/* =============================================================================
   Interceptor de backend em memória (docs §6) — ALINHADO À HACKAHUB API.
   Só ativo quando `environment.useMock`. Reproduz rotas e shapes reais.
   Substituível pelo backend NestJS trocando o environment (useMock=false).
   ============================================================================= */

import { HttpHandlerFn, HttpRequest, HttpResponse, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  db, nextId, toCatalogCard, toCatalogDetail, toHackathonResponse, userResponse,
  membershipResponse, myMembership, teamResponse, inviteResponse, joinRequestResponse,
  publicUser, teamOfUser, HackRow, MembershipRow,
} from './mock-db';

const LATENCY = 240;

class Fault {
  constructor(public status: number, public message: string, public error = 'Bad Request') {}
}

// ---- Helpers de sessão / autorização --------------------------------------

function currentUserId(req: HttpRequest<unknown>): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer mock.')) return null;
  const id = auth.slice('Bearer mock.'.length);
  return db.users.some((u) => u.id === id) ? id : null;
}

function requireUser(req: HttpRequest<unknown>): string {
  const id = currentUserId(req);
  if (!id) throw new Fault(401, 'Sessão expirada. Faça login novamente.', 'Unauthorized');
  return id;
}

function membershipRow(userId: string, hackathonId: string, role?: 'PARTICIPANT' | 'MENTOR'): MembershipRow | undefined {
  return db.memberships.find((m) => m.userId === userId && m.hackathonId === hackathonId && (!role || m.role === role));
}

function requireApprovedMember(userId: string, hackathonId: string): void {
  const ok = db.memberships.some((m) => m.userId === userId && m.hackathonId === hackathonId && m.status === 'APPROVED');
  if (!ok) throw new Fault(403, 'Você não participa deste evento.', 'Forbidden');
}

function requireApprovedParticipant(userId: string, hackathonId: string): void {
  const m = membershipRow(userId, hackathonId, 'PARTICIPANT');
  if (!m || m.status !== 'APPROVED') throw new Fault(403, 'Ação restrita a participantes aprovados.', 'Forbidden');
}

function teamMemberCount(teamId: string): number {
  return db.teamMembers.filter((tm) => tm.teamId === teamId).length;
}

// ---- Roteador --------------------------------------------------------------

function route(req: HttpRequest<unknown>, path: string): unknown {
  const seg = path.split('/').filter(Boolean);
  const method = req.method.toUpperCase();
  const body = (req.body ?? {}) as Record<string, any>;
  const q = req.params;

  // ---- Auth ----
  if (method === 'POST' && path === '/auth/register') {
    const email = String(body['email'] ?? '').trim().toLowerCase();
    const required = ['name', 'password', 'documentId', 'phone', 'birthDate'];
    if (!email || required.some((k) => !body[k])) throw new Fault(400, 'Preencha todos os campos obrigatórios.');
    if (body['acceptedTerms'] !== true) throw new Fault(400, 'É necessário aceitar os termos de uso.');
    if (String(body['password']).length < 6) throw new Fault(400, 'A senha deve ter no mínimo 6 caracteres.');
    if (db.users.some((u) => u.email === email)) throw new Fault(409, 'Este e-mail já está em uso.', 'Conflict');
    const id = nextId('u');
    db.users.push({
      id, name: String(body['name']), email, password: String(body['password']),
      documentId: String(body['documentId']), phone: String(body['phone']),
      birthDate: new Date(String(body['birthDate'])).toISOString(), acceptedTerms: true,
      createdAt: new Date().toISOString(),
    });
    return { user: userResponse(id) };
  }

  if (method === 'POST' && path === '/auth/login') {
    const email = String(body['email'] ?? '').trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== body['password']) throw new Fault(401, 'E-mail ou senha inválidos.', 'Unauthorized');
    return { accessToken: `mock.${user.id}`, user: userResponse(user.id) };
  }

  if (method === 'GET' && path === '/auth/me') {
    return { user: userResponse(requireUser(req)) };
  }

  // Extensão frontend (docs §4.4): agregação global de memberships.
  if (method === 'GET' && path === '/me/memberships') {
    const uid = requireUser(req);
    return db.memberships.filter((m) => m.userId === uid).map(myMembership);
  }

  if (method === 'PATCH' && path === '/users/me') {
    const uid = requireUser(req);
    const user = db.users.find((u) => u.id === uid)!;
    for (const k of ['name', 'phone', 'institution', 'course', 'githubUrl', 'linkedinUrl'] as const) {
      if (body[k] !== undefined) (user as any)[k] = body[k];
    }
    return { user: userResponse(uid) };
  }

  // ---- Catálogo (público) ----
  if (method === 'GET' && path === '/catalog') {
    return catalog(q.get('search'), q.get('registrationMode'), Number(q.get('page') ?? 1));
  }
  if (method === 'GET' && seg[0] === 'catalog' && seg.length === 2) {
    const h = db.hackathons.find((x) => x.slug === seg[1] && x.visibility === 'PUBLIC' && x.status === 'PUBLISHED');
    if (!h) throw new Fault(404, 'Evento não encontrado.', 'Not Found');
    return toCatalogDetail(h);
  }

  // ---- Escopo por hackathon ----
  if (seg[0] === 'hackathons' && seg.length >= 2) {
    const hid = seg[1];
    const h = db.hackathons.find((x) => x.id === hid);
    if (!h) throw new Fault(404, 'Evento não encontrado.', 'Not Found');

    // POST /hackathons/:id/join
    if (method === 'POST' && seg[2] === 'join' && seg.length === 3) {
      return joinHackathon(req, h);
    }
    // POST /hackathons/:id/apply-mentor
    if (method === 'POST' && seg[2] === 'apply-mentor' && seg.length === 3) {
      return applyMentor(req, h);
    }
    // GET /hackathons/:id
    if (method === 'GET' && seg.length === 2) {
      const uid = requireUser(req);
      requireApprovedMember(uid, hid);
      return toHackathonResponse(h);
    }
    // GET /hackathons/:id/memberships/me
    if (method === 'GET' && seg[2] === 'memberships' && seg[3] === 'me' && seg.length === 4) {
      const uid = requireUser(req);
      return db.memberships.filter((m) => m.userId === uid && m.hackathonId === hid).map(membershipResponse);
    }
    // GET /hackathons/:id/challenges
    if (method === 'GET' && seg[2] === 'challenges' && seg.length === 3) {
      requireApprovedMember(requireUser(req), hid);
      return db.challenges.filter((c) => c.hackathonId === hid).map((c) => ({ id: c.id, title: c.title, category: c.category, description: c.description }));
    }
    // GET /hackathons/:id/participants?search=
    if (method === 'GET' && seg[2] === 'participants' && seg.length === 3) {
      const uid = requireUser(req);
      requireApprovedMember(uid, hid);
      const search = (q.get('search') ?? '').toLowerCase();
      return db.memberships
        .filter((m) => m.hackathonId === hid && m.role === 'PARTICIPANT' && m.status === 'APPROVED')
        .map((m) => publicUser(m.userId))
        .filter((u) => !search || u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    }

    // ---- Times ----
    if (seg[2] === 'teams') {
      if (method === 'GET' && seg.length === 3) {
        requireApprovedMember(requireUser(req), hid);
        const search = (q.get('search') ?? '').toLowerCase();
        return db.teams
          .filter((t) => t.hackathonId === hid && (!search || t.name.toLowerCase().includes(search)))
          .map(teamResponse);
      }
      if (method === 'POST' && seg.length === 3) {
        return createTeam(req, h);
      }
      const tid = seg[3];
      const team = db.teams.find((t) => t.id === tid && t.hackathonId === hid);
      if (!team) throw new Fault(404, 'Time não encontrado.', 'Not Found');

      if (method === 'GET' && seg.length === 4) {
        requireApprovedMember(requireUser(req), hid);
        return teamResponse(team);
      }
      // POST /teams/:tid/challenges (líder)
      if (method === 'POST' && seg[4] === 'challenges' && seg.length === 5) {
        const uid = requireUser(req);
        if (team.leaderId !== uid) throw new Fault(403, 'Apenas o líder pode selecionar desafios.', 'Forbidden');
        const ids: string[] = Array.isArray(body['challengeIds']) ? body['challengeIds'] : [];
        if (ids.length === 0) throw new Fault(400, 'Selecione pelo menos um desafio.');
        const valid = db.challenges.filter((c) => c.hackathonId === hid).map((c) => c.id);
        if (ids.some((id) => !valid.includes(id))) throw new Fault(400, 'Desafio inválido para este evento.');
        db.teamChallenges = db.teamChallenges.filter((tc) => tc.teamId !== tid);
        ids.forEach((challengeId) => db.teamChallenges.push({ teamId: tid, challengeId }));
        return teamResponse(team);
      }
      // DELETE /teams/:tid/members/:userId (líder)
      if (method === 'DELETE' && seg[4] === 'members' && seg.length === 6) {
        const uid = requireUser(req);
        if (team.leaderId !== uid) throw new Fault(403, 'Apenas o líder pode remover membros.', 'Forbidden');
        const target = seg[5];
        if (target === team.leaderId) throw new Fault(400, 'O líder não pode ser removido.');
        db.teamMembers = db.teamMembers.filter((tm) => !(tm.teamId === tid && tm.userId === target));
        return teamResponse(team);
      }
      // POST /teams/:tid/join-requests (participante pede entrada)
      if (method === 'POST' && seg[4] === 'join-requests' && seg.length === 5) {
        const uid = requireUser(req);
        requireApprovedParticipant(uid, hid);
        if (teamOfUser(uid, hid)) throw new Fault(409, 'Você já faz parte de um time neste evento.', 'Conflict');
        if (db.joinRequests.some((j) => j.teamId === tid && j.userId === uid && j.status === 'PENDING')) {
          throw new Fault(409, 'Você já solicitou entrada neste time.', 'Conflict');
        }
        const jr = { id: nextId('j'), hackathonId: hid, teamId: tid, userId: uid, status: 'PENDING' as const, createdAt: new Date().toISOString() };
        db.joinRequests.push(jr);
        return joinRequestResponse(jr);
      }
      // GET /teams/:tid/join-requests (líder)
      if (method === 'GET' && seg[4] === 'join-requests' && seg.length === 5) {
        const uid = requireUser(req);
        if (team.leaderId !== uid) throw new Fault(403, 'Apenas o líder vê as solicitações.', 'Forbidden');
        return db.joinRequests.filter((j) => j.teamId === tid && j.status === 'PENDING').map(joinRequestResponse);
      }
      // POST /teams/:tid/invites (líder)
      if (method === 'POST' && seg[4] === 'invites' && seg.length === 5) {
        const uid = requireUser(req);
        if (team.leaderId !== uid) throw new Fault(403, 'Apenas o líder pode convidar.', 'Forbidden');
        const toUserId = String(body['toUserId'] ?? '');
        const targetM = membershipRow(toUserId, hid, 'PARTICIPANT');
        if (!targetM || targetM.status !== 'APPROVED') throw new Fault(400, 'Usuário não participa deste evento.');
        if (teamOfUser(toUserId, hid)) throw new Fault(409, 'Esse participante já está em um time.', 'Conflict');
        if (teamMemberCount(tid) >= h.teamMaxSize) throw new Fault(409, 'O time já atingiu o tamanho máximo.', 'Conflict');
        if (db.invites.some((i) => i.teamId === tid && i.toUserId === toUserId && i.status === 'PENDING')) {
          throw new Fault(409, 'Já existe um convite pendente para esse usuário.', 'Conflict');
        }
        const invite = { id: nextId('i'), hackathonId: hid, teamId: tid, fromUserId: uid, toUserId, status: 'PENDING' as const, createdAt: new Date().toISOString() };
        db.invites.push(invite);
        return inviteResponse(invite);
      }
    }

    // ---- Solicitações (aprovar/recusar pelo líder) ----
    if (seg[2] === 'join-requests' && seg.length === 5) {
      const uid = requireUser(req);
      const jr = db.joinRequests.find((j) => j.id === seg[3] && j.hackathonId === hid);
      if (!jr) throw new Fault(404, 'Solicitação não encontrada.', 'Not Found');
      const team = db.teams.find((t) => t.id === jr.teamId)!;
      if (team.leaderId !== uid) throw new Fault(403, 'Apenas o líder decide as solicitações.', 'Forbidden');
      if (method === 'POST' && seg[4] === 'approve') {
        if (teamOfUser(jr.userId, hid)) throw new Fault(409, 'Esse participante já entrou em um time.', 'Conflict');
        if (teamMemberCount(team.id) >= h.teamMaxSize) throw new Fault(409, 'O time já atingiu o tamanho máximo.', 'Conflict');
        db.teamMembers.push({ teamId: team.id, userId: jr.userId, hackathonId: hid, joinedAt: new Date().toISOString() });
        jr.status = 'APPROVED';
        return joinRequestResponse(jr);
      }
      if (method === 'POST' && seg[4] === 'reject') {
        jr.status = 'REJECTED';
        return joinRequestResponse(jr);
      }
    }

    // ---- Convites ----
    if (seg[2] === 'invites') {
      if (method === 'GET' && seg[3] === 'received' && seg.length === 4) {
        const uid = requireUser(req);
        return db.invites.filter((i) => i.hackathonId === hid && i.toUserId === uid && i.status === 'PENDING').map(inviteResponse);
      }
      const iid = seg[3];
      const invite = db.invites.find((i) => i.id === iid && i.hackathonId === hid);
      if (invite && seg.length === 5) {
        const uid = requireUser(req);
        if (invite.toUserId !== uid) throw new Fault(403, 'Este convite não é seu.', 'Forbidden');
        if (method === 'POST' && seg[4] === 'accept') {
          if (invite.status !== 'PENDING') throw new Fault(409, 'Este convite não está mais pendente.', 'Conflict');
          if (teamOfUser(uid, hid)) throw new Fault(409, 'Você já faz parte de um time neste evento.', 'Conflict');
          if (teamMemberCount(invite.teamId) >= h.teamMaxSize) throw new Fault(409, 'O time já atingiu o tamanho máximo.', 'Conflict');
          db.teamMembers.push({ teamId: invite.teamId, userId: uid, hackathonId: hid, joinedAt: new Date().toISOString() });
          invite.status = 'ACCEPTED';
          return inviteResponse(invite);
        }
        if (method === 'POST' && seg[4] === 'decline') {
          invite.status = 'DECLINED';
          return inviteResponse(invite);
        }
      }
    }

    // ---- Mentoria ----
    if (seg[2] === 'mentor' && seg[3] === 'teams') {
      const uid = requireUser(req);
      const m = membershipRow(uid, hid, 'MENTOR');
      if (!m || m.status !== 'APPROVED') throw new Fault(403, 'Você não é mentor aprovado neste evento.', 'Forbidden');
      if (method === 'GET' && seg.length === 4) {
        const teamIds = db.mentorAssignments.filter((a) => a.mentorId === uid).map((a) => a.teamId);
        return db.teams.filter((t) => t.hackathonId === hid && teamIds.includes(t.id)).map(teamResponse);
      }
      if (method === 'POST' && seg[4] && seg[5] === 'assign') {
        const tid = seg[4];
        if (!db.mentorAssignments.some((a) => a.mentorId === uid && a.teamId === tid)) {
          db.mentorAssignments.push({ mentorId: uid, teamId: tid });
        }
        return { ok: true };
      }
    }
  }

  throw new Fault(404, `Rota não encontrada: ${method} ${path}`, 'Not Found');
}

// ---- Handlers específicos --------------------------------------------------

function joinHackathon(req: HttpRequest<unknown>, h: HackRow) {
  const uid = requireUser(req);
  const body = (req.body ?? {}) as Record<string, any>;
  if (h.status !== 'PUBLISHED') throw new Fault(403, 'Este evento não está aberto para inscrições.', 'Forbidden');
  // Uma pessoa tem só um papel por evento: bloqueia papel repetido e papel diferente.
  const existing = membershipRow(uid, h.id);
  if (existing) {
    throw new Fault(
      409,
      existing.role === 'PARTICIPANT'
        ? 'Você já está inscrito neste evento.'
        : 'Você já participa deste evento com outro papel.',
      'Conflict',
    );
  }
  let status: MembershipRow['status'];
  switch (h.registrationMode) {
    case 'OPEN': status = 'APPROVED'; break;
    case 'APPROVAL': status = 'PENDING'; break;
    case 'CODE':
      if (String(body['registrationCode'] ?? '').trim() !== h.registrationCode) throw new Fault(400, 'Código de inscrição inválido.');
      status = 'APPROVED'; break;
    default: status = 'PENDING';
  }
  const m: MembershipRow = { id: nextId('m'), userId: uid, hackathonId: h.id, role: 'PARTICIPANT', status, mentorExpertise: [], mentorSeniority: null, mentorMotivation: null, mentorMaxTeams: null, createdAt: new Date().toISOString() };
  db.memberships.push(m);
  return membershipResponse(m);
}

function applyMentor(req: HttpRequest<unknown>, h: HackRow) {
  const uid = requireUser(req);
  const body = (req.body ?? {}) as Record<string, any>;
  if (h.status !== 'PUBLISHED') throw new Fault(403, 'Este evento não está aberto para candidaturas.', 'Forbidden');
  // Uma pessoa tem só um papel por evento: bloqueia papel repetido e papel diferente.
  const existingApp = membershipRow(uid, h.id);
  if (existingApp) {
    throw new Fault(
      409,
      existingApp.role === 'MENTOR'
        ? 'Você já se candidatou como mentor neste evento.'
        : 'Você já participa deste evento com outro papel.',
      'Conflict',
    );
  }
  const m: MembershipRow = {
    id: nextId('m'), userId: uid, hackathonId: h.id, role: 'MENTOR', status: 'PENDING',
    mentorExpertise: Array.isArray(body['expertise']) ? body['expertise'] : [],
    mentorSeniority: body['seniority'] ?? null, mentorMotivation: body['motivation'] ?? null,
    mentorMaxTeams: body['maxTeams'] ?? null, createdAt: new Date().toISOString(),
  };
  db.memberships.push(m);
  return membershipResponse(m);
}

function createTeam(req: HttpRequest<unknown>, h: HackRow) {
  const uid = requireUser(req);
  const body = (req.body ?? {}) as Record<string, any>;
  requireApprovedParticipant(uid, h.id);
  if (teamOfUser(uid, h.id)) throw new Fault(409, 'Você já faz parte de um time neste evento.', 'Conflict');
  const name = String(body['name'] ?? '').trim();
  if (!name) throw new Fault(400, 'Informe o nome do time.');
  if (db.teams.some((t) => t.hackathonId === h.id && t.name.toLowerCase() === name.toLowerCase())) {
    throw new Fault(409, 'Já existe um time com esse nome neste evento.', 'Conflict');
  }
  const team = { id: nextId('t'), hackathonId: h.id, name, description: String(body['description'] ?? '') || null, leaderId: uid, createdAt: new Date().toISOString() };
  db.teams.push(team);
  db.teamMembers.push({ teamId: team.id, userId: uid, hackathonId: h.id, joinedAt: new Date().toISOString() });
  return teamResponse(team);
}

function catalog(search: string | null, registrationMode: string | null, page: number) {
  let items = db.hackathons.filter((h) => h.visibility === 'PUBLIC' && h.status === 'PUBLISHED');
  if (search) {
    const s = search.toLowerCase();
    items = items.filter((h) => h.name.toLowerCase().includes(s) || (h.description ?? '').toLowerCase().includes(s));
  }
  if (registrationMode) items = items.filter((h) => h.registrationMode === registrationMode);

  // Inscrição aberta e mais próximos primeiro (backend §catálogo).
  const now = Date.now();
  const isOpen = (h: HackRow) => (!h.endsAt || new Date(h.endsAt).getTime() >= now);
  items = [...items].sort((a, b) => {
    const oa = isOpen(a) ? 0 : 1;
    const ob = isOpen(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
    return ta - tb;
  });

  const pageSize = 12;
  const p = Math.max(1, page);
  const data = items.slice((p - 1) * pageSize, p * pageSize).map(toCatalogCard);
  return { data, page: p, pageSize, total: items.length };
}

// ---- Interceptor -----------------------------------------------------------

export function mockBackendInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const base = environment.apiBaseUrl;
  if (!req.url.startsWith(base)) return next(req);
  const path = req.url.slice(base.length).split('?')[0] || '/';

  return of(null).pipe(
    delay(LATENCY),
    mergeMap(() => {
      try {
        const result = route(req, path);
        return of(new HttpResponse({ status: 200, body: result ?? null, url: req.url }));
      } catch (e) {
        const fault = e instanceof Fault ? e : new Fault(500, 'Erro interno do mock.', 'Internal Server Error');
        return throwError(
          () => new HttpErrorResponse({
            status: fault.status, statusText: fault.error, url: req.url,
            error: { statusCode: fault.status, message: fault.message, error: fault.error },
          }),
        );
      }
    }),
  );
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplyMentorPayload,
  Challenge,
  ChallengePayload,
  CreateHackathonPayload,
  Hackathon,
  LeaveEventResult,
  Membership,
  MembershipRole,
  MembershipStatus,
  UpdateHackathonPayload,
} from '../models';

/** Ações de evento/membership (docs §4.2 / §4.8). */
@Injectable({ providedIn: 'root' })
export class HackathonService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Cria um evento sob uma organização e torna o autor ORGANIZER (docs §8). */
  create(payload: CreateHackathonPayload): Observable<Hackathon> {
    return this.http.post<Hackathon>(`${this.base}/hackathons`, payload);
  }

  /** Detalhe autenticado (inclui teamMaxSize). Requer membership aprovada. */
  detail(hackathonId: string): Observable<Hackathon> {
    return this.http.get<Hackathon>(`${this.base}/hackathons/${hackathonId}`);
  }

  /** Edição do evento (ORGANIZER). `null` limpa o campo; `undefined` mantém. */
  update(hackathonId: string, payload: UpdateHackathonPayload): Observable<Hackathon> {
    return this.http.patch<Hackathon>(`${this.base}/hackathons/${hackathonId}`, payload);
  }

  challenges(hackathonId: string): Observable<Challenge[]> {
    return this.http.get<Challenge[]>(`${this.base}/hackathons/${hackathonId}/challenges`);
  }

  /** Detalhe de um desafio (qualquer membro aprovado). */
  challenge(hackathonId: string, challengeId: string): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.base}/hackathons/${hackathonId}/challenges/${challengeId}`);
  }

  // ---- CRUD de desafios (ORGANIZER) ----------------------------------------

  createChallenge(hackathonId: string, payload: ChallengePayload): Observable<Challenge> {
    return this.http.post<Challenge>(`${this.base}/hackathons/${hackathonId}/challenges`, payload);
  }

  updateChallenge(
    hackathonId: string,
    challengeId: string,
    payload: Partial<ChallengePayload>,
  ): Observable<Challenge> {
    return this.http.patch<Challenge>(
      `${this.base}/hackathons/${hackathonId}/challenges/${challengeId}`,
      payload,
    );
  }

  deleteChallenge(hackathonId: string, challengeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/hackathons/${hackathonId}/challenges/${challengeId}`);
  }

  // ---- Inscrições (ORGANIZER) ----------------------------------------------

  /** Participações do evento (participantes e mentores), com filtros opcionais. */
  memberships(
    hackathonId: string,
    filter: { role?: MembershipRole; status?: MembershipStatus } = {},
  ): Observable<Membership[]> {
    let params = new HttpParams();
    if (filter.role) params = params.set('role', filter.role);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<Membership[]>(`${this.base}/hackathons/${hackathonId}/memberships`, { params });
  }

  /** Aprova inscrição/candidatura PENDING (revalida o limite de vagas → 409 se lotado). */
  approveMembership(hackathonId: string, membershipId: string): Observable<Membership> {
    return this.http.post<Membership>(`${this.base}/hackathons/${hackathonId}/memberships/${membershipId}/approve`, {});
  }

  rejectMembership(hackathonId: string, membershipId: string): Observable<Membership> {
    return this.http.post<Membership>(`${this.base}/hackathons/${hackathonId}/memberships/${membershipId}/reject`, {});
  }

  /** Minhas participações neste evento (não exige aprovação). */
  myMemberships(hackathonId: string): Observable<Membership[]> {
    return this.http.get<Membership[]>(`${this.base}/hackathons/${hackathonId}/memberships/me`);
  }

  /**
   * Cancela a própria inscrição/candidatura no evento. Participante sai da equipe
   * (líder sozinho → equipe excluída; líder com outros membros → 409); mentor
   * devolve os atendimentos em andamento para a fila. Organizador não sai (403).
   */
  leave(hackathonId: string): Observable<LeaveEventResult> {
    return this.http.delete<LeaveEventResult>(`${this.base}/hackathons/${hackathonId}/memberships/me`);
  }

  /** Participar (docs §4.2). Comportamento depende do `registrationMode`. */
  join(hackathonId: string, registrationCode?: string): Observable<Membership> {
    return this.http.post<Membership>(`${this.base}/hackathons/${hackathonId}/join`, { registrationCode });
  }

  /** Candidatar-se como mentor — fluxo pull (docs §4.8). Nasce PENDING. */
  applyMentor(hackathonId: string, application: ApplyMentorPayload): Observable<Membership> {
    return this.http.post<Membership>(`${this.base}/hackathons/${hackathonId}/apply-mentor`, application);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invite, JoinRequest, PublicUser, Team } from '../models';

/** Times, convites e solicitações — escopados por hackathon (docs §4.5–4.7). */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private hb(hackathonId: string) {
    return `${this.base}/hackathons/${hackathonId}`;
  }

  list(hackathonId: string, search?: string): Observable<Team[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Team[]>(`${this.hb(hackathonId)}/teams`, { params });
  }

  get(hackathonId: string, teamId: string): Observable<Team> {
    return this.http.get<Team>(`${this.hb(hackathonId)}/teams/${teamId}`);
  }

  create(hackathonId: string, data: { name: string; description?: string }): Observable<Team> {
    return this.http.post<Team>(`${this.hb(hackathonId)}/teams`, data);
  }

  /** Só o líder. Endpoint é POST (não PUT) no backend. */
  selectChallenges(hackathonId: string, teamId: string, challengeIds: string[]): Observable<Team> {
    return this.http.post<Team>(`${this.hb(hackathonId)}/teams/${teamId}/challenges`, { challengeIds });
  }

  /** A API responde `{ message }` (não o time) — recarregar a lista depois. */
  removeMember(hackathonId: string, teamId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.hb(hackathonId)}/teams/${teamId}/members/${userId}`);
  }

  /** Busca de participantes do evento (para convidar). */
  searchParticipants(hackathonId: string, search: string): Observable<PublicUser[]> {
    const params = new HttpParams().set('search', search);
    return this.http.get<PublicUser[]>(`${this.hb(hackathonId)}/participants`, { params });
  }

  invite(hackathonId: string, teamId: string, toUserId: string): Observable<Invite> {
    return this.http.post<Invite>(`${this.hb(hackathonId)}/teams/${teamId}/invites`, { toUserId });
  }

  // ---- Solicitações de entrada ---------------------------------------------
  requestJoin(hackathonId: string, teamId: string): Observable<JoinRequest> {
    return this.http.post<JoinRequest>(`${this.hb(hackathonId)}/teams/${teamId}/join-requests`, {});
  }

  /** A API devolve o histórico (todos os status); só PENDING aceita ação. */
  teamJoinRequests(hackathonId: string, teamId: string): Observable<JoinRequest[]> {
    return this.http
      .get<JoinRequest[]>(`${this.hb(hackathonId)}/teams/${teamId}/join-requests`)
      .pipe(map((list) => list.filter((r) => r.status === 'PENDING')));
  }

  approveRequest(hackathonId: string, requestId: string): Observable<JoinRequest> {
    return this.http.post<JoinRequest>(`${this.hb(hackathonId)}/join-requests/${requestId}/approve`, {});
  }

  rejectRequest(hackathonId: string, requestId: string): Observable<JoinRequest> {
    return this.http.post<JoinRequest>(`${this.hb(hackathonId)}/join-requests/${requestId}/reject`, {});
  }

  // ---- Convites recebidos (docs §4.6) — escopados por hackathon ------------
  /** Idem: só convites PENDING (aceitos/recusados voltariam com botões e dariam 409). */
  receivedInvites(hackathonId: string): Observable<Invite[]> {
    return this.http
      .get<Invite[]>(`${this.hb(hackathonId)}/invites/received`)
      .pipe(map((list) => list.filter((i) => i.status === 'PENDING')));
  }

  acceptInvite(hackathonId: string, inviteId: string): Observable<Invite> {
    return this.http.post<Invite>(`${this.hb(hackathonId)}/invites/${inviteId}/accept`, {});
  }

  declineInvite(hackathonId: string, inviteId: string): Observable<Invite> {
    return this.http.post<Invite>(`${this.hb(hackathonId)}/invites/${inviteId}/decline`, {});
  }
}

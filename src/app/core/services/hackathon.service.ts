import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplyMentorPayload,
  Challenge,
  ChallengePayload,
  Hackathon,
  Membership,
  UpdateHackathonPayload,
} from '../models';

/** Ações de evento/membership (docs §4.2 / §4.8). */
@Injectable({ providedIn: 'root' })
export class HackathonService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

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

  /** Minhas participações neste evento (não exige aprovação). */
  myMemberships(hackathonId: string): Observable<Membership[]> {
    return this.http.get<Membership[]>(`${this.base}/hackathons/${hackathonId}/memberships/me`);
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

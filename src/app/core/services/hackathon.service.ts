import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplyMentorPayload, Challenge, Hackathon, Membership } from '../models';

/** Ações de evento/membership (docs §4.2 / §4.8). */
@Injectable({ providedIn: 'root' })
export class HackathonService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Detalhe autenticado (inclui teamMaxSize). Requer membership aprovada. */
  detail(hackathonId: string): Observable<Hackathon> {
    return this.http.get<Hackathon>(`${this.base}/hackathons/${hackathonId}`);
  }

  challenges(hackathonId: string): Observable<Challenge[]> {
    return this.http.get<Challenge[]>(`${this.base}/hackathons/${hackathonId}/challenges`);
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

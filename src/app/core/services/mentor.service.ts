import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team } from '../models';

/**
 * Painel de mentoria (docs §4.8). As candidaturas de mentor do usuário são
 * derivadas das memberships globais (AuthService), não deste serviço.
 */
@Injectable({ providedIn: 'root' })
export class MentorService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /**
   * TODOS os times do evento (mentor aprovado) — o mentor escolhe quais
   * acompanhar. Os que ele já mentora trazem o próprio id em `team.mentors`.
   */
  teams(hackathonId: string): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.base}/hackathons/${hackathonId}/mentor/teams`);
  }

  /** Passa a mentorar o time (409 se já associado). */
  assign(hackathonId: string, teamId: string): Observable<Team> {
    return this.http.post<Team>(`${this.base}/hackathons/${hackathonId}/mentor/teams/${teamId}/assign`, {});
  }
}

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

  /** Times mentorados naquele evento (mentor aprovado). */
  mentoredTeams(hackathonId: string): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.base}/hackathons/${hackathonId}/mentor/teams`);
  }
}

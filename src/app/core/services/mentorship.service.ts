import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MentorshipPayload, MentorshipRequest, MentorshipStatus } from '../models';

/**
 * Tickets de mentoria — mesma fila que o bot Discord opera (`/mentoria`).
 * Participante abre/cancela; mentor assume (claim atômico → 409 se outro
 * mentor pegou antes) e conclui; organizador vê tudo e pode concluir.
 */
@Injectable({ providedIn: 'root' })
export class MentorshipService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private url(hackathonId: string, path = ''): string {
    return `${this.base}/hackathons/${hackathonId}/mentorship${path}`;
  }

  /** Fila do evento (MENTOR/ORGANIZER), mais recentes primeiro. */
  list(hackathonId: string, status?: MentorshipStatus): Observable<MentorshipRequest[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<MentorshipRequest[]>(this.url(hackathonId), { params });
  }

  /** Pedidos abertos pelo usuário autenticado. */
  mine(hackathonId: string): Observable<MentorshipRequest[]> {
    return this.http.get<MentorshipRequest[]>(this.url(hackathonId, '/mine'));
  }

  create(hackathonId: string, payload: MentorshipPayload): Observable<MentorshipRequest> {
    return this.http.post<MentorshipRequest>(this.url(hackathonId), payload);
  }

  claim(hackathonId: string, requestId: string): Observable<MentorshipRequest> {
    return this.http.post<MentorshipRequest>(this.url(hackathonId, `/${requestId}/claim`), {});
  }

  complete(hackathonId: string, requestId: string): Observable<MentorshipRequest> {
    return this.http.post<MentorshipRequest>(this.url(hackathonId, `/${requestId}/complete`), {});
  }

  cancel(hackathonId: string, requestId: string): Observable<MentorshipRequest> {
    return this.http.post<MentorshipRequest>(this.url(hackathonId, `/${requestId}/cancel`), {});
  }
}

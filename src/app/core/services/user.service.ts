import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUser } from '../models';

/** Perfil do usuário (docs §4.9 / rota /app/perfil). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  updateProfile(data: Partial<CurrentUser>): Observable<CurrentUser> {
    return this.http
      .patch<{ user: CurrentUser }>(`${this.base}/users/me`, data)
      .pipe(map((r) => r.user));
  }
}

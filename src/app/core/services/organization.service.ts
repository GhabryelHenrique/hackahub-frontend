import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateOrganizationPayload, Organization } from '../models';

/** Organizações/tenants (docs §2.4). Quem cria vira o dono (`ownerId`). */
@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Cria uma organização e a torna dona dos hackathons criados sob ela. */
  create(payload: CreateOrganizationPayload): Observable<Organization> {
    return this.http.post<Organization>(`${this.base}/organizations`, payload);
  }

  /** Organizações em que o usuário pode criar eventos (dono ou organizador de um evento dela). */
  mine(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.base}/organizations/mine`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogPage, CatalogQuery, HackathonDetail, HackathonSummary } from '../models';

/** Catálogo público cross-tenant (docs §4.1). Sem token. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: CatalogQuery = {}): Observable<CatalogPage<HackathonSummary>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.registrationMode) params = params.set('registrationMode', query.registrationMode);
    if (query.page && query.page > 1) params = params.set('page', String(query.page));
    return this.http.get<CatalogPage<HackathonSummary>>(`${this.base}/catalog`, { params });
  }

  getBySlug(slug: string): Observable<HackathonDetail> {
    return this.http.get<HackathonDetail>(`${this.base}/catalog/${slug}`);
  }
}

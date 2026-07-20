import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor';
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

  /** `silent` evita o toast global (ex.: evento DRAFT dentro do app — 404 esperado). */
  getBySlug(slug: string, opts?: { silent?: boolean }): Observable<HackathonDetail> {
    return this.http.get<HackathonDetail>(`${this.base}/catalog/${slug}`, {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, opts?.silent ?? false),
    });
  }
}

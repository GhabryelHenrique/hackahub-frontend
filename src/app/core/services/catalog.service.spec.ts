import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor';

const API = 'http://localhost:3000';

describe('CatalogService', () => {
  let service: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list sem filtros faz GET /catalog sem query params', () => {
    const page = { data: [], page: 1, pageSize: 12, total: 0 };
    let result: unknown;
    service.list().subscribe((r) => (result = r));

    const req = http.expectOne(`${API}/catalog`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(page);
    expect(result).toEqual(page);
  });

  it('list envia search, registrationMode e page (> 1)', () => {
    service.list({ search: 'ia', registrationMode: 'CODE', page: 3 }).subscribe();

    const req = http.expectOne((r) => r.url === `${API}/catalog`);
    expect(req.request.params.get('search')).toBe('ia');
    expect(req.request.params.get('registrationMode')).toBe('CODE');
    expect(req.request.params.get('page')).toBe('3');
    req.flush({ data: [], page: 3, pageSize: 12, total: 0 });
  });

  it('list omite filtros vazios e a página 1', () => {
    service.list({ search: '', registrationMode: '', page: 1 }).subscribe();

    const req = http.expectOne((r) => r.url === `${API}/catalog`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ data: [], page: 1, pageSize: 12, total: 0 });
  });

  it('getBySlug faz GET /catalog/:slug com toast habilitado por padrão', () => {
    service.getBySlug('hack-2026').subscribe();

    const req = http.expectOne(`${API}/catalog/hack-2026`);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(false);
    req.flush({});
  });

  it('getBySlug com silent suprime o toast global', () => {
    service.getBySlug('rascunho', { silent: true }).subscribe();

    const req = http.expectOne(`${API}/catalog/rascunho`);
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush({});
  });
});

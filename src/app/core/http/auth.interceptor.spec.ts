import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenStorage } from '../auth/token-storage';

const API = 'http://localhost:3000';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const token = signal<string | null>('tok-123');

  beforeEach(() => {
    token.set('tok-123');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorage, useValue: { token } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function authHeaderFor(url: string): string | null {
    http.get(url).subscribe();
    const req = backend.expectOne(url);
    const header = req.request.headers.get('Authorization');
    req.flush({});
    return header;
  }

  it('anexa o Bearer nas rotas autenticadas da API', () => {
    expect(authHeaderFor(`${API}/auth/me`)).toBe('Bearer tok-123');
    expect(authHeaderFor(`${API}/me/memberships`)).toBe('Bearer tok-123');
    expect(authHeaderFor(`${API}/hackathons/h1/teams`)).toBe('Bearer tok-123');
    expect(authHeaderFor(`${API}/uploads`)).toBe('Bearer tok-123');
  });

  it('não anexa token nos prefixos públicos', () => {
    expect(authHeaderFor(`${API}/catalog`)).toBeNull();
    expect(authHeaderFor(`${API}/catalog/hack-2026`)).toBeNull();
    expect(authHeaderFor(`${API}/auth/login`)).toBeNull();
    expect(authHeaderFor(`${API}/auth/register`)).toBeNull();
    expect(authHeaderFor(`${API}/auth/discord`)).toBeNull();
    expect(authHeaderFor(`${API}/auth/discord/complete`)).toBeNull();
  });

  it('não vaza o token para URLs fora da API', () => {
    expect(authHeaderFor('https://cdn.exemplo.com/hackathons/capa.png')).toBeNull();
    expect(authHeaderFor('/assets/config.json')).toBeNull();
  });

  it('sem token não adiciona header', () => {
    token.set(null);
    expect(authHeaderFor(`${API}/auth/me`)).toBeNull();
  });
});

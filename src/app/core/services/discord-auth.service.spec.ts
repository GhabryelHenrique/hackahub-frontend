import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DiscordAuthService } from './discord-auth.service';
import { AuthService } from '../auth/auth.service';

const API = 'http://localhost:3000';

/** Monta um JWT falso (sem assinatura válida) com payload UTF-8 em base64url. */
function fakeJwt(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${b64}.assinatura`;
}

describe('DiscordAuthService', () => {
  let service: DiscordAuthService;
  let http: HttpTestingController;
  const auth = { adoptSession: vi.fn() };

  function setup(platform: 'browser' | 'server' = 'browser'): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    service = TestBed.inject(DiscordAuthService);
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => auth.adoptSession.mockReset());
  afterEach(() => http.verify());

  it('completeSignup faz POST /auth/discord/complete e adota a sessão retornada', () => {
    setup();
    const user = { id: 'u1', name: 'Ana' };
    auth.adoptSession.mockReturnValue(of(user));
    const payload = {
      ticket: 't',
      documentId: '123',
      phone: '11999990000',
      birthDate: '2000-01-01',
      acceptedTerms: true,
    };
    let result: unknown;
    service.completeSignup(payload).subscribe((u) => (result = u));

    const req = http.expectOne(`${API}/auth/discord/complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ accessToken: 'tok-discord', user });

    expect(auth.adoptSession).toHaveBeenCalledWith('tok-discord');
    expect(result).toEqual(user);
  });

  it('decodeTicket lê nome/e-mail/avatar preservando acentos e emoji', () => {
    setup();
    const ticket = fakeJwt({ name: 'João Ñandú 🚀', email: 'joao@ex.com', avatar: 'http://cdn/a.png' });
    expect(service.decodeTicket(ticket)).toEqual({
      name: 'João Ñandú 🚀',
      email: 'joao@ex.com',
      avatar: 'http://cdn/a.png',
    });
  });

  it('decodeTicket usa defaults quando nome/avatar faltam', () => {
    setup();
    expect(service.decodeTicket(fakeJwt({ email: 'a@b.c' }))).toEqual({ name: '', email: 'a@b.c', avatar: null });
  });

  it('decodeTicket devolve null sem e-mail ou com token inválido', () => {
    setup();
    expect(service.decodeTicket(fakeJwt({ name: 'Sem email' }))).toBeNull();
    expect(service.decodeTicket('lixo')).toBeNull();
    expect(service.decodeTicket('a.%%%.c')).toBeNull();
  });

  it('startLogin no servidor (SSR) não tenta redirecionar', () => {
    setup('server');
    const before = window.location.href;
    expect(() => service.startLogin('/app')).not.toThrow();
    expect(window.location.href).toBe(before);
  });
});

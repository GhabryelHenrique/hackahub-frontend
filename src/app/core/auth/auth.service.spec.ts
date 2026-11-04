import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';
import { CurrentUser, MyMembership, RegisterPayload } from '../models';

const API = 'http://localhost:3000';

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'u1',
    name: 'Ana Souza',
    email: 'ana@hackahub.local',
    documentId: '12345678900',
    phone: '11999990000',
    birthDate: '2000-01-01',
    acceptedTerms: true,
    institution: 'USP',
    course: 'Computação',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function membership(overrides: Partial<MyMembership>): MyMembership {
  return {
    id: 'm1',
    hackathonId: 'h1',
    role: 'PARTICIPANT',
    status: 'APPROVED',
    createdAt: '2026-01-01T00:00:00Z',
    hackathon: {
      id: 'h1',
      name: 'Hack',
      slug: 'hack',
      description: null,
      organization: { name: 'Org', slug: 'org' },
      registrationMode: 'OPEN',
      startsAt: null,
      endsAt: null,
      participantsCount: 0,
    },
    ...overrides,
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let tokens: TokenStorage;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    tokens = TestBed.inject(TokenStorage);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  /** Responde ao par GET /auth/me + GET /me/memberships da hidratação. */
  function flushSession(u: CurrentUser = user(), memberships: MyMembership[] = []): void {
    const me = http.expectOne(`${API}/auth/me`);
    expect(me.request.method).toBe('GET');
    const ms = http.expectOne(`${API}/me/memberships`);
    expect(ms.request.method).toBe('GET');
    me.flush({ user: u });
    ms.flush(memberships);
  }

  describe('bootstrap', () => {
    it('sem token marca ready sem chamar a API', async () => {
      await auth.bootstrap();
      expect(auth.ready()).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
      http.expectNone(`${API}/auth/me`);
    });

    it('com token hidrata usuário e memberships', async () => {
      tokens.set('tok');
      const done = auth.bootstrap();
      expect(auth.ready()).toBe(false);
      flushSession(user(), [membership({})]);
      await done;

      expect(auth.ready()).toBe(true);
      expect(auth.user()?.name).toBe('Ana Souza');
      expect(auth.memberships().length).toBe(1);
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('falha na hidratação ainda marca ready (sem sessão)', async () => {
      tokens.set('expirado');
      const done = auth.bootstrap();
      const me = http.expectOne(`${API}/auth/me`);
      http.expectOne(`${API}/me/memberships`);
      me.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      await done;

      expect(auth.ready()).toBe(true);
      expect(auth.user()).toBeNull();
    });
  });

  describe('login / register / adoptSession', () => {
    it('login guarda o token e hidrata a sessão', () => {
      let result: CurrentUser | undefined;
      auth.login({ email: 'ana@hackahub.local', password: 'ana12345' }).subscribe((u) => (result = u));

      const req = http.expectOne(`${API}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'ana@hackahub.local', password: 'ana12345' });
      req.flush({ accessToken: 'tok-123', user: user() });

      expect(tokens.token()).toBe('tok-123');
      expect(localStorage.getItem('hackahub.token')).toBe('tok-123');
      flushSession(user(), [membership({})]);

      expect(result?.id).toBe('u1');
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.memberships().length).toBe(1);
    });

    it('login com erro não guarda token nem hidrata', () => {
      let failed = false;
      auth.login({ email: 'x@y.z', password: 'errada' }).subscribe({ error: () => (failed = true) });
      http.expectOne(`${API}/auth/login`).flush({ message: 'Credenciais inválidas' }, { status: 401, statusText: 'Unauthorized' });

      expect(failed).toBe(true);
      expect(tokens.token()).toBeNull();
      http.expectNone(`${API}/auth/me`);
    });

    it('register cria a conta e faz login com as mesmas credenciais', () => {
      const payload: RegisterPayload = {
        name: 'Ana',
        email: 'ana@hackahub.local',
        password: 'ana12345',
        documentId: '123',
        phone: '11999990000',
        birthDate: '2000-01-01',
        acceptedTerms: true,
      };
      let result: CurrentUser | undefined;
      auth.register(payload).subscribe((u) => (result = u));

      const reg = http.expectOne(`${API}/auth/register`);
      expect(reg.request.method).toBe('POST');
      expect(reg.request.body).toEqual(payload);
      reg.flush({ user: user() });

      const login = http.expectOne(`${API}/auth/login`);
      expect(login.request.body).toEqual({ email: 'ana@hackahub.local', password: 'ana12345' });
      login.flush({ accessToken: 'tok', user: user() });
      flushSession();

      expect(result?.id).toBe('u1');
    });

    it('adoptSession guarda o token recebido e hidrata', () => {
      let result: CurrentUser | undefined;
      auth.adoptSession('tok-discord').subscribe((u) => (result = u));
      expect(tokens.token()).toBe('tok-discord');
      flushSession(user({ id: 'u-discord' }));
      expect(result?.id).toBe('u-discord');
    });
  });

  describe('logout / sessão expirada / refresh', () => {
    beforeEach(() => {
      tokens.set('tok');
      auth.user.set(user());
      auth.memberships.set([membership({})]);
    });

    it('logout limpa a sessão e volta para a home', () => {
      const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      auth.logout();

      expect(tokens.token()).toBeNull();
      expect(auth.user()).toBeNull();
      expect(auth.memberships()).toEqual([]);
      expect(nav).toHaveBeenCalledWith('/');
    });

    it('onSessionExpired limpa a sessão sem navegar', () => {
      const nav = vi.spyOn(router, 'navigateByUrl');
      auth.onSessionExpired();

      expect(tokens.token()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(nav).not.toHaveBeenCalled();
    });

    it('refresh recarrega a sessão quando há token', () => {
      auth.refresh();
      flushSession(user({ name: 'Ana Atualizada' }), []);
      expect(auth.user()?.name).toBe('Ana Atualizada');
      expect(auth.memberships()).toEqual([]);
    });

    it('refresh sem token não chama a API', () => {
      tokens.clear();
      auth.refresh();
      http.expectNone(`${API}/auth/me`);
    });

    it('refresh engole erros', () => {
      auth.refresh();
      const me = http.expectOne(`${API}/auth/me`);
      http.expectOne(`${API}/me/memberships`);
      me.flush({}, { status: 500, statusText: 'Erro' });
      expect(auth.user()?.name).toBe('Ana Souza');
    });

    it('reload devolve o fluxo da hidratação', () => {
      let result: CurrentUser | undefined;
      auth.reload().subscribe((u) => (result = u));
      flushSession(user({ id: 'u7' }));
      expect(result?.id).toBe('u7');
    });

    it('applyUser reflete o perfil atualizado', () => {
      auth.applyUser(user({ name: 'Novo Nome' }));
      expect(auth.user()?.name).toBe('Novo Nome');
    });
  });

  describe('papéis por evento', () => {
    beforeEach(() => {
      auth.memberships.set([
        membership({ id: 'a', hackathonId: 'h1', role: 'PARTICIPANT', status: 'APPROVED' }),
        membership({ id: 'b', hackathonId: 'h2', role: 'MENTOR', status: 'PENDING' }),
        membership({ id: 'c', hackathonId: 'h2', role: 'ORGANIZER', status: 'APPROVED' }),
        membership({ id: 'd', hackathonId: 'h3', role: 'PARTICIPANT', status: 'REJECTED' }),
      ]);
    });

    it('membershipsFor filtra pelo evento', () => {
      expect(auth.membershipsFor('h2').map((m) => m.id)).toEqual(['b', 'c']);
      expect(auth.membershipsFor('h9')).toEqual([]);
    });

    it('membership encontra por evento + papel', () => {
      expect(auth.membership('h2', 'MENTOR')?.id).toBe('b');
      expect(auth.membership('h1', 'MENTOR')).toBeUndefined();
    });

    it('hasRole exige status APPROVED', () => {
      expect(auth.hasRole('h1', 'PARTICIPANT')).toBe(true);
      expect(auth.hasRole('h2', 'ORGANIZER')).toBe(true);
      expect(auth.hasRole('h2', 'MENTOR')).toBe(false);
      expect(auth.hasRole('h3', 'PARTICIPANT')).toBe(false);
      expect(auth.hasRole('h9', 'PARTICIPANT')).toBe(false);
    });
  });

  describe('perfil incompleto', () => {
    it('sem usuário não há pendências', () => {
      expect(auth.profileMissing()).toEqual([]);
      expect(auth.isProfileIncomplete()).toBe(false);
    });

    it('perfil completo não tem pendências', () => {
      auth.user.set(user());
      expect(auth.profileMissing()).toEqual([]);
      expect(auth.isProfileIncomplete()).toBe(false);
    });

    it('lista telefone, instituição e curso ausentes ou em branco', () => {
      auth.user.set(user({ phone: '   ', institution: null, course: undefined }));
      expect(auth.profileMissing()).toEqual(['telefone', 'instituição', 'curso']);
      expect(auth.isProfileIncomplete()).toBe(true);
    });

    it('reage à atualização do usuário', () => {
      auth.user.set(user({ course: '' }));
      expect(auth.profileMissing()).toEqual(['curso']);
      auth.applyUser(user({ course: 'Design' }));
      expect(auth.isProfileIncomplete()).toBe(false);
    });
  });
});

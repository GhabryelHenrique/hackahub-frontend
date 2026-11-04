import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { SUPPRESS_ERROR_TOAST, errorInterceptor } from './error.interceptor';
import { ToastService } from '../toast/toast.service';
import { AuthService } from '../auth/auth.service';
import { ApiError } from '../models';

const API = 'http://localhost:3000';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: ToastService;
  const auth = { onSessionExpired: vi.fn() };
  const router = { url: '/', navigate: vi.fn() };

  beforeEach(() => {
    auth.onSessionExpired.mockReset();
    router.navigate.mockReset();
    router.url = '/';
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'error');
  });

  afterEach(() => backend.verify());

  /** Dispara um GET, responde com erro e devolve o erro normalizado recebido pelo chamador. */
  function fail(
    url: string,
    status: number,
    body: object | null = null,
    context?: HttpContext,
  ): ApiError | undefined {
    let error: ApiError | undefined;
    http.get(url, { context }).subscribe({ error: (e) => (error = e) });
    const req = backend.expectOne(url);
    if (status === 0) req.error(new ProgressEvent('error'));
    else req.flush(body, { status, statusText: 'Erro' });
    return error;
  }

  it('respostas de sucesso passam intactas', () => {
    let body: unknown;
    http.get(`${API}/catalog`).subscribe((b) => (body = b));
    backend.expectOne(`${API}/catalog`).flush({ ok: true });
    expect(body).toEqual({ ok: true });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('normaliza message em string e mostra o toast', () => {
    const err = fail(`${API}/hackathons/h1/join`, 409, {
      statusCode: 409,
      message: 'Evento lotado',
      error: 'Conflict',
    });
    expect(err).toEqual({ statusCode: 409, message: 'Evento lotado', error: 'Conflict' });
    expect(toast.error).toHaveBeenCalledWith('Evento lotado');
  });

  it('usa a primeira mensagem quando message é array (validação)', () => {
    const err = fail(`${API}/hackathons`, 400, {
      statusCode: 400,
      message: ['slug must match pattern', 'name should not be empty'],
      error: 'Bad Request',
    });
    expect(err?.message).toBe('slug must match pattern');
    expect(toast.error).toHaveBeenCalledWith('slug must match pattern');
  });

  it('cai na mensagem padrão por status quando a API não manda message', () => {
    expect(fail(`${API}/x`, 404)?.message).toBe('Recurso não encontrado.');
    expect(fail(`${API}/x`, 403, {})?.message).toBe('Você não tem permissão para esta ação neste evento.');
    expect(fail(`${API}/x`, 409, { message: [] })?.message).toBe('Conflito com o estado atual.');
    expect(fail(`${API}/x`, 500, { message: '' })?.message).toBe('Erro interno do servidor.');
    expect(fail(`${API}/x`, 418)?.message).toBe('Ocorreu um erro inesperado.');
    expect(fail(`${API}/x`, 0)?.message).toBe('Não foi possível conectar ao servidor.');
    expect(toast.error).toHaveBeenCalledTimes(6);
  });

  it('respeita SUPPRESS_ERROR_TOAST, mas ainda propaga o erro', () => {
    const ctx = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    const err = fail(`${API}/catalog/rascunho`, 404, null, ctx);
    expect(err?.statusCode).toBe(404);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('endpoints de auth não disparam toast (erro inline na tela)', () => {
    const err = fail(`${API}/auth/register`, 400, { message: 'E-mail já cadastrado' });
    expect(err?.message).toBe('E-mail já cadastrado');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('401 dentro de /app encerra a sessão, avisa e redireciona ao login com returnUrl', () => {
    router.url = '/app/eventos/h1';
    const err = fail(`${API}/hackathons/h1`, 401, { message: 'Unauthorized' });

    expect(err?.statusCode).toBe(401);
    expect(auth.onSessionExpired).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/app/eventos/h1' } });
  });

  it('401 fora de /app só limpa a sessão', () => {
    router.url = '/eventos/hack';
    fail(`${API}/me/memberships`, 401);
    expect(auth.onSessionExpired).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('401 em endpoint de auth (login inválido) não redireciona', () => {
    router.url = '/app';
    fail(`${API}/auth/login`, 401, { message: 'Credenciais inválidas' });
    expect(auth.onSessionExpired).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

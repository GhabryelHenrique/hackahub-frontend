import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

describe('Login', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;
  let router: Router;
  const auth = { login: vi.fn() };
  const originalProduction = environment.production;

  beforeEach(() => {
    auth.login.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'login', component: Login }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  afterEach(() => {
    environment.production = originalProduction;
  });

  async function open(url = '/login') {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Login);
    await harness.fixture.whenStable();
    el = harness.routeNativeElement!;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  async function type(id: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }
  async function submit() {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
  }

  it('formulário vazio mostra erros e não chama a API', async () => {
    await open();
    await submit();
    expect(auth.login).not.toHaveBeenCalled();
    expect(text(el)).toContain('Campo obrigatório.');
  });

  it('e-mail inválido é sinalizado', async () => {
    await open();
    await type('email', 'nao-eh-email');
    await type('password', 'x');
    await submit();
    expect(auth.login).not.toHaveBeenCalled();
    expect(text(el)).toContain('E-mail inválido.');
  });

  it('login válido envia as credenciais e vai para /app', async () => {
    auth.login.mockReturnValue(of({ id: 'u1' }));
    await open();
    await type('email', 'ana@hackahub.local');
    await type('password', 'ana12345');
    await submit();

    expect(auth.login).toHaveBeenCalledWith({ email: 'ana@hackahub.local', password: 'ana12345' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app');
  });

  it('respeita o returnUrl da querystring', async () => {
    auth.login.mockReturnValue(of({ id: 'u1' }));
    await open('/login?returnUrl=%2Fapp%2Feventos%2Fh1');
    await type('email', 'ana@hackahub.local');
    await type('password', 'ana12345');
    await submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/eventos/h1');
  });

  it('erro da API aparece inline', async () => {
    auth.login.mockReturnValue(throwError(() => ({ statusCode: 401, message: 'Credenciais inválidas' })));
    await open();
    await type('email', 'ana@hackahub.local');
    await type('password', 'errada');
    await submit();

    expect(text(el.querySelector('.auth__error'))).toBe('Credenciais inválidas');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('erro sem mensagem em texto usa a mensagem padrão', async () => {
    auth.login.mockReturnValue(throwError(() => ({ statusCode: 400, message: ['a', 'b'] })));
    await open();
    await type('email', 'ana@hackahub.local');
    await type('password', 'x');
    await submit();
    expect(text(el.querySelector('.auth__error'))).toBe('Não foi possível entrar. Tente novamente.');
  });

  it('mostra o erro de retorno do SSO do Discord', async () => {
    await open('/login?discord=erro');
    expect(text(el.querySelector('.auth__error'))).toBe('Não foi possível entrar com o Discord. Tente novamente.');
  });

  it('mostra o cancelamento do SSO do Discord', async () => {
    await open('/login?discord=cancelado');
    expect(text(el.querySelector('.auth__error'))).toBe('Login com o Discord cancelado.');
  });

  it('avisa quando o SSO do Discord não está configurado na API', async () => {
    await open('/login?discord=indisponivel');
    expect(text(el.querySelector('.auth__error'))).toBe(
      'Login com o Discord indisponível no momento. Entre com e-mail e senha.',
    );
  });

  it('credenciais de demonstração só fora de produção', async () => {
    environment.production = true;
    await open();
    expect(el.querySelector('.auth__demo')).toBeNull();
  });

  it('em desenvolvimento exibe as credenciais do seed', async () => {
    environment.production = false;
    await open();
    expect(text(el.querySelector('.auth__demo'))).toContain('ana@hackahub.local');
  });
});

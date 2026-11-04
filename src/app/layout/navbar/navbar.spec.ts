import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { AuthService } from '../../core/auth/auth.service';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let el: HTMLElement;

  const user = signal<{ name: string; avatarUrl: string | null } | null>(null);
  const auth = { user, isAuthenticated: computed(() => user() !== null), logout: vi.fn() };

  beforeEach(() => {
    user.set(null);
    auth.logout.mockReset();
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  async function render(variant: 'public' | 'app' = 'public') {
    fixture = TestBed.createComponent(Navbar);
    fixture.componentRef.setInput('variant', variant);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const links = () => Array.from(el.querySelectorAll('.nav__links a')).map((a) => [text(a), a.getAttribute('href')]);

  it('visitante vê "Eventos", "Entrar" e "Criar conta"', async () => {
    await render();
    expect(links()).toEqual([
      ['Eventos', '/'],
      ['Entrar', '/login'],
      ['Criar conta', '/cadastro'],
    ]);
    expect(el.querySelector('.usermenu')).toBeNull();
  });

  it('logado na área pública vê "Meus eventos" e o menu do usuário', async () => {
    user.set({ name: 'Ana Souza', avatarUrl: null });
    await render();

    expect(links()).toEqual([
      ['Eventos', '/'],
      ['Meus eventos', '/app'],
    ]);
    expect(text(el.querySelector('.usermenu__name'))).toBe('Ana Souza');
    expect(text(el)).not.toContain('Entrar');
  });

  it('variante app mostra a navegação da área logada', async () => {
    user.set({ name: 'Ana Souza', avatarUrl: null });
    await render('app');
    expect(links()).toEqual([
      ['Meus eventos', '/app'],
      ['Descobrir eventos', '/'],
      ['Criar evento', '/app/eventos/novo'],
    ]);
  });

  it('menu do usuário abre com perfil, candidaturas e sair (que faz logout)', async () => {
    user.set({ name: 'Ana Souza', avatarUrl: null });
    await render();
    el.querySelector<HTMLButtonElement>('.usermenu__trigger')!.click();
    await fixture.whenStable();

    const items = Array.from(el.querySelectorAll('.usermenu__item')).map(text);
    expect(items).toEqual(['Perfil', 'Candidaturas de mentor', 'Sair']);

    el.querySelector<HTMLButtonElement>('.usermenu__item--danger')!.click();
    await fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(el.querySelector('.usermenu__dropdown')).toBeNull();
  });

  it('botão de menu alterna o menu mobile', async () => {
    await render();
    const burger = el.querySelector<HTMLButtonElement>('.nav__burger')!;
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    burger.click();
    await fixture.whenStable();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.nav__links')!.classList).toContain('is-open');
  });
});

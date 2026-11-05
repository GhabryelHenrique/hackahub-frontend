import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { EventDetail } from './event-detail';
import { CatalogService } from '../../../core/services/catalog.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  HackathonDetail,
  MembershipRole,
  MembershipStatus,
  MyMembership,
  RegistrationMode,
} from '../../../core/models';

const DAY = 86_400_000;

function event(registrationMode: RegistrationMode = 'OPEN'): HackathonDetail {
  return {
    id: 'e1',
    name: 'Hack Cidades',
    slug: 'hack-cidades',
    description: 'Um hackathon sobre cidades inteligentes.',
    organization: { name: 'Org X', slug: 'org-x' },
    registrationMode,
    coverImage: null,
    startsAt: new Date(Date.now() + 10 * DAY).toISOString(),
    endsAt: new Date(Date.now() + 12 * DAY).toISOString(),
    location: 'São Paulo',
    price: null,
    participantsCount: 12,
    challenges: [{ id: 'c1', title: 'Mobilidade', description: 'Transporte público', category: 'Smart City' }],
  };
}

function mem(role: MembershipRole, status: MembershipStatus): MyMembership {
  return { id: 'm1', hackathonId: 'e1', role, status, createdAt: '', hackathon: event() };
}

describe('EventDetail', () => {
  let fixture: ComponentFixture<EventDetail>;
  let el: HTMLElement;
  let router: Router;
  let toast: ToastService;

  const catalog = { getBySlug: vi.fn() };
  const hackathons = { join: vi.fn(), applyMentor: vi.fn() };
  const isAuthenticated = signal(false);
  const memberships = signal<MyMembership[]>([]);
  const auth = {
    isAuthenticated,
    membershipsFor: (id: string) => memberships().filter((m) => m.hackathonId === id),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    catalog.getBySlug.mockReset().mockReturnValue(of(event()));
    hackathons.join.mockReset();
    hackathons.applyMentor.mockReset();
    auth.refresh.mockReset();
    isAuthenticated.set(false);
    memberships.set([]);

    TestBed.configureTestingModule({
      imports: [EventDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: CatalogService, useValue: catalog },
        { provide: HackathonService, useValue: hackathons },
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'warning');
  });

  async function render() {
    fixture = TestBed.createComponent(EventDetail);
    fixture.componentRef.setInput('slug', 'hack-cidades');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cta = () => text(el.querySelector('.cta'));
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('button, a')).find((b) => text(b) === label);
  async function click(label: string) {
    button(label)!.click();
    await fixture.whenStable();
  }
  async function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('busca o evento pelo slug e mostra os dados públicos', async () => {
    await render();
    expect(catalog.getBySlug).toHaveBeenCalledWith('hack-cidades');
    expect(text(el.querySelector('h1'))).toBe('Hack Cidades');
    expect(text(el)).toContain('12 participantes');
    expect(text(el)).toContain('Gratuito');
    expect(text(el)).toContain('Mobilidade');
    expect(TestBed.inject(Title).getTitle()).toBe('Hack Cidades — Hackahub');
  });

  it('evento inexistente mostra "Evento não encontrado"', async () => {
    catalog.getBySlug.mockReturnValue(throwError(() => ({ statusCode: 404 })));
    await render();
    expect(text(el)).toContain('Evento não encontrado');
  });

  describe('sem sessão', () => {
    it('oferece entrar para participar e redireciona ao login com returnUrl', async () => {
      await render();
      expect(cta()).toContain('Entre na sua conta');
      expect(button('Candidatar-se como mentor')).toBeUndefined();

      await click('Entrar para participar');
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/eventos/hack-cidades' } });
      expect(hackathons.join).not.toHaveBeenCalled();
    });
  });

  describe('logado sem participação', () => {
    beforeEach(() => isAuthenticated.set(true));

    it('modo OPEN: "Participar" + candidatura de mentor', async () => {
      await render();
      expect(button('Participar')).toBeTruthy();
      expect(button('Candidatar-se como mentor')).toBeTruthy();
    });

    it('participar aprovado confirma e leva à área do evento', async () => {
      hackathons.join.mockReturnValue(of({ ...mem('PARTICIPANT', 'APPROVED') }));
      await render();
      await click('Participar');

      expect(hackathons.join).toHaveBeenCalledWith('e1', undefined);
      expect(auth.refresh).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Inscrição confirmada! Bem-vindo ao evento.');
      expect(router.navigate).toHaveBeenCalledWith(['/app/eventos', 'e1']);
    });

    it('modo APPROVAL: "Solicitar participação" fica pendente sem navegar', async () => {
      catalog.getBySlug.mockReturnValue(of(event('APPROVAL')));
      hackathons.join.mockReturnValue(of({ ...mem('PARTICIPANT', 'PENDING') }));
      await render();
      expect(button('Participar')).toBeUndefined();
      await click('Solicitar participação');

      expect(hackathons.join).toHaveBeenCalledWith('e1', undefined);
      expect(toast.success).toHaveBeenCalledWith('Solicitação enviada. Aguarde a aprovação da organização.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('modo CODE: exige o código e envia sem espaços', async () => {
      catalog.getBySlug.mockReturnValue(of(event('CODE')));
      hackathons.join.mockReturnValue(of({ ...mem('PARTICIPANT', 'APPROVED') }));
      await render();
      expect(el.querySelector('#code')).not.toBeNull();

      await click('Validar e participar');
      expect(toast.warning).toHaveBeenCalledWith('Informe o código de inscrição.');
      expect(hackathons.join).not.toHaveBeenCalled();

      await type('#code', '  SEGREDO26 ');
      await click('Validar e participar');
      expect(hackathons.join).toHaveBeenCalledWith('e1', 'SEGREDO26');
    });

    it('candidatura de mentor em duas etapas envia expertise normalizada', async () => {
      hackathons.applyMentor.mockReturnValue(of(mem('MENTOR', 'PENDING')));
      await render();
      await click('Candidatar-se como mentor');
      expect(el.querySelector('[role="dialog"]')).not.toBeNull();

      await click('Continuar');
      expect(text(el.querySelector('[role="dialog"]'))).toContain('Informe ao menos uma área.');

      await type('[formcontrolname="expertise"]', 'Backend,  IA , ,Cloud');
      await click('Continuar');
      await type('[formcontrolname="motivation"]', 'Tenho 10 anos de experiência com backend.');
      await click('Enviar candidatura');

      expect(hackathons.applyMentor).toHaveBeenCalledWith('e1', {
        expertise: ['Backend', 'IA', 'Cloud'],
        seniority: 'Pleno',
        motivation: 'Tenho 10 anos de experiência com backend.',
      });
      expect(el.querySelector('[role="dialog"]')).toBeNull();
      expect(auth.refresh).toHaveBeenCalled();
    });

    it('senioridade é um select com Pleno, Sênior, Especialista e PhD', async () => {
      await render();
      await click('Candidatar-se como mentor');
      const select = el.querySelector<HTMLSelectElement>('[formcontrolname="seniority"]')!;
      expect(Array.from(select.options).map((o) => o.value)).toEqual(['Pleno', 'Sênior', 'Especialista', 'PhD']);
    });

    it('evento com aprovação automática avisa que a pessoa já é mentora', async () => {
      hackathons.applyMentor.mockReturnValue(of(mem('MENTOR', 'APPROVED')));
      await render();
      await click('Candidatar-se como mentor');
      await type('[formcontrolname="expertise"]', 'Backend');
      await click('Continuar');
      await type('[formcontrolname="motivation"]', 'Tenho 10 anos de experiência com backend.');
      await click('Enviar candidatura');

      expect(toast.success).toHaveBeenCalledWith('Pronto! Você já é mentor deste evento.');
    });

    it('motivação curta não envia a candidatura', async () => {
      await render();
      await click('Candidatar-se como mentor');
      await type('[formcontrolname="expertise"]', 'Backend');
      await click('Continuar');
      await type('[formcontrolname="motivation"]', 'curta');
      await click('Enviar candidatura');

      expect(hackathons.applyMentor).not.toHaveBeenCalled();
      expect(text(el.querySelector('[role="dialog"]'))).toContain('Descreva sua motivação (mín. 20 caracteres).');
    });
  });

  describe('logado com participação existente', () => {
    beforeEach(() => isAuthenticated.set(true));

    it('aprovado: mostra "Papel · Status" e o acesso à área, sem novas ações', async () => {
      memberships.set([mem('PARTICIPANT', 'APPROVED')]);
      await render();

      expect(cta()).toContain('Participante · Ativo');
      expect(cta()).toContain('Você já faz parte deste evento.');
      const access = button('Acessar área do evento');
      expect(access?.getAttribute('href')).toBe('/app/eventos/e1');
      expect(button('Participar')).toBeUndefined();
      expect(button('Candidatar-se como mentor')).toBeUndefined();
    });

    it('mentor pendente: candidatura em análise, ainda acessa a área', async () => {
      memberships.set([mem('MENTOR', 'PENDING')]);
      await render();

      expect(cta()).toContain('Mentor · Pendente de aprovação');
      expect(cta()).toContain('Sua candidatura de mentor está em análise.');
      expect(button('Acessar área do evento')).toBeTruthy();
      expect(button('Candidatar-se como mentor')).toBeUndefined();
    });

    it('recusado: informa a recusa e esconde o acesso à área', async () => {
      memberships.set([mem('PARTICIPANT', 'REJECTED')]);
      await render();

      expect(cta()).toContain('Participante · Recusado');
      expect(cta()).toContain('A organização recusou sua inscrição neste evento.');
      expect(button('Acessar área do evento')).toBeUndefined();
      expect(button('Candidatar-se como mentor')).toBeUndefined();
    });
  });
});

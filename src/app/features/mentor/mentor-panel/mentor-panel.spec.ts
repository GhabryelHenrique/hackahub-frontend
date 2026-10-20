import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MentorPanel } from './mentor-panel';
import { MentorService } from '../../../core/services/mentor.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { MentorshipRequest, MentorshipStatus, PublicUser, Team } from '../../../core/models';

const ME: PublicUser = { id: 'me', name: 'Mentor Eu', email: 'eu@ex.com' };
const OTHER: PublicUser = { id: 'other', name: 'Outra Mentora', email: 'outra@ex.com' };

function ticket(id: string, status: MentorshipStatus, title: string, mentor: PublicUser | null, createdAt: string): MentorshipRequest {
  return {
    id,
    hackathonId: 'h1',
    title,
    description: 'Detalhes do problema',
    status,
    createdAt,
    claimedAt: null,
    closedAt: null,
    user: { id: `u-${id}`, name: `Autor ${id}`, email: `${id}@ex.com` },
    mentor,
    team: null,
  };
}

// A API devolve os mais recentes primeiro.
const tickets: MentorshipRequest[] = [
  ticket('k5', 'PENDING', 'Erro no deploy', null, '2026-10-18T10:00:00Z'),
  ticket('k4', 'PENDING', 'Dúvida de API', null, '2026-10-16T10:00:00Z'),
  ticket('k3', 'IN_PROGRESS', 'Banco lento', ME, '2026-10-15T10:00:00Z'),
  ticket('k2', 'IN_PROGRESS', 'Layout quebrado', OTHER, '2026-10-14T10:00:00Z'),
  ticket('k1', 'COMPLETED', 'Docker', ME, '2026-10-13T10:00:00Z'),
  ticket('k0', 'COMPLETED', 'Outro concluído', OTHER, '2026-10-12T10:00:00Z'),
];

function team(id: string, name: string, mentors: PublicUser[]): Team {
  return {
    id,
    hackathonId: 'h1',
    name,
    description: null,
    leaderId: 'l',
    createdAt: '2026-10-10T00:00:00Z',
    leader: { id: 'l', name: 'Líder', email: 'l@ex.com' },
    members: [{ id: 'l', name: 'Líder', email: 'l@ex.com', joinedAt: '' }],
    challenges: [],
    mentors,
  };
}

const teams = [team('zeta', 'Zeta', [ME]), team('alfa', 'Alfa', []), team('beta', 'Beta', [OTHER, ME])];

describe('MentorPanel', () => {
  let fixture: ComponentFixture<MentorPanel>;
  let el: HTMLElement;
  let toast: ToastService;
  const mentor = { teams: vi.fn(), assign: vi.fn() };
  const mentorship = { list: vi.fn(), claim: vi.fn(), complete: vi.fn() };
  const auth = { user: signal({ id: 'me', name: 'Mentor Eu' }) };

  beforeEach(async () => {
    mentor.teams.mockReset().mockReturnValue(of(teams));
    mentor.assign.mockReset();
    mentorship.list.mockReset().mockReturnValue(of(tickets));
    mentorship.claim.mockReset();
    mentorship.complete.mockReset();

    TestBed.configureTestingModule({
      imports: [MentorPanel],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MentorService, useValue: mentor },
        { provide: MentorshipService, useValue: mentorship },
        { provide: AuthService, useValue: auth },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');

    fixture = TestBed.createComponent(MentorPanel);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  });

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tabs = () => Array.from(el.querySelectorAll('[role="tab"]')).map(text);
  const queue = () => Array.from(el.querySelectorAll('.ticket__title')).map(text);
  const teamNames = () => Array.from(el.querySelectorAll('.mp-team__head h3')).map(text);
  const ticketCard = (title: string) => Array.from(el.querySelectorAll('.ticket')).find((c) => text(c.querySelector('.ticket__title')) === title)!;
  const teamCard = (name: string) => Array.from(el.querySelectorAll('.mp-team')).find((c) => text(c.querySelector('h3')) === name)!;
  const button = (root: Element, label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => text(b) === label) as HTMLButtonElement | undefined;

  async function openTab(prefix: string) {
    (Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((t) => text(t).startsWith(prefix)))!.click();
    await fixture.whenStable();
  }

  it('carrega times e fila do evento', () => {
    expect(mentor.teams).toHaveBeenCalledWith('h1');
    expect(mentorship.list).toHaveBeenCalledWith('h1');
  });

  describe('fila', () => {
    it('abas contam a fila e os meus atendimentos', () => {
      expect(tabs()).toEqual(['Na fila (2)', 'Meus atendimentos (1)', 'Concluídos por mim']);
    });

    it('"Na fila" mostra pendentes do mais antigo para o mais novo', () => {
      expect(queue()).toEqual(['Dúvida de API', 'Erro no deploy']);
    });

    it('"Meus atendimentos" = em atendimento comigo', async () => {
      await openTab('Meus atendimentos');
      expect(queue()).toEqual(['Banco lento']);
      expect(text(ticketCard('Banco lento'))).toContain('k3@ex.com');
    });

    it('"Concluídos por mim" ignora concluídos de outros mentores', async () => {
      await openTab('Concluídos');
      expect(queue()).toEqual(['Docker']);
    });

    it('assumir move o ticket para "Meus atendimentos"', async () => {
      mentorship.claim.mockReturnValue(of({ ...tickets[1], status: 'IN_PROGRESS', mentor: ME }));
      button(ticketCard('Dúvida de API'), 'Assumir')!.click();
      await fixture.whenStable();

      expect(mentorship.claim).toHaveBeenCalledWith('h1', 'k4');
      expect(tabs()).toEqual(['Na fila (1)', 'Meus atendimentos (2)', 'Concluídos por mim']);
      expect(el.querySelector('[role="tab"].is-active')!.textContent).toContain('Meus atendimentos');
      expect(queue()).toEqual(['Dúvida de API', 'Banco lento']);
      expect(toast.success).toHaveBeenCalledWith('Você assumiu “Dúvida de API”. Combine o atendimento com Autor k4.');
    });

    it('erro ao assumir (outro mentor pegou) recarrega a fila', async () => {
      mentorship.claim.mockReturnValue(throwError(() => ({ statusCode: 409 })));
      const refreshed = tickets.map((t) => (t.id === 'k4' ? { ...t, status: 'IN_PROGRESS' as const, mentor: OTHER } : t));
      mentorship.list.mockReturnValue(of(refreshed));

      button(ticketCard('Dúvida de API'), 'Assumir')!.click();
      await fixture.whenStable();

      expect(mentorship.list).toHaveBeenCalledTimes(2);
      expect(queue()).toEqual(['Erro no deploy']);
      expect(tabs()[0]).toBe('Na fila (1)');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('concluir tira o ticket dos meus atendimentos', async () => {
      mentorship.complete.mockReturnValue(of({ ...tickets[2], status: 'COMPLETED' }));
      await openTab('Meus atendimentos');
      button(ticketCard('Banco lento'), 'Concluir')!.click();
      await fixture.whenStable();

      expect(mentorship.complete).toHaveBeenCalledWith('h1', 'k3');
      expect(queue()).toEqual([]);
      expect(text(el)).toContain('Nenhum atendimento em andamento');
      expect(toast.success).toHaveBeenCalledWith('Atendimento concluído. Obrigado por mentorar!');

      await openTab('Concluídos');
      expect(queue()).toEqual(['Banco lento', 'Docker']);
    });

    it('fila vazia mostra o estado vazio', async () => {
      mentorship.list.mockReturnValue(of([]));
      (fixture.componentInstance as unknown as { loadTickets(): void }).loadTickets();
      await fixture.whenStable();
      expect(text(el)).toContain('Fila vazia');
    });
  });

  describe('times', () => {
    it('ordena os que eu mentoro primeiro, depois por nome', () => {
      expect(teamNames()).toEqual(['Beta', 'Zeta', 'Alfa']);
      expect(text(el)).toContain('Você acompanha 2 de 3 times.');
    });

    it('só times que não mentoro oferecem "Mentorar este time"', () => {
      expect(button(teamCard('Alfa'), 'Mentorar este time')).toBeTruthy();
      expect(button(teamCard('Beta'), 'Mentorar este time')).toBeUndefined();
      expect(text(teamCard('Zeta'))).toContain('Você mentora');
    });

    it('assumir um time o marca como meu e reordena', async () => {
      mentor.assign.mockReturnValue(of(team('alfa', 'Alfa', [ME])));
      button(teamCard('Alfa'), 'Mentorar este time')!.click();
      await fixture.whenStable();

      expect(mentor.assign).toHaveBeenCalledWith('h1', 'alfa');
      expect(teamNames()).toEqual(['Alfa', 'Beta', 'Zeta']);
      expect(text(el)).toContain('Você acompanha 3 de 3 times.');
      expect(button(teamCard('Alfa'), 'Mentorar este time')).toBeUndefined();
      expect(toast.success).toHaveBeenCalledWith('Você agora mentora o time Alfa.');
    });
  });
});

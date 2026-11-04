import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EventOverview } from './event-overview';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { ToastService } from '../../../core/toast/toast.service';
import { MembershipStatus, MentorshipRequest, MentorshipStatus, MyMembership } from '../../../core/models';

function request(id: string, status: MentorshipStatus, extra: Partial<MentorshipRequest> = {}): MentorshipRequest {
  return {
    id,
    hackathonId: 'h1',
    title: `Pedido ${id}`,
    description: 'Detalhes do problema',
    status,
    createdAt: new Date().toISOString(),
    claimedAt: null,
    closedAt: null,
    user: { id: 'me', name: 'Eu', email: 'eu@ex.com' },
    mentor: null,
    team: null,
    ...extra,
  };
}

describe('EventOverview', () => {
  let fixture: ComponentFixture<EventOverview>;
  let el: HTMLElement;
  let toast: ToastService;

  const participantStatus = signal<MembershipStatus | null>('APPROVED');
  const mentorStatus = signal<MembershipStatus | null>(null);
  const organizerStatus = signal<MembershipStatus | null>(null);
  const asMembership = (s: MembershipStatus | null) => (s ? ({ status: s } as MyMembership) : undefined);
  const ctx = {
    activeId: signal<string | null>('h1'),
    participant: computed(() => asMembership(participantStatus())),
    mentor: computed(() => asMembership(mentorStatus())),
    isParticipantApproved: computed(() => participantStatus() === 'APPROVED'),
    isMentorApproved: computed(() => mentorStatus() === 'APPROVED'),
    isOrganizerApproved: computed(() => organizerStatus() === 'APPROVED'),
    detail: signal(null),
    loading: signal(false),
    full: signal(null),
    summary: signal(null),
    teamMaxSize: signal<number | null>(null),
  };
  const mentorship = { mine: vi.fn(), create: vi.fn(), cancel: vi.fn() };

  beforeEach(() => {
    participantStatus.set('APPROVED');
    mentorStatus.set(null);
    organizerStatus.set(null);
    mentorship.mine.mockReset().mockReturnValue(of([]));
    mentorship.create.mockReset();
    mentorship.cancel.mockReset();

    TestBed.configureTestingModule({
      imports: [EventOverview],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: EventContextService, useValue: ctx },
        { provide: MentorshipService, useValue: mentorship },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
  });

  async function render() {
    fixture = TestBed.createComponent(EventOverview);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const help = () => el.querySelector('.ov__help');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label);
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

  describe('card de ajuda do participante', () => {
    it('sem pedido aberto oferece "Pedir mentoria"', async () => {
      await render();
      expect(mentorship.mine).toHaveBeenCalledWith('h1');
      expect(help()).not.toBeNull();
      expect(button('Pedir mentoria')).toBeTruthy();
    });

    it('criar pedido envia título/descrição sem espaços e mostra o pedido aberto', async () => {
      mentorship.create.mockImplementation((_h: string, p: { title: string }) => of(request('r9', 'PENDING', { title: p.title })));
      await render();
      await click('Pedir mentoria');
      expect(el.querySelector('[role="dialog"]')).not.toBeNull();

      await type('#help-title', '  Deploy falhando  ');
      await type('#help-desc', '  O build quebra na etapa de testes.  ');
      await click('Enviar pedido');

      expect(mentorship.create).toHaveBeenCalledWith('h1', {
        title: 'Deploy falhando',
        description: 'O build quebra na etapa de testes.',
      });
      expect(el.querySelector('[role="dialog"]')).toBeNull();
      expect(text(help()!.querySelector('.ov__req'))).toContain('Na fila');
      expect(text(help()!.querySelector('.ov__req strong'))).toBe('Deploy falhando');
      expect(button('Pedir mentoria')).toBeUndefined();
      expect(toast.success).toHaveBeenCalledWith('Pedido enviado! Um mentor vai assumir em breve.');
    });

    it('formulário inválido não cria o pedido', async () => {
      await render();
      await click('Pedir mentoria');
      await type('#help-title', 'ab');
      await type('#help-desc', 'curto');
      await click('Enviar pedido');

      expect(mentorship.create).not.toHaveBeenCalled();
      const dialog = text(el.querySelector('[role="dialog"]'));
      expect(dialog).toContain('Resuma em 3 a 120 caracteres.');
      expect(dialog).toContain('Descreva com 10 a 2000 caracteres.');
    });

    it('pedido aberto (na fila) bloqueia um novo e pode ser cancelado', async () => {
      mentorship.mine.mockReturnValue(of([request('r1', 'PENDING')]));
      mentorship.cancel.mockReturnValue(of(request('r1', 'CANCELLED')));
      await render();

      expect(button('Pedir mentoria')).toBeUndefined();
      expect(text(help()!.querySelector('.ov__req strong'))).toBe('Pedido r1');

      await click('Cancelar pedido');
      expect(mentorship.cancel).toHaveBeenCalledWith('h1', 'r1');
      expect(help()!.querySelector('.ov__req')).toBeNull();
      expect(button('Pedir mentoria')).toBeTruthy();
      expect(text(help())).toContain('Histórico de pedidos (1)');
    });

    it('pedido em atendimento mostra o mentor e não pode ser cancelado', async () => {
      mentorship.mine.mockReturnValue(
        of([request('r2', 'IN_PROGRESS', { mentor: { id: 'm', name: 'Marcos', email: 'm@ex.com' } }), request('r1', 'COMPLETED')]),
      );
      await render();

      expect(text(help()!.querySelector('.ov__req'))).toContain('Com Marcos');
      expect(button('Cancelar pedido')).toBeUndefined();
      expect(button('Pedir mentoria')).toBeUndefined();
      expect(text(help())).toContain('Histórico de pedidos (2)');
    });

    it('pedidos encerrados não bloqueiam um novo', async () => {
      mentorship.mine.mockReturnValue(of([request('r1', 'COMPLETED'), request('r0', 'CANCELLED')]));
      await render();
      expect(button('Pedir mentoria')).toBeTruthy();
    });

    it('quem não é participante aprovado não vê o card nem consulta pedidos', async () => {
      participantStatus.set('PENDING');
      await render();
      expect(help()).toBeNull();
      expect(mentorship.mine).not.toHaveBeenCalled();
      expect(text(el)).toContain('Participação pendente');
    });
  });

  describe('atalhos por papel', () => {
    const actions = () => Array.from(el.querySelectorAll('.ov__action strong')).map(text);

    it('participante aprovado vê time, convites e desafios', async () => {
      await render();
      expect(actions()).toEqual(['Meu time', 'Convites', 'Desafios']);
      expect(el.querySelector('.ov__action')!.getAttribute('href')).toBe('/app/eventos/h1/time');
    });

    it('organizador aprovado vê os atalhos de gestão', async () => {
      participantStatus.set(null);
      organizerStatus.set('APPROVED');
      await render();
      expect(actions()).toEqual(['Painel do evento', 'Inscrições', 'Configurações do evento', 'Gerenciar desafios']);
    });

    it('mentor pendente vê o aviso de candidatura em análise', async () => {
      participantStatus.set(null);
      mentorStatus.set('PENDING');
      await render();
      expect(actions()).toEqual([]);
      expect(text(el)).toContain('Candidatura de mentor pendente');
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrganizerDashboard } from './organizer-dashboard';
import { HackathonService } from '../../../core/services/hackathon.service';
import { TeamService } from '../../../core/services/team.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  Challenge,
  Hackathon,
  Membership,
  MembershipRole,
  MembershipStatus,
  MentorshipRequest,
  MentorshipStatus,
  Team,
} from '../../../core/models';

function member(id: string, role: MembershipRole, status: MembershipStatus, createdAt: string, name: string): Membership {
  return { id, userId: `u-${id}`, hackathonId: 'h1', role, status, createdAt, user: { id: `u-${id}`, name, email: `${id}@ex.com` } };
}

const memberships: Membership[] = [
  member('org', 'ORGANIZER', 'APPROVED', '2026-10-01T10:00:00Z', 'Olga Org'),
  member('p1', 'PARTICIPANT', 'APPROVED', '2026-10-10T10:00:00Z', 'Paula'),
  member('m1', 'MENTOR', 'APPROVED', '2026-10-11T10:00:00Z', 'Marcos'),
  member('p2', 'PARTICIPANT', 'APPROVED', '2026-10-12T10:00:00Z', 'Pedro'),
  member('r1', 'PARTICIPANT', 'REJECTED', '2026-10-12T11:00:00Z', 'Rui'),
  member('p4', 'PARTICIPANT', 'APPROVED', '2026-10-12T15:00:00Z', 'Priscila'),
  member('p5', 'PARTICIPANT', 'APPROVED', '2026-10-13T08:00:00Z', 'Paulo'),
  // Pendentes fora de ordem: a fila deve mostrar o mais antigo primeiro.
  member('p3', 'PARTICIPANT', 'PENDING', '2026-10-15T10:00:00Z', 'Patrícia'),
  member('m2', 'MENTOR', 'PENDING', '2026-10-14T09:00:00Z', 'Marta'),
];

const challenges: Challenge[] = [
  { id: 'c1', title: 'Mobilidade', description: '', category: 'Cidade' },
  { id: 'c2', title: 'Saúde', description: '', category: 'Saúde' },
  { id: 'c3', title: 'Educação', description: '', category: 'Educação' },
];

const pub = (id: string, name: string) => ({ id, name, email: `${id}@ex.com` });

const teams: Team[] = [
  {
    id: 't1',
    hackathonId: 'h1',
    name: 'Alfa',
    description: null,
    leaderId: 'u-p1',
    createdAt: '2026-10-13T00:00:00Z',
    leader: pub('u-p1', 'Paula'),
    members: [
      { ...pub('u-p1', 'Paula'), joinedAt: '' },
      { ...pub('u-p2', 'Pedro'), joinedAt: '' },
    ],
    challenges: [challenges[0]],
    mentors: [pub('u-m1', 'Marcos')],
  },
  {
    id: 't2',
    hackathonId: 'h1',
    name: 'Beta',
    description: null,
    leaderId: 'u-p4',
    createdAt: '2026-10-13T00:00:00Z',
    leader: pub('u-p4', 'Priscila'),
    members: [{ ...pub('u-p4', 'Priscila'), joinedAt: '' }],
    challenges: [challenges[0], challenges[1]],
    mentors: [],
  },
];

function ticket(id: string, status: MentorshipStatus): MentorshipRequest {
  return {
    id,
    hackathonId: 'h1',
    title: `Ticket ${id}`,
    description: 'Preciso de ajuda',
    status,
    createdAt: '2026-10-18T10:00:00Z',
    claimedAt: null,
    closedAt: null,
    user: pub('u-p1', 'Paula'),
    mentor: null,
    team: { id: 't1', name: 'Alfa' },
  };
}

const tickets = [ticket('k1', 'PENDING'), ticket('k2', 'PENDING'), ticket('k3', 'IN_PROGRESS'), ticket('k4', 'COMPLETED')];

const full: Hackathon = {
  id: 'h1',
  organizationId: 'o1',
  name: 'Hack Cidades',
  slug: 'hack-cidades',
  description: 'Descrição',
  visibility: 'PUBLIC',
  status: 'DRAFT',
  registrationMode: 'APPROVAL',
  coverImage: null,
  startsAt: '2026-11-01T12:00:00Z',
  endsAt: '2026-11-03T12:00:00Z',
  teamMaxSize: 4,
  maxParticipants: 10,
  maxMentors: null,
  location: null,
  price: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('OrganizerDashboard', () => {
  let fixture: ComponentFixture<OrganizerDashboard>;
  let el: HTMLElement;
  let toast: ToastService;

  const hackathons = {
    memberships: vi.fn(),
    challenges: vi.fn(),
    approveMembership: vi.fn(),
    rejectMembership: vi.fn(),
  };
  const teamService = { list: vi.fn() };
  const mentorship = { list: vi.fn() };
  const ctx = {
    full: signal<Hackathon | null>(full),
    teamMaxSize: () => ctx.full()?.teamMaxSize ?? null,
    refreshPendingCount: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));

    hackathons.memberships.mockReset().mockReturnValue(of(memberships));
    hackathons.challenges.mockReset().mockReturnValue(of(challenges));
    hackathons.approveMembership.mockReset();
    hackathons.rejectMembership.mockReset();
    teamService.list.mockReset().mockReturnValue(of(teams));
    mentorship.list.mockReset().mockReturnValue(of(tickets));
    ctx.refreshPendingCount.mockReset();
    ctx.full.set(full);

    TestBed.configureTestingModule({
      imports: [OrganizerDashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: HackathonService, useValue: hackathons },
        { provide: TeamService, useValue: teamService },
        { provide: MentorshipService, useValue: mentorship },
        { provide: EventContextService, useValue: ctx },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'info');
  });

  afterEach(() => vi.useRealTimers());

  async function render() {
    fixture = TestBed.createComponent(OrganizerDashboard);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (node: Element | null) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tile = (label: string) => {
    const t = Array.from(el.querySelectorAll('app-stat-tile')).find((x) => text(x.querySelector('.tile__label')) === label)!;
    return {
      value: text(t.querySelector('.tile__value')),
      subs: Array.from(t.querySelectorAll('.tile__sub')).map(text),
      meter: t.querySelector('.meter'),
    };
  };
  const panel = (title: string) =>
    Array.from(el.querySelectorAll('app-card')).find((c) => text(c.querySelector('h3')) === title)!;
  const queueNames = () => Array.from(el.querySelectorAll('.queue__item strong')).map(text);
  const cmp = () => fixture.componentInstance as any;

  it('carrega as quatro fontes do evento', async () => {
    await render();
    expect(hackathons.memberships).toHaveBeenCalledWith('h1');
    expect(hackathons.challenges).toHaveBeenCalledWith('h1');
    expect(teamService.list).toHaveBeenCalledWith('h1');
    expect(mentorship.list).toHaveBeenCalledWith('h1');
  });

  describe('KPIs', () => {
    beforeEach(render);

    it('participantes: aprovados contra o limite de vagas + pendentes', () => {
      const t = tile('Participantes');
      expect(t.value).toBe('4');
      expect(t.meter?.getAttribute('data-level')).toBe('ok');
      expect(t.subs).toEqual(['40% de 10 vagas', '1 aguardando aprovação']);
    });

    it('mentores: sem limite não há medidor; mostra candidaturas pendentes', () => {
      const t = tile('Mentores');
      expect(t.value).toBe('1');
      expect(t.meter).toBeNull();
      expect(t.subs).toEqual(['1 candidatura(s) pendente(s)']);
    });

    it('times: contagem, média por time e participantes sem time', () => {
      const t = tile('Times formados');
      expect(t.value).toBe('2');
      expect(t.subs).toEqual(['1,5 por time em média · 1 sem time']);
    });

    it('mentoria: abertos = na fila + em atendimento', () => {
      const t = tile('Pedidos de mentoria abertos');
      expect(t.value).toBe('3');
      expect(t.subs).toEqual(['4 no total']);
    });
  });

  describe('tendência de inscrições', () => {
    beforeEach(render);

    it('acumula por dia do primeiro registro até hoje, sem contar organizadores', () => {
      const points = cmp().trend() as { date: string; value: number; delta: number }[];
      expect(points.length).toBe(10);
      expect(points[0]).toEqual({ date: '2026-10-10', value: 1, delta: 1 });
      expect(points.at(-1)).toEqual({ date: '2026-10-19', value: 8, delta: 0 });
      for (let i = 1; i < points.length; i++) {
        expect(points[i].value).toBe(points[i - 1].value + points[i].delta);
      }
    });

    it('"Ver dados" mostra só os dias com novas inscrições', async () => {
      const btn = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Ver dados')!;
      btn.click();
      await fixture.whenStable();
      const rows = Array.from(el.querySelectorAll('table tbody tr'))
        .map((tr) => Array.from(tr.querySelectorAll('td')).map(text))
        .filter((r) => r[0].includes('/2026'));
      expect(rows).toEqual([
        ['10/10/2026', '1', '1'],
        ['11/10/2026', '1', '2'],
        ['12/10/2026', '3', '5'],
        ['13/10/2026', '1', '6'],
        ['14/10/2026', '1', '7'],
        ['15/10/2026', '1', '8'],
      ]);
    });

    it('um único dia de inscrições ganha um ponto zero anterior', async () => {
      hackathons.memberships.mockReturnValue(of([member('p1', 'PARTICIPANT', 'PENDING', '2026-10-19T08:00:00Z', 'Paula')]));
      cmp().load('h1');
      await fixture.whenStable();
      expect(cmp().trend()).toEqual([
        { date: '2026-10-18', value: 0, delta: 0 },
        { date: '2026-10-19', value: 1, delta: 1 },
      ]);
    });
  });

  describe('fila de aprovação', () => {
    it('lista pendentes do mais antigo para o mais novo', async () => {
      await render();
      expect(queueNames()).toEqual(['Marta', 'Patrícia']);
      expect(text(panel('Aguardando aprovação').querySelector('.panel__head p'))).toBe('2 pedidos');
    });

    it('aprovar atualiza a lista, o KPI e o contador do contexto', async () => {
      hackathons.approveMembership.mockReturnValue(of({ ...memberships[8], status: 'APPROVED', user: undefined }));
      await render();
      el.querySelector<HTMLButtonElement>('[aria-label="Aprovar Marta"]')!.click();
      await fixture.whenStable();

      expect(hackathons.approveMembership).toHaveBeenCalledWith('h1', 'm2');
      expect(queueNames()).toEqual(['Patrícia']);
      expect(tile('Mentores').value).toBe('2');
      expect(ctx.refreshPendingCount).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Marta aprovado(a) como mentor.');
    });

    it('recusar remove da fila e avisa', async () => {
      hackathons.rejectMembership.mockReturnValue(of({ ...memberships[7], status: 'REJECTED' }));
      await render();
      el.querySelector<HTMLButtonElement>('[aria-label="Recusar Patrícia"]')!.click();
      await fixture.whenStable();

      expect(hackathons.rejectMembership).toHaveBeenCalledWith('h1', 'p3');
      expect(queueNames()).toEqual(['Marta']);
      expect(tile('Participantes').subs).toEqual(['40% de 10 vagas']);
      expect(ctx.refreshPendingCount).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith('Patrícia foi recusado(a).');
    });

    it('sem pendências mostra "Tudo em dia"', async () => {
      hackathons.memberships.mockReturnValue(of(memberships.filter((m) => m.status !== 'PENDING')));
      await render();
      expect(text(panel('Aguardando aprovação'))).toContain('Tudo em dia — nenhuma inscrição pendente.');
    });
  });

  describe('desafios e mentoria', () => {
    beforeEach(render);

    it('conta quantos times escolheram cada desafio', () => {
      expect(cmp().challengeBars()).toEqual([
        { label: 'Mobilidade', value: 2 },
        { label: 'Saúde', value: 1 },
        { label: 'Educação', value: 0 },
      ]);
      const labels = Array.from(panel('Desafios mais escolhidos').querySelectorAll('.bar__label')).map(text);
      expect(labels).toEqual(['Mobilidade', 'Saúde', 'Educação']);
      expect(text(panel('Desafios mais escolhidos'))).not.toContain('Nenhum time escolheu desafio ainda.');
    });

    it('segmenta os tickets por status', () => {
      expect(cmp().ticketSegments().map((s: { key: string; value: number }) => [s.key, s.value])).toEqual([
        ['PENDING', 2],
        ['IN_PROGRESS', 1],
        ['COMPLETED', 1],
        ['CANCELLED', 0],
      ]);
      expect(panel('Mentoria').querySelectorAll('.seg__part').length).toBe(3);
    });

    it('tabela de times ordenada por tamanho, com ocupação do limite', () => {
      const rows = Array.from(panel('Times').querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).map(text),
      );
      expect(rows.map((r) => r[0])).toEqual(['Alfa', 'Beta']);
      expect(rows[0][2]).toBe('2/4');
      expect(rows[1][3]).toBe('Mobilidade +1');
      expect(text(panel('Times').querySelector('.panel__head p'))).toBe('3 de 4 participantes em times');
    });
  });

  describe('prontidão do evento', () => {
    it('checklist reflete ctx.full() e os desafios', async () => {
      await render();
      expect(cmp().checklist().map((c: { label: string; done: boolean }) => [c.label, c.done])).toEqual([
        ['Descrição do evento', true],
        ['Datas de início e fim', true],
        ['Imagem de capa', false],
        ['Ao menos um desafio', true],
        ['Evento publicado', false],
      ]);
      expect(text(el.querySelector('.ready'))).toContain('3 de 5 etapas concluídas');
      const pendingLinks = Array.from(el.querySelectorAll('.ready__list a')).map((a) => a.getAttribute('href'));
      expect(pendingLinks).toEqual(['/app/eventos/h1/gerenciar/configuracoes', '/app/eventos/h1/gerenciar/configuracoes']);
    });

    it('com tudo pronto o card some e aparece o link da página pública', async () => {
      ctx.full.set({ ...full, coverImage: 'http://cdn/capa.png', status: 'PUBLISHED' });
      await render();
      expect(el.querySelector('.ready')).toBeNull();
      expect(text(el.querySelector('.dash__actions'))).toContain('Página pública');
      expect(el.querySelector('.dash__actions a')!.getAttribute('href')).toBe('/eventos/hack-cidades');
    });

    it('evento privado não oferece página pública', async () => {
      ctx.full.set({ ...full, status: 'PUBLISHED', visibility: 'PRIVATE' });
      await render();
      expect(text(el.querySelector('.dash__actions'))).not.toContain('Página pública');
    });
  });

  describe('falhas isoladas', () => {
    it('erro nos tickets mostra "indisponível" sem derrubar o restante', async () => {
      mentorship.list.mockReturnValue(throwError(() => ({ statusCode: 500 })));
      await render();

      expect(tile('Pedidos de mentoria abertos').subs).toEqual(['Indisponível']);
      expect(text(panel('Mentoria'))).toContain('Não foi possível carregar os pedidos de mentoria.');
      expect(queueNames()).toEqual(['Marta', 'Patrícia']);
      expect(tile('Participantes').value).toBe('4');
      expect(panel('Desafios mais escolhidos').querySelectorAll('.bar').length).toBe(3);
    });

    it('erro nas inscrições, times e desafios mostra a mensagem de cada card', async () => {
      hackathons.memberships.mockReturnValue(throwError(() => ({ statusCode: 500 })));
      teamService.list.mockReturnValue(throwError(() => ({ statusCode: 500 })));
      hackathons.challenges.mockReturnValue(throwError(() => ({ statusCode: 500 })));
      await render();

      expect(text(panel('Inscrições recebidas'))).toContain('Não foi possível carregar as inscrições.');
      expect(text(panel('Times'))).toContain('Não foi possível carregar os times.');
      expect(text(panel('Desafios mais escolhidos'))).toContain('Não foi possível carregar os desafios.');
      expect(tile('Pedidos de mentoria abertos').value).toBe('3');
    });
  });
});

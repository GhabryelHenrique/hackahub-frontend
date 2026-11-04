import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Registrations } from './registrations';
import { HackathonService } from '../../../core/services/hackathon.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Membership, MembershipRole, MembershipStatus } from '../../../core/models';

function member(
  id: string,
  role: MembershipRole,
  status: MembershipStatus,
  createdAt: string,
  name: string,
  extra: Partial<Membership> = {},
): Membership {
  const email = `${name.split(' ')[0].toLowerCase()}@ex.com`;
  return { id, userId: `u-${id}`, hackathonId: 'h1', role, status, createdAt, user: { id: `u-${id}`, name, email }, ...extra };
}

const memberships: Membership[] = [
  member('org', 'ORGANIZER', 'APPROVED', '2026-10-01T10:00:00Z', 'Olga Org'),
  member('p1', 'PARTICIPANT', 'APPROVED', '2026-10-10T10:00:00Z', 'Paula Lima'),
  member('p2', 'PARTICIPANT', 'APPROVED', '2026-10-12T10:00:00Z', 'Pedro Alves'),
  member('p3', 'PARTICIPANT', 'PENDING', '2026-10-15T10:00:00Z', 'Patrícia Gomes'),
  member('m1', 'MENTOR', 'APPROVED', '2026-10-11T10:00:00Z', 'Marcos Dias', {
    mentorProfile: { expertise: ['Backend', 'Cloud'], seniority: 'Sênior', motivation: 'Mentoro times há 5 anos.' },
  }),
  member('m2', 'MENTOR', 'PENDING', '2026-10-14T09:00:00Z', 'Marta Reis', {
    mentorProfile: { expertise: [], seniority: null, motivation: null },
  }),
  member('r1', 'PARTICIPANT', 'REJECTED', '2026-10-12T11:00:00Z', 'Rui Costa'),
];

describe('Registrations', () => {
  let fixture: ComponentFixture<Registrations>;
  let el: HTMLElement;
  let toast: ToastService;
  const hackathons = { memberships: vi.fn(), approveMembership: vi.fn(), rejectMembership: vi.fn() };
  const ctx = { refreshPendingCount: vi.fn() };

  beforeEach(async () => {
    hackathons.memberships.mockReset().mockReturnValue(of(memberships));
    hackathons.approveMembership.mockReset();
    hackathons.rejectMembership.mockReset();
    ctx.refreshPendingCount.mockReset();

    TestBed.configureTestingModule({
      imports: [Registrations],
      providers: [
        provideZonelessChangeDetection(),
        { provide: HackathonService, useValue: hackathons },
        { provide: EventContextService, useValue: ctx },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'info');
  });

  async function render() {
    fixture = TestBed.createComponent(Registrations);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tabs = () => Array.from(el.querySelectorAll('[role="tab"]')).map(text);
  const names = () => Array.from(el.querySelectorAll('.reg__who strong')).map(text);
  const card = (name: string) => Array.from(el.querySelectorAll('.reg')).find((c) => text(c.querySelector('.reg__who strong')) === name)!;
  const button = (root: Element, label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => text(b) === label) as HTMLButtonElement;

  async function openTab(prefix: string) {
    (Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((t) => text(t).startsWith(prefix)))!.click();
    await fixture.whenStable();
  }

  async function search(term: string) {
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = term;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('carrega todas as participações do evento', async () => {
    await render();
    expect(hackathons.memberships).toHaveBeenCalledWith('h1');
  });

  it('abas mostram as contagens por filtro, sem organizadores', async () => {
    await render();
    expect(tabs()).toEqual(['Pendentes (2)', 'Participantes (2)', 'Mentores (1)', 'Recusados (1)']);
  });

  it('pendentes vêm em ordem de chegada (mais antigo primeiro)', async () => {
    await render();
    expect(names()).toEqual(['Marta Reis', 'Patrícia Gomes']);
  });

  it('demais abas filtram por papel aprovado/recusado, mais recentes primeiro', async () => {
    await render();
    await openTab('Participantes');
    expect(names()).toEqual(['Pedro Alves', 'Paula Lima']);
    await openTab('Mentores');
    expect(names()).toEqual(['Marcos Dias']);
    await openTab('Recusados');
    expect(names()).toEqual(['Rui Costa']);
  });

  it('só pendentes têm botões de decisão', async () => {
    await render();
    expect(button(card('Marta Reis'), 'Aprovar')).toBeTruthy();
    await openTab('Participantes');
    expect(button(card('Paula Lima'), 'Aprovar')).toBeUndefined();
    expect(button(card('Paula Lima'), 'Recusar')).toBeUndefined();
  });

  describe('busca', () => {
    beforeEach(async () => {
      await render();
      await openTab('Participantes');
    });

    it('filtra por nome sem diferenciar maiúsculas', async () => {
      await search('  PAULA ');
      expect(names()).toEqual(['Paula Lima']);
    });

    it('filtra por e-mail', async () => {
      await search('pedro@');
      expect(names()).toEqual(['Pedro Alves']);
    });

    it('sem resultados mostra "Ninguém encontrado"', async () => {
      await search('zzz');
      expect(names()).toEqual([]);
      expect(text(el)).toContain('Ninguém encontrado');
    });
  });

  it('aprovar atualiza status, contagens e o contador do contexto', async () => {
    hackathons.approveMembership.mockReturnValue(of({ ...memberships[5], status: 'APPROVED', user: undefined }));
    await render();
    button(card('Marta Reis'), 'Aprovar').click();
    await fixture.whenStable();

    expect(hackathons.approveMembership).toHaveBeenCalledWith('h1', 'm2');
    expect(names()).toEqual(['Patrícia Gomes']);
    expect(tabs()).toEqual(['Pendentes (1)', 'Participantes (2)', 'Mentores (2)', 'Recusados (1)']);
    expect(ctx.refreshPendingCount).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Marta Reis aprovado(a) como mentor.');

    await openTab('Mentores');
    expect(names()).toEqual(['Marta Reis', 'Marcos Dias']);
  });

  it('recusar move para a aba de recusados', async () => {
    hackathons.rejectMembership.mockReturnValue(of({ ...memberships[3], status: 'REJECTED' }));
    await render();
    button(card('Patrícia Gomes'), 'Recusar').click();
    await fixture.whenStable();

    expect(hackathons.rejectMembership).toHaveBeenCalledWith('h1', 'p3');
    expect(tabs()).toEqual(['Pendentes (1)', 'Participantes (2)', 'Mentores (1)', 'Recusados (2)']);
    expect(toast.info).toHaveBeenCalledWith('Patrícia Gomes foi recusado(a).');
    expect(ctx.refreshPendingCount).toHaveBeenCalled();
  });

  it('erro na decisão mantém a inscrição pendente', async () => {
    hackathons.approveMembership.mockReturnValue(throwError(() => ({ statusCode: 409, message: 'Lotado' })));
    await render();
    button(card('Patrícia Gomes'), 'Aprovar').click();
    await fixture.whenStable();

    expect(names()).toEqual(['Marta Reis', 'Patrícia Gomes']);
    expect(ctx.refreshPendingCount).not.toHaveBeenCalled();
    expect(button(card('Patrícia Gomes'), 'Recusar').disabled).toBe(false);
  });

  it('"Ver perfil" expande expertise, senioridade e motivação do mentor', async () => {
    await render();
    await openTab('Mentores');
    button(card('Marcos Dias'), 'Ver perfil').click();
    await fixture.whenStable();

    const profile = text(card('Marcos Dias').querySelector('.reg__profile'));
    expect(profile).toContain('Backend');
    expect(profile).toContain('Cloud');
    expect(profile).toContain('Sênior');
    expect(profile).toContain('Mentoro times há 5 anos.');
    expect(button(card('Marcos Dias'), 'Ocultar perfil')).toBeTruthy();
  });

  it('falha no carregamento oferece tentar de novo', async () => {
    hackathons.memberships.mockReturnValue(throwError(() => ({ statusCode: 500 })));
    await render();
    expect(text(el)).toContain('Não foi possível carregar as inscrições');

    hackathons.memberships.mockReturnValue(of(memberships));
    button(el, 'Tentar de novo').click();
    await fixture.whenStable();
    expect(hackathons.memberships).toHaveBeenCalledTimes(2);
    expect(names()).toEqual(['Marta Reis', 'Patrícia Gomes']);
  });

  it('sem pendências mostra o estado vazio da aba', async () => {
    hackathons.memberships.mockReturnValue(of(memberships.filter((m) => m.status !== 'PENDING')));
    await render();
    expect(text(el)).toContain('Nenhuma inscrição pendente');
  });
});

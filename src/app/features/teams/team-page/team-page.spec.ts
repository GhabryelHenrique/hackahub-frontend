import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TeamPage } from './team-page';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { ToastService } from '../../../core/toast/toast.service';
import { JoinRequest, PublicUser, Team } from '../../../core/models';

const ME: PublicUser = { id: 'me', name: 'Eu Mesmo', email: 'eu@ex.com' };
const ANA: PublicUser = { id: 'ana', name: 'Ana', email: 'ana@ex.com' };

function team(id: string, name: string, leader: PublicUser, members: PublicUser[]): Team {
  return {
    id,
    hackathonId: 'h1',
    name,
    description: null,
    leaderId: leader.id,
    createdAt: '2026-10-10T00:00:00Z',
    leader,
    members: members.map((m) => ({ ...m, joinedAt: '' })),
    challenges: [],
    mentors: [],
  };
}

function joinRequest(id: string, name: string): JoinRequest {
  return { id, status: 'PENDING', createdAt: '', team: { id: 't1', name: 'Alfa' }, user: { id: `u-${id}`, name, email: '' } };
}

describe('TeamPage', () => {
  let fixture: ComponentFixture<TeamPage>;
  let el: HTMLElement;
  let toast: ToastService;

  const teamService = {
    list: vi.fn(),
    teamJoinRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    create: vi.fn(),
    requestJoin: vi.fn(),
    removeMember: vi.fn(),
  };
  const auth = { user: signal({ id: 'me', name: 'Eu Mesmo' }) };
  const ctx = { teamMaxSize: signal<number | null>(4) };

  beforeEach(() => {
    for (const fn of Object.values(teamService)) fn.mockReset();
    teamService.teamJoinRequests.mockReturnValue(of([joinRequest('r1', 'Carla'), joinRequest('r2', 'Davi')]));

    TestBed.configureTestingModule({
      imports: [TeamPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TeamService, useValue: teamService },
        { provide: AuthService, useValue: auth },
        { provide: EventContextService, useValue: ctx },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
  });

  async function render() {
    fixture = TestBed.createComponent(TeamPage);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const requests = () => Array.from(el.querySelectorAll('.request__name')).map(text);
  const request = (name: string) => Array.from(el.querySelectorAll('.request')).find((r) => text(r).includes(name))!;
  const button = (root: Element, label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label);

  describe('líder do time', () => {
    beforeEach(async () => {
      teamService.list.mockReturnValue(of([team('t1', 'Alfa', ME, [ME, ANA]), team('t2', 'Beta', ANA, [ANA])]));
      await render();
    });

    it('vê o próprio time e as solicitações de entrada pendentes', () => {
      expect(text(el.querySelector('.team__name'))).toBe('Alfa');
      expect(text(el.querySelector('.team__count'))).toBe('2 / 4');
      expect(teamService.teamJoinRequests).toHaveBeenCalledWith('h1', 't1');
      expect(text(el.querySelector('.team__requests'))).toContain('Solicitações de entrada');
      expect(requests()).toEqual(['Carla', 'Davi']);
    });

    it('aprovar a solicitação avisa e recarrega o time', async () => {
      teamService.approveRequest.mockReturnValue(of({ ...joinRequest('r1', 'Carla'), status: 'APPROVED' }));
      teamService.teamJoinRequests.mockReturnValue(of([joinRequest('r2', 'Davi')]));
      button(request('Carla'), 'Aprovar')!.click();
      await fixture.whenStable();

      expect(teamService.approveRequest).toHaveBeenCalledWith('h1', 'r1');
      expect(toast.success).toHaveBeenCalledWith('Carla entrou no time.');
      expect(teamService.list).toHaveBeenCalledTimes(2);
      expect(requests()).toEqual(['Davi']);
    });

    it('recusar remove a solicitação da lista', async () => {
      teamService.rejectRequest.mockReturnValue(of({ ...joinRequest('r2', 'Davi'), status: 'REJECTED' }));
      button(request('Davi'), 'Recusar')!.click();
      await fixture.whenStable();

      expect(teamService.rejectRequest).toHaveBeenCalledWith('h1', 'r2');
      expect(teamService.list).toHaveBeenCalledTimes(1);
      expect(requests()).toEqual(['Carla']);
    });

    it('sem solicitações mostra o aviso', async () => {
      teamService.rejectRequest.mockReturnValue(of({}));
      button(request('Davi'), 'Recusar')!.click();
      await fixture.whenStable();
      button(request('Carla'), 'Recusar')!.click();
      await fixture.whenStable();
      expect(text(el.querySelector('.team__requests'))).toContain('Nenhuma solicitação pendente.');
    });

    it('pode remover integrantes (menos o líder)', () => {
      expect(el.querySelectorAll('.member__remove').length).toBe(1);
    });
  });

  it('integrante comum não vê solicitações nem consulta a API delas', async () => {
    teamService.list.mockReturnValue(of([team('t1', 'Alfa', ANA, [ANA, ME])]));
    await render();

    expect(text(el.querySelector('.team__name'))).toBe('Alfa');
    expect(teamService.teamJoinRequests).not.toHaveBeenCalled();
    expect(el.querySelector('.team__requests')).toBeNull();
    expect(el.querySelectorAll('.member__remove').length).toBe(0);
  });

  describe('sem time', () => {
    beforeEach(async () => {
      teamService.list.mockReturnValue(of([team('t2', 'Beta', ANA, [ANA])]));
      await render();
    });

    it('oferece criar time e lista os demais para solicitar entrada', () => {
      expect(text(el)).toContain('Criar um time');
      expect(text(el.querySelector('.browse__item strong'))).toBe('Beta');
      expect(teamService.teamJoinRequests).not.toHaveBeenCalled();
    });

    it('solicitar entrada marca o time como "Solicitado"', async () => {
      teamService.requestJoin.mockReturnValue(of({}));
      button(el.querySelector('.browse__item')!, 'Solicitar entrada')!.click();
      await fixture.whenStable();

      expect(teamService.requestJoin).toHaveBeenCalledWith('h1', 't2');
      expect(text(el.querySelector('.browse__item'))).toContain('Solicitado');
      expect(button(el.querySelector('.browse__item')!, 'Solicitar entrada')).toBeUndefined();
    });

    it('criar time envia nome/descrição e recarrega', async () => {
      teamService.create.mockReturnValue(of({}));
      const name = el.querySelector<HTMLInputElement>('[formcontrolname="name"]')!;
      name.value = 'Os Inovadores';
      name.dispatchEvent(new Event('input'));
      el.querySelector('form.create__form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();

      expect(teamService.create).toHaveBeenCalledWith('h1', { name: 'Os Inovadores', description: '' });
      expect(toast.success).toHaveBeenCalledWith('Time criado! Agora convide participantes.');
      expect(teamService.list).toHaveBeenCalledTimes(2);
    });

    it('nome curto não cria o time', async () => {
      const name = el.querySelector<HTMLInputElement>('[formcontrolname="name"]')!;
      name.value = 'A';
      name.dispatchEvent(new Event('input'));
      el.querySelector('form.create__form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();

      expect(teamService.create).not.toHaveBeenCalled();
      expect(text(el)).toContain('Informe um nome (mín. 2 caracteres).');
    });
  });
});

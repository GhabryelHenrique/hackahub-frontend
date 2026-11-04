import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { InvitesPage } from './invites-page';
import { TeamService } from '../../../core/services/team.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Invite } from '../../../core/models';

function invite(id: string, team: string, from: string): Invite {
  return {
    id,
    status: 'PENDING',
    createdAt: '2026-10-18T10:00:00Z',
    team: { id: `t-${id}`, name: team },
    fromUser: { id: `u-${id}`, name: from, email: `${id}@ex.com` },
    toUser: { id: 'me', name: 'Eu', email: 'eu@ex.com' },
  };
}

const invites = [invite('i1', 'Alfa', 'Paula'), invite('i2', 'Beta', 'Pedro')];

describe('InvitesPage', () => {
  let fixture: ComponentFixture<InvitesPage>;
  let el: HTMLElement;
  let toast: ToastService;
  const teamService = { receivedInvites: vi.fn(), acceptInvite: vi.fn(), declineInvite: vi.fn() };

  beforeEach(() => {
    teamService.receivedInvites.mockReset().mockReturnValue(of(invites));
    teamService.acceptInvite.mockReset();
    teamService.declineInvite.mockReset();

    TestBed.configureTestingModule({
      imports: [InvitesPage],
      providers: [provideZonelessChangeDetection(), { provide: TeamService, useValue: teamService }],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
  });

  async function render() {
    fixture = TestBed.createComponent(InvitesPage);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const items = () => Array.from(el.querySelectorAll('.invite__text')).map(text);
  const card = (team: string) => Array.from(el.querySelectorAll('.invite')).find((c) => text(c).includes(team))!;
  const button = (root: Element, label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label)!;

  it('lista os convites pendentes do evento', async () => {
    await render();
    expect(teamService.receivedInvites).toHaveBeenCalledWith('h1');
    expect(items()).toEqual(['Paula convidou você para o time Alfa', 'Pedro convidou você para o time Beta']);
  });

  it('aceitar entra no time e recarrega a lista', async () => {
    teamService.acceptInvite.mockReturnValue(of({ ...invites[0], status: 'ACCEPTED' }));
    await render();
    teamService.receivedInvites.mockReturnValue(of([invites[1]]));

    button(card('Alfa'), 'Aceitar').click();
    await fixture.whenStable();

    expect(teamService.acceptInvite).toHaveBeenCalledWith('h1', 'i1');
    expect(toast.success).toHaveBeenCalledWith('Você entrou no time Alfa!');
    expect(teamService.receivedInvites).toHaveBeenCalledTimes(2);
    expect(items()).toEqual(['Pedro convidou você para o time Beta']);
  });

  it('recusar remove o convite sem recarregar', async () => {
    teamService.declineInvite.mockReturnValue(of({ ...invites[1], status: 'DECLINED' }));
    await render();
    button(card('Beta'), 'Recusar').click();
    await fixture.whenStable();

    expect(teamService.declineInvite).toHaveBeenCalledWith('h1', 'i2');
    expect(teamService.receivedInvites).toHaveBeenCalledTimes(1);
    expect(items()).toEqual(['Paula convidou você para o time Alfa']);
  });

  it('erro ao aceitar mantém o convite e reabilita os botões', async () => {
    teamService.acceptInvite.mockReturnValue(throwError(() => ({ statusCode: 409 })));
    await render();
    button(card('Alfa'), 'Aceitar').click();
    await fixture.whenStable();

    expect(items().length).toBe(2);
    expect(button(card('Alfa'), 'Recusar').disabled).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('sem convites mostra o estado vazio', async () => {
    teamService.receivedInvites.mockReturnValue(of([]));
    await render();
    expect(text(el)).toContain('Nenhum convite pendente');
  });
});

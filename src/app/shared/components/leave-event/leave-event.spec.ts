import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LeaveEvent } from './leave-event';
import { HackathonService } from '../../../core/services/hackathon.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { LeaveEventResult, MembershipRole, MembershipStatus } from '../../../core/models';

function result(over: Partial<LeaveEventResult> = {}): LeaveEventResult {
  return {
    message: 'Inscrição cancelada',
    roles: ['PARTICIPANT'],
    teamId: null,
    teamDeleted: false,
    releasedMentorshipIds: [],
    ...over,
  };
}

describe('LeaveEvent', () => {
  let fixture: ComponentFixture<LeaveEvent>;
  let el: HTMLElement;
  const hackathons = { leave: vi.fn() };
  const auth = { reload: vi.fn() };
  const toast = { success: vi.fn() };

  async function render(role: MembershipRole, status: MembershipStatus) {
    fixture = TestBed.createComponent(LeaveEvent);
    fixture.componentRef.setInput('hackathonId', 'e1');
    fixture.componentRef.setInput('role', role);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(el.querySelectorAll('button'));
  }

  function click(text: string) {
    const btn = buttons().find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`botão "${text}" não encontrado`);
    btn.click();
  }

  beforeEach(() => {
    hackathons.leave.mockReset().mockReturnValue(of(result()));
    auth.reload.mockReset().mockReturnValue(of({}));
    toast.success.mockReset();
    TestBed.configureTestingModule({
      imports: [LeaveEvent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: HackathonService, useValue: hackathons },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it('organizador e recusado não veem o botão', async () => {
    await render('ORGANIZER', 'APPROVED');
    expect(buttons()).toHaveLength(0);
    await render('PARTICIPANT', 'REJECTED');
    expect(buttons()).toHaveLength(0);
  });

  it('mentor pendente vê "Desistir da candidatura"', async () => {
    await render('MENTOR', 'PENDING');
    expect(el.textContent).toContain('Desistir da candidatura');
  });

  it('confirma, chama a API, recarrega a sessão e avisa', async () => {
    await render('PARTICIPANT', 'APPROVED');
    let emitted: LeaveEventResult | null = null;
    fixture.componentInstance.left.subscribe((r) => (emitted = r));

    click('Cancelar inscrição');
    await fixture.whenStable();
    expect(el.textContent).toContain('Cancelar sua inscrição neste evento?');
    click('Sim, cancelar');
    await fixture.whenStable();

    expect(hackathons.leave).toHaveBeenCalledWith('e1');
    expect(auth.reload).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Inscrição cancelada.');
    expect(emitted).not.toBeNull();
  });

  it('avisa quando a equipe foi excluída junto', async () => {
    hackathons.leave.mockReturnValue(of(result({ teamId: 't1', teamDeleted: true })));
    await render('PARTICIPANT', 'APPROVED');
    click('Cancelar inscrição');
    await fixture.whenStable();
    click('Sim, cancelar');
    await fixture.whenStable();
    expect(toast.success).toHaveBeenCalledWith('Inscrição cancelada. Sua equipe foi excluída.');
  });

  it('erro da API (ex.: líder com membros) mantém o modal e não emite', async () => {
    hackathons.leave.mockReturnValue(throwError(() => new Error('409')));
    await render('PARTICIPANT', 'APPROVED');
    let emitted = false;
    fixture.componentInstance.left.subscribe(() => (emitted = true));
    click('Cancelar inscrição');
    await fixture.whenStable();
    click('Sim, cancelar');
    await fixture.whenStable();
    expect(emitted).toBe(false);
    expect(auth.reload).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Sim, cancelar');
  });
});

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { ToastService } from '../../../core/toast/toast.service';
import { LeaveEventResult, MembershipRole, MembershipStatus } from '../../../core/models';
import { Button, Icon, Modal } from '../../ui';

/**
 * "Cancelar inscrição" no evento: botão + confirmação. Mesma regra do bot do
 * Discord (a API decide): participante sai da equipe (líder sozinho → equipe
 * excluída; líder com outros membros → erro explicando), mentor devolve os
 * atendimentos em andamento para a fila. Organizador e recusados não veem o botão.
 */
@Component({
  selector: 'app-leave-event',
  imports: [Button, Icon, Modal],
  template: `
    @if (cancellable()) {
      <app-button variant="ghost" size="sm" [block]="block()" (click)="open.set(true)">
        <app-icon slot="icon" name="log-out" [size]="16" /> {{ label() }}
      </app-button>

      <app-modal [open]="open()" [title]="label()" (close)="open.set(false)">
        <p class="leave__lead">{{ question() }}</p>
        <ul class="leave__list">
          @if (role() === 'PARTICIPANT') {
            <li>Você sai da sua equipe. Se for o último dela, a equipe é excluída.</li>
            <li>Se você lidera uma equipe com outros membros, remova-os ou exclua a equipe antes.</li>
            <li>Pedidos de entrada pendentes são apagados e convites recebidos, recusados.</li>
          } @else if (status() === 'APPROVED') {
            <li>Seus atendimentos de mentoria em andamento voltam para a fila.</li>
          }
          <li>Você pode se inscrever de novo depois, se as inscrições continuarem abertas.</li>
        </ul>
        <div slot="footer">
          <app-button variant="ghost" (click)="open.set(false)">Voltar</app-button>
          <app-button variant="danger" [loading]="leaving()" (click)="confirm()">Sim, cancelar</app-button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .leave__lead { margin: 0 0 var(--sp-3); }
    .leave__list {
      margin: 0;
      padding-left: 1.25rem;
      color: var(--text-muted);
      display: grid;
      gap: var(--sp-2);
    }
  `,
})
export class LeaveEvent {
  readonly hackathonId = input.required<string>();
  readonly role = input.required<MembershipRole>();
  readonly status = input.required<MembershipStatus>();
  readonly block = input(false);
  /** Emitido depois que a API confirmou e as memberships foram recarregadas. */
  readonly left = output<LeaveEventResult>();

  private readonly hackathons = inject(HackathonService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly open = signal(false);
  protected readonly leaving = signal(false);

  protected readonly cancellable = computed(
    () => this.role() !== 'ORGANIZER' && this.status() !== 'REJECTED',
  );
  protected readonly label = computed(() =>
    this.role() === 'MENTOR' && this.status() === 'PENDING' ? 'Desistir da candidatura' : 'Cancelar inscrição',
  );
  protected readonly question = computed(() => {
    if (this.role() === 'MENTOR') {
      return this.status() === 'PENDING'
        ? 'Desistir da sua candidatura de mentor neste evento?'
        : 'Deixar de ser mentor neste evento?';
    }
    return 'Cancelar sua inscrição neste evento?';
  });

  protected confirm(): void {
    this.leaving.set(true);
    // Erros (ex.: 409 do líder com membros) viram toast no interceptor global.
    this.hackathons.leave(this.hackathonId()).subscribe({
      next: (result) => {
        this.auth.reload().subscribe({
          next: () => this.finish(result),
          error: () => this.finish(result),
        });
      },
      error: () => this.leaving.set(false),
    });
  }

  private finish(result: LeaveEventResult): void {
    this.leaving.set(false);
    this.open.set(false);
    this.toast.success(
      result.teamDeleted ? 'Inscrição cancelada. Sua equipe foi excluída.' : 'Inscrição cancelada.',
    );
    this.left.emit(result);
  }
}

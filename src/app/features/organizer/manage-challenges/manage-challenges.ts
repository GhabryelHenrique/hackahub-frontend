import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HackathonService } from '../../../core/services/hackathon.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Challenge } from '../../../core/models';
import { Badge, Button, EmptyState, Icon, Modal, Skeleton } from '../../../shared/ui';

/** Gestão de desafios do evento (ORGANIZER): lista + criar/editar/excluir. */
@Component({
  selector: 'app-manage-challenges',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Button, EmptyState, Icon, Modal, Skeleton],
  templateUrl: './manage-challenges.html',
  styleUrl: './manage-challenges.scss',
})
export class ManageChallenges {
  readonly hackathonId = input.required<string>();

  private readonly hackathons = inject(HackathonService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly challenges = signal<Challenge[]>([]);
  /** Desafio aguardando confirmação de exclusão (modal). */
  protected readonly confirming = signal<Challenge | null>(null);
  protected readonly deleting = signal(false);

  constructor() {
    effect(() => this.load(this.hackathonId()));
  }

  private load(id: string): void {
    this.loading.set(true);
    this.hackathons.challenges(id).subscribe({
      next: (list) => {
        this.challenges.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected confirmDelete(): void {
    const target = this.confirming();
    if (!target) return;
    this.deleting.set(true);
    this.hackathons.deleteChallenge(this.hackathonId(), target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirming.set(null);
        this.toast.success('Desafio excluído.');
        this.load(this.hackathonId());
      },
      error: () => this.deleting.set(false),
    });
  }
}

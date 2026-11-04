import { Component, effect, inject, input, signal } from '@angular/core';
import { TeamService } from '../../../core/services/team.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Invite } from '../../../core/models';
import { Avatar, Button, Card, EmptyState, Icon, Skeleton } from '../../../shared/ui';

@Component({
  selector: 'app-invites-page',
  imports: [Avatar, Button, Card, EmptyState, Icon, Skeleton],
  templateUrl: './invites-page.html',
  styleUrl: './invites-page.scss',
})
export class InvitesPage {
  readonly hackathonId = input.required<string>();

  private readonly teamService = inject(TeamService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly invites = signal<Invite[]>([]);
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  private load(hid: string): void {
    this.loading.set(true);
    this.teamService.receivedInvites(hid).subscribe({
      next: (invites) => {
        this.invites.set(invites);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected accept(invite: Invite): void {
    this.busyId.set(invite.id);
    this.teamService.acceptInvite(this.hackathonId(), invite.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Você entrou no time ${invite.team.name}!`);
        this.load(this.hackathonId());
      },
      error: () => this.busyId.set(null),
    });
  }

  protected decline(invite: Invite): void {
    this.busyId.set(invite.id);
    this.teamService.declineInvite(this.hackathonId(), invite.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.invites.update((list) => list.filter((i) => i.id !== invite.id));
      },
      error: () => this.busyId.set(null),
    });
  }
}

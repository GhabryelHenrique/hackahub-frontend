import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HackathonService } from '../../../core/services/hackathon.service';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Challenge, Team } from '../../../core/models';
import { Badge, Button, EmptyState, Icon, Skeleton } from '../../../shared/ui';

@Component({
  selector: 'app-challenges-page',
  imports: [RouterLink, Badge, Button, EmptyState, Icon, Skeleton],
  templateUrl: './challenges-page.html',
  styleUrl: './challenges-page.scss',
})
export class ChallengesPage {
  readonly hackathonId = input.required<string>();

  private readonly hackathons = inject(HackathonService);
  private readonly teamService = inject(TeamService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly challenges = signal<Challenge[]>([]);
  protected readonly myTeam = signal<Team | null>(null);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly saving = signal(false);

  protected readonly myId = computed(() => this.auth.user()?.id ?? '');
  protected readonly isLeader = computed(() => this.myTeam()?.leaderId === this.myId());
  protected readonly dirty = computed(() => {
    const original = new Set(this.myTeam()?.challenges.map((c) => c.id));
    const cur = this.selected();
    if (original.size !== cur.size) return true;
    for (const id of cur) if (!original.has(id)) return true;
    return false;
  });

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  private load(hid: string): void {
    this.loading.set(true);
    forkJoin({ challenges: this.hackathons.challenges(hid), teams: this.teamService.list(hid) }).subscribe({
      next: ({ challenges, teams }) => {
        this.challenges.set(challenges);
        const mine = teams.find((t) => t.members.some((m) => m.id === this.myId())) ?? null;
        this.myTeam.set(mine);
        this.selected.set(new Set(mine?.challenges.map((c) => c.id) ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string): void {
    if (!this.isLeader()) return;
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected save(): void {
    const team = this.myTeam();
    if (!team || !this.isLeader()) return;
    const ids = [...this.selected()];
    if (!ids.length) {
      this.toast.warning('Selecione pelo menos um desafio.');
      return;
    }
    this.saving.set(true);
    this.teamService.selectChallenges(this.hackathonId(), team.id, ids).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.myTeam.set(updated);
        this.selected.set(new Set(updated.challenges.map((c) => c.id)));
        this.toast.success('Desafios atualizados.');
      },
      error: () => this.saving.set(false),
    });
  }
}

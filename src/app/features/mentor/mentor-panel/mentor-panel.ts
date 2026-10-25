import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MentorService } from '../../../core/services/mentor.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { MentorshipRequest, Team } from '../../../core/models';
import { Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, Tabs, TabItem } from '../../../shared/ui';
import { MENTORSHIP_LABEL, MENTORSHIP_TONE } from '../../../shared/labels';
import { timeAgo } from '../../../shared/format';

/**
 * Painel do mentor: fila de pedidos de ajuda (a mesma do `/mentoria` no
 * Discord — assumir aqui reflete lá) e os times do evento, com os que ele
 * acompanha primeiro.
 */
@Component({
  selector: 'app-mentor-panel',
  imports: [Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, Tabs],
  templateUrl: './mentor-panel.html',
  styleUrl: './mentor-panel.scss',
})
export class MentorPanel {
  readonly hackathonId = input.required<string>();

  private readonly mentor = inject(MentorService);
  private readonly mentorship = inject(MentorshipService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly MENTORSHIP_LABEL = MENTORSHIP_LABEL;
  protected readonly MENTORSHIP_TONE = MENTORSHIP_TONE;
  protected readonly timeAgo = timeAgo;

  protected readonly loadingTeams = signal(true);
  protected readonly loadingTickets = signal(true);
  protected readonly teams = signal<Team[]>([]);
  protected readonly tickets = signal<MentorshipRequest[]>([]);
  protected readonly busyId = signal<string | null>(null);
  protected readonly queueTab = signal<string>('PENDING');

  private readonly myId = computed(() => this.auth.user()?.id ?? '');

  /** Times que eu mentoro primeiro; depois por nome. */
  protected readonly sortedTeams = computed(() =>
    [...this.teams()].sort(
      (a, b) => Number(this.isMine(b)) - Number(this.isMine(a)) || a.name.localeCompare(b.name),
    ),
  );
  protected readonly myTeamsCount = computed(() => this.teams().filter((t) => this.isMine(t)).length);

  protected readonly queue = computed(() => {
    const tab = this.queueTab();
    const me = this.myId();
    const list = this.tickets();
    if (tab === 'PENDING') return list.filter((t) => t.status === 'PENDING').reverse(); // mais antigos primeiro
    if (tab === 'MINE') return list.filter((t) => t.status === 'IN_PROGRESS' && t.mentor?.id === me);
    return list.filter((t) => t.status === 'COMPLETED' && t.mentor?.id === me);
  });

  protected readonly queueTabs = computed<TabItem[]>(() => {
    const me = this.myId();
    const list = this.tickets();
    return [
      { id: 'PENDING', label: `Na fila (${list.filter((t) => t.status === 'PENDING').length})` },
      { id: 'MINE', label: `Meus atendimentos (${list.filter((t) => t.status === 'IN_PROGRESS' && t.mentor?.id === me).length})` },
      { id: 'DONE', label: 'Concluídos por mim' },
    ];
  });

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) {
        this.loadTeams(id);
        this.loadTickets(id);
      }
    });
  }

  protected isMine(t: Team): boolean {
    return t.mentors.some((m) => m.id === this.myId());
  }

  private loadTeams(hid: string): void {
    this.loadingTeams.set(true);
    this.mentor.teams(hid).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loadingTeams.set(false);
      },
      error: () => this.loadingTeams.set(false),
    });
  }

  protected loadTickets(hid = this.hackathonId()): void {
    this.loadingTickets.set(true);
    this.mentorship.list(hid).subscribe({
      next: (list) => {
        this.tickets.set(list);
        this.loadingTickets.set(false);
      },
      error: () => this.loadingTickets.set(false),
    });
  }

  protected assign(team: Team): void {
    this.busyId.set(team.id);
    this.mentor.assign(this.hackathonId(), team.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.teams.update((list) => list.map((t) => (t.id === team.id ? updated : t)));
        this.toast.success(`Você agora mentora o time ${team.name}.`);
      },
      error: () => this.busyId.set(null),
    });
  }

  protected claim(t: MentorshipRequest): void {
    this.busyId.set(t.id);
    this.mentorship.claim(this.hackathonId(), t.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
        this.queueTab.set('MINE');
        this.toast.success(`Você assumiu “${t.title}”. Combine o atendimento com ${t.user.name}.`);
      },
      // 409 = outro mentor assumiu antes: recarrega a fila para refletir.
      error: () => {
        this.busyId.set(null);
        this.loadTickets();
      },
    });
  }

  protected complete(t: MentorshipRequest): void {
    this.busyId.set(t.id);
    this.mentorship.complete(this.hackathonId(), t.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
        this.toast.success('Atendimento concluído. Obrigado por mentorar!');
      },
      error: () => this.busyId.set(null),
    });
  }

  private replace(updated: MentorshipRequest): void {
    this.tickets.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }
}

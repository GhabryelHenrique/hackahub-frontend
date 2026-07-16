import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { JoinRequest, PublicUser, Team } from '../../../core/models';
import { Avatar, Badge, Button, Card, EmptyState, FormField, Icon, Modal, Skeleton } from '../../../shared/ui';

@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, Avatar, Badge, Button, Card, EmptyState, FormField, Icon, Modal, Skeleton],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
})
export class TeamPage {
  readonly hackathonId = input.required<string>();

  private readonly teamService = inject(TeamService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly ctx = inject(EventContextService);

  protected readonly loading = signal(true);
  protected readonly teams = signal<Team[]>([]);
  protected readonly requests = signal<JoinRequest[]>([]);
  protected readonly requestedTeamIds = signal<Set<string>>(new Set());

  protected readonly myId = computed(() => this.auth.user()?.id ?? '');
  protected readonly myTeam = computed(() =>
    this.teams().find((t) => t.members.some((m) => m.id === this.myId())) ?? null,
  );
  protected readonly otherTeams = computed(() => this.teams().filter((t) => t.id !== this.myTeam()?.id));
  protected readonly isLeader = computed(() => this.myTeam()?.leaderId === this.myId());

  // Criar time
  protected readonly creating = signal(false);
  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  // Convidar
  protected readonly inviteOpen = signal(false);
  protected readonly inviteResults = signal<PublicUser[]>([]);
  protected readonly inviteSearch = signal('');
  protected readonly inviting = signal(false);
  private inviteDebounce?: ReturnType<typeof setTimeout>;

  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  private load(hid: string): void {
    this.loading.set(true);
    this.teamService.list(hid).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
        const mine = teams.find((t) => t.members.some((m) => m.id === this.myId()));
        if (mine && mine.leaderId === this.myId()) {
          this.teamService.teamJoinRequests(hid, mine.id).subscribe({ next: (r) => this.requests.set(r), error: () => {} });
        } else {
          this.requests.set([]);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  // ---- Criar / procurar -----------------------------------------------------
  protected createTeam(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.teamService.create(this.hackathonId(), this.createForm.getRawValue()).subscribe({
      next: () => {
        this.creating.set(false);
        this.createForm.reset({ name: '', description: '' });
        this.toast.success('Time criado! Agora convide participantes.');
        this.load(this.hackathonId());
      },
      error: () => this.creating.set(false),
    });
  }

  protected requestJoin(teamId: string): void {
    this.teamService.requestJoin(this.hackathonId(), teamId).subscribe({
      next: () => {
        this.requestedTeamIds.update((s) => new Set(s).add(teamId));
        this.toast.success('Solicitação enviada ao líder do time.');
      },
    });
  }

  // ---- Ações do líder -------------------------------------------------------
  protected openInvite(): void {
    this.inviteSearch.set('');
    this.inviteResults.set([]);
    this.inviteOpen.set(true);
  }

  protected onInviteSearch(term: string): void {
    this.inviteSearch.set(term);
    clearTimeout(this.inviteDebounce);
    this.inviteDebounce = setTimeout(() => {
      this.teamService.searchParticipants(this.hackathonId(), term).subscribe({
        next: (users) => {
          const memberIds = new Set(this.myTeam()?.members.map((m) => m.id));
          this.inviteResults.set(users.filter((u) => !memberIds.has(u.id)));
        },
      });
    }, 300);
  }

  protected invite(user: PublicUser): void {
    const team = this.myTeam();
    if (!team) return;
    this.inviting.set(true);
    this.teamService.invite(this.hackathonId(), team.id, user.id).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteOpen.set(false);
        this.toast.success(`Convite enviado para ${user.name}.`);
      },
      error: () => this.inviting.set(false),
    });
  }

  protected approve(req: JoinRequest): void {
    this.busy.set(true);
    this.teamService.approveRequest(this.hackathonId(), req.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(`${req.user.name} entrou no time.`);
        this.load(this.hackathonId());
      },
      error: () => this.busy.set(false),
    });
  }

  protected reject(req: JoinRequest): void {
    this.busy.set(true);
    this.teamService.rejectRequest(this.hackathonId(), req.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.requests.update((list) => list.filter((r) => r.id !== req.id));
      },
      error: () => this.busy.set(false),
    });
  }

  protected removeMember(user: PublicUser): void {
    const team = this.myTeam();
    if (!team) return;
    this.busy.set(true);
    this.teamService.removeMember(this.hackathonId(), team.id, user.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.info(`${user.name} foi removido do time.`);
        this.load(this.hackathonId());
      },
      error: () => this.busy.set(false),
    });
  }
}

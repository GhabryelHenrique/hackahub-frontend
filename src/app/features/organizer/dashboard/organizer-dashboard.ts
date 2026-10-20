import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HackathonService } from '../../../core/services/hackathon.service';
import { TeamService } from '../../../core/services/team.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Challenge, Membership, MentorshipRequest, Team } from '../../../core/models';
import { Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton } from '../../../shared/ui';
import { StatTile } from '../../../shared/components/charts/stat-tile';
import { TrendChart, TrendPoint } from '../../../shared/components/charts/trend-chart';
import { BarList, BarItem } from '../../../shared/components/charts/bar-list';
import { Segment, SegmentBar } from '../../../shared/components/charts/segment-bar';
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, MENTORSHIP_LABEL, MENTORSHIP_TONE, ROLE_LABEL } from '../../../shared/labels';
import { timeAgo } from '../../../shared/format';

interface DashData {
  memberships: Membership[] | null;
  teams: Team[] | null;
  tickets: MentorshipRequest[] | null;
  challenges: Challenge[] | null;
}

interface CheckItem {
  label: string;
  done: boolean;
  link: unknown[];
}

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Painel do organizador: KPIs com ocupação de vagas, tendência de inscrições,
 * fila de aprovação, desafios mais escolhidos, mentoria e composição dos times.
 * Cada fonte falha isolada (o card mostra "indisponível"), sem derrubar a tela.
 */
@Component({
  selector: 'app-organizer-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, StatTile, TrendChart, BarList, SegmentBar],
  templateUrl: './organizer-dashboard.html',
  styleUrl: './organizer-dashboard.scss',
})
export class OrganizerDashboard {
  readonly hackathonId = input.required<string>();

  private readonly hackathons = inject(HackathonService);
  private readonly teamService = inject(TeamService);
  private readonly mentorship = inject(MentorshipService);
  private readonly toast = inject(ToastService);
  protected readonly ctx = inject(EventContextService);

  protected readonly ROLE_LABEL = ROLE_LABEL;
  protected readonly MENTORSHIP_LABEL = MENTORSHIP_LABEL;
  protected readonly MENTORSHIP_TONE = MENTORSHIP_TONE;
  protected readonly EVENT_STATUS_LABEL = EVENT_STATUS_LABEL;
  protected readonly EVENT_STATUS_TONE = EVENT_STATUS_TONE;
  protected readonly timeAgo = timeAgo;

  protected readonly loading = signal(true);
  protected readonly data = signal<DashData>({ memberships: null, teams: null, tickets: null, challenges: null });
  protected readonly busyId = signal<string | null>(null);
  protected readonly showTrendTable = signal(false);

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  protected load(hid = this.hackathonId()): void {
    this.loading.set(true);
    const safe = <T>(o: import('rxjs').Observable<T>) => o.pipe(catchError(() => of(null)));
    forkJoin({
      memberships: safe(this.hackathons.memberships(hid)),
      teams: safe(this.teamService.list(hid)),
      tickets: safe(this.mentorship.list(hid)),
      challenges: safe(this.hackathons.challenges(hid)),
    }).subscribe((d) => {
      this.data.set(d);
      this.loading.set(false);
    });
  }

  // ---- Inscrições ------------------------------------------------------------
  private readonly members = computed(() => (this.data().memberships ?? []).filter((m) => m.role !== 'ORGANIZER'));
  private count(role: 'PARTICIPANT' | 'MENTOR', status: 'APPROVED' | 'PENDING' | 'REJECTED'): number {
    return this.members().filter((m) => m.role === role && m.status === status).length;
  }
  protected readonly participants = computed(() => ({
    approved: this.count('PARTICIPANT', 'APPROVED'),
    pending: this.count('PARTICIPANT', 'PENDING'),
  }));
  protected readonly mentors = computed(() => ({
    approved: this.count('MENTOR', 'APPROVED'),
    pending: this.count('MENTOR', 'PENDING'),
  }));
  /** Mais antigas primeiro — quem chegou antes é atendido antes. */
  protected readonly pending = computed(() =>
    this.members()
      .filter((m) => m.status === 'PENDING')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );

  /** Inscrições recebidas (participantes + mentores, qualquer status), acumuladas por dia. */
  protected readonly trend = computed<TrendPoint[]>(() => {
    const list = this.members();
    if (!list.length) return [];
    const perDay = new Map<string, number>();
    for (const m of list) {
      const k = m.createdAt.slice(0, 10);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    const first = [...perDay.keys()].sort()[0];
    const start = new Date(`${first}T00:00:00Z`).getTime();
    const end = Math.max(start, new Date(`${isoDay(new Date())}T00:00:00Z`).getTime());
    // No máximo ~120 pontos: agrupa em semanas se o período for longo.
    const span = Math.round((end - start) / DAY);
    const step = span > 120 ? 7 : 1;
    const out: TrendPoint[] = [];
    let total = 0;
    for (let t = start; t <= end; t += step * DAY) {
      let delta = 0;
      for (let i = 0; i < step; i++) delta += perDay.get(isoDay(new Date(t + i * DAY))) ?? 0;
      total += delta;
      out.push({ date: isoDay(new Date(t)), value: total, delta });
    }
    if (out.length === 1) out.unshift({ date: isoDay(new Date(start - DAY)), value: 0, delta: 0 });
    return out;
  });
  protected readonly trendRows = computed(() => this.trend().filter((p) => p.delta));

  // ---- Times e desafios --------------------------------------------------------
  protected readonly teams = computed(() => this.data().teams ?? []);
  protected readonly teamStats = computed(() => {
    const teams = this.teams();
    const inTeams = new Set(teams.flatMap((t) => t.members.map((m) => m.id))).size;
    return {
      count: teams.length,
      inTeams,
      withoutTeam: Math.max(0, this.participants().approved - inTeams),
      avg: teams.length ? (inTeams / teams.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0',
    };
  });
  protected readonly sortedTeams = computed(() =>
    [...this.teams()].sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name)),
  );

  protected readonly challengeBars = computed<BarItem[]>(() => {
    const picks = new Map<string, number>();
    for (const t of this.teams()) for (const c of t.challenges) picks.set(c.id, (picks.get(c.id) ?? 0) + 1);
    return (this.data().challenges ?? []).map((c) => ({ label: c.title, value: picks.get(c.id) ?? 0 }));
  });
  protected readonly anyChallengePicked = computed(() => this.challengeBars().some((b) => b.value > 0));

  // ---- Mentoria ----------------------------------------------------------------
  protected readonly tickets = computed(() => this.data().tickets ?? []);
  protected readonly ticketSegments = computed<Segment[]>(() => {
    const by = (s: MentorshipRequest['status']) => this.tickets().filter((t) => t.status === s).length;
    return [
      { key: 'PENDING', label: MENTORSHIP_LABEL.PENDING, value: by('PENDING'), color: 'var(--warning)' },
      { key: 'IN_PROGRESS', label: MENTORSHIP_LABEL.IN_PROGRESS, value: by('IN_PROGRESS'), color: 'var(--info)' },
      { key: 'COMPLETED', label: MENTORSHIP_LABEL.COMPLETED, value: by('COMPLETED'), color: 'var(--success)' },
      { key: 'CANCELLED', label: MENTORSHIP_LABEL.CANCELLED, value: by('CANCELLED'), color: 'var(--n-400)' },
    ];
  });
  protected readonly openTickets = computed(
    () => this.tickets().filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
  );

  // ---- Prontidão do evento -----------------------------------------------------
  protected readonly checklist = computed<CheckItem[]>(() => {
    const f = this.ctx.full();
    const id = this.hackathonId();
    const cfg = ['/app/eventos', id, 'gerenciar', 'configuracoes'];
    return [
      { label: 'Descrição do evento', done: !!f?.description?.trim(), link: cfg },
      { label: 'Datas de início e fim', done: !!(f?.startsAt && f?.endsAt), link: cfg },
      { label: 'Imagem de capa', done: !!f?.coverImage, link: cfg },
      { label: 'Ao menos um desafio', done: (this.data().challenges?.length ?? 0) > 0, link: ['/app/eventos', id, 'gerenciar', 'desafios'] },
      { label: 'Evento publicado', done: f?.status === 'PUBLISHED', link: cfg },
    ];
  });
  protected readonly checklistDone = computed(() => this.checklist().filter((c) => c.done).length);
  protected readonly publicLink = computed(() => {
    const f = this.ctx.full();
    return f && f.status === 'PUBLISHED' && f.visibility !== 'PRIVATE' ? ['/eventos', f.slug] : null;
  });

  // ---- Ações -------------------------------------------------------------------
  protected decide(m: Membership, approve: boolean): void {
    this.busyId.set(m.id);
    const call = approve
      ? this.hackathons.approveMembership(this.hackathonId(), m.id)
      : this.hackathons.rejectMembership(this.hackathonId(), m.id);
    call.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.data.update((d) => ({
          ...d,
          memberships: (d.memberships ?? []).map((x) => (x.id === m.id ? { ...x, ...updated, user: x.user } : x)),
        }));
        this.ctx.refreshPendingCount();
        const who = m.user?.name ?? 'Inscrição';
        if (approve) this.toast.success(`${who} aprovado(a) como ${ROLE_LABEL[m.role].toLowerCase()}.`);
        else this.toast.info(`${who} foi recusado(a).`);
      },
      error: () => this.busyId.set(null),
    });
  }
}

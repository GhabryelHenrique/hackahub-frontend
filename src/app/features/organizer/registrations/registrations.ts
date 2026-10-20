import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HackathonService } from '../../../core/services/hackathon.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Membership } from '../../../core/models';
import { Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, Tabs, TabItem } from '../../../shared/ui';
import { ROLE_LABEL, STATUS_LABEL, STATUS_TONE } from '../../../shared/labels';
import { timeAgo } from '../../../shared/format';

type Filter = 'PENDING' | 'PARTICIPANT' | 'MENTOR' | 'REJECTED';

/**
 * Gestão de inscrições do organizador: aprova/recusa participantes (modo
 * APPROVAL) e candidaturas de mentor. A API revalida vagas ao aprovar (409 se
 * lotado — a mensagem vem no toast global).
 */
@Component({
  selector: 'app-registrations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, Tabs],
  templateUrl: './registrations.html',
  styleUrl: './registrations.scss',
})
export class Registrations {
  readonly hackathonId = input.required<string>();

  private readonly hackathons = inject(HackathonService);
  private readonly ctx = inject(EventContextService);
  private readonly toast = inject(ToastService);

  protected readonly ROLE_LABEL = ROLE_LABEL;
  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly timeAgo = timeAgo;

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly all = signal<Membership[]>([]);
  protected readonly filter = signal<string>('PENDING');
  protected readonly search = signal('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly expanded = signal<string | null>(null);

  /** Organizadores não entram na gestão (não há o que aprovar). */
  private readonly members = computed(() => this.all().filter((m) => m.role !== 'ORGANIZER'));

  protected readonly tabs = computed<TabItem[]>(() => {
    const ms = this.members();
    const n = (f: Filter) => ms.filter((m) => this.matches(m, f)).length;
    return [
      { id: 'PENDING', label: `Pendentes (${n('PENDING')})` },
      { id: 'PARTICIPANT', label: `Participantes (${n('PARTICIPANT')})` },
      { id: 'MENTOR', label: `Mentores (${n('MENTOR')})` },
      { id: 'REJECTED', label: `Recusados (${n('REJECTED')})` },
    ];
  });

  protected readonly visible = computed(() => {
    const f = this.filter() as Filter;
    const q = this.search().trim().toLowerCase();
    return this.members()
      .filter((m) => this.matches(m, f))
      .filter((m) => !q || `${m.user?.name ?? ''} ${m.user?.email ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) =>
        // Pendentes: mais antigos primeiro (ordem de chegada); demais: mais recentes.
        f === 'PENDING' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
      );
  });

  protected readonly pendingCount = computed(() => this.members().filter((m) => m.status === 'PENDING').length);

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  private matches(m: Membership, f: Filter): boolean {
    switch (f) {
      case 'PENDING':
        return m.status === 'PENDING';
      case 'REJECTED':
        return m.status === 'REJECTED';
      default:
        return m.role === f && m.status === 'APPROVED';
    }
  }

  protected load(hid = this.hackathonId()): void {
    this.loading.set(true);
    this.failed.set(false);
    this.hackathons.memberships(hid).subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected decide(m: Membership, approve: boolean): void {
    this.busyId.set(m.id);
    const call = approve
      ? this.hackathons.approveMembership(this.hackathonId(), m.id)
      : this.hackathons.rejectMembership(this.hackathonId(), m.id);
    call.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.all.update((list) => list.map((x) => (x.id === m.id ? { ...x, ...updated, user: x.user } : x)));
        this.ctx.refreshPendingCount();
        const who = m.user?.name ?? 'Inscrição';
        if (approve) this.toast.success(`${who} aprovado(a) como ${ROLE_LABEL[m.role].toLowerCase()}.`);
        else this.toast.info(`${who} foi recusado(a).`);
      },
      error: () => this.busyId.set(null),
    });
  }

  protected toggle(id: string): void {
    this.expanded.update((cur) => (cur === id ? null : id));
  }
}

import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { MentorshipService } from '../../../core/services/mentorship.service';
import { ToastService } from '../../../core/toast/toast.service';
import { MentorshipRequest } from '../../../core/models';
import { Badge, Button, Card, FormField, Icon, Modal, Skeleton } from '../../../shared/ui';
import { MENTORSHIP_LABEL, MENTORSHIP_TONE, REGISTRATION_LABEL } from '../../../shared/labels';
import { formatPrice, timeAgo } from '../../../shared/format';
import { LeaveEvent } from '../../../shared/components/leave-event/leave-event';

interface ActionCard {
  label: string;
  description: string;
  icon: string;
  link: unknown[];
}

@Component({
  selector: 'app-event-overview',
  imports: [RouterLink, ReactiveFormsModule, Badge, Button, Card, FormField, Icon, LeaveEvent, Modal, Skeleton],
  templateUrl: './event-overview.html',
  styleUrl: './event-overview.scss',
})
export class EventOverview {
  protected readonly ctx = inject(EventContextService);
  private readonly mentorship = inject(MentorshipService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly REGISTRATION_LABEL = REGISTRATION_LABEL;
  protected readonly MENTORSHIP_LABEL = MENTORSHIP_LABEL;
  protected readonly MENTORSHIP_TONE = MENTORSHIP_TONE;
  protected readonly formatPrice = formatPrice;
  protected readonly timeAgo = timeAgo;

  // ---- Pedidos de mentoria do participante (mesma fila do bot) --------------
  protected readonly myRequests = signal<MentorshipRequest[]>([]);
  protected readonly helpOpen = signal(false);
  protected readonly sending = signal(false);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly helpForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });
  /** Pedido aberto (na fila ou em atendimento) — evita duplicar pedidos. */
  protected readonly openRequest = computed(() =>
    this.myRequests().find((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS') ?? null,
  );

  constructor() {
    effect(() => {
      const id = this.ctx.activeId();
      if (id && this.ctx.isParticipantApproved()) untracked(() => this.loadRequests(id));
      else this.myRequests.set([]);
    });
  }

  private loadRequests(hid: string): void {
    this.mentorship.mine(hid).subscribe({ next: (list) => this.myRequests.set(list), error: () => {} });
  }

  protected openHelp(): void {
    this.helpForm.reset({ title: '', description: '' });
    this.helpOpen.set(true);
  }

  protected sendHelp(): void {
    const hid = this.ctx.activeId();
    if (!hid) return;
    if (this.helpForm.invalid) {
      this.helpForm.markAllAsTouched();
      return;
    }
    const v = this.helpForm.getRawValue();
    this.sending.set(true);
    this.mentorship.create(hid, { title: v.title.trim(), description: v.description.trim() }).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.helpOpen.set(false);
        this.myRequests.update((list) => [r, ...list]);
        this.toast.success('Pedido enviado! Um mentor vai assumir em breve.');
      },
      error: () => this.sending.set(false),
    });
  }

  protected cancelRequest(r: MentorshipRequest): void {
    const hid = this.ctx.activeId();
    if (!hid) return;
    this.cancellingId.set(r.id);
    this.mentorship.cancel(hid, r.id).subscribe({
      next: (updated) => {
        this.cancellingId.set(null);
        this.myRequests.update((list) => list.map((x) => (x.id === r.id ? updated : x)));
      },
      error: () => this.cancellingId.set(null),
    });
  }

  /** Participação que a própria pessoa pode cancelar (organizador não sai). */
  protected readonly leavable = computed(() => {
    if (this.ctx.organizer()) return null;
    const me = this.ctx.participant() ?? this.ctx.mentor();
    return me && me.status !== 'REJECTED' ? me : null;
  });

  /** Fora do evento a área interna deixa de abrir: volta para a página pública dele. */
  protected onLeft(): void {
    const slug = this.ctx.summary()?.slug;
    this.router.navigate(slug ? ['/eventos', slug] : ['/app']);
  }

  protected readonly participantPending = computed(() => this.ctx.participant()?.status === 'PENDING');
  protected readonly mentorPending = computed(() => this.ctx.mentor()?.status === 'PENDING');

  protected readonly actions = computed<ActionCard[]>(() => {
    const id = this.ctx.activeId();
    if (!id) return [];
    const items: ActionCard[] = [];
    if (this.ctx.isParticipantApproved()) {
      items.push(
        { label: 'Meu time', description: 'Crie ou gerencie seu time neste evento.', icon: 'users', link: ['/app/eventos', id, 'time'] },
        { label: 'Convites', description: 'Convites recebidos para times.', icon: 'mail', link: ['/app/eventos', id, 'convites'] },
        { label: 'Desafios', description: 'Veja e selecione os desafios do time.', icon: 'target', link: ['/app/eventos', id, 'desafios'] },
      );
    }
    if (this.ctx.isMentorApproved()) {
      items.push({ label: 'Painel de mentoria', description: 'Times que você acompanha.', icon: 'lightbulb', link: ['/app/eventos', id, 'mentoria'] });
    }
    if (this.ctx.isOrganizerApproved()) {
      items.push(
        { label: 'Painel do evento', description: 'Métricas de inscrições, times, desafios e mentoria.', icon: 'chart', link: ['/app/eventos', id, 'gerenciar'] },
        { label: 'Inscrições', description: 'Aprove participantes e candidaturas de mentor.', icon: 'user-check', link: ['/app/eventos', id, 'gerenciar', 'inscricoes'] },
        { label: 'Configurações do evento', description: 'Edite informações, inscrições e publicação.', icon: 'settings', link: ['/app/eventos', id, 'gerenciar', 'configuracoes'] },
        { label: 'Gerenciar desafios', description: 'Cadastre e edite os desafios do evento.', icon: 'target', link: ['/app/eventos', id, 'gerenciar', 'desafios'] },
      );
    }
    return items;
  });
}

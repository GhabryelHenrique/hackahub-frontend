import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Icon, Skeleton } from '../../../shared/ui';
import { EVENT_STATUS_LABEL, ROLE_LABEL, STATUS_LABEL, STATUS_TONE } from '../../../shared/labels';
import { coverHue, coverImage, dateRange } from '../../../shared/format';

interface NavItem {
  label: string;
  icon: string;
  link: unknown[];
  exact: boolean;
  /** Contador opcional (ex.: inscrições pendentes do organizador). */
  count?: number;
}

/** Layout de contexto de evento (docs §3.2). Define o evento ativo e a nav. */
@Component({
  selector: 'app-event-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Skeleton],
  templateUrl: './event-shell.html',
  styleUrl: './event-shell.scss',
})
export class EventShell {
  readonly hackathonId = input.required<string>();

  protected readonly ctx = inject(EventContextService);
  private readonly auth = inject(AuthService);

  protected readonly ROLE_LABEL = ROLE_LABEL;
  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly EVENT_STATUS_LABEL = EVENT_STATUS_LABEL;
  protected readonly dateRange = dateRange;

  /** Cabeçalho: detalhe (rico) quando disponível, senão o resumo (instantâneo). */
  protected readonly head = computed(() => this.ctx.detail() ?? this.ctx.summary());
  protected readonly hue = computed(() => {
    const slug = this.head()?.slug;
    return slug ? coverHue(slug) : 255;
  });
  protected readonly memberships = computed(() => this.auth.membershipsFor(this.hackathonId()));
  protected readonly photo = computed(() => coverImage(this.head()?.coverImage, true));
  /** Status de publicação só é conhecido pelo detalhe autenticado (`full`). */
  protected readonly eventStatus = computed(() => this.ctx.full()?.status ?? null);

  protected readonly navItems = computed<NavItem[]>(() => {
    const id = this.hackathonId();
    const items: NavItem[] = [
      { label: 'Visão geral', icon: 'home', link: ['/app/eventos', id], exact: true },
    ];
    if (this.ctx.isParticipantApproved()) {
      items.push({ label: 'Meu time', icon: 'users', link: ['/app/eventos', id, 'time'], exact: false });
      items.push({ label: 'Convites', icon: 'mail', link: ['/app/eventos', id, 'convites'], exact: false });
      items.push({ label: 'Desafios', icon: 'target', link: ['/app/eventos', id, 'desafios'], exact: false });
    }
    if (this.ctx.isMentorApproved()) {
      items.push({ label: 'Mentoria', icon: 'lightbulb', link: ['/app/eventos', id, 'mentoria'], exact: false });
    }
    // Organizador não colide com as abas de participante (1 papel por evento).
    if (this.ctx.isOrganizerApproved()) {
      const g = ['/app/eventos', id, 'gerenciar'];
      items.push({ label: 'Painel', icon: 'chart', link: g, exact: true });
      items.push({
        label: 'Inscrições',
        icon: 'user-check',
        link: [...g, 'inscricoes'],
        exact: false,
        count: this.ctx.pendingCount() ?? undefined,
      });
      items.push({ label: 'Desafios', icon: 'target', link: [...g, 'desafios'], exact: false });
      items.push({ label: 'Configurações', icon: 'settings', link: [...g, 'configuracoes'], exact: false });
    }
    return items;
  });

  constructor() {
    effect(() => this.ctx.setActive(this.hackathonId()));
  }
}

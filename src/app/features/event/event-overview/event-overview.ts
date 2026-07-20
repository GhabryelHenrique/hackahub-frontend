import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { Badge, Card, Icon, Skeleton } from '../../../shared/ui';
import { REGISTRATION_LABEL } from '../../../shared/labels';
import { formatPrice } from '../../../shared/format';

interface ActionCard {
  label: string;
  description: string;
  icon: string;
  link: unknown[];
}

@Component({
  selector: 'app-event-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Card, Icon, Skeleton],
  templateUrl: './event-overview.html',
  styleUrl: './event-overview.scss',
})
export class EventOverview {
  protected readonly ctx = inject(EventContextService);
  protected readonly REGISTRATION_LABEL = REGISTRATION_LABEL;
  protected readonly formatPrice = formatPrice;

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
        { label: 'Configurações do evento', description: 'Edite informações, inscrições e publicação.', icon: 'settings', link: ['/app/eventos', id, 'gerenciar'] },
        { label: 'Gerenciar desafios', description: 'Cadastre e edite os desafios do evento.', icon: 'target', link: ['/app/eventos', id, 'gerenciar', 'desafios'] },
      );
    }
    return items;
  });
}

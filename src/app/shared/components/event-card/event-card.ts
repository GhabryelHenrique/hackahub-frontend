import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HackathonSummary } from '../../../core/models';
import { Badge, Icon } from '../../ui';
import { dateRange, hueFromString, registrationState } from '../../format';

/** Card de evento do catálogo (docs §4.1). Reutilizado em "Meus eventos". */
@Component({
  selector: 'app-event-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Icon],
  template: `
    <a class="card" [routerLink]="['/eventos', event().slug]">
      <div
        class="card__cover"
        [style.--hue]="hue()"
        [style.backgroundImage]="event().coverImage ? 'url(' + event().coverImage + ')' : null"
      ></div>
      <div class="card__body">
        <span class="card__org">{{ event().organization.name }}</span>
        <h3 class="card__name">{{ event().name }}</h3>
        <p class="card__summary">{{ event().description }}</p>
        <div class="card__meta">
          <span class="row gap-1"><app-icon name="calendar" [size]="15" /> {{ range() }}</span>
          <span class="row gap-1"><app-icon name="users" [size]="15" /> {{ event().participantsCount }}</span>
        </div>
      </div>
      <div class="card__foot">
        <app-badge [tone]="reg().tone" [dot]="true">{{ reg().label }}</app-badge>
        <span class="card__cta">Ver detalhes <app-icon name="arrow-right" [size]="15" /></span>
      </div>
    </a>
  `,
  styleUrl: './event-card.scss',
})
export class EventCard {
  readonly event = input.required<HackathonSummary>();

  protected readonly hue = computed(() => hueFromString(this.event().slug));
  protected readonly range = computed(() => dateRange(this.event().startsAt, this.event().endsAt));
  protected readonly reg = computed(() => registrationState(this.event()));
}

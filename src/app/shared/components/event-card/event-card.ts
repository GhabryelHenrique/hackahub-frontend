import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HackathonSummary } from '../../../core/models';
import { Badge, Icon } from '../../ui';
import { coverHue, coverImage, dateBlock, dateRange, formatPrice, registrationState } from '../../format';

/** Card de evento do catálogo (docs §4.1). Reutilizado em "Meus eventos". */
@Component({
  selector: 'app-event-card',
  imports: [RouterLink, Badge, Icon],
  template: `
    <a class="card" [routerLink]="['/eventos', event().slug]">
      <div
        class="card__cover cover-art"
        [class.has-photo]="!!event().coverImage"
        [style.--hue]="hue()"
        [style.backgroundImage]="photo()"
      >
        @if (date(); as d) {
          <span class="card__date" aria-hidden="true">
            <strong>{{ d.day }}</strong><small>{{ d.month }}</small>
          </span>
        }
        @if (!event().coverImage) {
          <span class="card__mono" aria-hidden="true">{{ monogram() }}</span>
        }
        <span class="card__price glass-chip">{{ price() }}</span>
      </div>
      <div class="card__body">
        <span class="card__org">{{ event().organization.name }}</span>
        <h3 class="card__name">{{ event().name }}</h3>
        @if (event().description) {
          <p class="card__summary">{{ event().description }}</p>
        }
        <ul class="card__meta">
          <li><app-icon name="calendar" [size]="15" /> {{ range() }}</li>
          <li>
            <app-icon [name]="event().location ? 'map-pin' : 'globe'" [size]="15" />
            <span class="card__loc">{{ event().location || 'Online' }}</span>
          </li>
          <li><app-icon name="users" [size]="15" /> {{ event().participantsCount }} {{ event().participantsCount === 1 ? 'inscrito' : 'inscritos' }}</li>
        </ul>
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

  protected readonly hue = computed(() => coverHue(this.event().slug));
  protected readonly photo = computed(() => coverImage(this.event().coverImage));
  protected readonly date = computed(() => dateBlock(this.event().startsAt));
  protected readonly range = computed(() => dateRange(this.event().startsAt, this.event().endsAt));
  protected readonly price = computed(() => formatPrice(this.event().price));
  protected readonly reg = computed(() => registrationState(this.event()));
  /** Iniciais das 2 primeiras palavras relevantes ("NASA Space Apps" → "NS"). */
  protected readonly monogram = computed(() =>
    this.event()
      .name.split(/\s+/)
      .filter((w) => /^[\p{L}\d]/u.test(w) && w.length > 2)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );
}

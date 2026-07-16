import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Spinner } from '../spinner/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Botão tematizado (docs §5). Laranja = ação primária (um por vista, docs §1.1).
 * Renderiza `<a routerLink>` quando `routerLink` é fornecido, senão `<button>`.
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-block]': 'block()' },
  imports: [RouterLink, Spinner, NgTemplateOutlet],
  template: `
    <!-- Um único par de <ng-content> reaproveitado nos dois ramos: <ng-content>
         duplicado em @if/@else só projeta em um slot (limitação do Angular). -->
    <ng-template #content>
      <ng-content select="[slot=icon]" />
      <ng-content />
    </ng-template>

    @if (routerLink() !== undefined) {
      <a [routerLink]="routerLink()" [class]="cssClass()" [attr.aria-disabled]="disabled() || null">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <button
        [type]="type()"
        [class]="cssClass()"
        [disabled]="disabled() || loading()"
        [attr.aria-busy]="loading() || null"
      >
        @if (loading()) {
          <app-spinner [size]="size() === 'lg' ? 20 : 16" />
        }
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    }
  `,
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly block = input(false);
  readonly routerLink = input<string | unknown[] | undefined>(undefined);

  protected readonly cssClass = computed(() =>
    [
      'btn',
      `btn--${this.variant()}`,
      `btn--${this.size()}`,
      this.block() ? 'btn--block' : '',
      this.loading() ? 'is-loading' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}

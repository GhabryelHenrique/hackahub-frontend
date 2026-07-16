import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** Estado vazio com ícone, título, descrição e ações projetadas (docs §5). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="empty">
      <span class="empty__icon"><app-icon [name]="icon()" [size]="28" /></span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (description()) { <p class="empty__desc">{{ description() }}</p> }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: [
    `.empty {
       display: flex; flex-direction: column; align-items: center; text-align: center;
       padding: var(--sp-12) var(--sp-6); gap: var(--sp-3);
     }
     .empty__icon {
       display: inline-flex; align-items: center; justify-content: center;
       width: 64px; height: 64px; border-radius: 50%;
       background: var(--brand-gradient-soft); color: var(--brand-blue);
       margin-bottom: var(--sp-2);
     }
     .empty__title { font-size: var(--fs-xl); }
     .empty__desc { color: var(--text-muted); max-width: 46ch; }
     .empty__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; margin-top: var(--sp-2); }
     .empty__actions:empty { display: none; }`,
  ],
})
export class EmptyState {
  readonly icon = input('compass');
  readonly title = input.required<string>();
  readonly description = input<string>('');
}

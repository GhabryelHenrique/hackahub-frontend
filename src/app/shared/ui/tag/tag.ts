import { Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Chip/tag, opcionalmente removível ou selecionável (docs §5). */
@Component({
  selector: 'app-tag',
  imports: [Icon],
  host: { '[class.is-selected]': 'selected()' },
  template: `
    <span class="tag">
      <ng-content />
      @if (removable()) {
        <button type="button" class="tag__remove" (click)="remove.emit()" aria-label="Remover">
          <app-icon name="x" [size]="12" />
        </button>
      }
    </span>
  `,
  styles: [
    `:host { display: inline-flex; }
     .tag {
       display: inline-flex; align-items: center; gap: 6px;
       padding: 4px 10px; border-radius: var(--radius-full);
       background: var(--surface-inset); color: var(--text-muted);
       border: 1px solid var(--border); font-size: var(--fs-sm); font-weight: 500;
     }
     :host(.is-selected) .tag {
       background: var(--accent-soft); color: var(--accent-text); border-color: var(--accent);
     }
     .tag__remove {
       display: inline-flex; border: 0; background: transparent; cursor: pointer;
       color: inherit; padding: 0; border-radius: 50%; opacity: 0.7;
     }
     .tag__remove:hover { opacity: 1; }`,
  ],
})
export class Tag {
  readonly removable = input(false);
  readonly selected = input(false);
  readonly remove = output<void>();
}

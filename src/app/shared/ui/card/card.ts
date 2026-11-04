import { Component, input } from '@angular/core';

/** Card base tematizado (docs §5). */
@Component({
  selector: 'app-card',
  host: {
    '[class.is-interactive]': 'interactive()',
    '[style.padding]': 'padded() ? null : "0"',
  },
  template: `<ng-content />`,
  styles: [
    `:host {
       display: block;
       background: var(--surface);
       border: 1px solid var(--border);
       border-radius: var(--radius-lg);
       box-shadow: var(--shadow-sm);
       padding: var(--sp-6);
     }
     :host(.is-interactive) {
       transition: box-shadow 0.18s var(--ease), transform 0.18s var(--ease), border-color 0.18s var(--ease);
     }
     :host(.is-interactive:hover) {
       box-shadow: var(--shadow-lg);
       transform: translateY(-3px);
       border-color: var(--border-strong);
     }`,
  ],
})
export class Card {
  readonly interactive = input(false);
  readonly padded = input(true);
}

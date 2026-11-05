import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Envolve um controle de formulário com label, dica e mensagem de erro
 * (docs §5). O controle projetado deve usar a classe global `.control`.
 */
@Component({
  selector: 'app-form-field',
  imports: [Icon],
  template: `
    <div class="field">
      @if (label()) {
        <label class="field__label" [attr.for]="for()">
          {{ label() }}@if (required()) { <span class="field__req" aria-hidden="true">*</span> }
        </label>
      }
      <ng-content />
      @if (error()) {
        <p class="field__msg field__msg--error" role="alert">
          <app-icon name="alert-circle" [size]="14" /> {{ error() }}
        </p>
      } @else if (hint()) {
        <p class="field__msg field__msg--hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `.field { display: flex; flex-direction: column; gap: 6px; }
     .field__label { font-size: var(--fs-sm); font-weight: 500; color: var(--text); }
     .field__req { color: var(--accent-text); margin-left: 2px; }
     .field__msg { display: flex; align-items: center; gap: 5px; font-size: var(--fs-sm); }
     .field__msg--error { color: var(--danger); }
     .field__msg--hint { color: var(--text-subtle); }`,
  ],
})
export class FormField {
  readonly label = input<string>('');
  readonly for = input<string | undefined>(undefined);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input(false);
}

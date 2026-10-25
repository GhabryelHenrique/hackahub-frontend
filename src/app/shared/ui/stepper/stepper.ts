import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** Indicador de etapas — usado na candidatura de mentor (docs §5 / §4.8). */
@Component({
  selector: 'app-stepper',
  imports: [Icon],
  template: `
    <ol class="stepper">
      @for (s of steps(); track $index; let i = $index) {
        <li class="step" [class.is-done]="i < current()" [class.is-active]="i === current()">
          <span class="step__dot">
            @if (i < current()) { <app-icon name="check" [size]="14" /> } @else { {{ i + 1 }} }
          </span>
          <span class="step__label">{{ s }}</span>
          @if (!$last) { <span class="step__line"></span> }
        </li>
      }
    </ol>
  `,
  styles: [
    `.stepper { display: flex; align-items: center; gap: 0; }
     .step { display: flex; align-items: center; gap: var(--sp-2); flex: 1; min-width: 0; }
     .step:last-child { flex: none; }
     .step__dot {
       flex: none; width: 30px; height: 30px; border-radius: 50%;
       display: inline-flex; align-items: center; justify-content: center;
       background: var(--surface-inset); color: var(--text-subtle);
       border: 2px solid var(--border); font-weight: 700; font-size: var(--fs-sm);
     }
     .step__label { font-size: var(--fs-sm); font-weight: 500; color: var(--text-subtle); white-space: nowrap; }
     .step__line { flex: 1; height: 2px; background: var(--border); margin: 0 var(--sp-2); min-width: 16px; }
     .step.is-active .step__dot { background: var(--brand-navy); color: #fff; border-color: var(--brand-navy); }
     .step.is-active .step__label { color: var(--text); }
     .step.is-done .step__dot { background: var(--success); color: #fff; border-color: var(--success); }
     .step.is-done .step__line { background: var(--success); }
     .step.is-done .step__label { color: var(--text); }
     @media (max-width: 560px) { .step__label { display: none; } }`,
  ],
})
export class Stepper {
  readonly steps = input.required<string[]>();
  readonly current = input(0);
}

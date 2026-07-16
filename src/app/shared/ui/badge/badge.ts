import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Badge de status (evento/membership) — docs §5. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge--' + tone()">
    @if (dot()) { <span class="badge__dot"></span> }
    <ng-content />
  </span>`,
  styles: [
    `:host { display: inline-flex; }
     .badge {
       display: inline-flex; align-items: center; gap: 6px;
       padding: 3px 10px; border-radius: var(--radius-full);
       font-size: var(--fs-xs); font-weight: 600; line-height: 1.5;
       white-space: nowrap; border: 1px solid transparent;
     }
     .badge__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
     .badge--neutral { background: var(--n-100); color: var(--n-600); border-color: var(--n-200); }
     .badge--success { background: var(--success-bg); color: #15803d; }
     .badge--warning { background: var(--warning-bg); color: #b45309; }
     .badge--danger  { background: var(--danger-bg);  color: #b91c1c; }
     .badge--info    { background: var(--info-bg);    color: #0369a1; }
     .badge--brand   { background: rgba(46,144,216,.12); color: var(--brand-blue); }`,
  ],
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(false);
}

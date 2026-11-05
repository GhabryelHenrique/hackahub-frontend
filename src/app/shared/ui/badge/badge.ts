import { Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Badge de status (evento/membership) — docs §5. */
@Component({
  selector: 'app-badge',
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
     .badge--neutral { background: var(--surface-inset); color: var(--text-muted); border-color: var(--border); }
     .badge--success { background: var(--success-bg); color: var(--success); }
     .badge--warning { background: var(--warning-bg); color: var(--warning); }
     .badge--danger  { background: var(--danger-bg);  color: var(--danger); }
     .badge--info    { background: var(--info-bg);    color: var(--info); }
     .badge--brand   { background: var(--accent-soft); color: var(--accent-text); }`,
  ],
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(false);
}

import { Component, computed, input } from '@angular/core';

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** Cor do segmento (token CSS, ex.: `var(--warning)`). */
  color: string;
}

/**
 * Barra 100% (parte-do-todo) com vão de 2px entre segmentos e legenda com
 * contagens — a identidade nunca depende só da cor. Hover/foco: tooltip.
 */
@Component({
  selector: 'app-segment-bar',
  template: `
    @if (total() > 0) {
      <div class="seg" role="img" [attr.aria-label]="ariaLabel()">
        @for (s of visible(); track s.key) {
          <span class="seg__part" tabindex="0" [style.flex-grow]="s.value" [style.background]="s.color">
            <span class="seg__tip" role="tooltip"><strong>{{ s.value }}</strong> {{ s.label }} · {{ s.share }}%</span>
          </span>
        }
      </div>
    } @else {
      <div class="seg seg--empty"></div>
    }
    <ul class="legend">
      @for (s of segments(); track s.key) {
        <li>
          <span class="legend__swatch" [style.background]="s.color"></span>
          <span class="legend__label">{{ s.label }}</span>
          <strong class="legend__value">{{ s.value }}</strong>
        </li>
      }
    </ul>
  `,
  styles: [
    `:host { display: block; }
     .seg { display: flex; gap: 2px; height: 14px; border-radius: 4px; }
     .seg--empty { background: var(--chart-track); }
     .seg__part {
       position: relative; min-width: 6px; flex-basis: 0; outline: none;
       transition: filter 0.15s var(--ease);
     }
     .seg__part:first-child { border-radius: 4px 0 0 4px; }
     .seg__part:last-child { border-radius: 0 4px 4px 0; }
     .seg__part:only-child { border-radius: 4px; }
     .seg__part:hover, .seg__part:focus-visible { filter: brightness(1.1); }
     .seg__part:focus-visible { box-shadow: var(--shadow-focus); }
     .seg__tip {
       position: absolute; left: 50%; bottom: calc(100% + 6px); z-index: 2;
       transform: translate(-50%, 4px); padding: 6px 10px; border-radius: var(--radius-sm);
       background: var(--surface-raised); color: var(--text-muted); font-size: var(--fs-xs);
       border: 1px solid var(--border-strong);
       white-space: nowrap; box-shadow: var(--shadow); pointer-events: none;
       opacity: 0; transition: opacity 0.12s, transform 0.12s;
     }
     .seg__tip strong { color: var(--text); }
     .seg__part:hover .seg__tip, .seg__part:focus-visible .seg__tip { opacity: 1; transform: translate(-50%, 0); }

     .legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px var(--sp-4); margin-top: var(--sp-3); }
     .legend li { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); }
     .legend__swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
     .legend__label { color: var(--text-muted); flex: 1; }
     .legend__value { color: var(--text); font-variant-numeric: tabular-nums; }`,
  ],
})
export class SegmentBar {
  readonly segments = input.required<Segment[]>();

  protected readonly total = computed(() => this.segments().reduce((s, x) => s + x.value, 0));
  protected readonly visible = computed(() => {
    const total = this.total() || 1;
    return this.segments()
      .filter((s) => s.value > 0)
      .map((s) => ({ ...s, share: Math.round((s.value / total) * 100) }));
  });
  protected readonly ariaLabel = computed(() =>
    this.segments()
      .map((s) => `${s.label}: ${s.value}`)
      .join(', '),
  );
}

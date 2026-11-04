import { Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
}

/**
 * Barras horizontais de magnitude (uma série, um matiz). Valor na ponta da
 * barra; hover/foco mostra a fatia do total. Ordena do maior para o menor.
 */
@Component({
  selector: 'app-bar-list',
  template: `
    <ul class="bars" role="list">
      @for (b of rows(); track b.label) {
        <li
          class="bar"
          tabindex="0"
          [attr.aria-label]="b.label + ': ' + b.value + ' ' + unit() + ' (' + b.share + '%)'"
        >
          <span class="bar__label" [title]="b.label">{{ b.label }}</span>
          <span class="bar__track">
            <span class="bar__fill" [style.width.%]="b.pct"></span>
            <span class="bar__value">{{ b.value }}</span>
            <span class="bar__tip" role="tooltip">
              <strong>{{ b.value }} {{ unit() }}</strong> {{ b.share }}% do total
            </span>
          </span>
        </li>
      }
    </ul>
  `,
  styles: [
    `:host { display: block; }
     .bars { display: flex; flex-direction: column; gap: 2px; }
     .bar {
       display: grid; grid-template-columns: minmax(0, 42%) 1fr; align-items: center;
       gap: var(--sp-3); padding: 7px 8px; border-radius: var(--radius-sm);
       outline: none; cursor: default;
     }
     .bar:hover, .bar:focus-visible { background: var(--surface-muted); }
     .bar:focus-visible { box-shadow: var(--shadow-focus); }
     .bar__label {
       font-size: var(--fs-sm); color: var(--text); overflow: hidden;
       text-overflow: ellipsis; white-space: nowrap;
     }
     .bar__track { position: relative; display: flex; align-items: center; gap: 8px; min-width: 0; }
     /* ≤24px de espessura; ponta de dados arredondada, base reta. */
     .bar__fill {
       height: 14px; min-width: 2px; border-radius: 0 4px 4px 0;
       background: var(--chart-series); transition: width 0.6s var(--ease), filter 0.15s var(--ease);
     }
     .bar:hover .bar__fill, .bar:focus-visible .bar__fill { filter: brightness(1.12); }
     .bar__value {
       font-size: var(--fs-sm); font-weight: 600; color: var(--text);
       font-variant-numeric: tabular-nums;
     }
     .bar__tip {
       position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 2;
       padding: 6px 10px; border-radius: var(--radius-sm);
       background: var(--brand-navy-deep); color: #e8eef6; font-size: var(--fs-xs);
       white-space: nowrap; box-shadow: var(--shadow); pointer-events: none;
       opacity: 0; transform: translateY(4px); transition: opacity 0.12s, transform 0.12s;
     }
     .bar__tip strong { color: #fff; margin-right: 4px; }
     .bar:hover .bar__tip, .bar:focus-visible .bar__tip { opacity: 1; transform: none; }`,
  ],
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  /** Unidade no tooltip/aria (ex.: "times"). */
  readonly unit = input('');

  protected readonly rows = computed(() => {
    const items = [...this.items()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const max = Math.max(1, ...items.map((i) => i.value));
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    return items.map((i) => ({
      ...i,
      pct: (i.value / max) * 88, // deixa ar à direita para o valor na ponta
      share: Math.round((i.value / total) * 100),
    }));
  });
}

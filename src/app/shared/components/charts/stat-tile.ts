import { Component, computed, input } from '@angular/core';
import { Icon } from '../../ui';
import { compact } from '../../format';

/**
 * Stat tile (KPI): rótulo · valor · linha de apoio e, opcionalmente, um medidor
 * de ocupação contra um limite (`max`). Sem `max` (null) = "ilimitado".
 * O medidor muda de severidade perto do limite (≥85% atenção, 100% lotado).
 */
@Component({
  selector: 'app-stat-tile',
  imports: [Icon],
  template: `
    <div class="tile">
      <div class="tile__head">
        <span class="tile__label">{{ label() }}</span>
        @if (icon()) {
          <span class="tile__icon"><app-icon [name]="icon()" [size]="18" /></span>
        }
      </div>
      <strong class="tile__value">{{ display() }}</strong>
      @if (meter(); as m) {
        <div
          class="meter"
          [attr.data-level]="m.level"
          role="meter"
          [attr.aria-valuenow]="value()"
          aria-valuemin="0"
          [attr.aria-valuemax]="max()"
          [attr.aria-label]="label() + ': ' + value() + ' de ' + max()"
        >
          <span class="meter__fill" [style.width.%]="m.pct"></span>
        </div>
        <span class="tile__sub">
          {{ m.pct }}% de {{ max() }} vagas
          @if (m.level === 'full') { · <strong>lotado</strong> }
        </span>
      } @else if (sub()) {
        <span class="tile__sub">{{ sub() }}</span>
      }
      @if (meter() && sub()) {
        <span class="tile__sub tile__sub--extra">{{ sub() }}</span>
      }
    </div>
  `,
  styles: [
    `:host { display: block; }
     .tile {
       height: 100%;
       display: flex; flex-direction: column; gap: 6px;
       background: var(--surface); border: 1px solid var(--border);
       border-radius: var(--radius-lg); padding: var(--sp-4) var(--sp-4) var(--sp-4) var(--sp-4);
       box-shadow: var(--shadow-sm);
     }
     .tile__head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
     .tile__label { font-size: var(--fs-sm); font-weight: 500; color: var(--text-muted); }
     .tile__icon {
       display: inline-flex; align-items: center; justify-content: center;
       width: 32px; height: 32px; border-radius: var(--radius);
       background: var(--brand-gradient-soft); color: var(--brand-blue);
     }
     .tile__value {
       font-family: var(--font-body); font-weight: 650; font-size: 2rem;
       line-height: 1.1; letter-spacing: -0.02em; color: var(--text);
     }
     .tile__sub { font-size: var(--fs-xs); color: var(--text-subtle); }
     .tile__sub strong { color: var(--danger); }
     .tile__sub--extra { margin-top: -2px; }

     /* Medidor: trilho = passo claro da mesma rampa; preenchimento carrega a severidade. */
     .meter {
       height: 8px; border-radius: var(--radius-full); overflow: hidden;
       background: var(--chart-track); margin-top: 4px;
     }
     .meter__fill {
       display: block; height: 100%; border-radius: var(--radius-full);
       background: var(--chart-series); transition: width 0.6s var(--ease);
     }
     .meter[data-level='warn'] { background: var(--warning-bg); }
     .meter[data-level='warn'] .meter__fill { background: var(--warning); }
     .meter[data-level='full'] { background: var(--danger-bg); }
     .meter[data-level='full'] .meter__fill { background: var(--danger); }`,
  ],
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input('');
  readonly sub = input('');
  /** Limite para o medidor. `undefined` = sem medidor; `null` = ilimitado (sem medidor). */
  readonly max = input<number | null | undefined>(undefined);

  protected readonly display = computed(() => compact(this.value()));

  protected readonly meter = computed(() => {
    const max = this.max();
    if (!max) return null;
    const pct = Math.min(100, Math.round((this.value() / max) * 100));
    const level = this.value() >= max ? 'full' : pct >= 85 ? 'warn' : 'ok';
    return { pct, level };
  });
}

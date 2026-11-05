import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';

export interface TrendPoint {
  /** Dia (ISO `YYYY-MM-DD`). */
  date: string;
  value: number;
  /** Variação do dia (para o tooltip), opcional. */
  delta?: number;
}

const W = 1000;
const H = 260;
const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const fmtDay = (iso: string) => dayFmt.format(new Date(`${iso}T12:00:00`)).replace('.', '');

/** Passo "limpo" (1, 2, 5 × 10ⁿ) para os ticks do eixo Y. */
function niceStep(max: number, ticks = 4): number {
  const raw = Math.max(1, max) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  // Contagens são inteiras e os rótulos são arredondados: passo < 1 repetiria ticks (0, 1, 1, 2, 2).
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
}

/**
 * Área de série única ao longo do tempo (linha 2px + lavagem ~10%). Crosshair
 * encontra o X mais próximo no hover; setas ←/→ fazem o mesmo pelo teclado.
 * Sem legenda (uma série — o título do card a nomeia); tabela em "Ver dados".
 */
@Component({
  selector: 'app-trend-chart',
  template: `
    <div class="trend">
      <div
        #plot
        class="trend__plot"
        tabindex="0"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (pointermove)="onPointer($event)"
        (pointerleave)="active.set(null)"
        (blur)="active.set(null)"
        (keydown)="onKey($event)"
      >
        @for (t of ticks(); track t.value) {
          <div class="trend__grid" [style.bottom.%]="t.pct">
            <span class="trend__tick">{{ t.value }}</span>
          </div>
        }
        <svg class="trend__svg" [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" aria-hidden="true">
          <path class="trend__area" [attr.d]="paths().area" />
          <path class="trend__line" [attr.d]="paths().line" vector-effect="non-scaling-stroke" />
        </svg>

        @if (last(); as l) {
          <span class="trend__dot" [style.left.%]="l.x" [style.bottom.%]="l.y"></span>
          <span class="trend__end" [style.bottom.%]="l.y">{{ l.value }}</span>
        }

        @if (hovered(); as h) {
          <div class="trend__cross" [style.left.%]="h.x"></div>
          <span class="trend__dot trend__dot--hover" [style.left.%]="h.x" [style.bottom.%]="h.y"></span>
          <div class="trend__tip" [class.is-right]="h.x > 60" [style.left.%]="h.x" role="tooltip">
            <strong>{{ h.value }}</strong> {{ unit() }}
            @if (h.delta) { <span class="trend__delta">+{{ h.delta }} no dia</span> }
            <span class="trend__date">{{ h.label }}</span>
          </div>
        }
      </div>
      <div class="trend__x">
        @for (x of xLabels(); track x.label) {
          <span [style.left.%]="x.pct">{{ x.label }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `:host { display: block; }
     .trend { padding-left: 34px; }
     .trend__plot { position: relative; height: 200px; outline: none; border-radius: var(--radius-sm); touch-action: pan-y; }
     .trend__plot:focus-visible { box-shadow: var(--shadow-focus); }
     .trend__grid { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid var(--chart-grid); }
     .trend__grid:first-child { border-top-color: var(--chart-axis); }
     .trend__tick {
       position: absolute; right: calc(100% + 8px); top: -8px;
       font-size: 11px; color: var(--text-subtle); font-variant-numeric: tabular-nums;
     }
     .trend__svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
     .trend__area { fill: var(--chart-series); opacity: 0.1; }
     .trend__line { fill: none; stroke: var(--chart-series); stroke-width: 2px; stroke-linejoin: round; stroke-linecap: round; }
     .trend__dot {
       position: absolute; width: 10px; height: 10px; margin: 0 0 -5px -5px; border-radius: 50%;
       background: var(--chart-series); box-shadow: 0 0 0 2px var(--surface); pointer-events: none;
     }
     .trend__end {
       position: absolute; right: -6px; transform: translate(100%, 50%);
       font-size: var(--fs-sm); font-weight: 600; color: var(--text); padding-left: 6px;
     }
     .trend__cross { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid var(--chart-axis); pointer-events: none; }
     .trend__tip {
       position: absolute; top: -6px; transform: translate(10px, -100%);
       display: flex; flex-direction: column; gap: 1px; min-width: 120px;
       padding: 8px 10px; border-radius: var(--radius-sm); pointer-events: none;
       background: var(--surface-raised); color: var(--text-muted); font-size: var(--fs-xs);
       border: 1px solid var(--border-strong);
       box-shadow: var(--shadow); z-index: 2;
     }
     .trend__tip.is-right { transform: translate(calc(-100% - 10px), -100%); }
     .trend__tip strong { color: var(--text); font-size: var(--fs-base); }
     .trend__delta { color: var(--accent-text); }
     .trend__date { color: var(--text-subtle); }
     .trend__x { position: relative; height: 22px; margin-top: 6px; }
     .trend__x span {
       position: absolute; transform: translateX(-50%); white-space: nowrap;
       font-size: 11px; color: var(--text-subtle);
     }
     .trend__x span:first-child { transform: none; }
     .trend__x span:last-child:not(:first-child) { transform: translateX(-100%); }`,
  ],
})
export class TrendChart {
  readonly points = input.required<TrendPoint[]>();
  /** Unidade no tooltip (ex.: "inscrições"). */
  readonly unit = input('');

  protected readonly W = W;
  protected readonly H = H;
  protected readonly active = signal<number | null>(null);
  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  private readonly yMax = computed(() => {
    const max = Math.max(0, ...this.points().map((p) => p.value));
    const step = niceStep(max);
    return Math.max(step, Math.ceil(max / step) * step);
  });

  protected readonly ticks = computed(() => {
    const step = niceStep(this.yMax());
    const out: { value: number; pct: number }[] = [];
    for (let v = 0; v <= this.yMax() + 1e-9; v += step) out.push({ value: Math.round(v), pct: (v / this.yMax()) * 100 });
    return out;
  });

  /** Posições em % (x da esquerda, y de baixo) — compartilhadas por SVG e HTML. */
  private readonly coords = computed(() => {
    const pts = this.points();
    const n = Math.max(1, pts.length - 1);
    return pts.map((p, i) => ({
      ...p,
      x: pts.length === 1 ? 50 : (i / n) * 100,
      y: (p.value / this.yMax()) * 100,
      label: fmtDay(p.date),
    }));
  });

  protected readonly paths = computed(() => {
    const c = this.coords();
    if (!c.length) return { line: '', area: '' };
    const pt = (p: { x: number; y: number }) => `${((p.x / 100) * W).toFixed(1)},${(H - (p.y / 100) * H).toFixed(1)}`;
    const line = 'M' + c.map(pt).join(' L');
    const area = `${line} L${((c[c.length - 1].x / 100) * W).toFixed(1)},${H} L${((c[0].x / 100) * W).toFixed(1)},${H} Z`;
    return { line, area };
  });

  protected readonly last = computed(() => this.coords().at(-1) ?? null);
  protected readonly hovered = computed(() => {
    const i = this.active();
    return i === null ? null : (this.coords()[i] ?? null);
  });

  /** Primeiro, meio e último dia — o suficiente para orientar sem poluir. */
  protected readonly xLabels = computed(() => {
    const c = this.coords();
    if (!c.length) return [];
    const idx = c.length > 4 ? [0, Math.floor((c.length - 1) / 2), c.length - 1] : c.length > 1 ? [0, c.length - 1] : [0];
    return idx.map((i) => ({ label: c[i].label, pct: c[i].x }));
  });

  protected readonly ariaLabel = computed(() => {
    const c = this.coords();
    if (!c.length) return 'Sem dados';
    return `Tendência de ${this.unit()}: de ${c[0].value} em ${c[0].label} a ${c[c.length - 1].value} em ${c[c.length - 1].label}. Use as setas para navegar.`;
  });

  protected onPointer(e: PointerEvent): void {
    const n = this.points().length;
    if (!n) return;
    const rect = this.plot().nativeElement.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    this.active.set(Math.round(frac * (n - 1)));
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.points().length;
    if (!n || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const cur = this.active() ?? n - 1;
    this.active.set(Math.min(n - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1))));
  }
}

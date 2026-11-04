import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TrendChart, TrendPoint } from './trend-chart';

function series(values: number[]): TrendPoint[] {
  let prev = 0;
  return values.map((value, i) => {
    const p = { date: `2026-10-${String(i + 1).padStart(2, '0')}`, value, delta: value - prev };
    prev = value;
    return p;
  });
}

describe('TrendChart', () => {
  let fixture: ComponentFixture<TrendChart>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TrendChart], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(TrendChart);
    el = fixture.nativeElement;
  });

  async function render(points: TrendPoint[], unit = 'inscrições') {
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('unit', unit);
    await fixture.whenStable();
  }

  const ticks = () => Array.from(el.querySelectorAll('.trend__tick')).map((t) => Number(t.textContent!.trim()));
  const plot = () => el.querySelector<HTMLElement>('.trend__plot')!;
  const tooltip = () => el.querySelector('.trend__tip');
  /** Texto do tooltip com cada parte (valor, unidade, delta, dia) separada por espaço. */
  const tipText = () =>
    Array.from(tooltip()!.childNodes)
      .filter((n) => n.nodeType !== Node.COMMENT_NODE)
      .map((n) => n.textContent!.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ');

  async function key(k: string) {
    const ev = new KeyboardEvent('keydown', { key: k, cancelable: true });
    plot().dispatchEvent(ev);
    await fixture.whenStable();
    return ev;
  }

  describe('eixo Y', () => {
    it('usa passos "limpos" (1, 2, 5 × 10ⁿ) cobrindo o máximo', async () => {
      await render(series([0, 10, 25, 40]));
      expect(ticks()).toEqual([0, 10, 20, 30, 40]);
    });

    it('arredonda o topo para cima no passo', async () => {
      await render(series([3, 37]));
      expect(ticks()).toEqual([0, 10, 20, 30, 40]);

      await render(series([1, 7]));
      expect(ticks()).toEqual([0, 2, 4, 6, 8]);

      await render(series([20, 120]));
      expect(ticks()).toEqual([0, 50, 100, 150]);
    });

    it('séries pequenas (contagens) geram ticks inteiros e sem repetição', async () => {
      for (const max of [0, 1, 2, 3, 5]) {
        await render(series([0, max]));
        const t = ticks();
        expect(new Set(t).size).toBe(t.length);
        expect(t.every(Number.isInteger)).toBe(true);
        expect(t[0]).toBe(0);
        expect(t.at(-1)).toBeGreaterThanOrEqual(max);
      }
    });

    it('ticks são posicionados proporcionalmente (0% a 100%)', async () => {
      await render(series([0, 10, 25, 40]));
      const bottoms = Array.from(el.querySelectorAll<HTMLElement>('.trend__grid')).map((g) => g.style.bottom);
      expect(bottoms).toEqual(['0%', '25%', '50%', '75%', '100%']);
    });
  });

  describe('SVG', () => {
    it('gera a linha e a área a partir dos pontos', async () => {
      await render(series([0, 5, 10]));
      const line = el.querySelector('.trend__line')!.getAttribute('d');
      const area = el.querySelector('.trend__area')!.getAttribute('d');
      expect(line).toBe('M0.0,260.0 L500.0,130.0 L1000.0,0.0');
      expect(area).toBe('M0.0,260.0 L500.0,130.0 L1000.0,0.0 L1000.0,260 L0.0,260 Z');
    });

    it('sem pontos não desenha nada e o aria-label avisa', async () => {
      await render([]);
      expect(el.querySelector('.trend__line')!.getAttribute('d')).toBe('');
      expect(plot().getAttribute('aria-label')).toBe('Sem dados');
      expect(el.querySelector('.trend__end')).toBeNull();
    });

    it('um único ponto fica centralizado', async () => {
      await render(series([4]));
      expect(el.querySelector<HTMLElement>('.trend__dot')!.style.left).toBe('50%');
    });
  });

  describe('rótulos', () => {
    it('o rótulo final mostra o último valor', async () => {
      await render(series([1, 4, 9]));
      expect(el.querySelector('.trend__end')!.textContent!.trim()).toBe('9');
    });

    it('eixo X mostra primeiro, meio e último dia em séries longas', async () => {
      await render(series([1, 2, 3, 4, 5, 6, 7]));
      const labels = Array.from(el.querySelectorAll('.trend__x span')).map((s) => s.textContent!.trim());
      expect(labels).toEqual(['01 de out', '04 de out', '07 de out']);
    });

    it('eixo X mostra só as pontas em séries curtas', async () => {
      await render(series([1, 2, 3]));
      expect(el.querySelectorAll('.trend__x span').length).toBe(2);
    });

    it('aria-label resume início e fim da série', async () => {
      await render(series([2, 9]));
      expect(plot().getAttribute('aria-label')).toBe(
        'Tendência de inscrições: de 2 em 01 de out a 9 em 02 de out. Use as setas para navegar.',
      );
    });
  });

  describe('interação por teclado', () => {
    beforeEach(() => render(series([1, 4, 9])));

    it('sem foco ativo não mostra tooltip', () => {
      expect(tooltip()).toBeNull();
    });

    it('← parte do último ponto e mostra o tooltip do anterior', async () => {
      const ev = await key('ArrowLeft');
      expect(ev.defaultPrevented).toBe(true);
      expect(tipText()).toBe('4 inscrições +3 no dia 02 de out');
      expect(el.querySelector<HTMLElement>('.trend__cross')!.style.left).toBe('50%');
    });

    it('→ avança e para no último ponto', async () => {
      await key('ArrowLeft');
      await key('ArrowLeft');
      expect(tipText()).toContain('01 de out');
      await key('ArrowRight');
      await key('ArrowRight');
      await key('ArrowRight');
      expect(tipText()).toBe('9 inscrições +5 no dia 03 de out');
    });

    it('← não passa do primeiro ponto', async () => {
      for (let i = 0; i < 5; i++) await key('ArrowLeft');
      expect(tipText()).toBe('1 inscrições +1 no dia 01 de out');
    });

    it('outras teclas são ignoradas', async () => {
      const ev = await key('Enter');
      expect(ev.defaultPrevented).toBe(false);
      expect(tooltip()).toBeNull();
    });

    it('blur e pointerleave escondem o tooltip', async () => {
      await key('ArrowLeft');
      plot().dispatchEvent(new FocusEvent('blur'));
      await fixture.whenStable();
      expect(tooltip()).toBeNull();

      await key('ArrowLeft');
      plot().dispatchEvent(new MouseEvent('pointerleave'));
      await fixture.whenStable();
      expect(tooltip()).toBeNull();
    });
  });

  it('ponteiro ativa o ponto mais próximo do X', async () => {
    await render(series([1, 4, 9]));
    vi.spyOn(plot(), 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200,
      top: 0,
      right: 300,
      bottom: 200,
      height: 200,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });
    plot().dispatchEvent(new MouseEvent('pointermove', { clientX: 110 }));
    await fixture.whenStable();
    expect(tipText()).toContain('01 de out');

    plot().dispatchEvent(new MouseEvent('pointermove', { clientX: 290 }));
    await fixture.whenStable();
    expect(tipText()).toContain('03 de out');
  });
});

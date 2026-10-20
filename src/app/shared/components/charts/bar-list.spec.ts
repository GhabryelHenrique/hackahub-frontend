import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BarItem, BarList } from './bar-list';

describe('BarList', () => {
  let fixture: ComponentFixture<BarList>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarList], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(BarList);
  });

  async function render(items: BarItem[], unit = 'times') {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('unit', unit);
    await fixture.whenStable();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.bar')).map((li) => ({
      label: li.querySelector('.bar__label')!.textContent!.trim(),
      value: li.querySelector('.bar__value')!.textContent!.trim(),
      width: li.querySelector<HTMLElement>('.bar__fill')!.style.width,
      tip: li.querySelector('.bar__tip')!.textContent!.replace(/\s+/g, ' ').trim(),
      aria: li.getAttribute('aria-label'),
    }));
  }

  it('ordena do maior para o menor (empate por rótulo)', async () => {
    const rows = await render([
      { label: 'Saúde', value: 1 },
      { label: 'Mobilidade', value: 3 },
      { label: 'Educação', value: 1 },
      { label: 'Energia', value: 0 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(['Mobilidade', 'Educação', 'Saúde', 'Energia']);
    expect(rows.map((r) => r.value)).toEqual(['3', '1', '1', '0']);
  });

  it('não altera a lista recebida', async () => {
    const items = [
      { label: 'B', value: 1 },
      { label: 'A', value: 2 },
    ];
    await render(items);
    expect(items.map((i) => i.label)).toEqual(['B', 'A']);
  });

  it('escala a largura pelo maior valor (88% para o máximo)', async () => {
    const rows = await render([
      { label: 'A', value: 4 },
      { label: 'B', value: 2 },
      { label: 'C', value: 1 },
    ]);
    expect(rows.map((r) => r.width)).toEqual(['88%', '44%', '22%']);
  });

  it('calcula a fatia do total no tooltip e no aria-label', async () => {
    const rows = await render([
      { label: 'Mobilidade', value: 3 },
      { label: 'Saúde', value: 1 },
    ]);
    expect(rows[0].tip).toBe('3 times 75% do total');
    expect(rows[1].tip).toBe('1 times 25% do total');
    expect(rows[0].aria).toBe('Mobilidade: 3 times (75%)');
  });

  it('tudo zero não quebra (largura 0 e 0%)', async () => {
    const rows = await render([
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
    ]);
    expect(rows.map((r) => r.width)).toEqual(['0%', '0%']);
    expect(rows.every((r) => r.aria!.endsWith('(0%)'))).toBe(true);
  });

  it('lista vazia não renderiza barras', async () => {
    expect(await render([])).toEqual([]);
  });
});

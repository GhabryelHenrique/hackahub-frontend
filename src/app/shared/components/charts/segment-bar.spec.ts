import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Segment, SegmentBar } from './segment-bar';

const segs = (values: [number, number, number, number]): Segment[] => [
  { key: 'PENDING', label: 'Na fila', value: values[0], color: 'var(--warning)' },
  { key: 'IN_PROGRESS', label: 'Em atendimento', value: values[1], color: 'var(--info)' },
  { key: 'COMPLETED', label: 'Concluído', value: values[2], color: 'var(--success)' },
  { key: 'CANCELLED', label: 'Cancelado', value: values[3], color: 'var(--n-400)' },
];

describe('SegmentBar', () => {
  let fixture: ComponentFixture<SegmentBar>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SegmentBar], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(SegmentBar);
    el = fixture.nativeElement;
  });

  async function render(segments: Segment[]) {
    fixture.componentRef.setInput('segments', segments);
    await fixture.whenStable();
  }

  const parts = () => Array.from(el.querySelectorAll<HTMLElement>('.seg__part'));
  const legend = () =>
    Array.from(el.querySelectorAll('.legend li')).map((li) => ({
      label: li.querySelector('.legend__label')!.textContent!.trim(),
      value: li.querySelector('.legend__value')!.textContent!.trim(),
    }));

  it('esconde segmentos zerados na barra', async () => {
    await render(segs([2, 0, 6, 0]));
    expect(parts().length).toBe(2);
    expect(parts().map((p) => p.style.flexGrow)).toEqual(['2', '6']);
  });

  it('calcula a fatia de cada segmento no tooltip', async () => {
    await render(segs([1, 0, 3, 0]));
    const tips = parts().map((p) => p.querySelector('.seg__tip')!.textContent!.replace(/\s+/g, ' ').trim());
    expect(tips).toEqual(['1 Na fila · 25%', '3 Concluído · 75%']);
  });

  it('a legenda lista todos os segmentos, inclusive os zerados', async () => {
    await render(segs([2, 0, 6, 0]));
    expect(legend()).toEqual([
      { label: 'Na fila', value: '2' },
      { label: 'Em atendimento', value: '0' },
      { label: 'Concluído', value: '6' },
      { label: 'Cancelado', value: '0' },
    ]);
  });

  it('aria-label da barra descreve todos os valores', async () => {
    await render(segs([2, 1, 0, 0]));
    expect(el.querySelector('.seg')!.getAttribute('aria-label')).toBe(
      'Na fila: 2, Em atendimento: 1, Concluído: 0, Cancelado: 0',
    );
  });

  it('total zero mostra a barra vazia, mas mantém a legenda', async () => {
    await render(segs([0, 0, 0, 0]));
    expect(el.querySelector('.seg--empty')).not.toBeNull();
    expect(el.querySelector('[role="img"]')).toBeNull();
    expect(parts().length).toBe(0);
    expect(legend().length).toBe(4);
  });
});

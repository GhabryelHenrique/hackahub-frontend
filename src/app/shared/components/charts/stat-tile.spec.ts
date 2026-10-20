import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StatTile } from './stat-tile';

describe('StatTile', () => {
  let fixture: ComponentFixture<StatTile>;
  let el: HTMLElement;

  async function render(inputs: { value: number; max?: number | null; sub?: string; label?: string }) {
    TestBed.configureTestingModule({ imports: [StatTile], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(StatTile);
    fixture.componentRef.setInput('label', inputs.label ?? 'Participantes');
    fixture.componentRef.setInput('value', inputs.value);
    if (inputs.max !== undefined) fixture.componentRef.setInput('max', inputs.max);
    if (inputs.sub !== undefined) fixture.componentRef.setInput('sub', inputs.sub);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const meter = () => el.querySelector<HTMLElement>('.meter');
  const fill = () => el.querySelector<HTMLElement>('.meter__fill');
  const subs = () => Array.from(el.querySelectorAll('.tile__sub')).map((s) => s.textContent!.replace(/\s+/g, ' ').trim());

  it('mostra rótulo e valor', async () => {
    await render({ value: 42 });
    expect(el.querySelector('.tile__label')!.textContent).toContain('Participantes');
    expect(el.querySelector('.tile__value')!.textContent!.trim()).toBe('42');
  });

  it('valor grande é compactado', async () => {
    await render({ value: 12_345 });
    expect(el.querySelector('.tile__value')!.textContent!.replace(/\s/g, ' ').trim()).toBe('12,3 mil');
  });

  it('sem max não há medidor e a linha de apoio aparece', async () => {
    await render({ value: 10, sub: 'Vagas ilimitadas' });
    expect(meter()).toBeNull();
    expect(subs()).toEqual(['Vagas ilimitadas']);
  });

  it('max null (ilimitado) ou 0 não mostra medidor', async () => {
    await render({ value: 10, max: null });
    expect(meter()).toBeNull();

    TestBed.resetTestingModule();
    await render({ value: 10, max: 0 });
    expect(meter()).toBeNull();
  });

  it('medidor "ok" abaixo de 85% com a ocupação no texto', async () => {
    await render({ value: 40, max: 100 });
    expect(meter()!.dataset['level']).toBe('ok');
    expect(fill()!.style.width).toBe('40%');
    expect(subs()[0]).toBe('40% de 100 vagas');
    expect(meter()!.getAttribute('aria-valuenow')).toBe('40');
    expect(meter()!.getAttribute('aria-valuemax')).toBe('100');
    expect(meter()!.getAttribute('aria-label')).toBe('Participantes: 40 de 100');
  });

  it('medidor "warn" a partir de 85%', async () => {
    await render({ value: 16, max: 20 });
    expect(meter()!.dataset['level']).toBe('ok');

    TestBed.resetTestingModule();
    await render({ value: 17, max: 20 });
    expect(meter()!.dataset['level']).toBe('warn');
    expect(subs()[0]).toBe('85% de 20 vagas');
  });

  it('medidor "full" no limite, com aviso de lotado', async () => {
    await render({ value: 20, max: 20 });
    expect(meter()!.dataset['level']).toBe('full');
    expect(subs()[0]).toBe('100% de 20 vagas · lotado');
  });

  it('acima do limite o preenchimento fica travado em 100%', async () => {
    await render({ value: 30, max: 20 });
    expect(meter()!.dataset['level']).toBe('full');
    expect(fill()!.style.width).toBe('100%');
  });

  it('com medidor e sub, mostra o sub como linha extra', async () => {
    await render({ value: 5, max: 10, sub: '3 aguardando aprovação' });
    expect(subs()).toEqual(['50% de 10 vagas', '3 aguardando aprovação']);
  });
});

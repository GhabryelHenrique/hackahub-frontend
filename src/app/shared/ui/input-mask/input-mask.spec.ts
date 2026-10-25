import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputMask } from './input-mask';

@Component({
  imports: [ReactiveFormsModule, InputMask],
  template: `
    <input id="cpf" [formControl]="cpf" appMask="cpf" />
    <input id="phone" [formControl]="phone" appMask="phone" />
  `,
})
class Host {
  readonly cpf = new FormControl('', { nonNullable: true });
  readonly phone = new FormControl('', { nonNullable: true });
}

describe('InputMask', () => {
  let host: Host;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  const field = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;

  /** Simula o navegador: valor bruto no input, cursor em `caret` e evento `input`. */
  function type(id: string, value: string, inputType = 'insertText', caret = value.length) {
    const i = field(id);
    i.value = value;
    i.setSelectionRange(caret, caret);
    i.dispatchEvent(new InputEvent('input', { inputType }));
  }

  it('exibe formatado e guarda só os dígitos no controle', () => {
    type('cpf', '52998224725');
    expect(field('cpf').value).toBe('529.982.247-25');
    expect(host.cpf.value).toBe('52998224725');

    type('phone', '11987654321');
    expect(field('phone').value).toBe('(11) 98765-4321');
    expect(host.phone.value).toBe('11987654321');
  });

  it('descarta letras/símbolos e o excesso de dígitos', () => {
    type('cpf', 'abc529.982.247-25999');
    expect(host.cpf.value).toBe('52998224725');
    expect(field('cpf').value).toBe('529.982.247-25');
  });

  it('formata o valor vindo do modelo (setValue/patchValue)', () => {
    host.phone.setValue('1134567890');
    expect(field('phone').value).toBe('(11) 3456-7890');
    host.cpf.setValue('529.982.247-25');
    expect(field('cpf').value).toBe('529.982.247-25');
  });

  it('mantém o cursor depois do dígito editado no meio do texto', () => {
    type('cpf', '529982247');
    expect(field('cpf').value).toBe('529.982.247');
    // Insere "0" logo após "529." (cursor na posição 5 do texto bruto).
    type('cpf', '529.0982.247', 'insertText', 5);
    expect(field('cpf').value).toBe('529.098.224-7');
    expect(field('cpf').selectionStart).toBe(5);
  });

  it('backspace logo após um separador apaga o dígito anterior', () => {
    type('cpf', '5299');
    expect(field('cpf').value).toBe('529.9');
    // "529.|9": o backspace remove só o ponto (dígitos iguais) → apaga o "9" antes dele.
    type('cpf', '5299', 'deleteContentBackward', 3);
    expect(host.cpf.value).toBe('529');
    expect(field('cpf').value).toBe('529');
  });

  it('define inputmode e maxlength conforme a máscara', () => {
    expect(field('cpf').getAttribute('inputmode')).toBe('numeric');
    expect(field('cpf').getAttribute('maxlength')).toBe('14');
    expect(field('phone').getAttribute('inputmode')).toBe('tel');
    expect(field('phone').getAttribute('maxlength')).toBe('15');
  });

  it('marca como touched no blur e respeita disable', () => {
    field('cpf').dispatchEvent(new Event('blur'));
    expect(host.cpf.touched).toBe(true);
    host.cpf.disable();
    expect(field('cpf').disabled).toBe(true);
  });
});

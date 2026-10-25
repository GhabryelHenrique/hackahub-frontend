import {
  Directive,
  ElementRef,
  Renderer2,
  computed,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { digitsOnly, formatCpf, formatPhone } from '../../format';

export type MaskKind = 'cpf' | 'phone';

const MASKS: Record<MaskKind, { format: (digits: string) => string; maxDigits: number }> = {
  cpf: { format: formatCpf, maxDigits: 11 },
  phone: { format: formatPhone, maxDigits: 11 },
};

/**
 * Máscara de digitação para `<input>` de formulário reativo: exibe o valor
 * formatado ("123.456.789-09") e entrega ao controle só os dígitos — o formato
 * que a API valida e guarda. Como ControlValueAccessor próprio, substitui o
 * DefaultValueAccessor do input (`<input formControlName="phone" appMask="phone">`).
 */
@Directive({
  selector: 'input[appMask]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputMask), multi: true },
  ],
  host: {
    '[attr.inputmode]': 'inputMode()',
    '[attr.maxlength]': 'maxLength()',
    '(input)': 'onInput($event)',
    '(blur)': 'onTouched()',
  },
})
export class InputMask implements ControlValueAccessor {
  readonly appMask = input.required<MaskKind>();

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly mask = computed(() => MASKS[this.appMask()]);
  private digits = '';
  private onChange: (digits: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected readonly inputMode = computed(() => (this.appMask() === 'phone' ? 'tel' : 'numeric'));
  protected readonly maxLength = computed(
    () => this.mask().format('0'.repeat(this.mask().maxDigits)).length,
  );

  writeValue(value: string | null | undefined): void {
    this.digits = digitsOnly(value).slice(0, this.mask().maxDigits);
    this.renderer.setProperty(this.el, 'value', this.mask().format(this.digits));
  }

  registerOnChange(fn: (digits: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el, 'disabled', isDisabled);
  }

  protected onInput(event: Event): void {
    const { format, maxDigits } = this.mask();
    const raw = this.el.value;
    const caret = this.el.selectionStart ?? raw.length;
    let before = digitsOnly(raw.slice(0, caret)).length;
    let digits = digitsOnly(raw);

    // Backspace logo após um separador ("123.|") apagaria só o ponto, que a
    // máscara recoloca — apaga o dígito anterior para a tecla não "travar".
    if (
      (event as InputEvent).inputType === 'deleteContentBackward' &&
      digits === this.digits &&
      before > 0
    ) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before--;
    }

    this.digits = digits.slice(0, maxDigits);
    const formatted = format(this.digits);
    this.el.value = formatted;

    // Mantém o cursor depois do mesmo dígito (edição no meio do texto).
    let pos = 0;
    for (let seen = 0; pos < formatted.length && seen < before; pos++) {
      if (/\d/.test(formatted[pos])) seen++;
    }
    this.el.setSelectionRange(pos, pos);

    this.onChange(this.digits);
  }
}

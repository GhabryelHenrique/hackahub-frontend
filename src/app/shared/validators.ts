/* Validadores de documentos BR (CPF/telefone) — espelham as regras da API. */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { digitsOnly } from './format';

/** CPF com 11 dígitos e dígitos verificadores válidos (rejeita "111.111.111-11" etc.). */
export function isValidCpf(value: string | null | undefined): boolean {
  const d = digitsOnly(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

/** Telefone BR com DDD: fixo (10 dígitos, começa em 2–8) ou celular (11 dígitos, começa em 9). */
export function isValidPhone(value: string | null | undefined): boolean {
  return /^[1-9]{2}(?:9\d{8}|[2-8]\d{7})$/.test(digitsOnly(value));
}

/** Vazio passa (combine com `Validators.required`); inválido → `{ cpf: true }`. */
export const cpfValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || isValidCpf(c.value) ? null : { cpf: true };

/** Vazio passa (combine com `Validators.required`); inválido → `{ phone: true }`. */
export const phoneValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || isValidPhone(c.value) ? null : { phone: true };

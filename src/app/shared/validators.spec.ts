import { FormControl } from '@angular/forms';
import { cpfValidator, isValidCpf, isValidPhone, phoneValidator } from './validators';

describe('validators', () => {
  describe('isValidCpf', () => {
    it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
      expect(isValidCpf('52998224725')).toBe(true);
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('recusa dígito verificador errado', () => {
      expect(isValidCpf('52998224724')).toBe(false);
      expect(isValidCpf('52998224715')).toBe(false);
    });

    it('recusa tamanho diferente de 11 e sequências repetidas', () => {
      expect(isValidCpf('5299822472')).toBe(false);
      expect(isValidCpf('529982247250')).toBe(false);
      expect(isValidCpf('11111111111')).toBe(false);
      expect(isValidCpf('')).toBe(false);
      expect(isValidCpf(null)).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('aceita celular (11 dígitos, 9 inicial) e fixo (10 dígitos)', () => {
      expect(isValidPhone('11987654321')).toBe(true);
      expect(isValidPhone('(11) 98765-4321')).toBe(true);
      expect(isValidPhone('1134567890')).toBe(true);
    });

    it('recusa sem DDD, DDD com zero e prefixos inválidos', () => {
      expect(isValidPhone('987654321')).toBe(false);
      expect(isValidPhone('01987654321')).toBe(false);
      expect(isValidPhone('11887654321')).toBe(false); // 11 dígitos sem o 9
      expect(isValidPhone('1194567890')).toBe(false); // fixo começando em 9
      expect(isValidPhone('119876543210')).toBe(false);
    });
  });

  describe('ValidatorFn', () => {
    it('vazio passa (fica a cargo do Validators.required)', () => {
      expect(cpfValidator(new FormControl(''))).toBeNull();
      expect(phoneValidator(new FormControl(''))).toBeNull();
    });

    it('marca { cpf } / { phone } quando inválido', () => {
      expect(cpfValidator(new FormControl('12345678900'))).toEqual({ cpf: true });
      expect(phoneValidator(new FormControl('123'))).toEqual({ phone: true });
      expect(cpfValidator(new FormControl('52998224725'))).toBeNull();
      expect(phoneValidator(new FormControl('11987654321'))).toBeNull();
    });
  });
});

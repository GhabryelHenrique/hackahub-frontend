import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TokenStorage } from './token-storage';

const KEY = 'hackahub.token';

describe('TokenStorage', () => {
  function setup(platform: 'browser' | 'server' = 'browser'): TokenStorage {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: platform }],
    });
    return TestBed.inject(TokenStorage);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('no navegador, restaura o token salvo no localStorage', () => {
    localStorage.setItem(KEY, 'tok-salvo');
    expect(setup().token()).toBe('tok-salvo');
  });

  it('sem token salvo começa nulo', () => {
    expect(setup().token()).toBeNull();
  });

  it('set atualiza o signal e persiste; clear remove', () => {
    const storage = setup();
    storage.set('novo');
    expect(storage.token()).toBe('novo');
    expect(localStorage.getItem(KEY)).toBe('novo');

    storage.clear();
    expect(storage.token()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('no servidor (SSR) não lê nem grava o localStorage', () => {
    localStorage.setItem(KEY, 'do-browser');
    const storage = setup('server');
    expect(storage.token()).toBeNull();

    storage.set('em-memoria');
    expect(storage.token()).toBe('em-memoria');
    expect(localStorage.getItem(KEY)).toBe('do-browser');
  });

  it('tolera storage indisponível (mantém só em memória)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const storage = setup();
    expect(storage.token()).toBeNull();
    expect(() => storage.set('x')).not.toThrow();
    expect(storage.token()).toBe('x');
    expect(() => storage.clear()).not.toThrow();
    expect(storage.token()).toBeNull();
  });
});

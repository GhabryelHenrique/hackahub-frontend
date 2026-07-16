import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'hackahub.token';

/**
 * Guarda o token de sessão. Persiste em localStorage no navegador; no servidor
 * (SSR) mantém apenas em memória para não quebrar a renderização.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly token = signal<string | null>(this.read());

  private read(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  set(token: string): void {
    this.token.set(token);
    if (this.isBrowser) {
      try {
        localStorage.setItem(KEY, token);
      } catch {
        /* storage indisponível — mantém só em memória */
      }
    }
  }

  clear(): void {
    this.token.set(null);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    }
  }
}

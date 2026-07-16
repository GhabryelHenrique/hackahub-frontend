import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  text: string;
}

/** Notificações efêmeras (docs §5 — Toast). Signal-based, zoneless-friendly. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, text: string, timeout = 4500): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, type, text }]);
    if (timeout > 0 && typeof setTimeout !== 'undefined') {
      setTimeout(() => this.dismiss(id), timeout);
    }
  }

  success(text: string) { this.show('success', text); }
  error(text: string) { this.show('error', text); }
  info(text: string) { this.show('info', text); }
  warning(text: string) { this.show('warning', text); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

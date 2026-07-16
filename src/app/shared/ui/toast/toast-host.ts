import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../../core/toast/toast.service';
import { Icon } from '../icon/icon';

const ICON: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'x-circle',
  info: 'info',
  warning: 'alert-circle',
};

/** Container de notificações (docs §5). Lê o `ToastService` (signals). */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="'toast--' + t.type" role="status">
          <app-icon [name]="icon(t.type)" [size]="18" />
          <span class="toast__text">{{ t.text }}</span>
          <button type="button" class="toast__close" (click)="dismiss(t.id)" aria-label="Fechar">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.scss',
})
export class ToastHost {
  private readonly service = inject(ToastService);
  readonly toasts = this.service.toasts;

  icon(type: ToastType): string {
    return ICON[type];
  }
  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Paginação simples (docs §5). */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (totalPages() > 1) {
      <nav class="pg" aria-label="Paginação">
        <button
          type="button"
          class="pg__btn"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
          aria-label="Página anterior"
        >
          <app-icon name="chevron-left" [size]="18" />
        </button>
        @for (p of pages(); track p) {
          <button
            type="button"
            class="pg__btn"
            [class.is-active]="p === page()"
            [attr.aria-current]="p === page() ? 'page' : null"
            (click)="go(p)"
          >
            {{ p }}
          </button>
        }
        <button
          type="button"
          class="pg__btn"
          [disabled]="page() >= totalPages()"
          (click)="go(page() + 1)"
          aria-label="Próxima página"
        >
          <app-icon name="chevron-right" [size]="18" />
        </button>
      </nav>
    }
  `,
  styles: [
    `.pg { display: inline-flex; gap: 6px; }
     .pg__btn {
       min-width: 40px; height: 40px; padding: 0 10px;
       display: inline-flex; align-items: center; justify-content: center;
       border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
       border-radius: var(--radius); cursor: pointer; font-weight: 600;
       transition: background 0.15s var(--ease), color 0.15s var(--ease);
     }
     .pg__btn:hover:not(:disabled) { background: var(--surface-inset); color: var(--text); }
     .pg__btn.is-active { background: var(--brand-navy); color: #fff; border-color: var(--brand-navy); }
     .pg__btn:disabled { opacity: 0.4; cursor: not-allowed; }`,
  ],
})
export class Pagination {
  readonly page = input(1);
  readonly total = input(0);
  readonly pageSize = input(9);
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  go(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) this.pageChange.emit(p);
  }
}

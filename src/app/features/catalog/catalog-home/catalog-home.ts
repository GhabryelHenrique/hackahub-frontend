import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, startWith, switchMap, map } from 'rxjs';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogPage, CatalogQuery, HackathonSummary, RegistrationMode } from '../../../core/models';
import { EventCard } from '../../../shared/components/event-card/event-card';
import { Button, EmptyState, Icon, Pagination, Skeleton } from '../../../shared/ui';
import { REGISTRATION_OPTIONS } from '../../../shared/labels';

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; data: CatalogPage<HackathonSummary> };

@Component({
  selector: 'app-catalog-home',
  imports: [EventCard, Button, EmptyState, Icon, Pagination, Skeleton],
  templateUrl: './catalog-home.html',
  styleUrl: './catalog-home.scss',
})
export class CatalogHome {
  // Filtros ligados à querystring (docs §4.1) via withComponentInputBinding.
  readonly search = input('');
  readonly registrationMode = input('');
  readonly page = input('1');

  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  protected readonly REGISTRATION_OPTIONS = REGISTRATION_OPTIONS;
  protected readonly searchModel = signal('');
  private debounce?: ReturnType<typeof setTimeout>;

  protected readonly query = computed<CatalogQuery>(() => ({
    search: this.search() || undefined,
    registrationMode: (this.registrationMode() as RegistrationMode) || '',
    page: Number(this.page()) || 1,
  }));

  protected readonly view = toSignal(
    toObservable(this.query).pipe(
      switchMap((qy) =>
        this.catalog.list(qy).pipe(
          map((data): ViewState => ({ status: 'ok', data })),
          startWith({ status: 'loading' } as ViewState),
          catchError(() => of({ status: 'error' } as ViewState)),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ViewState },
  );

  protected readonly hasFilters = computed(() => !!this.search() || !!this.registrationMode());
  protected readonly skeletons = Array.from({ length: 6 });

  constructor() {
    effect(() => this.searchModel.set(this.search()));
  }

  protected onSearchInput(value: string): void {
    this.searchModel.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.apply({ search: value || null, page: null }), 350);
  }

  protected setMode(value: string): void {
    this.apply({ registrationMode: value || null, page: null });
  }

  protected goToPage(p: number): void {
    this.apply({ page: p > 1 ? String(p) : null });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected clearFilters(): void {
    this.apply({ search: null, registrationMode: null, page: null });
  }

  /** Reflete filtros na URL (compartilhável + SSR). `null` remove o parâmetro. */
  private apply(params: Record<string, string | null>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

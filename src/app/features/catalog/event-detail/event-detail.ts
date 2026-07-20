import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { CatalogService } from '../../../core/services/catalog.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { HackathonDetail } from '../../../core/models';
import { Badge, Button, Card, EmptyState, FormField, Icon, Modal, Skeleton, Stepper } from '../../../shared/ui';
import { REGISTRATION_LABEL, REGISTRATION_TONE, SENIORITY_OPTIONS } from '../../../shared/labels';
import { dateRange, formatPrice, fullDate, hueFromString, registrationState } from '../../../shared/format';

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; event: HackathonDetail };

@Component({
  selector: 'app-event-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, Badge, Button, Card, EmptyState, FormField, Icon, Modal, Skeleton, Stepper],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetail {
  readonly slug = input.required<string>();

  private readonly catalog = inject(CatalogService);
  private readonly hackathons = inject(HackathonService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly fb = inject(FormBuilder);

  protected readonly REGISTRATION_LABEL = REGISTRATION_LABEL;
  protected readonly REGISTRATION_TONE = REGISTRATION_TONE;
  protected readonly SENIORITY_OPTIONS = SENIORITY_OPTIONS;
  protected readonly dateRange = dateRange;
  protected readonly fullDate = fullDate;
  protected readonly formatPrice = formatPrice;
  protected readonly registrationState = registrationState;

  protected readonly view = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        this.catalog.getBySlug(slug).pipe(
          map((event): ViewState => ({ status: 'ok', event })),
          startWith({ status: 'loading' } as ViewState),
          catchError(() => of({ status: 'error' } as ViewState)),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ViewState },
  );

  protected readonly event = computed(() => {
    const v = this.view();
    return v.status === 'ok' ? v.event : null;
  });
  protected readonly hue = computed(() => {
    const e = this.event();
    return e ? hueFromString(e.slug) : 205;
  });

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly participant = computed(() => {
    const e = this.event();
    return e ? this.auth.membership(e.id, 'PARTICIPANT') : undefined;
  });
  protected readonly mentor = computed(() => {
    const e = this.event();
    return e ? this.auth.membership(e.id, 'MENTOR') : undefined;
  });

  protected readonly joining = signal(false);
  protected readonly code = signal('');

  // Candidatura de mentor (docs §4.8) — modal com stepper.
  protected readonly mentorOpen = signal(false);
  protected readonly mentorStep = signal(0);
  protected readonly submittingMentor = signal(false);
  protected readonly mentorSteps = ['Expertise', 'Motivação'];
  protected readonly mentorForm = this.fb.nonNullable.group({
    expertise: ['', Validators.required],
    seniority: [SENIORITY_OPTIONS[1], Validators.required],
    motivation: ['', [Validators.required, Validators.minLength(20)]],
  });

  constructor() {
    // SEO por evento (docs §7): título + meta description dinâmicos.
    effect(() => {
      const e = this.event();
      if (e) {
        this.title.setTitle(`${e.name} — Hackahub`);
        this.meta.updateTag({ name: 'description', content: e.description ?? e.name });
      }
    });
  }

  // ---- Ações ---------------------------------------------------------------

  protected join(): void {
    const e = this.event();
    if (!e) return;
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/eventos/${e.slug}` } });
      return;
    }
    if (e.registrationMode === 'CODE' && !this.code().trim()) {
      this.toast.warning('Informe o código de inscrição.');
      return;
    }
    this.joining.set(true);
    this.hackathons.join(e.id, this.code().trim() || undefined).subscribe({
      next: (m) => {
        this.joining.set(false);
        this.auth.refresh();
        if (m.status === 'APPROVED') {
          this.toast.success('Inscrição confirmada! Bem-vindo ao evento.');
          this.router.navigate(['/app/eventos', e.id]);
        } else {
          this.toast.success('Solicitação enviada. Aguarde a aprovação da organização.');
        }
      },
      error: () => this.joining.set(false),
    });
  }

  protected openMentor(): void {
    if (!this.isAuthenticated()) {
      const e = this.event();
      this.router.navigate(['/login'], { queryParams: { returnUrl: e ? `/eventos/${e.slug}` : '/' } });
      return;
    }
    this.mentorStep.set(0);
    this.mentorForm.reset({ expertise: '', seniority: SENIORITY_OPTIONS[1], motivation: '' });
    this.mentorOpen.set(true);
  }

  protected mentorNext(): void {
    if (this.mentorForm.controls.expertise.invalid || this.mentorForm.controls.seniority.invalid) {
      this.mentorForm.controls.expertise.markAsTouched();
      return;
    }
    this.mentorStep.set(1);
  }

  protected submitMentor(): void {
    const e = this.event();
    if (!e || this.mentorForm.invalid) {
      this.mentorForm.markAllAsTouched();
      return;
    }
    const raw = this.mentorForm.getRawValue();
    this.submittingMentor.set(true);
    this.hackathons
      .applyMentor(e.id, {
        expertise: raw.expertise.split(',').map((s) => s.trim()).filter(Boolean),
        seniority: raw.seniority,
        motivation: raw.motivation,
      })
      .subscribe({
        next: () => {
          this.submittingMentor.set(false);
          this.mentorOpen.set(false);
          this.auth.refresh();
          this.toast.success('Candidatura enviada! Você poderá acompanhar o status em "Candidaturas".');
        },
        error: () => this.submittingMentor.set(false),
      });
  }
}

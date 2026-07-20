import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  HackathonStatus,
  HackathonVisibility,
  RegistrationMode,
  UpdateHackathonPayload,
} from '../../../core/models';
import { Button, Card, FormField, Skeleton } from '../../../shared/ui';
import { EVENT_STATUS_OPTIONS, REGISTRATION_OPTIONS, VISIBILITY_OPTIONS } from '../../../shared/labels';
import { isoToLocalInput, localInputToIso } from '../../../shared/format';

/** Fim não pode anteceder o início (strings YYYY-MM-DDTHH:mm comparam lexicograficamente). */
function dateOrderValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startsAt')?.value as string;
  const end = group.get('endsAt')?.value as string;
  return start && end && end < start ? { dateOrder: true } : null;
}

/** Configurações do evento — edição completa pelo organizador (docs §8). */
@Component({
  selector: 'app-event-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Card, FormField, Skeleton],
  templateUrl: './event-settings.html',
  styleUrl: './event-settings.scss',
})
export class EventSettings {
  readonly hackathonId = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly hackathons = inject(HackathonService);
  private readonly ctx = inject(EventContextService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly REGISTRATION_OPTIONS = REGISTRATION_OPTIONS;
  protected readonly EVENT_STATUS_OPTIONS = EVENT_STATUS_OPTIONS;
  protected readonly VISIBILITY_OPTIONS = VISIBILITY_OPTIONS;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(140)]],
      description: [''],
      location: ['', Validators.maxLength(160)],
      startsAt: [''],
      endsAt: [''],
      registrationMode: ['OPEN' as RegistrationMode, Validators.required],
      registrationCode: [''],
      price: ['' as string | number],
      maxParticipants: ['' as string | number],
      maxMentors: ['' as string | number],
      teamMaxSize: [6, [Validators.required, Validators.min(1), Validators.max(50)]],
      status: ['DRAFT' as HackathonStatus, Validators.required],
      visibility: ['PRIVATE' as HackathonVisibility, Validators.required],
    },
    { validators: dateOrderValidator },
  );

  constructor() {
    // Carga própria (não depende do timing do ctx.full()): o guard já garante ORGANIZER.
    effect(() => {
      const id = this.hackathonId();
      this.loading.set(true);
      this.hackathons.detail(id).subscribe({
        next: (h) => {
          this.form.patchValue({
            name: h.name,
            description: h.description ?? '',
            location: h.location ?? '',
            startsAt: isoToLocalInput(h.startsAt),
            endsAt: isoToLocalInput(h.endsAt),
            registrationMode: h.registrationMode,
            price: h.price ?? '',
            maxParticipants: h.maxParticipants ?? '',
            maxMentors: h.maxMentors ?? '',
            teamMaxSize: h.teamMaxSize,
            status: h.status,
            visibility: h.visibility,
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: UpdateHackathonPayload = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      location: v.location.trim() || null,
      startsAt: localInputToIso(v.startsAt),
      endsAt: localInputToIso(v.endsAt),
      registrationMode: v.registrationMode,
      price: this.toPriceOrNull(v.price),
      maxParticipants: this.toIntOrNull(v.maxParticipants),
      maxMentors: this.toIntOrNull(v.maxMentors),
      teamMaxSize: v.teamMaxSize,
      status: v.status,
      visibility: v.visibility,
    };
    // Write-only: a API nunca retorna o código — enviar '' apagaria o atual.
    if (v.registrationMode === 'CODE' && v.registrationCode.trim()) {
      payload.registrationCode = v.registrationCode.trim();
    }

    this.saving.set(true);
    this.hackathons.update(this.hackathonId(), payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.form.controls.registrationCode.setValue('');
        this.ctx.applyFull(updated);
        this.auth.refresh();
        this.toast.success('Evento atualizado.');
      },
      error: () => this.saving.set(false),
    });
  }

  /** '' → null (sem limite); aceita string do input number. */
  private toIntOrNull(value: string | number): number | null {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  /** '' → null (gratuito); arredonda a 2 casas (contrato maxDecimalPlaces). */
  private toPriceOrNull(value: string | number): number | null {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
}

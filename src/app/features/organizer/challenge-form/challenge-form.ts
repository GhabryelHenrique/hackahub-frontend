import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { HackathonService } from '../../../core/services/hackathon.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ApiError, Challenge } from '../../../core/models';
import { Button, Card, FormField, Icon, Skeleton } from '../../../shared/ui';

/**
 * Tela específica do desafio (docs §8): cria e edita no mesmo componente.
 * `challengeId` fica undefined na rota `desafios/novo`.
 */
@Component({
  selector: 'app-challenge-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Button, Card, FormField, Icon, Skeleton],
  templateUrl: './challenge-form.html',
  styleUrl: './challenge-form.scss',
})
export class ChallengeForm {
  readonly hackathonId = input.required<string>();
  readonly challengeId = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly hackathons = inject(HackathonService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly isEdit = computed(() => !!this.challengeId());
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  /** Erro inline no título (409 — duplicado neste evento). */
  protected readonly titleError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    category: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const cid = this.challengeId();
      if (!cid) return;
      this.loading.set(true);
      this.hackathons.challenge(this.hackathonId(), cid).subscribe({
        next: (c) => {
          this.form.patchValue({ title: c.title, category: c.category, description: c.description });
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
    this.titleError.set('');
    const payload = this.form.getRawValue();
    const cid = this.challengeId();
    const request: Observable<Challenge> = cid
      ? this.hackathons.updateChallenge(this.hackathonId(), cid, payload)
      : this.hackathons.createChallenge(this.hackathonId(), payload);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(cid ? 'Desafio atualizado.' : 'Desafio criado.');
        this.router.navigate(['/app/eventos', this.hackathonId(), 'gerenciar', 'desafios']);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        if (err.statusCode === 409) {
          this.titleError.set('Já existe um desafio com este título neste evento.');
        }
      },
    });
  }
}

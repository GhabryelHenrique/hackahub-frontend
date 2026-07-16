import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models';
import { Button, FormField, Icon } from '../../../shared/ui';
import { BrandLogo } from '../../../layout/brand-logo/brand-logo';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, Icon, BrandLogo],
  templateUrl: './register.html',
  styleUrls: ['../auth.shared.scss', './register.scss'],
})
export class Register {
  readonly returnUrl = input('');

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  // Cadastro cria só a identidade global — sem seleção de papel (docs §4.3).
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    documentId: ['', Validators.required],
    phone: ['', Validators.required],
    birthDate: ['', Validators.required],
    acceptedTerms: [false, Validators.requiredTrue],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.auth.register({ ...this.form.getRawValue(), documentType: 'CPF' }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(this.returnUrl() || '/app');
      },
      error: (e: ApiError) => {
        this.submitting.set(false);
        this.error.set(typeof e?.message === 'string' ? e.message : 'Não foi possível criar a conta. Tente novamente.');
      },
    });
  }

  protected field(
    name: 'name' | 'email' | 'password' | 'documentId' | 'phone' | 'birthDate' | 'acceptedTerms',
  ): string {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return '';
    if (c.errors?.['required']) return 'Campo obrigatório.';
    if (c.errors?.['requiredTrue']) return 'É necessário aceitar os termos.';
    if (c.errors?.['email']) return 'E-mail inválido.';
    if (c.errors?.['minlength']) return 'Mínimo de 6 caracteres.';
    return 'Valor inválido.';
  }
}

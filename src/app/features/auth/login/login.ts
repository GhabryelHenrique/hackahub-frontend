import { environment } from '../../../../environments/environment';
import { Component, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models';
import { Button, FormField, Icon } from '../../../shared/ui';
import { BrandLogo } from '../../../layout/brand-logo/brand-logo';
import { DiscordButton } from '../discord-button/discord-button';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, Icon, BrandLogo, DiscordButton],
  templateUrl: './login.html',
  styleUrls: ['../auth.shared.scss', './login.scss'],
})
export class Login {
  /** Credenciais do seed da API — nunca exibidas no build de produção. */
  protected readonly showDemo = !environment.production;

  /** Redireciona de volta após o login (docs §4.3). Ligado à querystring. */
  readonly returnUrl = input('');

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  constructor() {
    // Falha/cancelamento vindo do redirect do SSO do Discord (?discord=...).
    const discord = this.route.snapshot.queryParamMap.get('discord');
    if (discord === 'erro') {
      this.error.set('Não foi possível entrar com o Discord. Tente novamente.');
    } else if (discord === 'cancelado') {
      this.error.set('Login com o Discord cancelado.');
    }
  }

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(this.returnUrl() || '/app');
      },
      error: (e: ApiError) => {
        this.submitting.set(false);
        this.error.set(typeof e?.message === 'string' ? e.message : 'Não foi possível entrar. Tente novamente.');
      },
    });
  }

  protected field(name: 'email' | 'password'): string {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return '';
    if (c.errors?.['required']) return 'Campo obrigatório.';
    if (c.errors?.['email']) return 'E-mail inválido.';
    return 'Valor inválido.';
  }
}

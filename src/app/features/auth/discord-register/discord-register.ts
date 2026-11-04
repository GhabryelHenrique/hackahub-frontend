import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models';
import { DiscordAuthService, DiscordTicketInfo } from '../../../core/services/discord-auth.service';
import { BrandLogo } from '../../../layout/brand-logo/brand-logo';
import { Button, FormField, Icon, InputMask, Spinner } from '../../../shared/ui';
import { cpfValidator, phoneValidator } from '../../../shared/validators';

/**
 * Conclusão do cadastro via Discord (usuário novo). Recebe o `ticket` no
 * fragmento da URL; nome/e-mail vêm do Discord (só leitura) e o usuário informa
 * os campos que o Discord não fornece (CPF, telefone, nascimento, termos).
 */
@Component({
  selector: 'app-discord-register',
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, Icon, InputMask, Spinner, BrandLogo],
  templateUrl: './discord-register.html',
  styleUrls: ['../auth.shared.scss'],
})
export class DiscordRegister {
  private readonly fb = inject(FormBuilder);
  private readonly discord = inject(DiscordAuthService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private ticket = '';
  private returnUrl = '/app';

  protected readonly info = signal<DiscordTicketInfo | null>(null);
  protected readonly ready = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    // Só dígitos — a máscara (appMask) formata apenas a exibição.
    documentId: ['', [Validators.required, cpfValidator]],
    phone: ['', [Validators.required, phoneValidator]],
    birthDate: ['', Validators.required],
    acceptedTerms: [false, Validators.requiredTrue],
  });

  constructor() {
    // Se o usuário já está logado, não faz sentido completar cadastro.
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/app');
      return;
    }
    afterNextRender(() => this.init());
  }

  private init(): void {
    const params = new URLSearchParams(
      window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '',
    );
    const ticket = params.get('ticket');
    this.returnUrl = params.get('returnUrl') || '/app';
    history.replaceState(null, '', window.location.pathname + window.location.search);

    const info = ticket ? this.discord.decodeTicket(ticket) : null;
    if (!ticket || !info) {
      // Sem ticket válido não há o que completar — volta ao cadastro comum.
      this.router.navigateByUrl('/cadastro');
      return;
    }
    this.ticket = ticket;
    this.info.set(info);
    this.ready.set(true);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.discord
      .completeSignup({ ...this.form.getRawValue(), ticket: this.ticket, documentType: 'CPF' })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (e: ApiError) => {
          this.submitting.set(false);
          this.error.set(
            typeof e?.message === 'string'
              ? e.message
              : 'Não foi possível concluir o cadastro. Tente novamente.',
          );
        },
      });
  }

  protected field(name: 'documentId' | 'phone' | 'birthDate' | 'acceptedTerms'): string {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return '';
    if (c.errors?.['required']) return 'Campo obrigatório.';
    if (c.errors?.['requiredTrue']) return 'É necessário aceitar os termos.';
    if (c.errors?.['cpf']) return 'CPF inválido.';
    if (c.errors?.['phone']) return 'Telefone inválido — informe DDD + número.';
    return 'Valor inválido.';
  }
}

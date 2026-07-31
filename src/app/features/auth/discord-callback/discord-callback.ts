import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandLogo } from '../../../layout/brand-logo/brand-logo';
import { Icon, Spinner } from '../../../shared/ui';

/**
 * Retorno do SSO do Discord (login). O backend redireciona para cá com o token
 * no FRAGMENTO da URL (`#token=...&returnUrl=...`) — nunca chega ao servidor.
 * Guardamos a sessão e seguimos para o destino.
 */
@Component({
  selector: 'app-discord-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner, BrandLogo],
  templateUrl: './discord-callback.html',
  styleUrls: ['../auth.shared.scss'],
})
export class DiscordCallback {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal('');

  constructor() {
    // afterNextRender só roda no navegador — o fragmento não existe no SSR.
    afterNextRender(() => this.handle());
  }

  private handle(): void {
    const params = new URLSearchParams(
      window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '',
    );
    const token = params.get('token');
    const returnUrl = params.get('returnUrl') || '/app';

    // Remove o token da barra de endereço.
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (!token) {
      this.error.set('Não recebemos o retorno do Discord. Faça login novamente.');
      return;
    }
    this.auth.adoptSession(token).subscribe({
      next: () => this.router.navigateByUrl(returnUrl),
      error: () => this.error.set('Não foi possível concluir o login com o Discord.'),
    });
  }
}

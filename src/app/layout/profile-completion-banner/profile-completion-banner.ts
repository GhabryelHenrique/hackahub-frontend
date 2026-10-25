import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Icon } from '../../shared/ui';

const DISMISS_KEY = 'hackahub.profileBannerDismissed';

/**
 * Aviso dispensável exibido na área logada quando o perfil do usuário está
 * incompleto (campos de participante vazios — comum em contas via SSO). Some
 * sozinho ao salvar o perfil (reage ao signal do AuthService).
 */
@Component({
  selector: 'app-profile-completion-banner',
  imports: [RouterLink, Icon],
  templateUrl: './profile-completion-banner.html',
  styleUrl: './profile-completion-banner.scss',
})
export class ProfileCompletionBanner {
  private readonly auth = inject(AuthService);
  private readonly dismissed = signal(this.readDismissed());

  protected readonly missingLabel = computed(() => this.auth.profileMissing().join(', '));
  protected readonly show = computed(
    () => this.auth.isProfileIncomplete() && !this.dismissed(),
  );

  protected dismiss(): void {
    this.dismissed.set(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage indisponível — some só nesta sessão de memória */
    }
  }

  private readDismissed(): boolean {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  }
}

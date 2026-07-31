import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../models';

/** Identidade do Discord lida do ticket — só para pré-preencher a tela. */
export interface DiscordTicketInfo {
  name: string;
  email: string;
  avatar: string | null;
}

/** Campos que o Discord não fornece + o ticket assinado do backend. */
export interface CompleteDiscordSignup {
  ticket: string;
  documentId: string;
  phone: string;
  birthDate: string;
  acceptedTerms: boolean;
  documentType?: string;
  gender?: string;
  institution?: string;
  course?: string;
}

/**
 * SSO do Discord (OAuth2). O início é um redirect de página inteira para a API
 * (`GET /auth/discord`); o backend devolve na URL um `token` (login) ou um
 * `ticket` (cadastro novo). Ver [[hackahub-discord-bot]] para o fluxo do bot,
 * que é independente deste.
 */
@Injectable({ providedIn: 'root' })
export class DiscordAuthService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly base = environment.apiBaseUrl;

  /** Redireciona o navegador para iniciar o OAuth do Discord. */
  startLogin(returnUrl = ''): void {
    if (!this.isBrowser) return;
    window.location.href = `${this.base}/auth/discord?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  /** Conclui o cadastro de um usuário novo e adota a sessão criada. */
  completeSignup(payload: CompleteDiscordSignup): Observable<CurrentUser> {
    return this.http
      .post<{ accessToken: string; user: CurrentUser }>(
        `${this.base}/auth/discord/complete`,
        payload,
      )
      .pipe(switchMap((r) => this.auth.adoptSession(r.accessToken)));
  }

  /**
   * Lê nome/e-mail/avatar do payload do ticket JWT apenas para exibir na tela de
   * conclusão. NÃO é fonte de verdade — o backend revalida o ticket assinado.
   */
  decodeTicket(ticket: string): DiscordTicketInfo | null {
    try {
      const [, payload] = ticket.split('.');
      const json = JSON.parse(this.base64UrlDecode(payload)) as {
        name?: string;
        email?: string;
        avatar?: string | null;
      };
      if (!json.email) return null;
      return { name: json.name ?? '', email: json.email, avatar: json.avatar ?? null };
    } catch {
      return null;
    }
  }

  private base64UrlDecode(input: string): string {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    // Reconstitui UTF-8 (nomes do Discord podem ter acentos/emoji).
    return decodeURIComponent(
      Array.from(atob(padded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
  }
}

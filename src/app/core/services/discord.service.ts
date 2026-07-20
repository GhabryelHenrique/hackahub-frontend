import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DiscordLinkStatus {
  linked: boolean;
  discordUsername: string | null;
}

export interface DiscordLinkCode {
  code: string;
  expiresAt: string;
}

/** Vínculo da conta com o Discord (perfil). O lado do bot usa x-bot-key. */
@Injectable({ providedIn: 'root' })
export class DiscordService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getLink(): Observable<DiscordLinkStatus> {
    return this.http.get<DiscordLinkStatus>(`${this.base}/integrations/discord/link`);
  }

  /** Código de 8 caracteres, expira em 10 min — usado com /vincular no Discord. */
  generateCode(): Observable<DiscordLinkCode> {
    return this.http.post<DiscordLinkCode>(`${this.base}/integrations/discord/link-code`, {});
  }

  unlink(): Observable<void> {
    return this.http.delete<void>(`${this.base}/integrations/discord/link`);
  }
}

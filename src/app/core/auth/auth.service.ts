import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorage } from './token-storage';
import {
  CurrentUser,
  LoginPayload,
  MembershipRole,
  MyMembership,
  RegisterPayload,
} from '../models';

interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

/**
 * Sessão/auth global via signals (docs §2.3). O papel NÃO é global — é derivado
 * por evento a partir das `memberships` (docs §2.4).
 *
 * Contrato da API: `POST /auth/login` → { accessToken, user }; `POST /auth/register`
 * → { user } (sem token, exige login em seguida); `GET /auth/me` → { user }.
 * As memberships vêm de `GET /me/memberships` (ver nota em models/MyMembership).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorage);
  private readonly router = inject(Router);
  private readonly base = environment.apiBaseUrl;

  readonly user = signal<CurrentUser | null>(null);
  readonly memberships = signal<MyMembership[]>([]);
  readonly ready = signal(false);

  readonly isAuthenticated = computed(() => this.user() !== null);

  /**
   * Campos de perfil de participante que costumam faltar em contas criadas via
   * SSO do Discord (que só fornece nome/e-mail). Base do aviso "complete seu
   * perfil" na área logada. Ver [[hackahub-discord-sso]].
   */
  readonly profileMissing = computed<string[]>(() => {
    const u = this.user();
    if (!u) return [];
    const missing: string[] = [];
    if (!u.phone?.trim()) missing.push('telefone');
    if (!u.institution?.trim()) missing.push('instituição');
    if (!u.course?.trim()) missing.push('curso');
    return missing;
  });
  readonly isProfileIncomplete = computed(() => this.profileMissing().length > 0);

  bootstrap(): Promise<void> {
    if (!this.tokens.token()) {
      this.ready.set(true);
      return Promise.resolve();
    }
    return firstValueFrom(this.loadSession().pipe(catchError(() => of(null)))).then(() => {
      this.ready.set(true);
    });
  }

  private loadSession(): Observable<CurrentUser> {
    return forkJoin({
      me: this.http.get<{ user: CurrentUser }>(`${this.base}/auth/me`),
      memberships: this.http.get<MyMembership[]>(`${this.base}/me/memberships`),
    }).pipe(
      tap(({ me, memberships }) => {
        this.user.set(me.user);
        this.memberships.set(memberships);
      }),
      map(({ me }) => me.user),
    );
  }

  login(payload: LoginPayload): Observable<CurrentUser> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, payload).pipe(
      tap((r) => this.tokens.set(r.accessToken)),
      switchMap(() => this.loadSession()),
    );
  }

  /**
   * Adota uma sessão a partir de um accessToken já emitido por outro fluxo de
   * auth (ex.: SSO do Discord) — guarda o token e hidrata a sessão.
   */
  adoptSession(accessToken: string): Observable<CurrentUser> {
    this.tokens.set(accessToken);
    return this.loadSession();
  }

  /** Cadastro cria a identidade (sem token) e faz login em seguida (docs §4.3). */
  register(payload: RegisterPayload): Observable<CurrentUser> {
    return this.http.post<{ user: CurrentUser }>(`${this.base}/auth/register`, payload).pipe(
      switchMap(() => this.login({ email: payload.email, password: payload.password })),
    );
  }

  logout(): void {
    this.clear();
    this.router.navigateByUrl('/');
  }

  onSessionExpired(): void {
    this.clear();
  }

  private clear(): void {
    this.tokens.clear();
    this.user.set(null);
    this.memberships.set([]);
  }

  /** Recarrega memberships (após join/apply/aceitar convite). */
  refresh(): void {
    if (this.tokens.token()) this.loadSession().subscribe({ error: () => {} });
  }

  /**
   * Recarrega a sessão e devolve o fluxo — para aguardar as memberships antes de
   * navegar a uma rota protegida por papel (ex.: após criar um evento, o autor
   * vira ORGANIZER e a área de gestão só libera com a membership já carregada).
   */
  reload(): Observable<CurrentUser> {
    return this.loadSession();
  }

  /** Reflete o perfil atualizado na sessão (após PATCH /users/me). */
  applyUser(user: CurrentUser): void {
    this.user.set(user);
  }

  // ---- Derivações de papel por evento (docs §2.4) --------------------------

  membershipsFor(hackathonId: string): MyMembership[] {
    return this.memberships().filter((m) => m.hackathonId === hackathonId);
  }

  membership(hackathonId: string, role: MembershipRole): MyMembership | undefined {
    return this.memberships().find((m) => m.hackathonId === hackathonId && m.role === role);
  }

  hasRole(hackathonId: string, role: MembershipRole): boolean {
    return this.membership(hackathonId, role)?.status === 'APPROVED';
  }
}

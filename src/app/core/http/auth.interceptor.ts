import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorage } from '../auth/token-storage';
import { environment } from '../../../environments/environment';

/** Rotas públicas que NÃO devem receber token (docs §6, SSR-friendly). */
const PUBLIC_PREFIXES = ['/catalog', '/auth/login', '/auth/register'];

/** Injeta `Authorization: Bearer <token>` nas rotas autenticadas da API. */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const base = environment.apiBaseUrl;
  const isApi = req.url.startsWith(base);
  const path = isApi ? req.url.slice(base.length) : req.url;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  const token = inject(TokenStorage).token();
  if (!isApi || isPublic || !token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
}

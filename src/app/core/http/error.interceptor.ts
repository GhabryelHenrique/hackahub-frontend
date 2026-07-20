import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';
import { AuthService } from '../auth/auth.service';
import { ApiError } from '../models';
import { environment } from '../../../environments/environment';

/**
 * Suprime o toast global de erro — para chamadas cujo erro é tratado
 * silenciosamente pelo chamador (ex.: detalhe público de evento DRAFT).
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Normaliza o erro `{ statusCode, message, error }` da API (docs §6) e trata
 * 401 (sessão expirada → logout/redirect) e 403 (sem permissão no evento).
 * Endpoints de auth não disparam toast global — as telas mostram erro inline.
 */
export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const base = environment.apiBaseUrl;
  const path = req.url.startsWith(base) ? req.url.slice(base.length) : req.url;
  const isAuthEndpoint = path.startsWith('/auth/');

  return next(req).pipe(
    catchError((res: HttpErrorResponse) => {
      const api = (res.error ?? {}) as Partial<ApiError>;
      // A API pode devolver `message` como array (erros de validação).
      const message = Array.isArray(api.message)
        ? api.message[0] ?? fallbackMessage(res.status)
        : api.message || fallbackMessage(res.status);

      if (res.status === 401) {
        auth.onSessionExpired();
        if (!isAuthEndpoint && router.url.startsWith('/app')) {
          toast.error('Sua sessão expirou. Faça login novamente.');
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      } else if (!isAuthEndpoint && !req.context.get(SUPPRESS_ERROR_TOAST)) {
        toast.error(message);
      }

      return throwError(() => ({ statusCode: res.status, message, error: api.error } as ApiError));
    }),
  );
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 0: return 'Não foi possível conectar ao servidor.';
    case 403: return 'Você não tem permissão para esta ação neste evento.';
    case 404: return 'Recurso não encontrado.';
    case 409: return 'Conflito com o estado atual.';
    case 500: return 'Erro interno do servidor.';
    default: return 'Ocorreu um erro inesperado.';
  }
}

import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

/** Exige sessão autenticada; caso contrário redireciona ao login com returnUrl. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Busca um parâmetro subindo a árvore de rotas (params de ancestrais). */
export function paramFromTree(route: ActivatedRouteSnapshot, key: string): string | null {
  let r: ActivatedRouteSnapshot | null = route;
  while (r) {
    const v = r.paramMap.get(key);
    if (v) return v;
    r = r.parent;
  }
  return null;
}

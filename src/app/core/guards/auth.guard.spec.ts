import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { authGuard, paramFromTree } from './auth.guard';
import { AuthService } from '../auth/auth.service';

/** Snapshot mínimo: só `paramMap` e `parent`, que é o que os guards leem. */
function snapshot(params: Record<string, string>, parent: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap(params), parent } as unknown as ActivatedRouteSnapshot;
}

describe('authGuard', () => {
  const isAuthenticated = signal(false);
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated } },
      ],
    });
    router = TestBed.inject(Router);
  });

  function run(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard(snapshot({}), { url } as RouterStateSnapshot),
    );
  }

  it('libera quando há sessão', () => {
    isAuthenticated.set(true);
    expect(run('/app')).toBe(true);
  });

  it('sem sessão redireciona ao login guardando o returnUrl', () => {
    isAuthenticated.set(false);
    const result = run('/app/perfil');
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fapp%2Fperfil');
  });
});

describe('paramFromTree', () => {
  it('lê o parâmetro da própria rota', () => {
    expect(paramFromTree(snapshot({ hackathonId: 'h1' }), 'hackathonId')).toBe('h1');
  });

  it('sobe a árvore até achar o parâmetro em um ancestral', () => {
    const root = snapshot({});
    const event = snapshot({ hackathonId: 'h2' }, root);
    const child = snapshot({ teamId: 't1' }, event);
    expect(paramFromTree(child, 'hackathonId')).toBe('h2');
    expect(paramFromTree(child, 'teamId')).toBe('t1');
  });

  it('devolve null quando ninguém tem o parâmetro', () => {
    expect(paramFromTree(snapshot({}, snapshot({})), 'hackathonId')).toBeNull();
  });
});

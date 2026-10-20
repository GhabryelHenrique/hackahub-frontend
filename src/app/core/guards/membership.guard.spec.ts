import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { membershipGuard } from './membership.guard';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { CurrentUser, MembershipRole, MembershipStatus, MyMembership } from '../models';

function snapshot(params: Record<string, string>, parent: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap(params), parent } as unknown as ActivatedRouteSnapshot;
}

function mem(role: MembershipRole, status: MembershipStatus, hackathonId = 'h1'): MyMembership {
  return {
    id: `${role}-${status}`,
    hackathonId,
    role,
    status,
    createdAt: '2026-01-01T00:00:00Z',
    hackathon: {} as MyMembership['hackathon'],
  };
}

describe('membershipGuard', () => {
  let auth: AuthService;
  let router: Router;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'warning');
    auth.user.set({ id: 'u1', name: 'Ana' } as CurrentUser);
  });

  function run(
    role: MembershipRole,
    status: MembershipStatus | undefined,
    route = snapshot({ hackathonId: 'h1' }),
    url = '/app/eventos/h1/mentoria',
  ) {
    const guard = status ? membershipGuard(role, status) : membershipGuard(role);
    return TestBed.runInInjectionContext(() => guard(route, { url } as RouterStateSnapshot));
  }

  function url(result: unknown): string {
    expect(result).toBeInstanceOf(UrlTree);
    return router.serializeUrl(result as UrlTree);
  }

  it('sem sessão redireciona ao login', () => {
    auth.user.set(null);
    expect(url(run('MENTOR', undefined))).toBe('/login?returnUrl=%2Fapp%2Feventos%2Fh1%2Fmentoria');
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('sem hackathonId na rota volta para /app', () => {
    expect(url(run('PARTICIPANT', undefined, snapshot({})))).toBe('/app');
  });

  it('libera papel APPROVED (status padrão)', () => {
    auth.memberships.set([mem('MENTOR', 'APPROVED')]);
    expect(run('MENTOR', undefined)).toBe(true);
  });

  it('lê o hackathonId de uma rota ancestral', () => {
    auth.memberships.set([mem('ORGANIZER', 'APPROVED')]);
    const child = snapshot({}, snapshot({ hackathonId: 'h1' }));
    expect(run('ORGANIZER', undefined, child)).toBe(true);
  });

  it('libera quando o status exigido explicitamente bate (ex.: PENDING)', () => {
    auth.memberships.set([mem('MENTOR', 'PENDING')]);
    expect(run('MENTOR', 'PENDING')).toBe(true);
  });

  it('papel pendente redireciona à área do evento com aviso', () => {
    auth.memberships.set([mem('MENTOR', 'PENDING')]);
    expect(url(run('MENTOR', undefined))).toBe('/app/eventos/h1');
    expect(toast.warning).toHaveBeenCalledWith('Seu acesso como mentor neste evento está pendente de aprovação.');
  });

  it('papel recusado redireciona com aviso de recusa', () => {
    auth.memberships.set([mem('PARTICIPANT', 'REJECTED')]);
    expect(url(run('PARTICIPANT', undefined))).toBe('/app/eventos/h1');
    expect(toast.warning).toHaveBeenCalledWith('Seu acesso como participante neste evento está recusado.');
  });

  it('exigir PENDING com membership aprovada também bloqueia', () => {
    auth.memberships.set([mem('MENTOR', 'APPROVED')]);
    expect(url(run('MENTOR', 'PENDING'))).toBe('/app/eventos/h1');
    expect(toast.warning).toHaveBeenCalledWith('Seu acesso como mentor neste evento está ativo.');
  });

  it('sem o papel no evento redireciona com aviso de falta de acesso', () => {
    auth.memberships.set([mem('PARTICIPANT', 'APPROVED'), mem('ORGANIZER', 'APPROVED', 'h2')]);
    expect(url(run('ORGANIZER', undefined))).toBe('/app/eventos/h1');
    expect(toast.warning).toHaveBeenCalledWith('Você não tem acesso de organizador neste evento.');
  });
});

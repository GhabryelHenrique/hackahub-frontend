import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { MembershipRole, MembershipStatus } from '../models';
import { paramFromTree } from './auth.guard';

const ROLE_LABEL: Record<MembershipRole, string> = {
  PARTICIPANT: 'participante',
  MENTOR: 'mentor',
  ORGANIZER: 'organizador',
};

/**
 * Protege rotas por papel + status NAQUELE evento (docs §2.4).
 * Ex.: `membershipGuard('PARTICIPANT', 'APPROVED')` para criar time;
 *      `membershipGuard('MENTOR', 'APPROVED')` para o painel de mentoria.
 */
export function membershipGuard(
  role: MembershipRole,
  status: MembershipStatus = 'APPROVED',
): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const hackathonId = paramFromTree(route, 'hackathonId');
    if (!hackathonId) return router.createUrlTree(['/app']);

    const membership = auth.membership(hackathonId, role);
    if (membership && membership.status === status) return true;

    const label = ROLE_LABEL[role];
    toast.warning(
      membership
        ? `Seu acesso como ${label} neste evento está ${statusLabel(membership.status)}.`
        : `Você não tem acesso de ${label} neste evento.`,
    );
    return router.createUrlTree(['/app/eventos', hackathonId]);
  };
}

function statusLabel(status: MembershipStatus): string {
  return status === 'PENDING' ? 'pendente de aprovação' : status === 'REJECTED' ? 'recusado' : 'ativo';
}

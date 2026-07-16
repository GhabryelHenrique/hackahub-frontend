/* Rótulos pt-BR e mapeamentos de enums (docs §2.1 i18n-ready: centralizados). */

import { MembershipRole, MembershipStatus, RegistrationMode } from '../core/models';
import { BadgeTone } from './ui/badge/badge';

export const REGISTRATION_LABEL: Record<RegistrationMode, string> = {
  OPEN: 'Inscrição aberta',
  APPROVAL: 'Sujeito a aprovação',
  CODE: 'Por código',
  INVITE: 'Somente convite',
};

export const REGISTRATION_TONE: Record<RegistrationMode, BadgeTone> = {
  OPEN: 'success',
  APPROVAL: 'info',
  CODE: 'warning',
  INVITE: 'neutral',
};

export const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
  { value: 'OPEN', label: 'Inscrição aberta' },
  { value: 'APPROVAL', label: 'Sujeito a aprovação' },
  { value: 'CODE', label: 'Por código' },
  { value: 'INVITE', label: 'Somente convite' },
];

export const ROLE_LABEL: Record<MembershipRole, string> = {
  PARTICIPANT: 'Participante',
  MENTOR: 'Mentor',
  ORGANIZER: 'Organizador',
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  PENDING: 'Pendente de aprovação',
  APPROVED: 'Ativo',
  REJECTED: 'Recusado',
};

export const STATUS_TONE: Record<MembershipStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/** Senioridade de mentor — texto livre no backend (docs §4.8). */
export const SENIORITY_OPTIONS = ['Júnior', 'Pleno', 'Sênior', 'Especialista'];

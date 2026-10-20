/* Rótulos pt-BR e mapeamentos de enums (docs §2.1 i18n-ready: centralizados). */

import {
  HackathonStatus,
  HackathonVisibility,
  MembershipRole,
  MembershipStatus,
  MentorshipStatus,
  RegistrationMode,
} from '../core/models';
import { BadgeTone } from './ui/badge/badge';

export const REGISTRATION_LABEL: Record<RegistrationMode, string> = {
  OPEN: 'Inscrição aberta',
  APPROVAL: 'Sujeito a aprovação',
  CODE: 'Por código',
};

export const REGISTRATION_TONE: Record<RegistrationMode, BadgeTone> = {
  OPEN: 'success',
  APPROVAL: 'info',
  CODE: 'warning',
};

export const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
  { value: 'OPEN', label: 'Inscrição aberta' },
  { value: 'APPROVAL', label: 'Sujeito a aprovação' },
  { value: 'CODE', label: 'Por código' },
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

/** Área do organizador: selects de publicação do evento. */
export const EVENT_STATUS_OPTIONS: { value: HackathonStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'CLOSED', label: 'Encerrado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

export const VISIBILITY_OPTIONS: { value: HackathonVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Público (aparece no catálogo)' },
  { value: 'UNLISTED', label: 'Não listado (acesso por link)' },
  { value: 'PRIVATE', label: 'Privado' },
];

export const EVENT_STATUS_LABEL: Record<HackathonStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  CLOSED: 'Encerrado',
  ARCHIVED: 'Arquivado',
};

export const EVENT_STATUS_TONE: Record<HackathonStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  CLOSED: 'warning',
  ARCHIVED: 'neutral',
};

/** Tickets de mentoria (mesmos estados do bot Discord). */
export const MENTORSHIP_LABEL: Record<MentorshipStatus, string> = {
  PENDING: 'Na fila',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const MENTORSHIP_TONE: Record<MentorshipStatus, BadgeTone> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

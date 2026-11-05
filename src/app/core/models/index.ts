/* =============================================================================
   Contrato de dados do frontend — ALINHADO À HACKAHUB API (NestJS multi-tenant).
   Os tipos espelham os mappers do backend (src/common/mappers/*).
   Papel por evento via HackathonMembership (docs §2.4).
   ============================================================================= */

// ---- Enums (espelham o schema Prisma) -------------------------------------

export type MembershipRole = 'PARTICIPANT' | 'MENTOR' | 'ORGANIZER';
export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type HackathonVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
export type HackathonStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type RegistrationMode = 'OPEN' | 'APPROVAL' | 'CODE';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type MentorshipStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ---- Usuário / identidade -------------------------------------------------

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country?: string | null;
}

/** Perfil completo (GET /auth/me, POST /auth/login → user). */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  documentType?: string | null;
  documentId: string;
  phone: string;
  birthDate: string;
  acceptedTerms: boolean;
  gender?: string | null;
  institution?: string | null;
  course?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  shirtSize?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  createdAt: string;
  address?: AddressData | null;
}

/**
 * Usuário público (toPublicUser). `discordOnly` = perfil provisório criado pelo
 * bot do Discord para quem participa sem conta no site: não tem e-mail (null).
 * Some quando a pessoa vincula uma conta do site (tudo é transferido).
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string | null;
  discordOnly?: boolean;
}

// ---- Catálogo / eventos ---------------------------------------------------

export interface OrganizationRef {
  id?: string;
  name: string;
  slug: string;
}

/** Organização/tenant (OrganizationResponseDto). Dona dos hackathons criados sob ela. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  /** Quem criou — só ele (ou organizadores dos eventos dela) cria eventos sob ela. */
  ownerId: string | null;
}

/**
 * Card do catálogo (toCatalogCard). Só campos públicos — sem PII, sem
 * registrationCode. `description` aqui é o RESUMO. `coverImage` pode ser nulo
 * (o frontend deriva um gradiente a partir do slug).
 */
export interface HackathonSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organization: OrganizationRef;
  registrationMode: RegistrationMode;
  coverImage?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location?: string | null;
  price?: number | null; // null = gratuito
  participantsCount: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
}

/** Detalhe público (toCatalogDetail): resumo + descrição completa + desafios. */
export interface HackathonDetail extends HackathonSummary {
  challenges: Challenge[];
}

/** Hackathon autenticado (toHackathonResponse) — inclui teamMaxSize, status. */
export interface Hackathon {
  id: string;
  organizationId: string;
  organization?: OrganizationRef;
  name: string;
  slug: string;
  description: string | null;
  visibility: HackathonVisibility;
  status: HackathonStatus;
  registrationMode: RegistrationMode;
  coverImage?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  teamMaxSize: number;
  maxParticipants: number | null; // null = ilimitado
  maxMentors: number | null; // null = ilimitado
  /** Candidaturas de mentor entram aprovadas sem passar pela fila. */
  autoApproveMentors?: boolean;
  location: string | null;
  price: number | null; // null = gratuito
  createdAt: string;
  updatedAt: string;
}

// ---- Memberships (papel por evento) ---------------------------------------

export interface MentorProfile {
  expertise: string[];
  seniority: string | null;
  motivation: string | null;
  maxTeams?: number | null;
}

/** Membership por evento (toMembershipResponse). */
export interface Membership {
  id: string;
  userId: string;
  hackathonId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  user?: PublicUser;
  mentorProfile?: MentorProfile;
}

/**
 * Membership enriquecida com o evento embutido — usada em "Meus eventos"
 * (docs §4.4) e nas candidaturas de mentor (docs §4.8).
 *
 * NOTA DE CONTRATO: consumida de `GET /me/memberships`. A Hackahub API expõe
 * hoje apenas o recorte por evento (`GET /hackathons/:id/memberships/me`); esta
 * agregação global precisa ser adicionada no backend (ver README).
 */
export interface MyMembership {
  id: string;
  hackathonId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  mentorProfile?: MentorProfile;
  hackathon: HackathonSummary;
}

// ---- Times / desafios -----------------------------------------------------

export interface TeamMemberView extends PublicUser {
  joinedAt: string;
}

/** Time (toTeamResponse). `isLeader` deriva de `leaderId`. */
export interface Team {
  id: string;
  hackathonId: string;
  name: string;
  description: string | null;
  leaderId: string;
  createdAt: string;
  leader: PublicUser;
  members: TeamMemberView[];
  challenges: Challenge[];
  mentors: PublicUser[];
}

export interface TeamRef {
  id: string;
  name: string;
}

/** Convite (toInviteResponse). */
export interface Invite {
  id: string;
  status: InviteStatus;
  createdAt: string;
  team: TeamRef;
  fromUser: PublicUser;
  toUser: PublicUser;
}

/** Solicitação de entrada (toJoinRequestResponse). */
export interface JoinRequest {
  id: string;
  status: JoinRequestStatus;
  createdAt: string;
  team: TeamRef;
  user: PublicUser;
}

// ---- Mentoria (tickets de ajuda) ------------------------------------------

/** Ticket de mentoria (toMentorshipResponse) — o mesmo que o bot Discord usa. */
export interface MentorshipRequest {
  id: string;
  hackathonId: string;
  title: string;
  description: string;
  status: MentorshipStatus;
  createdAt: string;
  claimedAt: string | null;
  closedAt: string | null;
  user: PublicUser;
  mentor: PublicUser | null;
  team: TeamRef | null;
}

export interface MentorshipPayload {
  title: string; // 3–120
  description: string; // 10–2000
}

// ---- Paginação / erros ----------------------------------------------------

/** Página do catálogo (CatalogPage). */
export interface CatalogPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Erro padronizado da API (HttpExceptionFilter). */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---- Payloads -------------------------------------------------------------

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  documentId: string;
  phone: string;
  birthDate: string;
  acceptedTerms: boolean;
  documentType?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApplyMentorPayload {
  expertise?: string[];
  seniority?: string;
  motivation?: string;
  maxTeams?: number;
}

export interface CatalogQuery {
  search?: string;
  registrationMode?: RegistrationMode | '';
  page?: number;
}

/** Criação de organização (POST /organizations). `slug` casa `^[a-z0-9]+(?:-[a-z0-9]+)*$`. */
export interface CreateOrganizationPayload {
  name: string;
  slug: string;
}

/**
 * Criação de evento pelo organizador (POST /hackathons). Requer `organizationId`,
 * `name` e `slug`; o restante é opcional e assume os defaults do backend.
 * `null` em campos opcionais = sem limite / gratuito / data a definir.
 */
export interface CreateHackathonPayload {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  visibility?: HackathonVisibility;
  status?: HackathonStatus;
  registrationMode?: RegistrationMode;
  registrationCode?: string;
  coverImage?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  teamMaxSize?: number;
  maxParticipants?: number | null;
  maxMentors?: number | null;
  autoApproveMentors?: boolean;
  location?: string | null;
  price?: number | null;
}

/**
 * Edição do evento pelo organizador (PATCH /hackathons/:id).
 * `undefined` mantém o valor; `null` limpa o campo no backend.
 * `registrationCode` é write-only (a API nunca o retorna) — enviar só quando preenchido.
 */
export interface UpdateHackathonPayload {
  name?: string;
  description?: string | null;
  visibility?: HackathonVisibility;
  status?: HackathonStatus;
  registrationMode?: RegistrationMode;
  registrationCode?: string;
  coverImage?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  teamMaxSize?: number;
  maxParticipants?: number | null;
  maxMentors?: number | null;
  autoApproveMentors?: boolean;
  location?: string | null;
  price?: number | null;
}

/** Criação/edição de desafio (área do organizador). */
export interface ChallengePayload {
  title: string;
  description: string;
  category: string;
}

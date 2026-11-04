/* =============================================================================
   Backend em memória — seed alinhado à Hackahub API (multi-tenant).
   Reproduz os shapes dos mappers do backend (src/common/mappers/*).
   Mutações vivem enquanto a aba estiver aberta (reset no reload).
   ============================================================================= */

import {
  Challenge,
  HackathonDetail,
  HackathonSummary,
  InviteStatus,
  JoinRequestStatus,
  MembershipRole,
  MembershipStatus,
  RegistrationMode,
} from '../../models';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  documentId: string;
  phone: string;
  birthDate: string;
  acceptedTerms: boolean;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  institution?: string | null;
  createdAt: string;
}

export interface HackRow {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  registrationMode: RegistrationMode;
  registrationCode: string | null;
  coverImage: string | null;
  startsAt: string | null;
  endsAt: string | null;
  teamMaxSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRow {
  id: string;
  userId: string;
  hackathonId: string;
  role: MembershipRole;
  status: MembershipStatus;
  mentorExpertise: string[];
  mentorSeniority: string | null;
  mentorMotivation: string | null;
  mentorMaxTeams: number | null;
  createdAt: string;
}

export interface TeamRow {
  id: string;
  hackathonId: string;
  name: string;
  description: string | null;
  leaderId: string;
  createdAt: string;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
}

export interface Db {
  organizations: OrgRow[];
  users: MockUser[];
  hackathons: HackRow[];
  challenges: (Challenge & { hackathonId: string })[];
  memberships: MembershipRow[];
  teams: TeamRow[];
  teamMembers: { teamId: string; userId: string; hackathonId: string; joinedAt: string }[];
  teamChallenges: { teamId: string; challengeId: string }[];
  invites: { id: string; hackathonId: string; teamId: string; fromUserId: string; toUserId: string; status: InviteStatus; createdAt: string }[];
  joinRequests: { id: string; hackathonId: string; teamId: string; userId: string; status: JoinRequestStatus; createdAt: string }[];
  mentorAssignments: { mentorId: string; teamId: string }[];
}

const iso = (d: string) => new Date(d + 'T09:00:00.000Z').toISOString();

let seq = 1000;
export const nextId = (prefix: string) => `${prefix}_${++seq}`;

// ---- Organizações ----------------------------------------------------------
const organizations: OrgRow[] = [
  { id: 'org_devbr', name: 'Comunidade DevBR', slug: 'devbr' },
  { id: 'org_inova', name: 'InovaLab', slug: 'inovalab' },
  { id: 'org_gov', name: 'GovTech Brasil', slug: 'govtech' },
];

// ---- Usuários (senha demo: 123456) ----------------------------------------
const mkUser = (id: string, name: string, email: string, extra: Partial<MockUser> = {}): MockUser => ({
  id,
  name,
  email,
  password: '123456',
  documentId: '000.000.000-00',
  phone: '(11) 90000-0000',
  birthDate: iso('1998-05-20'),
  acceptedTerms: true,
  createdAt: iso('2026-01-10'),
  ...extra,
});

const users: MockUser[] = [
  mkUser('u_ana', 'Ana Souza', 'ana@hackahub.dev', { institution: 'USP', githubUrl: 'https://github.com/ana' }),
  mkUser('u_bruno', 'Bruno Lima', 'bruno@hackahub.dev', { institution: 'UNICAMP' }),
  mkUser('u_carla', 'Carla Dias', 'carla@hackahub.dev'),
  mkUser('u_diego', 'Diego Alves', 'diego@hackahub.dev'),
  mkUser('u_elena', 'Elena Rocha', 'elena@hackahub.dev'),
  mkUser('u_felipe', 'Felipe Nunes', 'felipe@hackahub.dev'),
];

// ---- Hackathons ------------------------------------------------------------
interface HackSeed {
  id: string; orgId: string; name: string; slug: string; summary: string; description: string;
  registrationMode: RegistrationMode; code?: string; startsAt: string | null; endsAt: string | null;
  teamMaxSize: number;
}

const hackSeeds: HackSeed[] = [
  {
    id: 'h_cidades', orgId: 'org_devbr', name: 'Hackathon Cidades Inteligentes', slug: 'cidades-inteligentes',
    summary: 'Soluções de dados e IoT para cidades mais eficientes e sustentáveis.',
    description: 'O Hackathon Cidades Inteligentes reúne desenvolvedores, designers e especialistas em dados para criar soluções que melhorem a vida urbana. Durante 48 horas, os times vão prototipar produtos em torno de mobilidade, sustentabilidade e serviços públicos, com mentorias e acesso a bases de dados abertas da cidade.',
    registrationMode: 'OPEN', startsAt: '2026-08-15', endsAt: '2026-08-17', teamMaxSize: 5,
  },
  {
    id: 'h_summer', orgId: 'org_devbr', name: 'DevBR Summer Hack', slug: 'devbr-summer-hack',
    summary: 'A maratona de verão da comunidade DevBR, 100% online.',
    description: 'Uma semana de construção intensa, mentorias ao vivo e prêmios para quem entregar o produto mais completo. As inscrições passam por aprovação da organização para equilibrar os perfis dos participantes.',
    registrationMode: 'APPROVAL', startsAt: '2026-09-01', endsAt: '2026-09-07', teamMaxSize: 4,
  },
  {
    id: 'h_fintech', orgId: 'org_inova', name: 'InovaLab Fintech Challenge', slug: 'inovalab-fintech',
    summary: 'Reinvente serviços financeiros com times presenciais em São Paulo.',
    description: 'Desafio para repensar pagamentos, crédito e educação financeira. Vagas limitadas — a participação exige um código de inscrição fornecido pela organização aos selecionados.',
    registrationMode: 'CODE', code: 'INOVA2026', startsAt: '2026-10-03', endsAt: '2026-10-05', teamMaxSize: 4,
  },
  {
    id: 'h_dados', orgId: 'org_gov', name: 'GovTech Dados Abertos', slug: 'govtech-dados-abertos',
    summary: 'Transparência pública através de dados abertos governamentais.',
    description: 'Construa ferramentas que tornem os dados públicos mais acessíveis à população. Evento em andamento — entre e comece a colaborar com times de todo o país.',
    registrationMode: 'OPEN', startsAt: '2026-07-05', endsAt: '2026-07-25', teamMaxSize: 6,
  },
  {
    id: 'h_health', orgId: 'org_inova', name: 'InovaLab HealthTech', slug: 'inovalab-healthtech',
    summary: 'Inovação em saúde digital — inscrições com aprovação.',
    description: 'Programa fechado para times selecionados trabalharem em telemedicina e prontuários inteligentes. A participação é exclusivamente por convite da organização.',
    registrationMode: 'APPROVAL', startsAt: '2026-09-20', endsAt: '2026-09-22', teamMaxSize: 5,
  },
  {
    id: 'h_ai', orgId: 'org_devbr', name: 'DevBR AI Marathon', slug: 'devbr-ai-marathon',
    summary: 'Construa agentes e produtos com IA generativa em 3 dias.',
    description: 'A maratona de IA da DevBR: do RAG a agentes autônomos. Traga sua ideia, monte seu time e escolha um desafio. Inscrições abertas para todos os níveis.',
    registrationMode: 'OPEN', startsAt: '2026-08-28', endsAt: '2026-08-30', teamMaxSize: 4,
  },
  {
    id: 'h_mobilidade', orgId: 'org_gov', name: 'GovTech Mobilidade Urbana', slug: 'govtech-mobilidade',
    summary: 'Edição encerrada — soluções para o transporte público.',
    description: 'Edição de maio de 2026 focada em mobilidade urbana. As inscrições já foram encerradas; os resultados serão divulgados em breve.',
    registrationMode: 'APPROVAL', startsAt: '2026-05-10', endsAt: '2026-05-12', teamMaxSize: 5,
  },
];

const hackathons: HackRow[] = hackSeeds.map((s) => ({
  id: s.id,
  organizationId: s.orgId,
  name: s.name,
  slug: s.slug,
  description: s.description,
  visibility: 'PUBLIC',
  status: 'PUBLISHED',
  registrationMode: s.registrationMode,
  registrationCode: s.code ?? null,
  coverImage: null,
  startsAt: s.startsAt ? iso(s.startsAt) : null,
  endsAt: s.endsAt ? iso(s.endsAt) : null,
  teamMaxSize: s.teamMaxSize,
  createdAt: iso('2026-06-01'),
  updatedAt: iso('2026-06-01'),
}));

// Guarda o resumo do seed para o card do catálogo (backend trunca em 240).
const SUMMARIES: Record<string, string> = Object.fromEntries(hackSeeds.map((s) => [s.id, s.summary]));

// ---- Desafios por hackathon ------------------------------------------------
const challengeSeed: Record<string, [string, string, string][]> = {
  h_cidades: [
    ['Mobilidade Inteligente', 'Otimize rotas e transporte público com dados em tempo real.', 'Mobilidade'],
    ['Energia Sustentável', 'Reduza o consumo energético de prédios públicos.', 'Sustentabilidade'],
    ['Serviços ao Cidadão', 'Simplifique o acesso a serviços municipais.', 'Serviços Públicos'],
  ],
  h_summer: [
    ['Produtividade', 'Ferramentas que economizam tempo do usuário.', 'Produtividade'],
    ['Educação', 'Democratize o acesso ao conhecimento.', 'Edtech'],
  ],
  h_fintech: [
    ['Pagamentos Instantâneos', 'Experiências de pagamento sem fricção.', 'Pagamentos'],
    ['Educação Financeira', 'Ajude pessoas a organizarem suas finanças.', 'Educação'],
    ['Crédito Justo', 'Modelos de crédito mais inclusivos.', 'Crédito'],
  ],
  h_dados: [
    ['Transparência Orçamentária', 'Visualize gastos públicos de forma clara.', 'Transparência'],
    ['Saúde Pública', 'Painéis de indicadores de saúde por município.', 'Saúde'],
    ['Educação Aberta', 'Cruze dados de desempenho escolar.', 'Educação'],
  ],
  h_health: [
    ['Telemedicina', 'Consultas remotas acessíveis.', 'Telemedicina'],
    ['Prontuário Inteligente', 'Registros médicos com apoio de IA.', 'Dados Clínicos'],
  ],
  h_ai: [
    ['Agentes Autônomos', 'Automatize tarefas complexas com agentes.', 'IA Generativa'],
    ['RAG para Empresas', 'Busca semântica sobre bases privadas.', 'IA Generativa'],
    ['Copilotos Verticais', 'Assistentes especializados por setor.', 'IA Generativa'],
  ],
  h_mobilidade: [['Transporte Público', 'Melhore a previsibilidade dos ônibus.', 'Mobilidade']],
};

const challenges: (Challenge & { hackathonId: string })[] = [];
for (const [hid, list] of Object.entries(challengeSeed)) {
  list.forEach(([title, description, category], i) => {
    challenges.push({ id: `c_${hid}_${i + 1}`, hackathonId: hid, title, description, category });
  });
}

// ---- Memberships (papel por evento — docs §2.4) ---------------------------
const M = (
  id: string, userId: string, hackathonId: string, role: MembershipRole, status: MembershipStatus,
  mentor?: { expertise: string[]; seniority: string; motivation: string },
): MembershipRow => ({
  id, userId, hackathonId, role, status,
  mentorExpertise: mentor?.expertise ?? [],
  mentorSeniority: mentor?.seniority ?? null,
  mentorMotivation: mentor?.motivation ?? null,
  mentorMaxTeams: null,
  createdAt: iso('2026-06-20'),
});

const memberships: MembershipRow[] = [
  // Ana (usuário demo) — papéis variados em vários eventos
  M('m_ana_cidades', 'u_ana', 'h_cidades', 'PARTICIPANT', 'APPROVED'),
  M('m_ana_ai', 'u_ana', 'h_ai', 'PARTICIPANT', 'APPROVED'),
  M('m_ana_dados', 'u_ana', 'h_dados', 'MENTOR', 'APPROVED', {
    expertise: ['Ciência de Dados', 'Python', 'Visualização'], seniority: 'Sênior',
    motivation: 'Quero ajudar times a extrair valor de dados públicos.',
  }),
  M('m_ana_summer', 'u_ana', 'h_summer', 'PARTICIPANT', 'PENDING'),
  M('m_ana_fintech', 'u_ana', 'h_fintech', 'MENTOR', 'PENDING', {
    expertise: ['Arquitetura', 'Segurança'], seniority: 'Especialista',
    motivation: 'Tenho 10 anos de experiência em sistemas financeiros.',
  }),

  // h_cidades
  M('m_bruno_cidades', 'u_bruno', 'h_cidades', 'PARTICIPANT', 'APPROVED'),
  M('m_carla_cidades', 'u_carla', 'h_cidades', 'PARTICIPANT', 'APPROVED'),
  M('m_diego_cidades', 'u_diego', 'h_cidades', 'PARTICIPANT', 'APPROVED'),
  M('m_felipe_cidades', 'u_felipe', 'h_cidades', 'PARTICIPANT', 'APPROVED'),

  // h_ai
  M('m_carla_ai', 'u_carla', 'h_ai', 'PARTICIPANT', 'APPROVED'),
  M('m_diego_ai', 'u_diego', 'h_ai', 'PARTICIPANT', 'APPROVED'),
  M('m_felipe_ai', 'u_felipe', 'h_ai', 'PARTICIPANT', 'APPROVED'),

  // h_dados
  M('m_bruno_dados', 'u_bruno', 'h_dados', 'PARTICIPANT', 'APPROVED'),
  M('m_carla_dados', 'u_carla', 'h_dados', 'PARTICIPANT', 'APPROVED'),
  M('m_elena_dados', 'u_elena', 'h_dados', 'MENTOR', 'APPROVED', {
    expertise: ['Backend', 'APIs'], seniority: 'Pleno', motivation: 'Curto ensinar boas práticas de API.',
  }),
];

// ---- Times -----------------------------------------------------------------
const teams: TeamRow[] = [
  { id: 't_inovadores', hackathonId: 'h_cidades', name: 'Os Inovadores', description: 'Time focado em mobilidade urbana com dados abertos.', leaderId: 'u_ana', createdAt: iso('2026-06-21') },
  { id: 't_warriors', hackathonId: 'h_cidades', name: 'Code Warriors', description: 'Buscamos mais um dev backend.', leaderId: 'u_diego', createdAt: iso('2026-06-22') },
  { id: 't_ninjas', hackathonId: 'h_ai', name: 'Neural Ninjas', description: 'Agentes autônomos para automação de suporte.', leaderId: 'u_carla', createdAt: iso('2026-06-25') },
  { id: 't_rebels', hackathonId: 'h_ai', name: 'Data Rebels', description: 'RAG sobre documentação técnica.', leaderId: 'u_diego', createdAt: iso('2026-06-26') },
  { id: 't_pioneers', hackathonId: 'h_dados', name: 'Data Pioneers', description: 'Painel de transparência orçamentária municipal.', leaderId: 'u_bruno', createdAt: iso('2026-07-06') },
];

const TM = (teamId: string, userId: string, hackathonId: string) => ({ teamId, userId, hackathonId, joinedAt: iso('2026-06-21') });
const teamMembers = [
  TM('t_inovadores', 'u_ana', 'h_cidades'), TM('t_inovadores', 'u_bruno', 'h_cidades'),
  TM('t_warriors', 'u_diego', 'h_cidades'), TM('t_warriors', 'u_felipe', 'h_cidades'),
  TM('t_ninjas', 'u_carla', 'h_ai'),
  TM('t_rebels', 'u_diego', 'h_ai'), TM('t_rebels', 'u_felipe', 'h_ai'),
  TM('t_pioneers', 'u_bruno', 'h_dados'), TM('t_pioneers', 'u_carla', 'h_dados'),
];

const teamChallenges = [
  { teamId: 't_inovadores', challengeId: 'c_h_cidades_1' },
  { teamId: 't_warriors', challengeId: 'c_h_cidades_2' },
  { teamId: 't_ninjas', challengeId: 'c_h_ai_1' },
  { teamId: 't_rebels', challengeId: 'c_h_ai_2' },
  { teamId: 't_pioneers', challengeId: 'c_h_dados_1' },
];

const invites: Db['invites'] = [
  { id: 'i_ana_ninjas', hackathonId: 'h_ai', teamId: 't_ninjas', fromUserId: 'u_carla', toUserId: 'u_ana', status: 'PENDING', createdAt: iso('2026-06-27') },
];

const joinRequests: Db['joinRequests'] = [
  { id: 'j_carla_inovadores', hackathonId: 'h_cidades', teamId: 't_inovadores', userId: 'u_carla', status: 'PENDING', createdAt: iso('2026-06-28') },
];

const mentorAssignments = [{ mentorId: 'u_ana', teamId: 't_pioneers' }];

// ---- Factory + singleton ---------------------------------------------------
export function createDb(): Db {
  return structuredClone({
    organizations, users, hackathons, challenges, memberships,
    teams, teamMembers, teamChallenges, invites, joinRequests, mentorAssignments,
  });
}

export const db: Db = createDb();

// ---- Mappers (espelham src/common/mappers/*) ------------------------------
const SUMMARY_MAX = 240;
function summarize(text: string | null): string | null {
  if (!text) return null;
  const t = text.trim();
  return t.length > SUMMARY_MAX ? `${t.slice(0, SUMMARY_MAX).trimEnd()}…` : t;
}

export function orgRef(id: string) {
  const o = db.organizations.find((x) => x.id === id)!;
  return { name: o.name, slug: o.slug };
}

export function participantsCount(hackathonId: string): number {
  return db.memberships.filter(
    (m) => m.hackathonId === hackathonId && m.role === 'PARTICIPANT' && m.status === 'APPROVED',
  ).length;
}

export function toCatalogCard(h: HackRow): HackathonSummary {
  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    description: summarize(SUMMARIES[h.id] ?? h.description),
    organization: orgRef(h.organizationId),
    registrationMode: h.registrationMode,
    coverImage: h.coverImage,
    startsAt: h.startsAt,
    endsAt: h.endsAt,
    participantsCount: participantsCount(h.id),
  };
}

export function toCatalogDetail(h: HackRow): HackathonDetail {
  return {
    ...toCatalogCard(h),
    description: h.description,
    challenges: db.challenges
      .filter((c) => c.hackathonId === h.id)
      .map((c) => ({ id: c.id, title: c.title, category: c.category, description: c.description })),
  };
}

export function toHackathonResponse(h: HackRow) {
  return {
    id: h.id,
    organizationId: h.organizationId,
    organization: (() => {
      const o = db.organizations.find((x) => x.id === h.organizationId)!;
      return { id: o.id, name: o.name, slug: o.slug };
    })(),
    name: h.name,
    slug: h.slug,
    description: h.description,
    visibility: h.visibility,
    status: h.status,
    registrationMode: h.registrationMode,
    coverImage: h.coverImage,
    startsAt: h.startsAt,
    endsAt: h.endsAt,
    teamMaxSize: h.teamMaxSize,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

export function publicUser(id: string) {
  const u = db.users.find((x) => x.id === id)!;
  return { id: u.id, name: u.name, email: u.email };
}

export function userResponse(id: string) {
  const u = db.users.find((x) => x.id === id)!;
  const { password, ...rest } = u;
  return { ...rest, address: null };
}

function mentorProfileOf(m: MembershipRow) {
  const isApp = m.mentorExpertise.length > 0 || m.mentorSeniority !== null || m.mentorMotivation !== null;
  return isApp
    ? { expertise: m.mentorExpertise, seniority: m.mentorSeniority, motivation: m.mentorMotivation, maxTeams: m.mentorMaxTeams }
    : undefined;
}

export function membershipResponse(m: MembershipRow) {
  return {
    id: m.id, userId: m.userId, hackathonId: m.hackathonId, role: m.role, status: m.status,
    createdAt: m.createdAt, user: publicUser(m.userId), mentorProfile: mentorProfileOf(m),
  };
}

/** Extensão frontend: membership + evento embutido (docs §4.4). */
export function myMembership(m: MembershipRow) {
  const h = db.hackathons.find((x) => x.id === m.hackathonId)!;
  return {
    id: m.id, hackathonId: m.hackathonId, role: m.role, status: m.status, createdAt: m.createdAt,
    mentorProfile: mentorProfileOf(m), hackathon: toCatalogCard(h),
  };
}

export function teamResponse(t: TeamRow) {
  const memberRows = db.teamMembers.filter((tm) => tm.teamId === t.id);
  const challengeIds = db.teamChallenges.filter((tc) => tc.teamId === t.id).map((tc) => tc.challengeId);
  const mentorIds = db.mentorAssignments.filter((a) => a.teamId === t.id).map((a) => a.mentorId);
  return {
    id: t.id, hackathonId: t.hackathonId, name: t.name, description: t.description,
    leaderId: t.leaderId, createdAt: t.createdAt,
    leader: publicUser(t.leaderId),
    members: memberRows.map((tm) => ({ ...publicUser(tm.userId), joinedAt: tm.joinedAt })),
    challenges: db.challenges.filter((c) => challengeIds.includes(c.id)).map((c) => ({ id: c.id, title: c.title, category: c.category, description: c.description })),
    mentors: mentorIds.map(publicUser),
  };
}

export function inviteResponse(i: Db['invites'][number]) {
  const team = db.teams.find((t) => t.id === i.teamId)!;
  return { id: i.id, status: i.status, createdAt: i.createdAt, team: { id: team.id, name: team.name }, fromUser: publicUser(i.fromUserId), toUser: publicUser(i.toUserId) };
}

export function joinRequestResponse(j: Db['joinRequests'][number]) {
  const team = db.teams.find((t) => t.id === j.teamId)!;
  return { id: j.id, status: j.status, createdAt: j.createdAt, team: { id: team.id, name: team.name }, user: publicUser(j.userId) };
}

export function teamOfUser(userId: string, hackathonId: string): TeamRow | undefined {
  const row = db.teamMembers.find((tm) => tm.hackathonId === hackathonId && tm.userId === userId);
  return row ? db.teams.find((t) => t.id === row.teamId) : undefined;
}

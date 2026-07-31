import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout/public-layout';
import { AppLayout } from './layout/app-layout/app-layout';
import { authGuard } from './core/guards/auth.guard';
import { membershipGuard } from './core/guards/membership.guard';

/** Mapa de rotas (docs §3). Público SSR + área autenticada CSR (docs §2.1). */
export const routes: Routes = [
  // ---- Público (SSR) ----
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/catalog/catalog-home/catalog-home').then((m) => m.CatalogHome),
        title: 'Hackahub — Encontre e participe de hackathons',
      },
      {
        path: 'eventos/:slug',
        loadComponent: () => import('./features/catalog/event-detail/event-detail').then((m) => m.EventDetail),
        title: 'Evento — Hackahub',
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
        title: 'Entrar — Hackahub',
      },
      {
        path: 'cadastro',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
        title: 'Criar conta — Hackahub',
      },
      // SSO Discord: retorno do OAuth (login) e conclusão de cadastro (usuário novo).
      {
        path: 'auth/discord/callback',
        loadComponent: () =>
          import('./features/auth/discord-callback/discord-callback').then((m) => m.DiscordCallback),
        title: 'Entrando com o Discord — Hackahub',
      },
      {
        path: 'cadastro/discord',
        loadComponent: () =>
          import('./features/auth/discord-register/discord-register').then((m) => m.DiscordRegister),
        title: 'Completar cadastro — Hackahub',
      },
      // Páginas institucionais/legais
      {
        path: 'termos',
        loadComponent: () => import('./features/legal/terms/terms').then((m) => m.Terms),
        title: 'Termos de Serviço — Hackahub',
      },
      {
        path: 'privacidade',
        loadComponent: () => import('./features/legal/privacy/privacy').then((m) => m.Privacy),
        title: 'Política de Privacidade — Hackahub',
      },
    ],
  },

  // ---- Autenticado (shell AppLayout) ----
  {
    path: 'app',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/my-events/my-events').then((m) => m.MyEvents),
        title: 'Meus eventos — Hackahub',
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
        title: 'Perfil — Hackahub',
      },
      {
        path: 'candidaturas',
        loadComponent: () => import('./features/mentor/my-applications/my-applications').then((m) => m.MyApplications),
        title: 'Minhas candidaturas — Hackahub',
      },
      // Criar evento (organização + hackathon). Antes de ':hackathonId'.
      {
        path: 'eventos/novo',
        loadComponent: () => import('./features/organizer/create-event/create-event').then((m) => m.CreateEvent),
        title: 'Criar evento — Hackahub',
      },
      // Contexto de evento
      {
        path: 'eventos/:hackathonId',
        loadComponent: () => import('./features/event/event-shell/event-shell').then((m) => m.EventShell),
        children: [
          {
            path: '',
            loadComponent: () => import('./features/event/event-overview/event-overview').then((m) => m.EventOverview),
          },
          {
            path: 'time',
            canActivate: [membershipGuard('PARTICIPANT', 'APPROVED')],
            loadComponent: () => import('./features/teams/team-page/team-page').then((m) => m.TeamPage),
          },
          {
            path: 'convites',
            canActivate: [membershipGuard('PARTICIPANT', 'APPROVED')],
            loadComponent: () => import('./features/teams/invites-page/invites-page').then((m) => m.InvitesPage),
          },
          {
            path: 'desafios',
            canActivate: [membershipGuard('PARTICIPANT', 'APPROVED')],
            loadComponent: () => import('./features/challenges/challenges-page/challenges-page').then((m) => m.ChallengesPage),
          },
          {
            path: 'desafios/:challengeId',
            canActivate: [membershipGuard('PARTICIPANT', 'APPROVED')],
            loadComponent: () => import('./features/challenges/challenge-detail/challenge-detail').then((m) => m.ChallengeDetail),
            title: 'Desafio — Hackahub',
          },
          {
            path: 'mentoria',
            canActivate: [membershipGuard('MENTOR', 'APPROVED')],
            loadComponent: () => import('./features/mentor/mentor-panel/mentor-panel').then((m) => m.MentorPanel),
          },
          // Área do organizador (guard no pai cobre os filhos)
          {
            path: 'gerenciar',
            canActivate: [membershipGuard('ORGANIZER', 'APPROVED')],
            children: [
              {
                path: '',
                loadComponent: () => import('./features/organizer/event-settings/event-settings').then((m) => m.EventSettings),
                title: 'Configurações do evento — Hackahub',
              },
              {
                path: 'desafios',
                loadComponent: () => import('./features/organizer/manage-challenges/manage-challenges').then((m) => m.ManageChallenges),
                title: 'Gerenciar desafios — Hackahub',
              },
              // Ordem importa: 'novo' antes de ':challengeId'.
              {
                path: 'desafios/novo',
                loadComponent: () => import('./features/organizer/challenge-form/challenge-form').then((m) => m.ChallengeForm),
                title: 'Novo desafio — Hackahub',
              },
              {
                path: 'desafios/:challengeId',
                loadComponent: () => import('./features/organizer/challenge-form/challenge-form').then((m) => m.ChallengeForm),
                title: 'Editar desafio — Hackahub',
              },
            ],
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];

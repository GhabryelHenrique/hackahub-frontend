# Hackahub — Frontend

Aplicação web do **Hackahub**, a plataforma SaaS de gestão de hackathons.
Escopo: **MVP** — catálogo público, autenticação, descoberta/participação
(participante + mentor via fluxo *pull*), formação de times e seleção de desafios.

Implementa a especificação de `../hackahub-frontend-docs.md`, consumindo o contrato da
**Hackahub API** (NestJS multi-tenant, em `../hackahub-api`).

## Stack

- **Angular 22** — componentes standalone, **signals**, control flow (`@if/@for/@switch`), **zoneless**.
- **SSR + hydration** (`@angular/ssr`) na área pública (catálogo/detalhe) para SEO e LCP; área autenticada é CSR.
- **SCSS** com design tokens em CSS custom properties (sem dependência de UI externa).
- Roteamento com **lazy loading** por feature; guards por *membership* (papel por evento).

## Como rodar

```bash
npm install
npm start                 # dev server → http://localhost:4200
```

Build de produção + servidor SSR:

```bash
npm run build
npm run serve:ssr:hackahub-frontend   # → http://localhost:4000
```

> O servidor SSR de produção valida o header `Host` (proteção SSRF). Os hosts
> permitidos ficam em `angular.json → architect.build.options.security.allowedHosts`.
> Já inclui `localhost`; **adicione o domínio de produção** ao publicar.

## Backend: mock x real

O app roda **sem backend** por padrão, através de um interceptor HTTP que simula a
Hackahub API em memória (dados de seed realistas). Controlado em
`src/environments/environment.ts`:

```ts
export const environment = {
  useMock: true,           // false → usa o backend real
  apiBaseUrl: '/api',      // real: ex. 'http://localhost:3000'
};
```

Para apontar ao NestJS real: `useMock: false` e ajuste `apiBaseUrl`. Todas as chamadas
usam `HttpClient` com as **rotas e shapes reais** da API — o mock só curto-circuita a
resposta; nenhuma tela precisa mudar.

### Credenciais de demonstração (modo mock)

| E-mail | Senha | Perfil no seed |
|---|---|---|
| `ana@hackahub.dev` | `123456` | Participante (líder de time) em 2 eventos, **mentora aprovada** em 1, com candidatura de mentor pendente |
| `bruno@hackahub.dev` … `felipe@hackahub.dev` | `123456` | Demais participantes/mentores |

Evento com inscrição por código: **InovaLab Fintech Challenge** — código `INOVA2026`.

### Contrato: `GET /me/memberships`

A tela **“Meus eventos”** (docs §4.4), a derivação de papel por evento e a lista de
**candidaturas de mentor** precisam das *memberships* do usuário **agregadas entre eventos**
(cada uma com o resumo do hackathon embutido). Além do recorte por evento
(`GET /hackathons/:id/memberships/me`), a Hackahub API expõe o agregador
**`GET /me/memberships`** — implementado no backend (`hackathons/me.controller.ts`) e no mock.
Ver `core/models/index.ts › MyMembership`.

## Arquitetura (`src/app`)

```
core/
  auth/            AuthService (signals), TokenStorage
  http/            interceptors (auth, error)
  guards/          authGuard, membershipGuard(role, status)
  services/        CatalogService, HackathonService, TeamService, MentorService, UserService
  event-context/   EventContextService (evento ativo + papel derivado)
  data/mock/       backend em memória (interceptor + seed) — reproduz os mappers da API
  models/          contrato de tipos (alinhado a src/common/mappers do backend)
shared/
  ui/              Button, Card, Badge, FormField, Modal, Tabs, Avatar, Toast,
                   EmptyState, Skeleton, Pagination, Tag, Stepper, Icon, Spinner
  components/      EventCard
  labels.ts, format.ts
layout/            PublicLayout, AppLayout, Navbar, Footer, BrandLogo
features/
  catalog/         home (vitrine) + detalhe de evento (SSR)
  auth/            login, cadastro
  dashboard/       meus eventos
  event/           shell de contexto + visão geral
  teams/           meu time (criar/convidar/aprovar/remover) + convites recebidos
  challenges/      seleção de desafios do time
  mentor/          candidaturas + painel de mentoria
  profile/         perfil
```

## Papel é por evento (ponto crítico)

Não existe “modo participante” vs “modo mentor” global. O papel vem de
`HackathonMembership { hackathonId, role, status }` e é resolvido **no contexto do
evento** (`hackathonId` na rota). `membershipGuard('PARTICIPANT','APPROVED')` protege a
área de times; `membershipGuard('MENTOR','APPROVED')` protege o painel de mentoria.
Como as rotas-filho herdam o `:hackathonId` do pai, o roteador usa
`paramsInheritanceStrategy: 'always'` (ver `app.config.ts`).

## Fora de escopo (MVP)

Área do organizador completa, billing, white-label, submissões, julgamento, matchmaking,
fluxo *push* de mentor, integrações e analytics. Há ganchos/TODOs onde faz sentido.

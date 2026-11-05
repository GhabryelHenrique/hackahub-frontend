# Hackahub — Frontend

Aplicação web do **Hackahub**, a plataforma SaaS de gestão de hackathons.
Escopo: catálogo público, autenticação, descoberta/participação (participante +
mentor via fluxo *pull*), formação de times e seleção de desafios, **área do
organizador** (editar evento + CRUD de desafios) e **vínculo de conta Discord**.

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

## Backend

O app consome a **Hackahub API real** (NestJS, em `../hackahub-api`). Configuração em
`src/environments/environment.ts`: `useMock: false` (API real, padrão) e `apiBaseUrl`,
que é `http://localhost:3000` no desenvolvimento. No build de produção a URL vem de
`--define` (o deploy usa `https://api.hackahub.com.br`):

```bash
npx ng build --define "HACKAHUB_API_BASE_URL='https://api.hackahub.com.br'"
```

Suba a API antes (`../hackahub-api`: `docker compose up -d postgres` + `npx prisma db seed`
+ `npm run start:dev`). As credenciais são as **do seed da API** (ver README de lá):
`organizer@hackahub.local` / `organizer123`, `ana@hackahub.local` / `ana12345`, etc.

> Existe um interceptor de mock em memória (`core/data/mock/`), **desligado** por padrão
> (`useMock` é `false` nos dois environments). Ele reproduz as rotas/shapes originais mas
> **não** cobre as features novas (organizador, Discord) — use a API real.

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
  services/        CatalogService, HackathonService, TeamService, MentorService, MentorshipService, UserService, DiscordService
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
  challenges/      seleção de desafios do time + detalhe do desafio
  organizer/       área do organizador: config do evento + gestão de desafios
  mentor/          candidaturas + painel de mentoria
  profile/         perfil + vínculo de conta Discord
```

## Papel é por evento (ponto crítico)

Não existe “modo participante” vs “modo mentor” global. O papel vem de
`HackathonMembership { hackathonId, role, status }` e é resolvido **no contexto do
evento** (`hackathonId` na rota). `membershipGuard('PARTICIPANT','APPROVED')` protege a
área de times; `membershipGuard('MENTOR','APPROVED')` protege o painel de mentoria.
Como as rotas-filho herdam o `:hackathonId` do pai, o roteador usa
`paramsInheritanceStrategy: 'always'` (ver `app.config.ts`).

## Área do organizador

`membershipGuard('ORGANIZER','APPROVED')` protege `/app/eventos/:id/gerenciar/**`
(abas no shell do evento, só para organizadores aprovados):

- `gerenciar` — **Painel**: KPIs com ocupação de vagas (participantes/mentores vs.
  limite), tendência de inscrições, fila de aprovação, desafios mais escolhidos,
  status dos pedidos de mentoria e tabela de times, mais um checklist de prontidão
  do evento. Gráficos em `shared/components/charts/` (SVG/CSS, sem biblioteca).
- `gerenciar/inscricoes` — aprova/recusa participantes (modo APPROVAL) e
  candidaturas de mentor; a aba mostra o nº de pendências.
- `gerenciar/configuracoes` — edição do evento (nome, sobre, capa, local, preço,
  limites, datas, inscrição, status/visibilidade). O modo CODE exige código.
- `gerenciar/desafios` — CRUD de desafios.

## Mentoria (web + Discord)

Os pedidos de ajuda são a **mesma fila** do `/mentoria` do bot Discord
(`MentorshipService`): o participante pede/cancela na visão geral do evento; o mentor
assume (claim atômico — 409 se outro mentor pegou antes) e conclui no painel de
mentoria, que também lista todos os times com "Mentorar este time".

## Capas de evento

Sem imagem enviada, as capas usam a classe global `.cover-art` (navy da marca +
brilho tingido por `coverHue(slug)`, faixa ciano→índigo). Com foto, `coverImage()`
monta o `background-image` (com véu escuro quando há texto por cima).

## Deploy (AWS)

`https://hackahub.com.br` é um CloudFront com duas origens: os arquivos do build (`*.js`,
`*.css`, `media/`, nomes com hash) vêm do **S3**, e o HTML vem do **Angular SSR no AWS
Lambda** (`hackahub-web-ssr`, Function URL protegida por OAC). A infraestrutura é do
CloudFormation da `hackahub-api` (`deploy/README.md`).

- [`lambda/index.mjs`](lambda/index.mjs): adaptador do Lambda. Sobe o `reqHandler` do
  `src/server.ts` num servidor local e repassa cada evento da Function URL para ele.
- [`lambda/smoke-test.mjs`](lambda/smoke-test.mjs): invoca o adaptador contra o build
  (`node lambda/smoke-test.mjs dist/hackahub-frontend`); roda no CI.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): a cada push na `main`, CI
  nos runners do GitHub e publicação no runner self-hosted da EC2 (label `hackahub-prod`):
  estáticos no S3 com cache de 1 ano, zip do SSR no Lambda e invalidação do CloudFront.

O Angular só renderiza no servidor para os hosts de `NG_ALLOWED_HOSTS` (variável do
Lambda); qualquer outro recebe 400, que é a proteção contra SSRF do `@angular/ssr`.

### Temporário: GitHub Pages (sem SSR)

Enquanto o CloudFront não está liberado na conta AWS, `https://hackahub.com.br` é servido
pelo **GitHub Pages** só como app de navegador. O workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builda com a configuração
`pages` do `angular.json` (`outputMode: static`, sem servidor) e publica a cada push na
`master`. Rotas profundas caem no `404.html`, que é o próprio app: o navegador abre
normal, mas a resposta HTTP é 404 e não há SSR para SEO.

Para voltar ao CloudFront: apague no Route 53 os registros A/AAAA de `hackahub.com.br` e o
CNAME de `www` (o deploy da stack cria os ALIAS e falharia com eles lá), remova o domínio
em **Settings → Pages** e desative o workflow `GitHub Pages`.

## Fora de escopo

Billing, white-label, submissões, julgamento, matchmaking e fluxo *push* de mentor. Há ganchos/TODOs onde faz sentido.

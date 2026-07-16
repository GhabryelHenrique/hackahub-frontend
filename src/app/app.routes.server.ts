import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Estratégia de renderização (docs §2.1):
 * - Área pública (catálogo, detalhe de evento, login/cadastro) → SSR para SEO/LCP.
 * - Área autenticada (`/app/**`) → CSR (depende da sessão do navegador).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'app',
    renderMode: RenderMode.Client,
  },
  {
    path: 'app/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];

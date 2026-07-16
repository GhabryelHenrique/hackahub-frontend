import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { mockBackendInterceptor } from './core/data/mock/mock-backend.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // 'undefinedIfStale' preserva o valor padrão do input() quando o param/query
      // nunca esteve na URL; o default do router ('alwaysUndefined') zera
      // TODOS os inputs roteados no primeiro carregamento sem o param.
      withComponentInputBinding({ unmatchedInputBehavior: 'undefinedIfStale' }),
      withViewTransitions(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // Necessário para que os filhos de `/app/eventos/:hackathonId` recebam o
      // `hackathonId` via input binding (docs §2.4).
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        errorInterceptor,
        authInterceptor,
        // Backend em memória — só quando `useMock` (docs §6). Deve ser o último
        // da cadeia para receber a requisição já com o token injetado.
        ...(environment.useMock ? [mockBackendInterceptor] : []),
      ]),
    ),
    // Restaura a sessão a partir do token guardado antes de renderizar (docs §2.3).
    provideAppInitializer(() => inject(AuthService).bootstrap()),
  ],
};

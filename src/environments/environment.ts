/**
 * Configuração de ambiente (docs §6).
 *
 * `useMock`: quando `true`, um interceptor de backend em memória responde às
 * chamadas HTTP com dados de seed — o app roda de ponta a ponta sem servidor.
 * Para apontar ao backend real (Hackahub API), defina `useMock: false` e ajuste
 * `apiBaseUrl` para a URL do NestJS (ex.: `http://localhost:3000`).
 *
 * `apiBaseUrl` de produção vem do build: o deploy roda
 * `ng build --define "HACKAHUB_API_BASE_URL='https://api.hackahub.com.br'"`.
 */
declare const HACKAHUB_API_BASE_URL: string | undefined;

export const environment = {
  production: true,
  useMock: false,
  apiBaseUrl:
    typeof HACKAHUB_API_BASE_URL === 'string'
      ? HACKAHUB_API_BASE_URL
      : 'http://localhost:3000',
  appName: 'Hackahub',
};

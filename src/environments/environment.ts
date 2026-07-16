/**
 * Configuração de ambiente (docs §6).
 *
 * `useMock`: quando `true`, um interceptor de backend em memória responde às
 * chamadas HTTP com dados de seed — o app roda de ponta a ponta sem servidor.
 * Para apontar ao backend real (Hackahub API), defina `useMock: false` e ajuste
 * `apiBaseUrl` para a URL do NestJS (ex.: `http://localhost:3000`).
 */
export const environment = {
  production: true,
  useMock: false,
  apiBaseUrl: 'http://localhost:3000',
  appName: 'Hackahub',
};

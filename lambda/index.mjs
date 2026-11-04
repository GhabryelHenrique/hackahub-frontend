/**
 * Adaptador AWS Lambda (Function URL atrás do CloudFront) → servidor Express do
 * Angular SSR (src/server.ts). Vai na raiz do zip do deploy, ao lado de `server/` e
 * `browser/` (saída do `ng build`).
 *
 * Em vez de reimplementar req/res do Node, sobe o `reqHandler` do Angular num
 * servidor HTTP local (uma vez por container) e repassa cada evento para ele.
 *
 * Host público: o CloudFront precisa mandar o Host da própria Function URL (OAC
 * assina o request), então a CloudFront Function copia o host do navegador para
 * `x-hackahub-host`, que aqui vira `x-forwarded-host` (NG_TRUST_PROXY_HEADERS e
 * NG_ALLOWED_HOSTS, no template do CloudFormation).
 */
import { createServer } from 'node:http';
import { reqHandler } from './server/server.mjs';

const server = createServer(reqHandler);
const ready = new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

// Não seguem para o servidor local (hop-by-hop, ou recalculados pelo fetch).
const DROP_REQUEST = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'expect',
  'x-hackahub-host',
]);
// O fetch já descomprime o corpo; o CloudFront comprime de novo para o navegador.
const DROP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);
const TEXT = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;

export async function handler(event) {
  await ready;
  const { port } = server.address();
  const { method } = event.requestContext.http;

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    if (!DROP_REQUEST.has(name.toLowerCase())) headers.set(name, value);
  }
  if (event.cookies?.length) headers.set('cookie', event.cookies.join('; '));
  const publicHost = event.headers?.['x-hackahub-host'];
  if (publicHost) headers.set('x-forwarded-host', publicHost);
  headers.set('x-forwarded-proto', 'https');

  const hasBody = event.body && method !== 'GET' && method !== 'HEAD';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const response = await fetch(`http://127.0.0.1:${port}${event.rawPath}${query}`, {
    method,
    headers,
    body: hasBody ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8') : undefined,
    redirect: 'manual',
  });

  const outHeaders = {};
  response.headers.forEach((value, name) => {
    if (!DROP_RESPONSE.has(name)) outHeaders[name] = value;
  });
  const body = Buffer.from(await response.arrayBuffer());
  const isText = TEXT.test(response.headers.get('content-type') ?? '');
  return {
    statusCode: response.status,
    headers: outHeaders,
    cookies: response.headers.getSetCookie(),
    body: isText ? body.toString('utf8') : body.toString('base64'),
    isBase64Encoded: !isText,
  };
}

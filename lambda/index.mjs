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
 *
 * Compressão: o comportamento do HTML usa CachingDisabled, e o CloudFront não
 * comprime o que não cacheia — então o texto sai comprimido daqui (Brotli ou gzip,
 * conforme o Accept-Encoding do navegador, que a AllViewerExceptHostHeader repassa).
 */
import { createServer } from 'node:http';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
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
// O fetch já descomprime o corpo (o Express não comprime, mas por garantia); a
// compressão para o navegador é feita no fim do handler.
const DROP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);
const TEXT = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;
// Abaixo disso a compressão não compensa o custo.
const MIN_COMPRESS_BYTES = 1024;

function pickEncoding(acceptEncoding = '') {
  if (/\bbr\b/.test(acceptEncoding)) return 'br';
  if (/\bgzip\b/.test(acceptEncoding)) return 'gzip';
  return null;
}

function compress(body, encoding) {
  // Qualidade 5 do Brotli: perto do gzip em CPU, bem melhor em tamanho.
  return encoding === 'br'
    ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
    : gzipSync(body, { level: 6 });
}

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
  let body = Buffer.from(await response.arrayBuffer());
  const isText = TEXT.test(response.headers.get('content-type') ?? '');
  const encoding =
    isText && body.length >= MIN_COMPRESS_BYTES ? pickEncoding(event.headers?.['accept-encoding']) : null;
  if (encoding) {
    body = compress(body, encoding);
    outHeaders['content-encoding'] = encoding;
    outHeaders.vary = outHeaders.vary ? `${outHeaders.vary}, accept-encoding` : 'accept-encoding';
  }
  // Texto sem compressão vai como string; binário ou comprimido, em base64.
  const asText = isText && !encoding;
  return {
    statusCode: response.status,
    headers: outHeaders,
    cookies: response.headers.getSetCookie(),
    body: asText ? body.toString('utf8') : body.toString('base64'),
    isBase64Encoded: !asText,
  };
}

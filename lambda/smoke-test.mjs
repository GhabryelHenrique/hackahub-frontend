/**
 * Smoke test do adaptador Lambda (index.mjs) contra o build de verdade:
 *   node lambda/smoke-test.mjs dist/hackahub-frontend
 * Monta o pacote como o deploy (index.mjs + server/ + browser/) numa pasta
 * temporária e invoca o handler com eventos no formato da Function URL.
 */
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const dist = resolve(process.argv[2] ?? 'dist/hackahub-frontend');
const pkg = mkdtempSync(join(tmpdir(), 'hackahub-ssr-'));
cpSync(new URL('./index.mjs', import.meta.url), join(pkg, 'index.mjs'));
cpSync(join(dist, 'server'), join(pkg, 'server'), { recursive: true });
cpSync(join(dist, 'browser'), join(pkg, 'browser'), { recursive: true });

process.env.NG_ALLOWED_HOSTS ??= 'hackahub.com.br,*.cloudfront.net,127.0.0.1,localhost';
process.env.NG_TRUST_PROXY_HEADERS ??= 'x-forwarded-host,x-forwarded-proto';
const { handler } = await import(pathToFileURL(join(pkg, 'index.mjs')).href);

const event = (rawPath, host = 'hackahub.com.br', acceptEncoding) => ({
  rawPath,
  rawQueryString: '',
  headers: {
    host: 'id.lambda-url.us-east-2.on.aws',
    'x-hackahub-host': host,
    ...(acceptEncoding ? { 'accept-encoding': acceptEncoding } : {}),
  },
  requestContext: { http: { method: 'GET', path: rawPath } },
  isBase64Encoded: false,
});

// HTML comprimido: confere o header e que o corpo descomprime para o SSR.
const compressed = (encoding, decompress) => (r) =>
  r.statusCode === 200 &&
  r.isBase64Encoded &&
  r.headers['content-encoding'] === encoding &&
  /accept-encoding/.test(r.headers.vary ?? '') &&
  /<app-root/.test(decompress(Buffer.from(r.body, 'base64')).toString('utf8'));

const checks = [
  ['SSR da home', event('/'), (r) => r.statusCode === 200 && /<app-root/.test(r.body)],
  ['shell CSR de /app', event('/app'), (r) => r.statusCode === 200 && /<app-root/.test(r.body)],
  ['arquivo binário em base64', event('/favicon.ico'), (r) => r.statusCode === 200 && r.isBase64Encoded],
  ['host fora do NG_ALLOWED_HOSTS → 400', event('/', 'evil.example.com'), (r) => r.statusCode === 400],
  ['HTML com Brotli (Accept-Encoding: br)', event('/', undefined, 'gzip, deflate, br, zstd'), compressed('br', brotliDecompressSync)],
  ['HTML com gzip (Accept-Encoding: gzip)', event('/', undefined, 'gzip'), compressed('gzip', gunzipSync)],
  ['sem Accept-Encoding: texto puro', event('/'), (r) => !r.headers['content-encoding'] && !r.isBase64Encoded],
];

let failed = 0;
for (const [label, ev, ok] of checks) {
  const res = await handler(ev);
  const pass = ok(res);
  failed += pass ? 0 : 1;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label} (${res.statusCode})`);
}
process.exit(failed ? 1 : 0);

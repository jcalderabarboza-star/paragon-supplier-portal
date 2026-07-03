// Local verify harness for the prototype access gate (SEC-GATE-01).
//
// Vercel Routing Middleware does not run under `vite preview`, so this tiny Node
// server wraps the SAME gate/handler.js the middleware uses and serves the built
// dist/ behind it. That lets Playwright drive the real gate end-to-end locally —
// unauthenticated -> gate -> wrong creds -> right creds -> app -> refresh -> logout —
// with no Vercel deploy. It is a verification tool only; it never ships.
//
// Usage (from repo root, after `npm run build`):
//   GATE_USER=paragon GATE_PASSWORD=... GATE_SECRET=... node scripts/gate-preview-server.mjs
// Optional: PORT (default 4178).

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGateRequest } from '../gate/handler.js';

const PORT = Number(process.env.PORT || 4178);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const env = {
  GATE_USER: process.env.GATE_USER,
  GATE_PASSWORD: process.env.GATE_PASSWORD,
  GATE_SECRET: process.env.GATE_SECRET,
};
if (!env.GATE_USER || !env.GATE_PASSWORD || !env.GATE_SECRET) {
  console.warn('[gate-harness] GATE_USER / GATE_PASSWORD / GATE_SECRET not all set — gate will render its fail-closed 503 page.');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const mimeFor = (p) => MIME[p.slice(p.lastIndexOf('.')).toLowerCase()] || 'application/octet-stream';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function toWebRequest(req) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }
  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await readBody(req);
    init.duplex = 'half';
  }
  return new Request(`http://localhost:${PORT}${req.url}`, init);
}

async function sendWebResponse(res, webRes) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  const cookies =
    typeof webRes.headers.getSetCookie === 'function' ? webRes.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(Buffer.from(await webRes.arrayBuffer()));
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  let filePath = normalize(join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end('forbidden');
  }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(filePath);
    res.setHeader('content-type', mimeFor(filePath));
    res.setHeader('cache-control', 'no-store');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const webReq = await toWebRequest(req);
    const gated = await handleGateRequest(webReq, env);
    if (gated) return await sendWebResponse(res, gated);
    return await serveStatic(res, new URL(webReq.url).pathname);
  } catch (err) {
    res.statusCode = 500;
    res.end(`harness error: ${err?.message ?? err}`);
  }
});

server.listen(PORT, () => {
  console.log(`[gate-harness] serving dist/ behind the gate at http://localhost:${PORT}`);
});

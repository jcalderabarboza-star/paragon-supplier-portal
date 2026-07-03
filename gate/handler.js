// The prototype access gate, as a pure function of the request (SEC-GATE-01).
//
// Returns a Response to short-circuit (serve the gate, redirect, or 401/503) or
// `null` to let the request continue to the origin (i.e. serve the SPA). Keeping
// this framework-agnostic — plain Web Request/Response, no Vercel imports — lets
// the SAME handler run inside middleware.js on Vercel AND inside the local Node
// verify harness, so the Playwright flow exercises the real gate logic.

import { signSession, verifySession, timingSafeEqual } from './session.js';
import { renderGatePage, renderMisconfigPage } from './render.js';

const COOKIE = 'pgate';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7-day session

const SECURITY_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
    },
  });
}

function redirect(location, cookie) {
  const headers = { Location: location, 'cache-control': 'no-store', ...SECURITY_HEADERS };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

const sessionCookie = (token) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
const clearedCookie = () =>
  `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Always compares both fields so the response time doesn't reveal which was wrong.
function checkCredentials(user, pass, env) {
  const okUser = timingSafeEqual(user, env.GATE_USER || '');
  const okPass = timingSafeEqual(pass, env.GATE_PASSWORD || '');
  return okUser && okPass;
}

export async function handleGateRequest(request, env, nowMs = Date.now()) {
  const { pathname } = new URL(request.url);

  // Let crawlers read the noindex directive and let the tab icon load without a
  // session, so the "keep it out of search" intent works even pre-auth.
  if (pathname === '/robots.txt' || pathname === '/favicon.ico') return null;

  // Fail closed: with no secrets provisioned, deny everything rather than either
  // exposing the prototype or accepting a token signed with an empty secret.
  if (!env.GATE_SECRET || !env.GATE_PASSWORD || !env.GATE_USER) {
    return htmlResponse(renderMisconfigPage(), 503);
  }

  if (pathname === '/__gate/logout') {
    return redirect('/', clearedCookie());
  }

  if (pathname === '/__gate/login') {
    if (request.method !== 'POST') return redirect('/');
    let user = '';
    let pass = '';
    try {
      const form = await request.formData();
      user = String(form.get('username') ?? '');
      pass = String(form.get('password') ?? '');
    } catch {
      // malformed body → treat as failed attempt
    }
    if (checkCredentials(user, pass, env)) {
      const token = await signSession(env.GATE_SECRET, TTL_SECONDS, nowMs);
      return redirect('/', sessionCookie(token));
    }
    return htmlResponse(renderGatePage({ error: 'Incorrect username or password.' }), 401);
  }

  // Everything else — including the app shell and every /assets/* chunk — needs a
  // valid session. Unauthenticated clients never receive the app bundle.
  const token = readCookie(request, COOKIE);
  if (token && (await verifySession(env.GATE_SECRET, token, nowMs))) return null;

  return htmlResponse(renderGatePage({}), 200);
}

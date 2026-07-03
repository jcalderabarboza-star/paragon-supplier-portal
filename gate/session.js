// Signed, expiring session token for the prototype access gate (SEC-GATE-01).
//
// HMAC-SHA256 over a compact JSON claim set, using the Web Crypto API so the
// exact same code runs on the Vercel Edge runtime (where the middleware lives)
// and under plain Node (where the unit tests and the local verify harness run).
// The signing secret (GATE_SECRET) is a server-side, NON-VITE env var — it is
// never bundled into the client, so the token cannot be forged from the browser.

const encoder = new TextEncoder();

function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const strToB64url = (str) => bytesToB64url(encoder.encode(str));
const b64urlToStr = (s) => new TextDecoder().decode(b64urlToBytes(s));

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

// Length-checked constant-time compare — no early-out on the first differing
// byte, so a matched-length signature can't be recovered by timing.
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Sign a session valid for ttlSeconds. `nowMs` is injectable so tests can pin time.
export async function signSession(secret, ttlSeconds, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000);
  const payload = strToB64url(
    JSON.stringify({ v: 1, sub: 'prototype', iat, exp: iat + ttlSeconds }),
  );
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

// Verify signature + expiry. Returns a boolean and never throws.
export async function verifySession(secret, token, nowMs = Date.now()) {
  if (!secret || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected;
  try {
    expected = await hmac(secret, payload);
  } catch {
    return false;
  }
  if (!timingSafeEqual(sig, expected)) return false;

  try {
    const claims = JSON.parse(b64urlToStr(payload));
    if (claims.v !== 1 || typeof claims.exp !== 'number') return false;
    return Math.floor(nowMs / 1000) < claims.exp;
  } catch {
    return false;
  }
}

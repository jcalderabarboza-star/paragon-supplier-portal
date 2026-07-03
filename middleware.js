// Vercel Routing Middleware — the deploy-time entry for the prototype access
// gate (SEC-GATE-01). Runs on the Edge Network BEFORE the vercel.json SPA
// rewrite, so it can gate the app shell and every /assets/* chunk: the app
// bundle is never served to an unauthenticated client. The gate decision lives
// in the framework-agnostic gate/ core, which is also driven by the local Node
// verify harness — so what Playwright exercises is exactly what ships.
//
// Secrets (GATE_USER / GATE_PASSWORD / GATE_SECRET) are server-side, NON-VITE
// environment variables read here via process.env; they are never bundled into
// the client. If they are unset the gate fails closed (503) — see gate/handler.js.

import { next } from '@vercel/functions';
import { handleGateRequest } from './gate/handler.js';

// Run on everything. Passthrough for /robots.txt and /favicon.ico is handled
// inside the gate so crawlers can still read the noindex directive pre-auth.
export const config = {
  matcher: '/(.*)',
};

export default async function middleware(request) {
  const env = {
    GATE_USER: process.env.GATE_USER,
    GATE_PASSWORD: process.env.GATE_PASSWORD,
    GATE_SECRET: process.env.GATE_SECRET,
  };

  const response = await handleGateRequest(request, env);
  return response ?? next();
}

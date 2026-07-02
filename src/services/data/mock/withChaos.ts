// ────────────────────────────────────────────────────────────────────────────
// withChaos — dev-only decorator that wraps an IDataService to inject latency
// (jitter range) and probabilistic failures, WITHOUT changing any method
// signature. Every method is already async, so we await a jittered delay and
// maybe throw DataError('CHAOS') before delegating to the real method.
//
// GATED: only wired in when import.meta.env.DEV && VITE_CHAOS === 'on'
// (see main.tsx). import.meta.env.DEV is statically false in the Vercel
// production build, so this module is dead code there and tree-shaken out.
// Tests get determinism by default (flag unset) and can opt in explicitly by
// passing a chaos-wrapped service to renderWithProviders.
// ────────────────────────────────────────────────────────────────────────────

import type { IDataService } from '../types';
import { DataError } from '../types';

export interface ChaosConfig {
  minMs: number;
  maxMs: number;
  failureRate: number; // 0..1
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (min: number, max: number) =>
  min + Math.random() * Math.max(0, max - min);

// Wrap every method of a sub-service. `this` binds to the original target so
// internal delegations (e.g. getPurchaseOrder -> getPurchaseOrders) are not
// double-delayed or double-failed — chaos applies at the top call boundary only.
function chaosProxy<T extends object>(target: T, cfg: ChaosConfig): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      if (typeof value !== 'function') return value;
      const method = value as (...args: unknown[]) => unknown;
      return async (...args: unknown[]) => {
        await sleep(jitter(cfg.minMs, cfg.maxMs));
        if (Math.random() < cfg.failureRate)
          throw new DataError('CHAOS', `Injected chaos failure on ${String(prop)}()`);
        return method.apply(obj, args);
      };
    },
  });
}

export function withChaos(inner: IDataService, cfg: ChaosConfig): IDataService {
  return {
    suppliers: chaosProxy(inner.suppliers, cfg),
    procurement: chaosProxy(inner.procurement, cfg),
    risk: chaosProxy(inner.risk, cfg),
    discovery: chaosProxy(inner.discovery, cfg),
    analytics: chaosProxy(inner.analytics, cfg),
    engagement: chaosProxy(inner.engagement, cfg),
  };
}

export function chaosConfigFromEnv(): ChaosConfig {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    minMs: num(import.meta.env.VITE_CHAOS_MIN_MS, 200),
    maxMs: num(import.meta.env.VITE_CHAOS_MAX_MS, 900),
    failureRate: num(import.meta.env.VITE_CHAOS_FAILURE_RATE, 0.15),
  };
}

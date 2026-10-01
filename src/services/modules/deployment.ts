// ────────────────────────────────────────────────────────────────────────────
// M1 · WHICH DEPLOYMENT IS THIS? — the input `MODULE_SET_NOT_SAMPLE_IN_PROD`
// reads (Design 5 D3, ruled: sample people may switch modules in the demo;
// production needs a real person, "gated on the deployment badge").
//
// The deployment badge is ENV-BADGE-01's `resolveEnvBadge`: `DEV` on a dev
// server, `PREVIEW` on a preview deploy (and on a local `build && preview`,
// whose hostname is not a production host), and NO BADGE on a production
// deploy. So production is exactly "the header shows no badge" — one reading,
// the same one the operator sees in the top bar, never a second classifier.
//
// ⚠️ **THE CONSEQUENCE, STATED WHERE THE NEXT READER WILL LOOK:** on the
// production alias no sample person can switch a module, and until the IdP
// there is nobody else. That is the ruling applied as written; switching is
// available on dev and preview deployments. Lifting it is a ruling, not an edit.
//
// `set` / `reset` exist for the both-ways probe, on `sdcClock`'s pattern.
// ────────────────────────────────────────────────────────────────────────────

import { resolveEnvBadge, type EnvBadge } from '../../lib/envBadge';

const liveBadge = (): EnvBadge =>
  resolveEnvBadge(
    import.meta.env.DEV,
    typeof __DEPLOY_ENV__ === 'string' ? __DEPLOY_ENV__ : undefined,
    typeof window !== 'undefined' ? window.location.hostname : undefined,
  );

let override: { badge: EnvBadge } | null = null;

export const moduleDeployment = {
  /** The badge in force: the live one, unless a probe set one. */
  badge(): EnvBadge {
    return override ? override.badge : liveBadge();
  },
  /** Production is the deployment that shows no badge. */
  isProduction(): boolean {
    return this.badge() === null;
  },
  set(badge: EnvBadge): void {
    override = { badge };
  },
  reset(): void {
    override = null;
  },
};

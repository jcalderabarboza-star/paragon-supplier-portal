// ────────────────────────────────────────────────────────────────────────────
// Deploy-environment badge for the header (ENV-BADGE-01).
//
// Three honest states:
//   • DEV      — local dev server (import.meta.env.DEV)
//   • PREVIEW  — a Vercel preview deploy
//   • null     — a production deploy: no badge at all
//
// PRIMARY signal is Vercel's build-time VERCEL_ENV ('production' | 'preview' |
// 'development'), injected into the client bundle by vite `define` as the global
// __DEPLOY_ENV__. VERCEL_ENV is the DEPLOY's environment, so it is 'production'
// on EVERY production deploy — the canonical alias, a deployment-specific
// (immutable) URL, or a dashboard redeploy — independent of which hostname the
// deploy is viewed through. This kills the original fragility (a hostname
// allowlist wrongly badged any production host it didn't hardcode as PREVIEW).
//
// The hostname allowlist survives only as a FALLBACK for builds with no
// VERCEL_ENV: a local `npm run build && preview`, or any non-Vercel host.
//
// Pure function (inputs passed in) so it is unit-testable without a DOM or a
// build. TopBarV2 supplies import.meta.env.DEV + __DEPLOY_ENV__ + window hostname.
// ────────────────────────────────────────────────────────────────────────────

export type EnvBadge = 'DEV' | 'PREVIEW' | null;

// Fallback allowlist only — used when VERCEL_ENV is absent (local prod build /
// non-Vercel). On Vercel, the VERCEL_ENV branch decides before this is reached.
export const PRODUCTION_HOSTS = [
  'paragon-supplier-portal.vercel.app',
  'paragon-supplier-portal-odyssey5.vercel.app',
  'paragon-supplier-portal-git-main-odyssey5.vercel.app',
];

export function resolveEnvBadge(
  isDev: boolean,
  deployEnv: string | undefined,
  hostname: string | undefined,
): EnvBadge {
  if (isDev) return 'DEV';

  // Primary, deploy-path-independent signal.
  if (deployEnv === 'production') return null;
  if (deployEnv === 'preview') return 'PREVIEW';

  // Fallback: no VERCEL_ENV in the build (non-Vercel / local `build && preview`).
  if (!hostname) return null;
  return PRODUCTION_HOSTS.includes(hostname) ? null : 'PREVIEW';
}

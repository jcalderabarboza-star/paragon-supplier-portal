// ────────────────────────────────────────────────────────────────────────────
// Deploy-environment badge for the header (ENV-BADGE-01).
//
// Three honest states:
//   • DEV      — local dev server (import.meta.env.DEV)
//   • PREVIEW  — a Vercel preview deploy (any non-canonical host, in a prod build)
//   • null     — the production canonical domain: no badge at all
//
// Pure function (inputs passed in) so it is unit-testable without a DOM or a
// build-mode toggle. TopBarV2 supplies import.meta.env.DEV + window hostname.
// ────────────────────────────────────────────────────────────────────────────

export type EnvBadge = 'DEV' | 'PREVIEW' | null;

// The canonical production hostnames for this Vercel project. Anything else in
// a production build is a preview deploy.
export const PRODUCTION_HOSTS = [
  'paragon-supplier-portal.vercel.app',
  'paragon-supplier-portal-odyssey5.vercel.app',
  'paragon-supplier-portal-git-main-odyssey5.vercel.app',
];

export function resolveEnvBadge(
  isDev: boolean,
  hostname: string | undefined,
): EnvBadge {
  if (isDev) return 'DEV';
  if (!hostname) return null;
  if (PRODUCTION_HOSTS.includes(hostname)) return null;
  return 'PREVIEW';
}

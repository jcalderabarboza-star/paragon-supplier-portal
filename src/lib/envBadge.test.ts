import { describe, it, expect } from 'vitest';
import { resolveEnvBadge } from './envBadge';

describe('resolveEnvBadge — deploy-path-independent via VERCEL_ENV', () => {
  it('DEV on the local dev server, regardless of the other signals', () => {
    expect(resolveEnvBadge(true, undefined, 'localhost')).toBe('DEV');
    expect(resolveEnvBadge(true, 'preview', 'paragon-supplier-portal.vercel.app')).toBe('DEV');
  });

  // The hardening: on a production deploy the badge is null on ANY host — the
  // canonical alias, an immutable deployment-specific URL, or a custom domain.
  // This is the case that regressed under the old hostname-allowlist signal.
  it('VERCEL_ENV=production → no badge on any host', () => {
    expect(
      resolveEnvBadge(false, 'production', 'paragon-supplier-portal.vercel.app'),
    ).toBeNull();
    expect(
      resolveEnvBadge(false, 'production', 'paragon-supplier-portal-8a1io5q7o-odyssey5.vercel.app'),
    ).toBeNull();
    expect(resolveEnvBadge(false, 'production', 'portal.paragon.co.id')).toBeNull();
    expect(resolveEnvBadge(false, 'production', undefined)).toBeNull();
  });

  it('VERCEL_ENV=preview → PREVIEW, even on a canonical-looking host', () => {
    expect(
      resolveEnvBadge(false, 'preview', 'paragon-supplier-portal.vercel.app'),
    ).toBe('PREVIEW');
    expect(
      resolveEnvBadge(false, 'preview', 'paragon-supplier-portal-abc123-odyssey5.vercel.app'),
    ).toBe('PREVIEW');
  });

  describe('fallback when VERCEL_ENV is absent (local `build && preview` / non-Vercel)', () => {
    it('no badge on a canonical host', () => {
      expect(resolveEnvBadge(false, '', 'paragon-supplier-portal.vercel.app')).toBeNull();
      expect(
        resolveEnvBadge(false, undefined, 'paragon-supplier-portal-git-main-odyssey5.vercel.app'),
      ).toBeNull();
    });

    it('PREVIEW on a non-canonical host', () => {
      expect(resolveEnvBadge(false, '', 'some-preview-xyz.vercel.app')).toBe('PREVIEW');
    });

    it('null when the hostname is unknown', () => {
      expect(resolveEnvBadge(false, undefined, undefined)).toBeNull();
    });
  });
});

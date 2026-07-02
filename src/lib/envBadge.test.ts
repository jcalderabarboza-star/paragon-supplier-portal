import { describe, it, expect } from 'vitest';
import { resolveEnvBadge } from './envBadge';

describe('resolveEnvBadge — three honest deploy states', () => {
  it('DEV on the local dev server', () => {
    expect(resolveEnvBadge(true, 'localhost')).toBe('DEV');
    expect(resolveEnvBadge(true, 'paragon-supplier-portal.vercel.app')).toBe('DEV');
  });

  it('nothing on the production canonical domain', () => {
    expect(resolveEnvBadge(false, 'paragon-supplier-portal.vercel.app')).toBeNull();
    expect(resolveEnvBadge(false, 'paragon-supplier-portal-git-main-odyssey5.vercel.app')).toBeNull();
  });

  it('PREVIEW on a preview deploy host', () => {
    expect(resolveEnvBadge(false, 'paragon-supplier-portal-abc123-odyssey5.vercel.app')).toBe('PREVIEW');
  });

  it('nothing when the hostname is unknown', () => {
    expect(resolveEnvBadge(false, undefined)).toBeNull();
  });
});

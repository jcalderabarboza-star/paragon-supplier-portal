import { describe, it, expect } from 'vitest';
import { CANONICAL_STATUSES } from './statusTone';
import {
  statusLabelKey,
  statusResourcesEn,
  statusResourcesId,
  __statusInternals,
} from './statusLabel';
import { resources } from './i18n';

const { STATUS_ID, slug } = __statusInternals;

describe('statusLabel — SSoT invariants (SEAT2-I18N-CHROME-01)', () => {
  it('every canonical status (statusTone.ts) has an ID translation', () => {
    const missing = CANONICAL_STATUSES.filter((s) => !(s in STATUS_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical status resolves to a key present in both en and id resources', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const status of CANONICAL_STATUSES) {
      const key = statusLabelKey(status);
      expect(key).not.toBeNull();
      expect(en[key as string]).toBeDefined();
      expect(id[key as string]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical to pre-i18n pills)', () => {
    for (const status of CANONICAL_STATUSES) {
      expect(statusResourcesEn[slug(status)]).toBe(status);
    }
  });

  it('ID differs from EN for the shared vocabulary (real translation, not fallback)', () => {
    // codes / loanwords intentionally kept identical across locales
    const keepAsIs = new Set(['EDI 846', 'Normal', 'Manual', 'Onboarding']);
    for (const status of CANONICAL_STATUSES) {
      if (keepAsIs.has(status)) continue;
      expect(statusResourcesId[slug(status)]).not.toBe(status);
    }
  });

  it('slugs are unique (no key collisions)', () => {
    const slugs = CANONICAL_STATUSES.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('statusLabelKey returns null for unknown / non-canonical labels', () => {
    expect(statusLabelKey('Totally Made Up')).toBeNull();
    expect(statusLabelKey('')).toBeNull();
  });

  it('statusLabelKey trims surrounding whitespace', () => {
    expect(statusLabelKey('  Delivered  ')).toBe('status.delivered');
  });
});

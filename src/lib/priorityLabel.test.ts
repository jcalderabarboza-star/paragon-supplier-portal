import { describe, it, expect } from 'vitest';
import {
  enumLabelKey,
  enumResourcesEn,
  enumResourcesId,
  CANONICAL_ENUMS,
  __enumInternals,
} from './priorityLabel';
import { resources } from './i18n';

const { ENUM_ID, slug } = __enumInternals;

describe('priorityLabel — enum-label SSoT invariants (SEAT2-I18N-ENUM-01)', () => {
  it('every canonical enum token has an ID translation', () => {
    const missing = CANONICAL_ENUMS.filter((s) => !(s in ENUM_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical token resolves to a key present in both en and id resources', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const token of CANONICAL_ENUMS) {
      const key = enumLabelKey(token);
      expect(key).not.toBeNull();
      expect(en[key as string]).toBeDefined();
      expect(id[key as string]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical display)', () => {
    for (const token of CANONICAL_ENUMS) {
      expect(enumResourcesEn[slug(token)]).toBe(token);
    }
  });

  it('ID differs from EN for every token (real translation, not fallback)', () => {
    for (const token of CANONICAL_ENUMS) {
      expect(enumResourcesId[slug(token)]).not.toBe(token);
    }
  });

  it('slugs are unique (no key collisions)', () => {
    const slugs = CANONICAL_ENUMS.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('enum slugs never collide with the status.* namespace', () => {
    for (const token of CANONICAL_ENUMS) {
      expect(slug(token).startsWith('enum.')).toBe(true);
    }
  });

  it('resolution is case-insensitive (RiskSeverity is stored lowercase)', () => {
    // 'High' (PRPriority) and 'high' (RiskSeverity) are the same display axis.
    expect(enumLabelKey('high')).toBe('enum.high');
    expect(enumLabelKey('High')).toBe('enum.high');
    expect(enumLabelKey('CRITICAL')).toBe('enum.critical');
  });

  it('slugs non-alphanumerics into underscores', () => {
    expect(enumLabelKey('N/A')).toBe('enum.n_a');
    expect(enumLabelKey('Return to Supplier')).toBe('enum.return_to_supplier');
  });

  it('enumLabelKey returns null for unknown / non-enum labels', () => {
    expect(enumLabelKey('Totally Made Up')).toBeNull();
    expect(enumLabelKey('')).toBeNull();
  });

  it('enumLabelKey trims surrounding whitespace', () => {
    expect(enumLabelKey('  High  ')).toBe('enum.high');
  });
});

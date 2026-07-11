import { describe, it, expect } from 'vitest';
import {
  modeLabelKey,
  modeResourcesEn,
  modeResourcesId,
  CANONICAL_MODES,
  __modeInternals,
} from './modeLabel';
import { resources } from './i18n';

const { MODE_ID, slug } = __modeInternals;

describe('modeLabel — shipment-mode SSoT invariants (SEAT2-I18N-MODE-01)', () => {
  it('every canonical mode has an ID translation', () => {
    const missing = CANONICAL_MODES.filter((s) => !(s in MODE_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical mode resolves to a key present in both en and id resources', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const mode of CANONICAL_MODES) {
      const key = modeLabelKey(mode);
      expect(key).not.toBeNull();
      expect(en[key as string]).toBeDefined();
      expect(id[key as string]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical display)', () => {
    for (const mode of CANONICAL_MODES) {
      expect(modeResourcesEn[slug(mode)]).toBe(mode);
    }
  });

  it('ID differs from EN for every mode (real translation)', () => {
    for (const mode of CANONICAL_MODES) {
      expect(modeResourcesId[slug(mode)]).not.toBe(mode);
    }
  });

  it('mode slugs are unique and namespaced mode.*', () => {
    const slugs = CANONICAL_MODES.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const mode of CANONICAL_MODES) expect(slug(mode).startsWith('mode.')).toBe(true);
  });

  it('resolution is case-insensitive and whitespace-trimmed', () => {
    expect(modeLabelKey('Sea')).toBe('mode.sea');
    expect(modeLabelKey('sea')).toBe('mode.sea');
    expect(modeLabelKey('  Air  ')).toBe('mode.air');
  });

  it('modeLabelKey returns null for unknown tokens', () => {
    expect(modeLabelKey('Rail')).toBeNull();
    expect(modeLabelKey('')).toBeNull();
  });
});

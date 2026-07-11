import { describe, it, expect } from 'vitest';
import {
  categoryLabelKey,
  categoryResourcesEn,
  categoryResourcesId,
  CANONICAL_CATEGORIES,
  __categoryInternals,
} from './categoryLabel';
import { resources } from './i18n';

const { CATEGORY_ID, slug } = __categoryInternals;

describe('categoryLabel — category SSoT invariants (SEAT2-I18N-CATEGORY-01)', () => {
  it('every canonical category has an ID translation', () => {
    const missing = CANONICAL_CATEGORIES.filter((s) => !(s in CATEGORY_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical category resolves to a key present in both en and id resources', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const cat of CANONICAL_CATEGORIES) {
      const key = categoryLabelKey(cat);
      expect(key).not.toBeNull();
      expect(en[key as string]).toBeDefined();
      expect(id[key as string]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical display)', () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(categoryResourcesEn[slug(cat)]).toBe(cat);
    }
  });

  it('category slugs are unique and namespaced category.*', () => {
    const slugs = CANONICAL_CATEGORIES.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const cat of CANONICAL_CATEGORIES) {
      expect(slug(cat).startsWith('category.')).toBe(true);
    }
  });

  it('the compliance-taxonomy split tokens localize (closes Batch 4/5 filter-vs-pill gap)', () => {
    expect(categoryResourcesId[slug('Halal Compliance')]).toBe('Kepatuhan Halal');
    expect(categoryResourcesId[slug('BPOM Regulatory')]).toBe('Regulasi BPOM');
    expect(categoryResourcesId[slug('Tax & Legal')]).toBe('Pajak & Hukum');
    expect(categoryResourcesId[slug('Quality')]).toBe('Kualitas');
    expect(categoryResourcesId[slug('Contract')]).toBe('Kontrak');
  });

  it('the beauty-material tokens localize', () => {
    expect(categoryResourcesId[slug('Fragrance')]).toBe('Pewangi');
    expect(categoryResourcesId[slug('Active Ingredient')]).toBe('Bahan Aktif');
    expect(categoryResourcesId[slug('Packaging')]).toBe('Kemasan');
    expect(categoryResourcesId[slug('Emulsifier')]).toBe('Pengemulsi');
    expect(categoryResourcesId[slug('Botanical')]).toBe('Botani');
    expect(categoryResourcesId[slug('Raw Material')]).toBe('Bahan Baku');
  });

  it('resolution is case-insensitive and whitespace-trimmed', () => {
    expect(categoryLabelKey('Fragrance')).toBe('category.fragrance');
    expect(categoryLabelKey('fragrance')).toBe('category.fragrance');
    expect(categoryLabelKey('  Tax & Legal  ')).toBe('category.tax_legal');
  });

  it('out-of-scope generic-industrial residue is unmapped (renders verbatim)', () => {
    expect(categoryLabelKey('Semiconductors')).toBeNull();
    expect(categoryLabelKey('PCB Assemblies')).toBeNull();
    expect(categoryLabelKey('Steel Components')).toBeNull();
    expect(categoryLabelKey('Rare Earth Metals')).toBeNull();
    expect(categoryLabelKey('')).toBeNull();
  });
});

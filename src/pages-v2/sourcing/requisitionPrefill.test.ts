// ────────────────────────────────────────────────────────────────────────────
// C.2 — the requisition prefill. EXACT MEMBERSHIP, AND THE REFUSALS ARE THE
// SUBJECT.
//
// The positive cases are one line each; the interesting half is everything the
// prefill DECLINES to carry, because every one of those is a place where a
// plausible-looking map would have been wrong.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  prefillFromRequisition,
  sourceableRequisitions,
  isRfqCategory,
  isRfqUom,
  RFQ_CATEGORY_OPTIONS,
} from './requisitionPrefill';
import type { PurchaseRequisition } from '../../services/data/types';

const pr = (over: Partial<PurchaseRequisition>): PurchaseRequisition =>
  ({
    id: 'pr-x',
    prNumber: 'PR-2026-00999',
    material: 'Halal Glycerin 99.5%',
    category: 'Fragrance',
    quantity: 2_000,
    uom: 'KG',
    requiredDate: '2026-05-30',
    estimatedValue: 43_000_000,
    requestor: 'Production Planning',
    costCenter: 'CC-MFG-001',
    status: 'Approved',
    createdDate: '2026-04-08',
    approvalLevel: 'Section Head',
    sourceOfSupply: 'PIR exists',
    linkedDoc: '',
    priority: 'Medium',
    justification: 'probe',
    ...over,
  }) as PurchaseRequisition;

describe('C.2 · what the prefill carries', () => {
  it('title ← material, totalQty ← quantity (as the wizard string)', () => {
    const p = prefillFromRequisition(pr({ material: 'Niacinamide B3', quantity: 500 }));
    expect(p.title).toBe('Niacinamide B3');
    // A STRING, and deliberately unformatted: the wizard owns the one parse, and
    // a thousands separator here would hand `readRfqTotalQty` an ambiguity this
    // side already knows the answer to.
    expect(p.totalQty).toBe('500');
  });

  it('sets sourceRequisitionId to the PR id — the key the cascade reads', () => {
    expect(prefillFromRequisition(pr({ id: 'pr-002' })).sourceRequisitionId).toBe('pr-002');
  });

  it('⚠️ NEVER carries material into materialIds — the shape has no such field', () => {
    // C7 GG-4: `material` is a display string, `materialIds` are S/4 codes. The
    // guarantee is structural — there is no field to put it in — so this asserts
    // the SHAPE rather than a value, which is what makes it hold for every input.
    const p = prefillFromRequisition(pr({ material: 'Halal Glycerin 99.5%' }));
    expect(Object.keys(p).sort()).toEqual(
      ['category', 'sourceRequisitionId', 'title', 'totalQty', 'uncarried', 'uom'].sort(),
    );
    expect(JSON.stringify(p)).not.toContain('materialIds');
  });
});

describe('C.2 · EXACT membership, and the four categories that must NOT map', () => {
  it('the two exact members carry', () => {
    expect(prefillFromRequisition(pr({ category: 'Fragrance' })).category).toBe('Fragrance');
    expect(prefillFromRequisition(pr({ category: 'Active Ingredients' })).category).toBe(
      'Active Ingredients',
    );
  });

  // ⚠️ THE HEART OF THE BATCH. Each of these has an obvious-looking RFQ
  // category beside it, and every one of those mappings is a decision this
  // surface has no authority to make. `Halal Emulsifier` in particular names a
  // CERTIFICATION; folding it into `Emulsifiers` would launder a compliance
  // claim into a procurement bucket.
  it.each([
    ['Halal Emulsifier', 'Emulsifiers'],
    ['Natural Botanical', 'Botanical'],
    ['Packaging Primary', 'Packaging'],
    ['Packaging Secondary', 'Packaging'],
  ])('%s does NOT become %s — it leaves the field unset', (prCategory, tempting) => {
    const p = prefillFromRequisition(pr({ category: prCategory }));
    expect(p.category).toBe('');
    expect(p.category).not.toBe(tempting);
    expect(p.uncarried).toContain('category');
  });

  it('the intersection is exactly two of the six RFQ categories — DERIVED', () => {
    // Re-derived here rather than restated: the fixture vocabulary crossed with
    // the RFQ union. If either side gains a member this recomputes.
    const prCategories = [
      'Active Ingredients',
      'Fragrance',
      'Halal Emulsifier',
      'Natural Botanical',
      'Packaging Primary',
      'Packaging Secondary',
    ];
    const intersection = prCategories.filter(isRfqCategory);
    expect(intersection).toEqual(['Active Ingredients', 'Fragrance']);
    expect(RFQ_CATEGORY_OPTIONS).toHaveLength(6);
  });
});

describe('C.2 · uom membership — validated, never coerced', () => {
  it('a member carries', () => {
    expect(prefillFromRequisition(pr({ uom: 'PCS' })).uom).toBe('PCS');
    expect(prefillFromRequisition(pr({ uom: 'PCS' })).uncarried).not.toContain('uom');
  });

  it('⚠️ a non-member yields null — NOT a default, and it is named as uncarried', () => {
    // `null` rather than 'KG' is the whole point: the caller must leave the
    // field alone. Returning a default here would put the wizard's own value
    // where a reader expects the requisition's.
    const p = prefillFromRequisition(pr({ uom: 'DRUM' }));
    expect(p.uom).toBeNull();
    expect(p.uncarried).toContain('uom');
    expect(isRfqUom('DRUM')).toBe(false);
  });

  it('is case-sensitive — near misses are non-members', () => {
    expect(isRfqUom('kg')).toBe(false);
    expect(isRfqCategory('fragrance')).toBe(false);
  });
});

describe('C.2 · which requisitions are offerable', () => {
  const rows = [
    pr({ id: 'a', status: 'Approved' }),
    pr({ id: 'b', status: 'Draft' }),
    pr({ id: 'c', status: 'Pending Approval' }),
    pr({ id: 'd', status: 'Sourcing Event' }),
    pr({ id: 'e', status: 'Approved' }),
  ];

  it('offers only the states passed in — the verb decides, not this function', () => {
    expect(sourceableRequisitions(rows, ['Approved']).map((r) => r.id)).toEqual(['a', 'e']);
  });

  it('⚠️ a PR already at Sourcing Event is NOT offerable', () => {
    // It is past the edge: `t_pr_source` is from `Approved` only, so offering it
    // would produce a cascade the dispatcher refuses as ILLEGAL_TRANSITION.
    expect(sourceableRequisitions(rows, ['Approved']).map((r) => r.id)).not.toContain('d');
  });

  it('an empty eligible set offers nothing, rather than everything', () => {
    // The failure mode a `!filter.length` short-circuit would introduce.
    expect(sourceableRequisitions(rows, [])).toEqual([]);
  });
});

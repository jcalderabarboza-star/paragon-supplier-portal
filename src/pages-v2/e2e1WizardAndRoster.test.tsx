// ────────────────────────────────────────────────────────────────────────────
// E2E-1 · TWO THINGS THE END-TO-END WALK COULD NOT GET PAST.
//
// 1. THE INCOTERM. The wizard's draft opened on 'CIF Jakarta', which is not one
//    of the select's options. The select then showed its first option (FOB)
//    while the draft kept the unlisted value, so a buyer who left "FOB" showing
//    saved an event that read "CIF Jakarta". Held: every select in the wizard
//    opens on one of its own options, so what is shown is what is stored.
//
// 2. THE ROSTER. An event leaves RFI only with two suppliers that answered,
//    and only a supplier with a sample person can be sat in to answer. One
//    supplier per supplier category had one (none in Fragrance), so no walked
//    event in any category could advance. Held, DERIVED from the wizard's own
//    category map and the governed roster: every sourcing category offers at
//    least the competition floor of eligible suppliers that a tester can sit as.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  CATEGORY_TO_SUPPLIER_CATEGORY,
  EMPTY_DRAFT,
  INCOTERMS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from './BuyerSourcing';
import PAGE_SOURCE from './BuyerSourcing.tsx?raw';
import { deliveryDateTooEarly } from './sourcing/rfqCreateModel';
import { RFQ_UOM_OPTIONS } from './sourcing/requisitionPrefill';
import { RFQ_CATEGORIES } from '../data/mockRfqs';
import { mockSuppliers } from '../data/mockSuppliers';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import {
  COMPETITION_FLOOR_INVITEES,
  isIneligibleInvitee,
  rosterStatusOf,
} from '../services/data/rfqSourcingGate';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import i18n from '../lib/i18n';

beforeEach(async () => {
  rfqStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  rfqStore.reset();
  await i18n.changeLanguage('en');
});

describe('E2E-1 · the wizard opens every select on one of its own options', () => {
  it('the option lists are the ones the page renders, and are not empty', () => {
    expect(INCOTERMS_OPTIONS).toContain('FOB');
    expect(INCOTERMS_OPTIONS).not.toContain('CIF Jakarta');
    expect(PAYMENT_TERMS_OPTIONS.length).toBeGreaterThan(1);
  });

  it('incoterm, payment terms and unit each open on a listed value', () => {
    expect(INCOTERMS_OPTIONS).toContain(EMPTY_DRAFT.incoterms);
    expect(PAYMENT_TERMS_OPTIONS).toContain(EMPTY_DRAFT.paymentTerms);
    expect(RFQ_UOM_OPTIONS).toContain(EMPTY_DRAFT.uom);
    // No delivery date is assumed for the buyer.
    expect(EMPTY_DRAFT.requestedDeliveryDate).toBe('');
  });
});

describe('E2E-1 · a stated delivery date falls after the award deadline', () => {
  const at = (awardDeadline: string, requestedDeliveryDate?: string) =>
    deliveryDateTooEarly({ awardDeadline, requestedDeliveryDate });

  it('KNOWN-GOOD first — a date after the award deadline is accepted', () => {
    expect(at('2026-12-10', '2026-12-11')).toBe(false);
    expect(at('2026-12-10', '2027-01-15')).toBe(false);
  });

  it('on the award deadline, or before it, is too early', () => {
    expect(at('2026-12-10', '2026-12-10')).toBe(true);
    expect(at('2026-12-10', '2026-12-05')).toBe(true);
  });

  it('an unstated delivery date is never the refusal — the field is optional', () => {
    expect(at('2026-12-10', '')).toBe(false);
    expect(at('2026-12-10')).toBe(false);
    expect(at('', '2026-12-05')).toBe(false);
  });

  it('the page calls this predicate at the step gate and under the field', () => {
    const calls = PAGE_SOURCE.match(/deliveryDateTooEarly\(draft\)/g) ?? [];
    expect(calls).toHaveLength(2);
    expect(PAGE_SOURCE).toContain("t('sourcing.wizard.deliveryAfterAward')");
    for (const lng of ['en', 'id'] as const) {
      expect(i18n.t('sourcing.wizard.deliveryAfterAward', { lng })).not.toBe('sourcing.wizard.deliveryAfterAward');
    }
    expect(i18n.t('sourcing.wizard.deliveryAfterAward', { lng: 'en' })).not.toBe(
      i18n.t('sourcing.wizard.deliveryAfterAward', { lng: 'id' }),
    );
  });
});

describe('E2E-1 · the sample roster can carry an event past RFI in every category', () => {
  const named = new Set(
    SAMPLE_PEOPLE.filter((p) => p.personaType === 'supplier').map((p) => p.supplierId),
  );
  /** The eligible suppliers the wizard offers for a category that a tester can sit as. */
  const sittable = (category: (typeof RFQ_CATEGORIES)[number]) =>
    mockSuppliers
      .filter((s) => CATEGORY_TO_SUPPLIER_CATEGORY[category].includes(s.category))
      .filter((s) => !isIneligibleInvitee(rosterStatusOf(s.id)))
      .filter((s) => named.has(s.id))
      .map((s) => s.id);

  it('CONTROL — the population is real, and the instrument can say no', () => {
    expect(RFQ_CATEGORIES).toContain('Active Ingredients');
    expect(RFQ_CATEGORIES).toContain('Fragrance');
    expect(Object.keys(CATEGORY_TO_SUPPLIER_CATEGORY).sort()).toEqual([...RFQ_CATEGORIES].sort());
    expect(COMPETITION_FLOOR_INVITEES).toBe(2);
    // A supplier with no person is not counted; an ineligible one is not either.
    expect(named.has('sup-009')).toBe(false);
    expect(sittable('Active Ingredients')).not.toContain('sup-009');
    expect(isIneligibleInvitee(rosterStatusOf('sup-012'))).toBe(true);
    // The three people the walk used are still who they were.
    expect([...named]).toEqual(expect.arrayContaining(['sup-002', 'sup-005', 'sup-007']));
  });

  it.each(RFQ_CATEGORIES)('%s offers at least the competition floor of sittable suppliers', (category) => {
    expect(sittable(category).length).toBeGreaterThanOrEqual(COMPETITION_FLOOR_INVITEES);
  });

  it('every supplier seat names a different, real, eligible supplier', () => {
    const ids = SAMPLE_PEOPLE.filter((p) => p.personaType === 'supplier').map((p) => p.supplierId!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(mockSuppliers.some((s) => s.id === id), id).toBe(true);
      expect(isIneligibleInvitee(rosterStatusOf(id)), id).toBe(false);
    }
  });
});

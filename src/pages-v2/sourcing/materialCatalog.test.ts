// ─────────────────────────────────────────────────────────────────────────────
// THE MATERIAL CATALOG — every entry either names a REAL master code or says it
// has none, and the payload carries only the codes.
//
// ⚠️ **THE ASSERTIONS HERE ARE ABOUT VALUES, NOT COUNTS, AND THAT IS
// DELIBERATE.** `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`: a count is
// satisfied by the wrong match and an id survives a corpus replacement, so the
// coded rows are pinned as NAMED (label → code) PAIRS. Replace the catalog and
// this file goes red, which is the only version of it worth having.
//
// ⚠️ **AND THE LABEL SET IS PINNED BYTE-FOR-BYTE BECAUSE THE BATCH'S BINDING
// RULE WAS THAT NO RENDERED LABEL MAY MOVE.** The mapping is data an operator
// will edit; the labels are what a person already reads. The two must be able
// to fail independently, so they are asserted independently.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { MATERIAL_CATALOG } from '../BuyerSourcing';
import {
  codeLessOfKeys,
  codesOfKeys,
  entryKey,
  labelsOfKeys,
  type CatalogEntry,
} from './materialCatalog';
import { MATERIAL_MASTER } from '../../services/sdc/fixtures';
import { buildRfqCreatePayload } from './rfqCreateModel';
import {
  decideSourcing,
  pslExemptionFor,
  rosterStatusOf,
} from '../../services/data/rfqSourcingGate';
import { mockSuppliers } from '../../data/mockSuppliers';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { spreadForQuote } from '../../lib/shouldCostSpread';
import { MATERIAL_BASKET_CLASSIFICATION } from '../../services/data/mock/fixtures/commodityMaterialMap';
import {
  SHOULD_COST_MATERIALS,
  ROOT_BENCHMARKS,
  SIMULATED_SPOT_FX,
} from '../../services/data/mock/fixtures/commodityBaskets';

const P = DECLARED_PRESENT;
const ALL: readonly CatalogEntry[] = Object.values(MATERIAL_CATALOG).flat();
const CODED = ALL.filter((e) => e.kind === 'CODED') as Array<
  Extract<CatalogEntry, { kind: 'CODED' }>
>;
const CODE_LESS = ALL.filter((e) => e.kind === 'CODE_LESS') as Array<
  Extract<CatalogEntry, { kind: 'CODE_LESS' }>
>;

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the population is real before anything is claimed about it', () => {
  it('the catalog is non-empty and spans every RFQ category the wizard offers', () => {
    expect(ALL.length).toBeGreaterThan(0);
    expect(Object.keys(MATERIAL_CATALOG).length).toBe(6);
    for (const [category, entries] of Object.entries(MATERIAL_CATALOG)) {
      expect(entries.length, `${category} offers nothing`).toBeGreaterThan(0);
    }
  });

  it('CONTROL — a fabricated label is absent and a real one is present', () => {
    const labels = ALL.map((e) => e.label);
    expect(labels).toContain('Cetearyl Alcohol');
    expect(labels).not.toContain('Zzz Not A Real Material');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ 9 CODED + 14 CODE-LESS = 23', () => {
  it('the split is exactly as ruled', () => {
    expect(CODED.length).toBe(9);
    expect(CODE_LESS.length).toBe(14);
    expect(ALL.length).toBe(23);
    expect(CODED.length + CODE_LESS.length).toBe(ALL.length);
  });

  it('⚠️ EVERY CODED ENTRY NAMES A REAL MATERIAL_MASTER KEY — the pair, by name', () => {
    // NAMED PAIRS, not a count: a count is satisfied by the wrong nine.
    expect(CODED.map((e) => `${e.label} -> ${e.code}`).sort()).toEqual(
      [
        'Cetearyl Alcohol -> RM-EMUL-3320',
        'Centella Asiatica Extract -> AI-CENT-6900',
        'Emina Fresh Accord -> FR-EMIN-4420',
        'Glyceryl Stearate SE -> RM-EMUL-9410',
        'Polysorbate 80 -> RM-EMUL-9430',
        'Retinyl Palmitate -> AI-RETA-6750',
        'Salicylic Acid -> AI-SALI-6800',
        'Sodium Hyaluronate HMW -> AI-HYALU-6610',
        'Vitamin C Derivative -> AI-VITC-6720',
      ].sort(),
    );
    for (const e of CODED) {
      expect(e.code in MATERIAL_MASTER, `${e.code} is not a master key`).toBe(true);
    }
    // CONTROL — the assertion above can fail. A fabricated code is not a key.
    expect('RM-NOTREAL-0000' in MATERIAL_MASTER).toBe(false);
  });

  it('no code is used twice, and no label is used twice', () => {
    expect(new Set(CODED.map((e) => e.code)).size).toBe(CODED.length);
    expect(new Set(ALL.map((e) => e.label)).size).toBe(ALL.length);
  });

  it('⚠️ "no code" IS A DECLARED MEMBER — every code-less row states a reason', () => {
    // The whole argument for the union: absence must be a finding, never an
    // omission. A row with no `reason` could not compile, and a row whose reason
    // is empty prose would defeat the point.
    for (const e of CODE_LESS) expect(e.reason.length).toBeGreaterThan(5);
    // The four future-bearing reasons, pinned by the rows that carry them.
    const by = (r: string) => CODE_LESS.filter((e) => e.reason === r).map((e) => e.label);
    expect(by('AMBIGUOUS_IN_MASTER')).toEqual(['PET Bottle 100ml']);
    expect(by('UNCONFIRMED_LOOSE_MATCH')).toEqual(['PET Bottle 200ml']);
    expect(by('NARROWS_THE_MEANING')).toEqual(['Shipper Box 12-pack']);
    expect(by('NOT_A_MATERIAL')).toEqual(['Custom material — specify in notes']);
    expect(by('NO_MASTER_TARGET').length).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE RENDERED LABEL SET IS BYTE-IDENTICAL TO WHAT SHIPPED BEFORE', () => {
  // Pinned per category AND in order, because the picker renders them in order
  // and a reordering is a visible change even when the set is equal.
  it('every label, in every category, in order', () => {
    expect(MATERIAL_CATALOG.Fragrance.map((e) => e.label)).toEqual([
      'Wardah Floral Accord',
      'Sample Citrus Compound',
      'Make Over Oud Base',
      'Emina Fresh Accord',
    ]);
    expect(MATERIAL_CATALOG['Active Ingredients'].map((e) => e.label)).toEqual([
      'Niacinamide USP',
      'Sodium Hyaluronate HMW',
      'Vitamin C Derivative',
      'Retinyl Palmitate',
      'Salicylic Acid',
    ]);
    expect(MATERIAL_CATALOG.Packaging.map((e) => e.label)).toEqual([
      'PET Bottle 100ml',
      'PET Bottle 200ml',
      'Airless Pump 15ml',
      'Folding Carton 150gsm',
      'Shipper Box 12-pack',
    ]);
    expect(MATERIAL_CATALOG.Emulsifiers.map((e) => e.label)).toEqual([
      'Glyceryl Stearate SE',
      'Polysorbate 80',
      'Cetearyl Alcohol',
      'Lecithin (Soy)',
    ]);
    expect(MATERIAL_CATALOG.Botanical.map((e) => e.label)).toEqual([
      'Centella Asiatica Extract',
      'Green Tea Extract',
      'Rice Bran Extract',
      'Mulberry Extract',
    ]);
    expect(MATERIAL_CATALOG.Other.map((e) => e.label)).toEqual([
      'Custom material — specify in notes',
    ]);
  });

  it('⚠️ A LABEL IS NEVER A CODE — no label parses as a master key', () => {
    // The inverse of the defect: if a label ever equalled a code, the two
    // vocabularies would have merged again and nothing here would notice.
    for (const e of ALL) expect(e.label in MATERIAL_MASTER).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE PAYLOAD CARRIES CODES, AND A CODE-LESS PICK CARRIES NOTHING', () => {
  const draft = (materials: string[], category = 'Emulsifiers') =>
    ({
      title: 'catalog payload probe',
      category,
      materials,
      totalQty: '100',
      uom: 'KG',
      budget: '',
      responseDeadline: '2026-10-01',
      awardDeadline: '2026-10-15',
      incoterms: 'DAP',
      paymentTerms: 'NET30',
      invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009'],
    }) as never;

  const codesFor = (category: keyof typeof MATERIAL_CATALOG, keys: string[]) =>
    codesOfKeys(MATERIAL_CATALOG[category], keys);

  it('a CODED selection reaches materialIds as a master code', () => {
    const keys = ['RM-EMUL-3320']; // Cetearyl Alcohol's entryKey IS its code.
    const codes = codesFor('Emulsifiers', keys);
    expect(codes).toEqual(['RM-EMUL-3320']);
    const payload = buildRfqCreatePayload(draft(codes), { totalQty: 100 } as never);
    expect(payload.materialIds).toEqual(['RM-EMUL-3320']);
    expect((payload.materialIds as string[]).every((c) => c in MATERIAL_MASTER)).toBe(true);
  });

  it('⚠️ A CODE-LESS SELECTION REACHES materialIds AS NOTHING — not as its label', () => {
    // The defect in one assertion: this used to be `['Lecithin (Soy)']`.
    const codes = codesFor('Emulsifiers', ['Lecithin (Soy)']);
    expect(codes).toEqual([]);
    const payload = buildRfqCreatePayload(draft(codes), { totalQty: 100 } as never);
    expect(payload.materialIds).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain('Lecithin');
  });

  it('a MIXED selection carries the coded half only', () => {
    const codes = codesFor('Emulsifiers', ['RM-EMUL-3320', 'Lecithin (Soy)']);
    expect(codes).toEqual(['RM-EMUL-3320']);
  });

  it('the helpers agree about what was picked — labels back, code-less named', () => {
    const keys = ['RM-EMUL-3320', 'Lecithin (Soy)'];
    expect(labelsOfKeys(MATERIAL_CATALOG.Emulsifiers, keys)).toEqual([
      'Cetearyl Alcohol',
      'Lecithin (Soy)',
    ]);
    expect(codeLessOfKeys(MATERIAL_CATALOG.Emulsifiers, keys).map((e) => e.label)).toEqual([
      'Lecithin (Soy)',
    ]);
    // entryKey is the identity the draft stores.
    expect(MATERIAL_CATALOG.Emulsifiers.map(entryKey)).toEqual([
      'RM-EMUL-9410',
      'RM-EMUL-9430',
      'RM-EMUL-3320',
      'Lecithin (Soy)',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ WHAT THE GATE SAYS ABOUT EACH — measured, not predicted', () => {
  const invitees = ['sup-005', 'sup-006', 'sup-009'];
  const decide = (codes: string[]) =>
    decideSourcing({ invitedSupplierIds: invitees, materialIds: codes }, P, rosterStatusOf);

  it('⚠️ A CODE-LESS EVENT: THE EXEMPTION NEVER APPLIES AND THE EVENT COMPETES', () => {
    // ⚠️ **AND THE VERDICT IS `NOT_EXEMPT`, NOT `UNDECIDABLE` — DERIVED, AND IT
    // CONTRADICTS WHAT THIS BATCH WAS DISPATCHED EXPECTING.** `pslExemptionFor`
    // reports UNDECIDABLE only when it HELD codes it could not resolve
    // (`materialCodes.length > 0`); a code-less pick hands it none at all, so
    // there is nothing to report unresolvable. Both verdicts block the
    // exemption and both compete — which is the ruling's substance — but they
    // are different sentences and only one of them is true here.
    const d = decide(codesOfKeys(MATERIAL_CATALOG.Emulsifiers, ['Lecithin (Soy)']));
    expect(d.exemption.kind).toBe('NOT_EXEMPT');
    expect(d.competition.kind).not.toBe('NOT_REQUIRED');
    expect(d.exemption.kind).not.toBe('EXEMPT');
  });

  it('a CODED event reaches the gate with a real code and can be decided', () => {
    const d = decide(codesOfKeys(MATERIAL_CATALOG['Active Ingredients'], ['AI-HYALU-6610']));
    // sup-005 is Validated on AI-HYALU-6610 — in force, and still competing. The
    // point is that the gate REACHED a listing at all, which no buyer-raised
    // event could do before this batch.
    expect(d.exemption.kind).toBe('NOT_EXEMPT');
    expect(d.competition.kind).toBe('SATISFIED');
  });

  it('⚠️ NO CODED ENTRY IS EXEMPTIBLE BY ANY SUPPLIER — the claim two headers make', () => {
    // `BuyerSourcingGate.test.tsx`'s header says `NOT_REQUIRED` still cannot be
    // produced from the wizard. That is a DERIVED fact about today's listings,
    // not a property of the design, so it is pinned here rather than left as
    // prose — the day a catalog code acquires an in-force Sole Source or
    // Mandatory listing, this goes red and that header must be rewritten.
    const everyone = mockSuppliers.map((s) => s.id);
    const exemptible = CODED.filter(
      (e) => pslExemptionFor(everyone, [e.code], P).kind === 'EXEMPT',
    );
    expect(exemptible).toEqual([]);
    // CONTROL — the probe can find one. A seeded RFQ's code IS exemptible, so
    // the empty result above is a fact about the catalog, not a broken matcher.
    expect(pslExemptionFor(everyone, ['AI-NIAC-6601'], P).kind).toBe('EXEMPT');
  });

  it('⚠️ CONTROL — the old behaviour, so the fix is visible rather than assumed', () => {
    // Feeding the LABEL (what the wizard used to ship) still produces the old
    // verdict. The gate did not change; what reaches it did.
    expect(decide(['Sodium Hyaluronate HMW']).exemption.kind).toBe('UNDECIDABLE');
    expect(decide(['AI-HYALU-6610']).exemption.kind).toBe('NOT_EXEMPT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ R5 — A BUYER-RAISED RFQ NOW RENDERS A SHOULD-COST SPREAD', () => {
  const DEPS = {
    join: MATERIAL_BASKET_CLASSIFICATION,
    materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
    roots: ROOT_BENCHMARKS,
    fx: SIMULATED_SPOT_FX,
  } as never;
  const spread = (id: string) => spreadForQuote(id, 'KG' as never, 100_000, 'IDR' as never, DEPS);

  it('at least one CODED entry prices, and it is named rather than counted', () => {
    // DERIVED from the catalog, so a remapping that breaks pricing is visible.
    const priceable = CODED.filter((e) => spread(e.code).kind === 'spread').map((e) => e.label);
    expect(priceable).toEqual(['Cetearyl Alcohol']);
  });

  it('⚠️ THE SAME MATERIAL PRICED NOTHING BEFORE — the label is still silent', () => {
    const coded = CODED.find((e) => e.label === 'Cetearyl Alcohol')!;
    expect(spread(coded.code).kind).toBe('spread');
    // What the wizard used to ship for the identical pick.
    const before = spread('Cetearyl Alcohol');
    expect(before.kind).toBe('silent');
    expect((before as { reason: string }).reason).toBe('unmapped');
  });

  it('a CODE-LESS pick prices nothing, and says unmapped rather than pretending', () => {
    const codes = codesOfKeys(MATERIAL_CATALOG.Botanical, ['Green Tea Extract']);
    expect(codes).toEqual([]);
    // Nothing to price, and nothing fabricated to price it with.
    expect(spread(undefined as never).kind).toBe('silent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5a — `CatalogItem.sapCode` IS A POINTER, AND FOUR OF FIVE ARE WRONG.
//
// The operator ruled at 2B-4a that `sapCode` COUNTS — a field holding `MAT-*`
// values that overlap the third space is material identity, whatever it is
// called. 2B-5a's investigation answered the question that ruling left open,
// and the answer is sharper than "it is a fourth space":
//
//   THE STOREFRONT DOES NOT ADD CODES TO A SPACE. IT ADDS FIVE CLAIMS ABOUT A
//   SPACE, AND THREE OF THEM ARE UNBACKED.
//
// R-D declares what the claim MEANS: `sapCode` is the supplier's assertion of
// which PARAGON MASTER CODE their catalogue item corresponds to. This file pins
// the exact disposition of all five against that declaration — an EXACT SET per
// bucket, never a count and never a "no offenders" filter, because the whole
// point is that the buckets are uneven and a reader must see which is which.
//
// ⚠️ WHY A DECLARATION AND NOT A REPAIR. Only ONE of the five is repaired here
// (R-D, `MAT-10045` → `PK-PETB-8803`). The other four are recorded as failing
// the declaration they were just given, because repairing them requires either
// 2B-5b's retirement (the two that point into the ASN lane) or a ruling nobody
// has made (the two that point nowhere). A DECLARATION THAT ONLY EVER ARRIVES
// WITH ITS OWN COMPLIANCE IS A DECLARATION WRITTEN TO FIT.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { MOCK_ASNS } from './fixtures/supplierShipments';
import { INITIAL_CATALOG } from './fixtures/supplierStorefront';

const POINTERS = INITIAL_CATALOG.map((c) => ({
  id: c.id,
  supplierId: c.supplierId,
  material: c.material,
  sapCode: c.sapCode,
}));

/** Every code the ASN lane names, with the supplier whose ASN carries it. */
const ASN_CODES = new Map<string, Set<string>>();
for (const asn of MOCK_ASNS) {
  for (const li of asn.lineItems) {
    if (!ASN_CODES.has(li.materialCode)) ASN_CODES.set(li.materialCode, new Set());
    ASN_CODES.get(li.materialCode)!.add(asn.supplierId);
  }
}

describe('2B-5a — the storefront pointer, declared and MEASURED against its declaration', () => {
  it('the population is real (guards a vacuous pass)', () => {
    expect(POINTERS).toHaveLength(5);
    expect(POINTERS.every((p) => p.sapCode !== '')).toBe(true);
    expect(ASN_CODES.size).toBe(7);
  });

  it('R-D — exactly ONE pointer resolves to the MASTER, and it is the corrected one', () => {
    // ⚠️ INVERTED FROM NOTHING — there was no such pin before, because before
    // R-D there was no declaration for a pointer to fail. `PK-PETB-8803` is the
    // 2B-3-authored row whose label this catalogue row states byte-for-byte.
    const resolving = POINTERS.filter((p) => p.sapCode in MATERIAL_MASTER);
    expect(resolving.map((p) => `${p.id} → ${p.sapCode}`)).toEqual(['c1 → PK-PETB-8803']);
    // And it points at the row that means what the row says it means. A pointer
    // that resolves to the WRONG master row would satisfy the line above and is
    // a different defect, so it is checked separately.
    expect(MATERIAL_MASTER['PK-PETB-8803'].label).toBe(
      POINTERS.find((p) => p.id === 'c1')!.material,
    );
  });

  it('TWO pointers resolve into the ASN lane instead — correct pointers, retiring space', () => {
    // ⚠️ THESE ARE NOT BROKEN. They name a code that exists, in a Paragon space
    // that is declared (`paragon.asn_chase_lane`, R-3) — and they name it UNDER
    // THE MATCHING SUPPLIER ON BOTH SIDES, which is what a working pointer looks
    // like. That agreement is the strongest single piece of evidence that
    // `sapCode` was always meant to point at a Paragon code rather than hold a
    // supplier's own. They fail R-D only because the space they point into is
    // booked for retirement, and they repoint when 2B-5b retires it.
    const intoAsn = POINTERS.filter(
      (p) => !(p.sapCode in MATERIAL_MASTER) && ASN_CODES.has(p.sapCode),
    );
    expect(intoAsn.map((p) => `${p.id} → ${p.sapCode}`)).toEqual([
      'c101 → MAT-30110',
      'c201 → MAT-40220',
    ]);
    for (const p of intoAsn) {
      expect(
        [...ASN_CODES.get(p.sapCode)!],
        `${p.sapCode}: storefront says ${p.supplierId}`,
      ).toEqual([p.supplierId]);
    }
  });

  it('TWO pointers resolve NOWHERE — unbacked claims, and no batch has ruled on them', () => {
    // Not repaired here, and deliberately not guessed at. `MAT-10046` ('PET
    // Bottle 200ml Standard Pump') and `MAT-10089` ('Airless Pump 15ml Travel
    // Size') name codes no Paragon space contains, and neither meaning has a
    // master row to point at — the master's nearest 200ml row is
    // `PK-PETB-8801` ('PET Bottle 200ml Frosted — Wardah Series'), a DIFFERENT
    // item, and there is no 15ml pump at all. Repairing them means AUTHORING
    // master rows from a supplier's catalogue prose, which is an adoption
    // decision and not 2B-5a's.
    const dangling = POINTERS.filter(
      (p) => !(p.sapCode in MATERIAL_MASTER) && !ASN_CODES.has(p.sapCode),
    );
    expect(dangling.map((p) => `${p.id} → ${p.sapCode}`)).toEqual([
      'c2 → MAT-10046',
      'c3 → MAT-10089',
    ]);
    // The nearest master row is NOT the same item — asserted so a later reader
    // cannot mistake proximity for a correspondence.
    expect(MATERIAL_MASTER['PK-PETB-8801'].label).toBe('PET Bottle 200ml Frosted — Wardah Series');
    expect(
      Object.values(MATERIAL_MASTER).filter((m) => /15\s*ml/i.test(m.label)),
    ).toEqual([]);
  });

  it('the three buckets PARTITION the five — nothing is counted twice or dropped', () => {
    // The pin that makes the three assertions above a decomposition rather than
    // three independent filters that might overlap or leave a remainder.
    const master = POINTERS.filter((p) => p.sapCode in MATERIAL_MASTER).length;
    const asn = POINTERS.filter(
      (p) => !(p.sapCode in MATERIAL_MASTER) && ASN_CODES.has(p.sapCode),
    ).length;
    const nowhere = POINTERS.filter(
      (p) => !(p.sapCode in MATERIAL_MASTER) && !ASN_CODES.has(p.sapCode),
    ).length;
    expect([master, asn, nowhere]).toEqual([1, 2, 2]);
    expect(master + asn + nowhere).toBe(POINTERS.length);
  });

  it('⚠️ NO POINTER MAY BE JOINED ON — it carries no provenance at all', () => {
    // C9 §4 unchanged: a claim entered by one party about ANOTHER party's space
    // is an adoption at best. This one has no `method`, no `sourceOfTruth`, no
    // `evidenceLiveness` and no `routeToResolution` — the four things
    // `AdjudicationProvenance` requires on every crosswalk row. Asserted
    // structurally rather than left as advice: the shape simply has nowhere to
    // put them, and a field that cannot record how it was decided must not be
    // read as a decision.
    const keys = Object.keys(INITIAL_CATALOG[0]);
    for (const required of ['method', 'sourceOfTruth', 'evidenceLiveness', 'routeToResolution']) {
      expect(keys, `a pointer cannot record ${required}`).not.toContain(required);
    }
  });
});

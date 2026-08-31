import { describe, it, expect } from 'vitest';
import {
  buildInventoryDeclarationPayload,
  normalizeInventoryDeclarationDraft,
  buildIncomingShipmentPayload,
  ownCollaboratedMaterials,
  asnTrackingFor,
} from '../index';
import type {
  ForecastPublication,
  Provenance,
  IncomingShipment,
  SupplierMaterialRelationship,
} from '../types';

// SDC-3b — the pure surface layer for the two additional supplier objects. These
// tests lock the SURFACE contracts that mirror the server rules: uom is never in
// a payload; asnRef rides ONLY a to-paragon leg; the material set equals the
// command's (i)∪(ii) membership; and a to-paragon leg carries an ASN axis
// BESIDE its stored lifecycle, never instead of it.

// CP-0 · PR-2a — the builder no longer parses. Coercion moved into
// `normalizeInventoryDeclarationDraft` (the ONE parse, routing through
// `normalizeQty`), so these split into two contracts: the normaliser owns
// strings → numbers + honest refusal, and the builder is pure assembly that
// CANNOT fabricate a value because it never sees a string.
describe('normalizeInventoryDeclarationDraft (the ONE parse)', () => {
  it('coerces unambiguous quantities and drops blank-numbered batch rows', () => {
    const r = normalizeInventoryDeclarationDraft({
      totalQty: '4000',
      batches: [
        { batchNumber: '  ', qty: '500' }, // an unfilled form row — dropped, not an error
        { batchNumber: 'A', qty: '1800', expiryDate: '2027-06-30' },
        { batchNumber: 'B', qty: '2200' },
      ],
    });
    expect(r).toEqual({
      ok: true,
      value: {
        totalQty: 4000,
        batches: [
          { batchNumber: 'A', qty: 1800, expiryDate: '2027-06-30' },
          { batchNumber: 'B', qty: 2200 },
        ],
      },
    });
  });

  // FLOOR CORRECTION (CP-0 · 6.1): this input read '4,000' and expected 4000 —
  // the EN reading, baked in by the old blanket `replace(/,/g,'')`. Under id the
  // same token is 4. Both readings are plausible, so neither may be produced.
  it('an AMBIGUOUS total REFUSES and names the field — never the EN reading', () => {
    expect(normalizeInventoryDeclarationDraft({ totalQty: '4,000' })).toEqual({
      ok: false,
      reason: 'AMBIGUOUS_QTY',
      field: { kind: 'totalQty' },
    });
  });

  it('an AMBIGUOUS batch qty REFUSES and points at the offending row', () => {
    expect(
      normalizeInventoryDeclarationDraft({
        totalQty: '4000',
        batches: [
          { batchNumber: 'A', qty: '2200' },
          { batchNumber: 'B', qty: '1,800' },
        ],
      }),
    ).toEqual({
      ok: false,
      reason: 'AMBIGUOUS_QTY',
      field: { kind: 'batchQty', index: 1, batchNumber: 'B' },
    });
  });

  it('a hint resolves a TYPED ambiguity — id reads "4.000" as 4000', () => {
    expect(normalizeInventoryDeclarationDraft({ totalQty: '4.000' }, 'id')).toEqual({
      ok: true,
      value: { totalQty: 4000 },
    });
  });

  // ZERO-COMMITMENT: a declared 0 means "I hold none of this" — a real, binding
  // statement. It must be TYPED, never manufactured from a blank the supplier
  // never filled in. The old `|| 0` did exactly that.
  it('a blank total REFUSES — an unentered field is never a zero commitment', () => {
    const r = normalizeInventoryDeclarationDraft({ totalQty: '' });
    expect(r).toEqual({ ok: false, reason: 'EMPTY_QTY', field: { kind: 'totalQty' } });
    expect(r.ok).toBe(false);
  });

  it('an ENTERED zero is still legal — the commitment survives, only the default dies', () => {
    expect(normalizeInventoryDeclarationDraft({ totalQty: '0' })).toEqual({
      ok: true,
      value: { totalQty: 0 },
    });
  });

  it('an unreadable quantity REFUSES rather than resolving to 0', () => {
    expect(normalizeInventoryDeclarationDraft({ totalQty: 'plenty' })).toMatchObject({
      ok: false,
      reason: 'NOT_NUMERIC',
    });
  });
});

describe('buildInventoryDeclarationPayload (pure assembly, total-first)', () => {
  it('a total-only declaration carries totalQty, no batches, no uom', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', { totalQty: 4000 });
    expect(p).toEqual({ supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', totalQty: 4000 });
    expect('uom' in p).toBe(false); // master owns the unit (invariant #2)
    expect('batches' in p).toBe(false);
  });

  it('batch detail is carried through verbatim (uom absent)', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: 4000,
      batches: [
        { batchNumber: 'A', qty: 1800, expiryDate: '2027-06-30' },
        { batchNumber: 'B', qty: 2200 },
      ],
    });
    expect(p.batches).toEqual([
      { batchNumber: 'A', qty: 1800, expiryDate: '2027-06-30' },
      { batchNumber: 'B', qty: 2200 },
    ]);
  });

  it('an empty batch list ⇒ a total-only payload (no batches key)', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: 1000,
      batches: [],
    });
    expect('batches' in p).toBe(false);
  });

  // The structural guarantee behind §4: the builder has no string input, so it
  // has nothing to parse and no second reading to diverge from the gate's.
  it('is pure assembly — the number it is given is the number it ships', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', { totalQty: 1.8 });
    expect(p.totalQty).toBe(1.8);
  });
});

// CP-0 · PR-2d — the shipment builder no longer parses either. `qty` arrives as
// a NUMBER the caller already ran through `normalizeQty`, so the builder cannot
// coerce, cannot fabricate a zero, and cannot disagree with the gate that let
// the submit through. The three drafts below carried the strings '6000' /
// '4000' / '10'; they now carry the numbers. See the ledger note on each.
describe('buildIncomingShipmentPayload (direction-guarded)', () => {
  // LEDGER (CP-0 · 6.1 · correction 1): `qty: '6000'` → `6000`. Mechanical —
  // the draft field is number-typed now; the assertion and its intent are
  // untouched. ('6000' was never ambiguous; only its TYPE changed.)
  it('a to-paragon leg carries the selected asnRef', () => {
    const p = buildIncomingShipmentPayload('sup-002', 'RM-EMUL-3310', 'to-paragon', {
      qty: 6000,
      awb: 'AWB-1',
      asnRef: 'ASN-2025-00301',
    });
    expect(p).toMatchObject({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      direction: 'to-paragon',
      qty: 6000,
      awb: 'AWB-1',
      asnRef: 'ASN-2025-00301',
    });
    expect('uom' in p).toBe(false);
  });

  // LEDGER (CP-0 · 6.1 · correction 2): `qty: '4000'` → `4000`. Mechanical.
  it('a principal-to-distributor leg NEVER carries an asnRef (even if one leaks in)', () => {
    const p = buildIncomingShipmentPayload('sup-005', 'RM-EMUL-3310', 'principal-to-distributor', {
      qty: 4000,
      // A stray asnRef must be stripped by direction — the symmetric guard's mirror.
      asnRef: 'ASN-SHOULD-NOT-APPEAR',
    });
    expect('asnRef' in p).toBe(false);
    expect(p.direction).toBe('principal-to-distributor');
  });

  // LEDGER (CP-0 · 6.1 · correction 3): `qty: '10'` → `10`. Mechanical.
  it('optional fields are omitted when blank', () => {
    const p = buildIncomingShipmentPayload('sup-002', 'RM-EMUL-3310', 'to-paragon', {
      qty: 10,
    });
    expect(p).toEqual({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      direction: 'to-paragon',
      qty: 10,
    });
  });

  // The structural guarantee behind §4, stated for this builder: no string
  // input ⇒ nothing to parse ⇒ no second reading that could diverge from the
  // gate the surface applied. The two values below are the ambiguous pair
  // ("6.000" reads as either) — the builder ships whichever ONE the caller's
  // single parse produced, and can never choose between them itself.
  it('is pure assembly — the number it is given is the number it ships', () => {
    const big = buildIncomingShipmentPayload('sup-007', 'PK-PETB-8810', 'to-paragon', {
      qty: 6000,
      asnRef: 'ASN-2025-00211',
    });
    const small = buildIncomingShipmentPayload('sup-007', 'PK-PETB-8810', 'to-paragon', {
      qty: 6,
      asnRef: 'ASN-2025-00211',
    });
    expect(big.qty).toBe(6000);
    expect(small.qty).toBe(6);
  });

  // ZERO-COMMITMENT, restated for shipments. A typed 0 is a real statement
  // ("nothing is in transit") and survives; a blank is not a zero and cannot
  // reach here at all, because the draft field no longer accepts a string for
  // the `|| 0` to act on. This is the contract the old builder inverted.
  it('a TYPED zero is carried through — "nothing is in transit" is a statement', () => {
    const p = buildIncomingShipmentPayload('sup-005', 'RM-EMUL-3310', 'principal-to-distributor', {
      qty: 0,
    });
    expect(p.qty).toBe(0);
  });
});

describe('ownCollaboratedMaterials (the (i)∪(ii) membership mirror)', () => {
  const rels: SupplierMaterialRelationship[] = [
    { supplierId: 'sup-005', materialCode: 'RM-A', supplierType: 'distributor' },
    { supplierId: 'sup-002', materialCode: 'RM-A', supplierType: 'manufacturer' },
  ];
  const pubs: ForecastPublication[] = [
    {
      // ⚠️ ADDED — it was MISSING, and `provenance` is REQUIRED. In a codebase
      //   whose central discipline is honest provenance, THE ONE REQUIRED FIELD
      //   THIS TEST DROPPED IS THE PROVENANCE MARKER. It passed because nothing
      //   on its path reads it — a publication with no honesty marking is a shape
      //   the type forbids and the untypechecked spec was free to build.
      provenance: { source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' } as Provenance,
      publicationId: 'PUB-1',
      planVersion: 'v1',
      publishedAt: '2026-08-01T00:00:00.000Z',
      horizon: ['2026-08'],
      lines: [
        {
          materialCode: 'PK-B',
          supplierId: 'sup-005',
          periodBucket: '2026-08',
          forecastQty: 100,
          uom: 'PCS',
          commitmentClass: 'firm',
          allocation: { materialPeriodTotal: 100, basis: 'planner-split' },
          provenance: { source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' },
        },
        // A line for a DIFFERENT supplier — must not leak into sup-005's set.
        {
          materialCode: 'PK-C',
          supplierId: 'sup-002',
          periodBucket: '2026-08',
          forecastQty: 100,
          uom: 'PCS',
          commitmentClass: 'firm',
          allocation: { materialPeriodTotal: 100, basis: 'planner-split' },
          provenance: { source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' },
        },
      ],
    },
  ];

  it('unions relationship materials (i) with ever-fanned materials (ii), sorted', () => {
    const got = ownCollaboratedMaterials(rels, pubs, 'sup-005');
    expect(got.map((m) => m.materialCode)).toEqual(['PK-B', 'RM-A']);
  });

  it('a relationship supplierType wins; a fanned-only material has null type', () => {
    const got = ownCollaboratedMaterials(rels, pubs, 'sup-005');
    expect(got.find((m) => m.materialCode === 'RM-A')!.supplierType).toBe('distributor');
    expect(got.find((m) => m.materialCode === 'PK-B')!.supplierType).toBeNull();
  });

  it('never returns another supplier’s fanned material', () => {
    const got = ownCollaboratedMaterials(rels, pubs, 'sup-005');
    expect(got.some((m) => m.materialCode === 'PK-C')).toBe(false);
  });
});

describe('asnTrackingFor — the SECOND axis, beside the stored one', () => {
  // ⚠️ **THIS BLOCK REPLACES FOUR TESTS THAT PINNED THE DEFECT AS THE CONTRACT.**
  // They are worth recording rather than quietly deleting. One was named *"a
  // to-paragon leg DERIVES its lifecycle from the linked ASN (not the stored
  // value)"* and its fixture carried `lifecycle: 'Booked', // stored —
  // deliberately stale`. The suite was not silent about the shadow; it asserted
  // the shadow was correct, which is why walking the verbs was the only way it
  // could be found.
  const base: Omit<IncomingShipment, 'direction' | 'lifecycle' | 'asnRef'> = {
    id: 'ish-x',
    supplierId: 'sup-002',
    materialCode: 'RM-A',
    qty: 100,
    uom: 'KG',
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
  };

  it('⚠️ a to-paragon leg keeps its STORED lifecycle and gains an ASN axis beside it', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'to-paragon',
      lifecycle: 'Booked',
      asnRef: 'ASN-1',
    };
    // The old contract returned 'Shipped' here and the stored 'Booked' vanished.
    expect(s.lifecycle).toBe('Booked');
    expect(asnTrackingFor(s, 'In Transit')).toEqual({
      asnRef: 'ASN-1',
      asnStatus: 'In Transit',
    });
  });

  it('the ASN axis reports the ASN OWN word verbatim — no translation into leg words', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'to-paragon',
      lifecycle: 'Booked',
      asnRef: 'ASN-1',
    };
    for (const st of ['Draft', 'Submitted', 'In Transit', 'Delivered', 'Discrepancy'] as const) {
      expect(asnTrackingFor(s, st)?.asnStatus).toBe(st);
    }
  });

  it('a principal-to-distributor leg has NO ASN axis (Paragon is not the consignee)', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'principal-to-distributor',
      lifecycle: 'Booked',
    };
    expect(asnTrackingFor(s, null)).toBeNull();
    expect(s.lifecycle).toBe('Booked');
  });

  it('a to-paragon leg whose ASN cannot be resolved gets no axis — and keeps its own state', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'to-paragon',
      lifecycle: 'Shipped',
      asnRef: 'ASN-GONE',
    };
    // The old code returned the stored value DRESSED AS a derived one here,
    // conflating "Paragon has nothing to say" with "the leg has not moved".
    expect(asnTrackingFor(s, null)).toBeNull();
    expect(s.lifecycle).toBe('Shipped');
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildInventoryDeclarationPayload,
  buildIncomingShipmentPayload,
  ownCollaboratedMaterials,
  shipmentDisplayLifecycle,
  asnStatusToLifecycle,
} from '../index';
import type {
  ForecastPublication,
  IncomingShipment,
  SupplierMaterialRelationship,
} from '../types';

// SDC-3b — the pure surface layer for the two additional supplier objects. These
// tests lock the SURFACE contracts that mirror the server rules: uom is never in
// a payload; asnRef rides ONLY a to-paragon leg; the material set equals the
// command's (i)∪(ii) membership; and a to-paragon leg's displayed lifecycle is
// DERIVED from its linked ASN (never the stored value).

describe('buildInventoryDeclarationPayload (total-first)', () => {
  it('a total-only declaration carries totalQty, no batches, no uom', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: '4,000',
    });
    expect(p).toEqual({ supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', totalQty: 4000 });
    expect('uom' in p).toBe(false); // master owns the unit (invariant #2)
    expect('batches' in p).toBe(false);
  });

  it('batch detail is carried when present (qty coerced, uom absent)', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: '4000',
      batches: [
        { batchNumber: 'A', qty: '1,800', expiryDate: '2027-06-30' },
        { batchNumber: 'B', qty: '2200' },
      ],
    });
    expect(p.batches).toEqual([
      { batchNumber: 'A', qty: 1800, expiryDate: '2027-06-30' },
      { batchNumber: 'B', qty: 2200 },
    ]);
  });

  it('blank-numbered batch rows are dropped (a form may carry empty rows)', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: '1000',
      batches: [
        { batchNumber: '  ', qty: '500' },
        { batchNumber: 'REAL', qty: '1000' },
      ],
    });
    expect(p.batches).toEqual([{ batchNumber: 'REAL', qty: 1000 }]);
  });

  it('all-blank batches ⇒ a total-only payload (no batches key)', () => {
    const p = buildInventoryDeclarationPayload('sup-002', 'RM-EMUL-3310', {
      totalQty: '1000',
      batches: [{ batchNumber: '', qty: '' }],
    });
    expect('batches' in p).toBe(false);
  });
});

describe('buildIncomingShipmentPayload (direction-guarded)', () => {
  it('a to-paragon leg carries the selected asnRef', () => {
    const p = buildIncomingShipmentPayload('sup-002', 'RM-EMUL-3310', 'to-paragon', {
      qty: '6000',
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

  it('a principal-to-distributor leg NEVER carries an asnRef (even if one leaks in)', () => {
    const p = buildIncomingShipmentPayload('sup-005', 'RM-EMUL-3310', 'principal-to-distributor', {
      qty: '4000',
      // A stray asnRef must be stripped by direction — the symmetric guard's mirror.
      asnRef: 'ASN-SHOULD-NOT-APPEAR',
    });
    expect('asnRef' in p).toBe(false);
    expect(p.direction).toBe('principal-to-distributor');
  });

  it('optional fields are omitted when blank', () => {
    const p = buildIncomingShipmentPayload('sup-002', 'RM-EMUL-3310', 'to-paragon', {
      qty: '10',
    });
    expect(p).toEqual({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      direction: 'to-paragon',
      qty: 10,
    });
  });
});

describe('ownCollaboratedMaterials (the (i)∪(ii) membership mirror)', () => {
  const rels: SupplierMaterialRelationship[] = [
    { supplierId: 'sup-005', materialCode: 'RM-A', supplierType: 'distributor' },
    { supplierId: 'sup-002', materialCode: 'RM-A', supplierType: 'manufacturer' },
  ];
  const pubs: ForecastPublication[] = [
    {
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

describe('shipmentDisplayLifecycle (drift-honesty)', () => {
  const base: Omit<IncomingShipment, 'direction' | 'lifecycle' | 'asnRef'> = {
    id: 'ish-x',
    supplierId: 'sup-002',
    materialCode: 'RM-A',
    qty: 100,
    uom: 'KG',
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
  };

  it('maps ASN statuses onto the shipment lifecycle vocabulary', () => {
    expect(asnStatusToLifecycle('Draft')).toBe('Booked');
    expect(asnStatusToLifecycle('Submitted')).toBe('Booked');
    expect(asnStatusToLifecycle('In Transit')).toBe('Shipped');
    expect(asnStatusToLifecycle('Delivered')).toBe('Arrived');
    expect(asnStatusToLifecycle('Discrepancy')).toBe('Arrived');
    expect(asnStatusToLifecycle('Nonsense')).toBeNull();
  });

  it('a to-paragon leg DERIVES its lifecycle from the linked ASN (not the stored value)', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'to-paragon',
      lifecycle: 'Booked', // stored — deliberately stale
      asnRef: 'ASN-1',
    };
    // The linked ASN is In Transit → the leg DISPLAYS Shipped, marked derived.
    expect(shipmentDisplayLifecycle(s, 'In Transit')).toEqual({
      lifecycle: 'Shipped',
      derivedFromAsn: true,
    });
  });

  it('a principal-to-distributor leg keeps its STORED lifecycle (no ASN)', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'principal-to-distributor',
      lifecycle: 'Booked',
    };
    expect(shipmentDisplayLifecycle(s, null)).toEqual({
      lifecycle: 'Booked',
      derivedFromAsn: false,
    });
  });

  it('a to-paragon leg whose ASN cannot be resolved falls back to the stored value', () => {
    const s: IncomingShipment = {
      ...base,
      direction: 'to-paragon',
      lifecycle: 'Shipped',
      asnRef: 'ASN-GONE',
    };
    // null status ⇒ no derivation invented.
    expect(shipmentDisplayLifecycle(s, null)).toEqual({
      lifecycle: 'Shipped',
      derivedFromAsn: false,
    });
  });
});

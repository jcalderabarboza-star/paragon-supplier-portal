// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · WHERE USED — counted from the documents, by kind.
//
// Two halves. Exact counts on sources the spec builds, so each rule is proved
// on a number it controls; then the live stores, where every count is checked
// against an independent count of the same store.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { COMPLIANCE_REGISTRY } from '../data/mock/fixtures/complianceRegistry';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { materialRecords, recordOf, supplierRecords } from './replica';
import { resetReplica } from './syncApplier';
import type { MasterRecord } from './types';
import { WHERE_USED_PATH, liveSources, whereUsedOf, type WhereUsedSources } from './whereUsed';

beforeEach(() => resetReplica());

const must = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new Error(`control: ${what} is seeded`);
  return value;
};
const live = (): WhereUsedSources => liveSources({ materials: materialRecords(), suppliers: supplierRecords() });
const countOf = (record: MasterRecord, sources: WhereUsedSources): Record<string, number> =>
  Object.fromEntries(whereUsedOf(record, sources).rows.map((r) => [r.kind, r.count]));

describe('MD-1 · where used counts the documents that name a key', () => {
  const sources = (): WhereUsedSources => ({
    purchaseOrders: [
      { supplierId: 'sup-002', currency: 'IDR', lineItems: [{ materialCode: 'RM-COCO-8200' }, { materialCode: 'RM-EMUL-3310' }] },
      { supplierId: 'sup-002', currency: 'USD', lineItems: [{ materialCode: 'RM-COCO-8200' }] },
      { supplierId: 'sup-007', currency: 'IDR', lineItems: [{ materialCode: 'PK-PETB-8810' }] },
    ],
    invoices: [{ supplierId: 'sup-002' }],
    contracts: [{ supplierId: 'sup-002' }, { supplierId: 'sup-007' }],
    listings: [
      { supplierId: 'sup-002', scope: { kind: 'material', materialCodes: ['RM-COCO-8200'] } },
      { supplierId: 'sup-002', scope: { kind: 'category' } },
    ],
    certificates: [{ supplierId: 'sup-002', materialCodes: ['RM-COCO-8200', 'RM-EMUL-3310'] }],
    requisitions: [{ costCenter: 'CC-RD-001' }, { costCenter: 'CC-RD-001' }, { costCenter: 'CC-SC-001' }],
    materials: materialRecords(),
    suppliers: supplierRecords(),
  });

  it('a material: orders with a line for it, listings scoped to it, certificates that cover it', () => {
    const used = whereUsedOf(must(recordOf('material', 'RM-COCO-8200'), 'RM-COCO-8200'), sources());
    expect(used.rows).toEqual([
      { kind: 'purchaseOrder', count: 2 },
      { kind: 'preferredListing', count: 1 },
      { kind: 'certificate', count: 1 },
    ]);
    expect(used.total).toBe(4);
  });

  it('a material no document names counts zero on every kind, and still lists the kinds', () => {
    const used = whereUsedOf(must(recordOf('material', 'RM-PALM-7100'), 'RM-PALM-7100'), sources());
    expect(used.rows.map((r) => r.count)).toEqual([0, 0, 0]);
    expect(used.total).toBe(0);
  });

  it('a supplier is counted by its portal id, not by its SAP number', () => {
    const fats = must(recordOf('supplier', 'BP-10001235'), 'BP-10001235');
    expect(fats.data.portalSupplierId).toBe('sup-002');
    expect(countOf(fats, sources())).toEqual({ purchaseOrder: 2, invoice: 1, contract: 1, preferredListing: 2, certificate: 1 });
  });

  it('a reference value is counted over the records and documents that carry it', () => {
    const s = sources();
    expect(countOf(must(recordOf('currency', 'IDR'), 'IDR'), s)).toEqual({ purchaseOrder: 2 });
    expect(countOf(must(recordOf('costCentre', 'CC-RD-001'), 'CC-RD-001'), s)).toEqual({ requisition: 2 });
    expect(countOf(must(recordOf('unit', 'KG'), 'KG'), s)).toEqual({
      material: s.materials.filter((m) => m.data.baseUnit === 'KG').length,
    });
    expect(countOf(must(recordOf('country', 'ID'), 'ID'), s)).toEqual({
      supplier: s.suppliers.filter((x) => x.data.country === 'ID').length,
    });
    // No stored document names a plant today, and the read says so rather than inventing a kind.
    expect(whereUsedOf(must(recordOf('plant', 'PL01'), 'PL01'), s)).toEqual({ total: 0, rows: [] });
  });

  it('every kind leads to a page', () => {
    for (const kind of ['purchaseOrder', 'invoice', 'contract', 'preferredListing', 'certificate', 'requisition', 'material', 'supplier'] as const) {
      expect(WHERE_USED_PATH[kind], kind).toMatch(/^\/buyer\//);
    }
  });
});

describe('MD-1 · where used over the live stores agrees with an independent count', () => {
  it('⚠ CONTROL — the stores hold documents, so a zero below is a real zero', () => {
    expect(purchaseOrderStore.all().length).toBeGreaterThan(0);
    expect(COMPLIANCE_REGISTRY.length).toBeGreaterThan(0);
  });

  it('every material: orders and certificates counted the same way a second derivation counts them', () => {
    const sources = live();
    const orders = purchaseOrderStore.all();
    for (const m of materialRecords()) {
      const counts = countOf(m, sources);
      expect(counts.purchaseOrder, m.key).toBe(orders.filter((po) => po.lineItems.map((l) => l.materialCode).includes(m.key)).length);
      expect(counts.certificate, m.key).toBe(COMPLIANCE_REGISTRY.filter((c) => c.materialCodes.includes(m.key)).length);
    }
  });

  it('one material with orders and one with none both exist at the pin', () => {
    const sources = live();
    const ordered = new Set(purchaseOrderStore.all().flatMap((po) => po.lineItems.map((l) => l.materialCode)));
    const withOrders = materialRecords().filter((m) => ordered.has(m.key));
    const without = materialRecords().filter((m) => !ordered.has(m.key));
    expect(withOrders.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
    expect(countOf(withOrders[0], sources).purchaseOrder).toBeGreaterThan(0);
    expect(countOf(without[0], sources).purchaseOrder).toBe(0);
  });

  it('every supplier’s order count equals the store’s', () => {
    const sources = live();
    for (const s of supplierRecords()) {
      expect(countOf(s, sources).purchaseOrder, s.key).toBe(
        purchaseOrderStore.all().filter((po) => po.supplierId === s.data.portalSupplierId).length,
      );
    }
  });
});

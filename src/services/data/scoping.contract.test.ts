// ────────────────────────────────────────────────────────────────────────────
// Service-level scoping contract. Enforced at the mock-service seam (not per
// page) — the cheap, single place to prove the sp-002 audit invariant:
//   • a supplier scope returns ONLY its own rows (never another supplier's),
//   • the buyer scope returns the cross-supplier superset,
//   • cross-supplier record lookups are denied (SCOPE_DENIED) or filtered out.
// Relies on the diversified supplier-side fixtures (sup-007 / sup-002 / sup-005).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService as svc } from './mock/mockDataService';
import { DataError } from './types';
import type { QueryScope } from './types';

const A = 'sup-007';
const B = 'sup-002';
const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };
const aScope: QueryScope = { personaType: 'supplier', supplierId: A };
const bScope: QueryScope = { personaType: 'supplier', supplierId: B };

type Scoped = (s: QueryScope) => Promise<{ items: { supplierId: string }[] }>;

// supplierId-scoped list reads (rows carry supplierId; applySupplierScope filters).
const SCOPED_READS: { name: string; run: Scoped }[] = [
  { name: 'getPurchaseOrders', run: (s) => svc.procurement.getPurchaseOrders(s) },
  { name: 'getInventory', run: (s) => svc.procurement.getInventory(s) },
  { name: 'getShipments', run: (s) => svc.procurement.getShipments(s) },
  { name: 'getASNs', run: (s) => svc.procurement.getASNs(s) },
  { name: 'getGoodsReceipts', run: (s) => svc.procurement.getGoodsReceipts(s) },
  { name: 'getBuyerInvoices', run: (s) => svc.procurement.getBuyerInvoices(s) },
  { name: 'getSupplierInvoices', run: (s) => svc.procurement.getSupplierInvoices(s) },
  { name: 'getContracts', run: (s) => svc.procurement.getContracts(s) },
  { name: 'getDocuments', run: (s) => svc.procurement.getDocuments(s) },
  { name: 'getStorefrontCatalog', run: (s) => svc.procurement.getStorefrontCatalog(s) },
  { name: 'getStorefrontCerts', run: (s) => svc.procurement.getStorefrontCerts(s) },
  { name: 'getStorefrontProducts', run: (s) => svc.procurement.getStorefrontProducts(s) },
  { name: 'getQuotations', run: (s) => svc.procurement.getQuotations(s) },
];

describe('service scoping contract — supplierId-scoped reads', () => {
  it.each(SCOPED_READS)(
    '$name: supplier scope is isolated and buyer is the superset',
    async ({ run }) => {
      const [a, b, buyer] = await Promise.all([run(aScope), run(bScope), run(buyerScope)]);
      // Isolation: a supplier scope only ever returns its own rows.
      expect(a.items.every((r) => r.supplierId === A)).toBe(true);
      expect(b.items.every((r) => r.supplierId === B)).toBe(true);
      // Buyer is the cross-supplier superset: its per-supplier slice matches
      // exactly what each supplier scope returns.
      expect(buyer.items.filter((r) => r.supplierId === A).length).toBe(a.items.length);
      expect(buyer.items.filter((r) => r.supplierId === B).length).toBe(b.items.length);
    },
  );

  it('is non-vacuous — documents carry real data for both A and B', async () => {
    const a = (await svc.procurement.getDocuments(aScope)).items;
    const b = (await svc.procurement.getDocuments(bScope)).items;
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});

describe('service scoping contract — non-supplierId scoping models', () => {
  it('getRFQs: supplier sees only RFQs it is invited to; buyer sees all', async () => {
    const a = (await svc.procurement.getRFQs(aScope)).items;
    const all = (await svc.procurement.getRFQs(buyerScope)).items;
    expect(a.every((r) => r.invitedSupplierIds.includes(A))).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(a.length);
  });

  it('getObligations: a supplier only sees obligations of its own contracts', async () => {
    const contractIds = new Set(
      (await svc.procurement.getContracts(aScope)).items.map((c) => c.id),
    );
    const obligations = (await svc.procurement.getObligations(aScope)).items;
    expect(obligations.every((o) => contractIds.has(o.contractId))).toBe(true);
  });

  it('suppliers.list: buyer sees all suppliers, a supplier sees none', async () => {
    expect((await svc.suppliers.list(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.suppliers.list(aScope)).items.length).toBe(0);
  });

  it('getScenarios: buyer sees modeled scenarios; a supplier sees none', async () => {
    expect((await svc.risk.getScenarios(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.risk.getScenarios(aScope)).items.length).toBe(0);
  });

  it('getKpis: improvement actions are wired into the snapshot', async () => {
    // Buyer and the seeded supplier read the populated snapshot; an unrelated
    // supplier gets the empty snapshot.
    expect((await svc.procurement.getKpis(buyerScope)).improvementActions.length).toBeGreaterThan(0);
    expect((await svc.procurement.getKpis(aScope)).improvementActions.length).toBeGreaterThan(0);
    expect((await svc.procurement.getKpis(bScope)).improvementActions.length).toBe(0);
  });
});

describe('service scoping contract — SCOPE_DENIED on record lookup', () => {
  it('supplier requesting another supplier record by id throws DataError(SCOPE_DENIED)', async () => {
    await expect(svc.suppliers.getById(aScope, B)).rejects.toBeInstanceOf(DataError);
    await expect(svc.suppliers.getById(aScope, B)).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });

  it('supplier reading its own record resolves', async () => {
    expect((await svc.suppliers.getById(aScope, A))?.id).toBe(A);
  });

  it('buyer may read any supplier record', async () => {
    expect((await svc.suppliers.getById(buyerScope, B))?.id).toBe(B);
  });

  it('filter-scoped record reads return null for another supplier row (no leak)', async () => {
    const bPOs = (await svc.procurement.getPurchaseOrders(bScope)).items;
    if (bPOs.length > 0) {
      const leaked = await svc.procurement.getPurchaseOrder(aScope, (bPOs[0] as { id: string }).id);
      expect(leaked).toBeNull();
    }
  });
});

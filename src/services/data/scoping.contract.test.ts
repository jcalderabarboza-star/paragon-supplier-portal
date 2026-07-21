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
const C = 'sup-005';
const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };
const aScope: QueryScope = { personaType: 'supplier', supplierId: A };
const bScope: QueryScope = { personaType: 'supplier', supplierId: B };
const cScope: QueryScope = { personaType: 'supplier', supplierId: C };

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
  // I3.1 — the canonical compliance registry: supplierId-keyed, so a supplier
  // reads only its own certs and the buyer sees the superset (the FK that closes
  // the name-vs-id split, HALAL-XPERSONA-01).
  { name: 'getComplianceRegistry', run: (s) => svc.risk.getComplianceRegistry(s) },
  // Delivery Agreement surface seam: SchedulingAgreement carries supplierId, so the
  // scoped view-model is isolated per supplier and the buyer sees the superset. The
  // view nests the agreement, so expose its supplierId for the shared assertions.
  // (Both seeded agreements are sup-007: buyer + sup-007 see both, sup-002/sup-005 →[].)
  {
    name: 'getDeliveryAgreements',
    run: async (s) => ({
      items: (await svc.delivery.getAgreements(s)).items.map((v) => ({
        supplierId: v.agreement.supplierId,
      })),
    }),
  },
];

describe('service scoping contract — supplierId-scoped reads', () => {
  it.each(SCOPED_READS)(
    '$name: supplier scope is isolated and buyer is the superset',
    async ({ run }) => {
      const [a, b, c, buyer] = await Promise.all([
        run(aScope),
        run(bScope),
        run(cScope),
        run(buyerScope),
      ]);
      // Isolation: a supplier scope only ever returns its own rows. Three
      // distinct tenants (sup-007 / sup-002 / sup-005) prove it is not a
      // two-party coincidence.
      expect(a.items.every((r) => r.supplierId === A)).toBe(true);
      expect(b.items.every((r) => r.supplierId === B)).toBe(true);
      expect(c.items.every((r) => r.supplierId === C)).toBe(true);
      // Buyer is the cross-supplier superset: its per-supplier slice matches
      // exactly what each supplier scope returns.
      expect(buyer.items.filter((r) => r.supplierId === A).length).toBe(a.items.length);
      expect(buyer.items.filter((r) => r.supplierId === B).length).toBe(b.items.length);
      expect(buyer.items.filter((r) => r.supplierId === C).length).toBe(c.items.length);
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

  it('analytics: buyer sees the portfolio view; a supplier sees none', async () => {
    // Discrete per-read reads are all buyer-only aggregates.
    expect((await svc.analytics.getSpendByCategory(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.analytics.getSpendByCategory(aScope)).items.length).toBe(0);
    expect((await svc.analytics.getSupplierPerformance(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.analytics.getSupplierPerformance(aScope)).items.length).toBe(0);
    // The scalar summary is populated for the buyer, null for a supplier.
    expect(await svc.analytics.getSummary(buyerScope)).not.toBeNull();
    expect(await svc.analytics.getSummary(aScope)).toBeNull();
  });

  it('engagement: buyer sees the comms bus; a supplier sees none', async () => {
    expect((await svc.engagement.getConversations(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.engagement.getConversations(aScope)).items.length).toBe(0);
    expect((await svc.engagement.getAutomationRules(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await svc.engagement.getAutomationRules(aScope)).items.length).toBe(0);
    expect(await svc.engagement.getSummary(buyerScope)).not.toBeNull();
    expect(await svc.engagement.getSummary(aScope)).toBeNull();
  });

  it('engagement: a conversation thread resolves for the buyer, empty for a supplier', async () => {
    const buyerThread = (await svc.engagement.getConversationThread(buyerScope, 'wa-001')).items;
    expect(buyerThread.length).toBeGreaterThan(0);
    const supplierThread = (await svc.engagement.getConversationThread(aScope, 'wa-001')).items;
    expect(supplierThread.length).toBe(0);
  });

  it('getSupplierScorecards: buyer sees the portfolio grading; a supplier sees none', async () => {
    const buyer = (await svc.procurement.getSupplierScorecards(buyerScope)).items;
    expect(buyer.length).toBeGreaterThan(0);
    expect((await svc.procurement.getSupplierScorecards(aScope)).items.length).toBe(0);
    // D-2: per-supplier optionals live on the record, not shared consts — the
    // conditional supplier carries both its compliance issue and its plan.
    const basf = buyer.find((s) => s.id === 'basf');
    expect(basf?.improvementActions?.length).toBeGreaterThan(0);
    expect(basf?.complianceIssue?.level).toBe('expiring');
  });

  it('getRequisitions: buyer sees PRs; a supplier sees none; status filter narrows', async () => {
    const all = (await svc.procurement.getRequisitions(buyerScope)).items;
    expect(all.length).toBeGreaterThan(0);
    expect((await svc.procurement.getRequisitions(aScope)).items.length).toBe(0);
    // The status filter narrows to a strict subset of the unfiltered buyer list.
    const drafts = (await svc.procurement.getRequisitions(buyerScope, { status: 'Draft' })).items;
    expect(drafts.every((r) => r.status === 'Draft')).toBe(true);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.length).toBeLessThan(all.length);
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

// DR-6 amended: the dispatcher enforces QueryScope on every COMMAND exactly as
// reads. These assertions never reach the apply stage (all fail/deny before it),
// so they do not mutate the shared PO store.
describe('service scoping contract — commands (DR-6 amended)', () => {
  const confirmOf = (id: string) => ({
    transitionId: 't_po_confirm',
    entity: 'purchaseOrder',
    entityId: id,
  });

  it('a supplier commanding another supplier’s PO is denied (SCOPE_DENIED)', async () => {
    const bPOs = (await svc.procurement.getPurchaseOrders(bScope)).items as { id: string }[];
    expect(bPOs.length).toBeGreaterThan(0);
    await expect(svc.commands.dispatch(aScope, confirmOf(bPOs[0].id))).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });

  it('a supplier commanding a non-existent entity is denied (no existence leak)', async () => {
    await expect(svc.commands.dispatch(aScope, confirmOf('po-does-not-exist'))).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });

  it('the buyer lacks the supplier-only po:confirm role (failed, not applied)', async () => {
    const buyerPOs = (await svc.procurement.getPurchaseOrders(buyerScope)).items as { id: string }[];
    const res = await svc.commands.dispatch(buyerScope, confirmOf(buyerPOs[0].id));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });

  // Creation-shape scope (Step 4 batch i): scoped by the payload's PARENT PO.
  it('a supplier drafting an ASN against another supplier’s PO is denied (creation scope)', async () => {
    // PO-2025-00107 is owned by sup-007; sup-002 cannot draft its ASN.
    await expect(
      svc.commands.dispatch(bScope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { poReference: 'PO-2025-00107' },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('a supplier submitting another supplier’s ASN is denied', async () => {
    const bAsns = (await svc.procurement.getASNs(bScope)).items as { asnNumber: string }[];
    expect(bAsns.length).toBeGreaterThan(0);
    await expect(
      svc.commands.dispatch(aScope, {
        transitionId: 't_asn_submit',
        entity: 'advanceShipNotice',
        entityId: bAsns[0].asnNumber,
        payload: { carrier: 'JNE', trackingNumber: 'X1', eta: '2026-05-01' },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});

import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { mockInventory } from '../../../data/mockInventory';
import { mockShipments } from '../../../data/mockShipments';
import { mockContracts } from '../../../data/mockContracts';
import { mockObligations } from '../../../data/mockObligations';
import { applySupplierScope } from '../scoping';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { toBuyerInvoice, toSupplierInvoice } from '../invoiceProjection';
import { PRODUCTION_LINES, SUPPLIER_HEALTH } from './fixtures/buyerDashboard';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { SUPPLIER_SCORECARDS } from './fixtures/buyerScorecard';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import {
  INITIAL_CATALOG,
  INITIAL_CERTS,
  PRODUCTS_DEFAULT,
} from './fixtures/supplierStorefront';
import {
  KPIS,
  RADAR_DATA,
  WEEKLY_TREND,
  IMPROVEMENT_ACTIONS,
  SUP_007_SUPPLIER_ID,
} from './fixtures/supplierPerformance';
import type {
  IProcurementService,
  Page,
  QueryScope,
  PurchaseOrder,
  POFilter,
  InventoryRecord,
  InventoryFilter,
  Shipment,
  ShipmentFilter,
  ASN,
  ASNFilter,
  GoodsReceipt,
  GRFilter,
  Contract,
  ContractFilter,
  ContractObligation,
  ObligationFilter,
  RFQ,
  RFQFilter,
  Quotation,
  QuotationFilter,
  BuyerInvoice,
  SupplierInvoice,
  InvoiceFilter,
  SupplierDocument,
  CatalogItem,
  ProfileCert,
  StorefrontProduct,
  KpiSnapshot,
  PerformancePoint,
  TrendRange,
  ProductionLineRow,
  SupplierHealthRow,
  SupplierScorecard,
  PurchaseRequisition,
  PRFilter,
  PrIntakeLine,
} from '../types';
import { PR_INTAKE_LINES } from './fixtures/prIntake';

const matchesList = <T>(value: T, filter: T | T[] | undefined): boolean => {
  if (filter === undefined) return true;
  return Array.isArray(filter) ? filter.includes(value) : value === filter;
};

const EMPTY_KPI_SNAPSHOT: KpiSnapshot = {
  kpis: [],
  radar: [],
  trend: [],
  improvementActions: [],
};

const SUP_007_KPI_SNAPSHOT: KpiSnapshot = {
  kpis: KPIS,
  radar: RADAR_DATA,
  trend: WEEKLY_TREND,
  improvementActions: IMPROVEMENT_ACTIONS,
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **FAN-OUT IS NOT DEFERRED. IT IS IMPOSSIBLE ON THIS DATA, AND THE SENTENCE
// THAT STOOD HERE WAS FALSE IN BOTH ITS HALVES.**
//
// It read: *"Today every relocated supplier fixture is tagged sup-007; the
// snapshot is only meaningful when scope resolves to that supplier … Fan-out
// across suppliers is a deferred follow-up."*
//
//   · **"tagged sup-007" is false.** `KPIS` / `RADAR_DATA` / `WEEKLY_TREND` /
//     `IMPROVEMENT_ACTIONS` carry NO `supplierId` field — nothing in
//     `KpiPoint`, `RadarPoint` or `PerformancePoint` has one. They are untagged
//     and merely ASSOCIATED with sup-007 by the two functions below.
//   · **"deferred follow-up" is false**, and it is the more expensive half:
//     deferring says the derivation becomes possible once somebody gets to it.
//     It does not. Nobody should pick this up as ready work.
//
// ── WHY IT IS IMPOSSIBLE, MEASURED ───────────────────────────────────────────
//   1. **The seeded tenant's own figures are AUTHORED, not computed.** `KPIS`
//      is hand-written strings — `'87%'`, `'1.4 days'`, `'42 hrs'`. Nothing
//      derives them from a transaction, which is exactly what
//      `SupplierPerformance` already declares with
//      `<ProvenanceMarker capability="scorecards" />`. So a fan-out would not
//      DERIVE eleven scorecards; it would AUTHOR eleven sets of invented
//      numbers and give them the same marker.
//   2. **No tenant carries a 12-week series.** `WEEKLY_TREND` is twelve
//      hand-written points. The richest tenant has purchase orders in **3
//      distinct months**; sup-002 has **1**. A rolling-12-week trend cannot be
//      bucketed out of that for anyone — sup-007 included.
//   3. **8 of the 11 tenants that carry any row have NO ASN**, so ASN Accuracy
//      has no denominator at all. Only sup-002, sup-005 and sup-007 have one,
//      and each of the first two has exactly ONE ASN.
//   4. **An on-time rate would render a fabricated zero.** No tenant has more
//      than 3 purchase orders. sup-002 has 2 and BOTH are late, so a "derived"
//      OTIF is 0% — the plausible-wrong-value this platform refuses, reached
//      through honest-looking arithmetic. A thin real number is worse than a
//      stated absence.
//
//   ⚠️ **THE FIGURES ABOVE ARE A MEASUREMENT, NOT A CLAIM — AND ONE OF THEM WAS
//   WRONG ON ITS FIRST TELLING** (`FLOOR-IN-PROSE-01`). Item 3 was first
//   reported as *"5 of 11"* and re-derived to 8; the fix is to name the
//   derivation, not to write a fresher number. Re-run it over
//   `purchaseOrderStore.all()` and `asnStore.all()`: tenants = the union of
//   their `supplierId`s; no-ASN = that union minus the ASN store's; months =
//   distinct `orderDate.slice(0, 7)` per tenant. Measured 2026-08-28.
//
// ── WHAT HAPPENS INSTEAD, AND IT IS ALREADY PINNED ───────────────────────────
//   A tenant with no authored scorecard reads the empty snapshot, and
//   `SupplierPerformance` short-circuits to its `EmptyState` on
//   `kpis.length === 0` — no chart is drawn on nothing, and no zero is
//   rendered as a performance figure. **Verified on the built bundle**, seat
//   sup-002: zero `<text>`/`<tspan>` nodes, no `0%`.
//
//   ⚠️ **DO NOT ADD A TEST FOR THIS — IT HAS TWO, AND THEY WERE PROBED.**
//   Returning the seeded snapshot to every tenant is killed by
//   `scoping.contract.test.ts` *"getKpis: improvement actions are wired into the
//   snapshot"* AND by `SupplierPerformance.test.tsx` *"empty: shows EmptyState
//   for a supplier with no published scorecard"*. Leaking ONLY `kpis` — the
//   shape that slips past the contract test, which asserts `improvementActions`
//   — is still killed by the surface test, because it renders sup-002 through
//   the real service and gates on the same field the page does.
//
// ── FILED, NOT CHANGED (operator-agreed): THE BUYER BRANCH ───────────────────
//   The first line of `snapshotForScope` hands sup-007's scorecard to ANY
//   buyer, unlabelled. It is unreachable today — `useKpis`' only consumer is
//   `SupplierPerformance`, which returns `<NoSupplierIdentity/>` before it
//   reads when `supplierId` is null. Its fix is a SEAM SIGNATURE CHANGE:
//   `getKpis(scope)` takes no supplier id, so a buyer cannot name which
//   supplier it means, and a shipped contract test asserts today's behaviour.
//   That is an F1/F2 design decision, not a mock-layer edit.
// ─────────────────────────────────────────────────────────────────────────────
function snapshotForScope(scope: QueryScope): KpiSnapshot {
  if (scope.personaType === 'buyer') return SUP_007_KPI_SNAPSHOT;
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return SUP_007_KPI_SNAPSHOT;
  return EMPTY_KPI_SNAPSHOT;
}

function trendForScope(scope: QueryScope): PerformancePoint[] {
  if (scope.personaType === 'buyer') return [...WEEKLY_TREND];
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return [...WEEKLY_TREND];
  return [];
}

export class MockProcurementService implements IProcurementService {
  // ─── Purchase orders ──────────────────────────────────────────────────────

  async getPurchaseOrders(
    scope: QueryScope,
    filter?: POFilter,
  ): Promise<Page<PurchaseOrder>> {
    // Reads resolve from the mutable store (Step 3.6) so a confirmed PO is
    // reflected after the command mutates it — no page-local seeded copy.
    let rows = applySupplierScope(scope, purchaseOrderStore.all());
    if (filter?.supplierId)
      rows = rows.filter((p) => p.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((p) => matchesList(p.status, filter.status));
    if (filter?.dateFrom) rows = rows.filter((p) => p.orderDate >= filter.dateFrom!);
    if (filter?.dateTo) rows = rows.filter((p) => p.orderDate <= filter.dateTo!);
    return { items: rows };
  }

  async getPurchaseOrder(
    scope: QueryScope,
    id: string,
  ): Promise<PurchaseOrder | null> {
    const { items } = await this.getPurchaseOrders(scope);
    return items.find((p) => p.id === id) ?? null;
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async getInventory(
    scope: QueryScope,
    filter?: InventoryFilter,
  ): Promise<Page<InventoryRecord>> {
    let rows = applySupplierScope(scope, mockInventory);
    if (filter?.supplierId)
      rows = rows.filter((r) => r.supplierId === filter.supplierId);
    if (filter?.materialCode)
      rows = rows.filter((r) => r.materialCode === filter.materialCode);
    if (filter?.stockStatus)
      rows = rows.filter((r) => matchesList(r.stockStatus, filter.stockStatus));
    return { items: rows };
  }

  // ─── Sourcing ─────────────────────────────────────────────────────────────

  async getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<Page<RFQ>> {
    // Reads resolve from the mutable RFQ store (Step 4 batch iv) so an awarded
    // RFQ is reflected after the command mutates it. The store seeds from the
    // fixtures, so initial reads are identical. RFQ scoping is not supplierId-
    // based: an RFQ is visible to suppliers whose id ∈ invitedSupplierIds.
    let rows: RFQ[] = [...rfqStore.all()];
    if (scope.personaType === 'supplier') {
      if (!scope.supplierId) return { items: [] };
      // ⚠️ PF-1a — A `Draft` RFQ IS NOT VISIBLE TO SUPPLIERS, AND THIS LINE IS
      // WHAT MAKES PUBLICATION AN ACT RATHER THAN A RELABEL.
      //
      // Membership alone used to decide visibility. That was harmless only
      // because no Draft fixture carried an invited supplier; the moment D-1
      // moved `t_rfq_create` to birth at Draft, EVERY newly-raised RFQ became a
      // Draft carrying the wizard's invited list — so an unpublished sourcing
      // event would have been on the supplier's board before the buyer published
      // it, and `t_rfq_publish` would have changed a label and nothing else.
      // Reported as a finding before it was fixed (`PF1A-DRAFT-RFQ-VISIBLE-01`).
      rows = rows.filter(
        (r) => r.status !== 'Draft' && r.invitedSupplierIds.includes(scope.supplierId!),
      );
    }
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    if (filter?.category)
      rows = rows.filter((r) => matchesList(r.materialCategory, filter.category));
    if (filter?.invitedSupplierId)
      rows = rows.filter((r) =>
        r.invitedSupplierIds.includes(filter.invitedSupplierId!),
      );
    return { items: rows };
  }

  async getQuotations(
    scope: QueryScope,
    filter?: QuotationFilter,
  ): Promise<Page<Quotation>> {
    // Reads resolve from the mutable quotation store (Step 4 batch iv) so an
    // awarded/rejected quote is reflected after the award cascade mutates it.
    let rows = applySupplierScope(scope, [...quotationStore.all()]);
    if (filter?.rfqId) rows = rows.filter((q) => q.rfqId === filter.rfqId);
    if (filter?.supplierId)
      rows = rows.filter((q) => q.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((q) => matchesList(q.status, filter.status));
    return { items: rows };
  }

  // ─── Fulfilment ───────────────────────────────────────────────────────────

  async getShipments(
    scope: QueryScope,
    filter?: ShipmentFilter,
  ): Promise<Page<Shipment>> {
    let rows = applySupplierScope(scope, mockShipments);
    if (filter?.supplierId)
      rows = rows.filter((s) => s.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((s) => matchesList(s.status, filter.status));
    if (filter?.mode) rows = rows.filter((s) => matchesList(s.mode, filter.mode));
    return { items: rows };
  }

  async getASNs(scope: QueryScope, filter?: ASNFilter): Promise<Page<ASN>> {
    // Reads resolve from the mutable ASN store (Step 4 batch i) so a created /
    // submitted ASN is reflected after the command mutates it.
    let rows = applySupplierScope(scope, asnStore.all());
    if (filter?.status) rows = rows.filter((a) => matchesList(a.status, filter.status));
    return { items: rows };
  }

  async getGoodsReceipts(
    scope: QueryScope,
    filter?: GRFilter,
  ): Promise<Page<GoodsReceipt>> {
    // Reads resolve from the mutable GR store (Step 4 batch ii) so a created /
    // inspected / posted GR is reflected after the command mutates it — mirrors
    // getASNs. The store seeds from the fixtures, so initial reads are identical.
    let rows = applySupplierScope(scope, goodsReceiptStore.all());
    if (filter?.supplierId)
      rows = rows.filter((g) => g.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((g) => matchesList(g.status, filter.status));
    return { items: rows };
  }

  // ─── Finance ──────────────────────────────────────────────────────────────

  // DR-7: both invoice reads project from the ONE canonical `invoiceStore`, so
  // the two persona surfaces can never contradict. The buyer sees every invoice
  // EXCEPT drafts (Draft is supplier-private); the supplier sees its own,
  // drafts included. Labels + Overdue are computed at read (invoiceProjection).
  async getBuyerInvoices(
    scope: QueryScope,
    filter?: InvoiceFilter,
  ): Promise<Page<BuyerInvoice>> {
    const now = new Date().toISOString();
    let rows = applySupplierScope(
      scope,
      invoiceStore
        .all()
        .filter((inv) => inv.status !== 'Draft')
        .map((inv) => toBuyerInvoice(inv, now)),
    );
    if (filter?.supplierId)
      rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber)
      rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  async getSupplierInvoices(
    scope: QueryScope,
    filter?: InvoiceFilter,
  ): Promise<Page<SupplierInvoice>> {
    const now = new Date().toISOString();
    let rows = applySupplierScope(
      scope,
      invoiceStore.all().map((inv) => toSupplierInvoice(inv, now)),
    );
    if (filter?.supplierId)
      rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber)
      rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  async getContracts(
    scope: QueryScope,
    filter?: ContractFilter,
  ): Promise<Page<Contract>> {
    let rows = applySupplierScope(scope, mockContracts);
    if (filter?.supplierId)
      rows = rows.filter((c) => c.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((c) => matchesList(c.status, filter.status));
    if (filter?.type) rows = rows.filter((c) => matchesList(c.type, filter.type));
    return { items: rows };
  }

  async getObligations(
    scope: QueryScope,
    filter?: ObligationFilter,
  ): Promise<Page<ContractObligation>> {
    // Obligation has no supplierId — scope via parent contract.
    const { items: scopedContracts } = await this.getContracts(scope);
    const allowedContractIds = new Set(scopedContracts.map((c) => c.id));
    let rows = mockObligations.filter((o) => allowedContractIds.has(o.contractId));
    if (filter?.contractId)
      rows = rows.filter((o) => o.contractId === filter.contractId);
    if (filter?.status) rows = rows.filter((o) => matchesList(o.status, filter.status));
    if (filter?.owner) rows = rows.filter((o) => o.owner === filter.owner);
    return { items: rows };
  }

  // ─── Supplier-side supporting data ────────────────────────────────────────

  // §82 — reads resolve from the STORE, not the frozen fixture module: the
  // supplier-document verbs are wired now, so a declaration made this session
  // must be visible to the next read. Scoping is unchanged — a buyer gets the
  // superset (which is what makes compliance's review queue possible at all),
  // a supplier gets only its own rows.
  async getDocuments(scope: QueryScope): Promise<Page<SupplierDocument>> {
    return { items: applySupplierScope(scope, supplierDocumentStore.all()) };
  }

  async getStorefrontCatalog(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<CatalogItem>> {
    let rows = applySupplierScope(scope, INITIAL_CATALOG);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  async getStorefrontCerts(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<ProfileCert>> {
    let rows = applySupplierScope(scope, INITIAL_CERTS);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  async getStorefrontProducts(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<StorefrontProduct>> {
    let rows = applySupplierScope(scope, PRODUCTS_DEFAULT);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  // ─── KPIs / performance ───────────────────────────────────────────────────

  async getKpis(scope: QueryScope): Promise<KpiSnapshot> {
    return snapshotForScope(scope);
  }

  async getPerformanceTrend(
    scope: QueryScope,
    _range: TrendRange,
  ): Promise<Page<PerformancePoint>> {
    return { items: trendForScope(scope) };
  }

  // ─── Supplier scorecard (buyer-only portfolio grading) ────────────────────
  // Cross-network grading view. Suppliers do not see it — [] for the supplier
  // persona (mirrors the analytics/engagement buyer-only aggregate pattern).

  async getSupplierScorecards(
    scope: QueryScope,
  ): Promise<Page<SupplierScorecard>> {
    return {
      items: scope.personaType === 'buyer' ? [...SUPPLIER_SCORECARDS] : [],
    };
  }

  // ─── Purchase requisitions (buyer-only ACQUIRE stage) ─────────────────────

  async getRequisitions(
    scope: QueryScope,
    filter?: PRFilter,
  ): Promise<Page<PurchaseRequisition>> {
    if (scope.personaType !== 'buyer') return { items: [] };
    // G1.1 — reads the mutable store (seeded from the fixture), so a PR pushed
    // through t_pr_create is list-visible, exactly as PO/ASN/invoice reads work.
    let rows = [...purchaseRequisitionStore.all()];
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    return { items: rows };
  }

  // ─── PR-intake review (buyer-only; C7 §2 — one shape, two producers) ──────
  // FORK-B=(b2): the intake REVIEW surface's real read. Buyer-only, exactly like
  // getRequisitions — suppliers never see PR intake. Reads the promoted intake
  // fixture (both producers). Honest render (SIMULATED × PLANNED) is enforced at
  // the page via the purchaseRequisitions capability, not here.
  async getPrIntake(scope: QueryScope): Promise<Page<PrIntakeLine>> {
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: [...PR_INTAKE_LINES] };
  }

  // ─── Buyer command-center aggregates (buyer-only) ─────────────────────────

  async getProductionLines(
    scope: QueryScope,
  ): Promise<Page<ProductionLineRow>> {
    return { items: scope.personaType === 'buyer' ? [...PRODUCTION_LINES] : [] };
  }

  async getSupplierHealth(
    scope: QueryScope,
  ): Promise<Page<SupplierHealthRow>> {
    return { items: scope.personaType === 'buyer' ? [...SUPPLIER_HEALTH] : [] };
  }
}

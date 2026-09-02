// ─────────────────────────────────────────────────────────────────────────────
// C1 · THE SCOPING CONFORMANCE FACTORY — the scoping contract, stated once and
// runnable against ANY `IDataService`.
//
// ── WHAT THIS IS ────────────────────────────────────────────────────────────
//   `describeScopingConformance(label, make)` is a vitest `describe` factory
//   parameterised over an implementation. Today one spec calls it with
//   `mockDataService`. An SE team building `httpDataService` calls it with
//   theirs and reads red/green — the assertions do not move and nobody rewrites
//   them per adapter.
//
// ── ⚠️ WHAT GREEN HERE DOES NOT PROVE ───────────────────────────────────────
//   Stated first, in the form 1c's and C1's headers state their blindness,
//   because a suite named "conformance" is read as a certificate.
//
//     · **GREEN AGAINST THE MOCK PROVES THE FACTORY RUNS. IT DOES NOT PROVE
//       THE CONTRACT IS SUFFICIENT.** The mock is the implementation these
//       assertions were written against, so it passing is the weakest possible
//       evidence — it is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01` built into
//       the design. The only evidence that this factory constrains anything is
//       that it FAILS against a broken implementation, which is why the probe
//       for this file drives it with a deliberately broken stub and not only
//       with a broken assertion.
//     · **THIS PROVES SCOPING, AND NOTHING ELSE.** Not that any returned VALUE
//       is correct, not ordering, not pagination, not a write path's effect,
//       not `DataError`'s shape (that is a class contract — see
//       `dataError.contract.test.ts`, which is deliberately NOT a factory), and
//       not `ICommandService` beyond three scope refusals.
//     · **IT IS A FLOOR, NOT A CEILING.** An implementation that passes every
//       assertion here can still leak a tenant's data through a method this
//       file does not name. The read list below is the list this contract
//       covers, not the list `IDataService` has.
//
// ── ⚠️ WHAT THIS FILE DELIBERATELY DOES NOT CONTAIN ─────────────────────────
//   Eight assertions that lived beside these in `scoping.contract.test.ts` did
//   NOT come with them, and that partition is the deliverable rather than an
//   omission. They name specific fixture rows (`sa-0001`, `PO-2025-00107`,
//   `sample-personalcare`), assert a specific cross-tenant DISTRIBUTION, or
//   reach outside `IDataService` entirely (`deriveDeliveryChase`). They are
//   mock fixture regression tests, and they now live in a file that says so.
//
//   **They were NOT parameterised through a seeding hook** (operator ruling):
//   turning `toEqual(['sa-0001', 'sa-0002'])` into "assert whatever the caller
//   says" converts a real assertion into a tautology. A test that names a
//   fixture row is a fixture test and must read as one.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeAll, describe, expect, it } from 'vitest';

import { DataError } from '../../data/types';
import type { IDataService, QueryScope } from '../../data/types';

/**
 * WHAT AN IMPLEMENTATION MUST SUPPLY TO RUN THIS FACTORY. **This set IS the
 * contract** — it is the part an SE team reads before writing an adapter.
 *
 * The three tenants must be DISTINCT and must all exist. Three rather than two
 * is deliberate: two tenants cannot distinguish "isolated" from "returns the
 * other one's rows by coincidence of ordering".
 */
export interface ScopingConformanceTarget {
  /** The implementation under test. */
  readonly service: IDataService;
  /**
   * Three distinct supplier ids that exist in this implementation.
   *
   * ⚠️ **DATA PRECONDITIONS — an implementation whose fixture does not meet
   * these will fail assertions that are about ITS DATA, not about its scoping.**
   * They are stated here rather than discovered at run time so that a red suite
   * can be read correctly:
   *   · `a` and `b` each have at least one document;
   *   · `b` has at least one purchase order and at least one ASN;
   *   · the buyer scope sees at least one supplier, one risk scenario, one
   *     spend-by-category row, one supplier-performance row, one scorecard, and
   *     at least one requisition — with BOTH a `Draft` one and a non-`Draft`
   *     one, since the filter assertion requires a strict subset.
   */
  readonly tenants: { readonly a: string; readonly b: string; readonly c: string };
  /**
   * The business roles each persona holds. Supplied by the caller rather than
   * imported here so this factory depends only on `data/types` — the SE team
   * gets one import, not a transitive walk into the transition registry.
   */
  readonly roles: {
    readonly buyer: readonly string[];
    readonly supplier: readonly string[];
  };
}

/** A `supplierId`-scoped list read: rows carry `supplierId` and are filtered. */
interface ScopedRead {
  readonly name: string;
  readonly run: (svc: IDataService, s: QueryScope) => Promise<{ items: { supplierId: string }[] }>;
}

// The read list is STATIC — names and accessors, no service captured — so
// `it.each` can enumerate it at collection time while the implementation itself
// is resolved in `beforeAll`. Capturing a service here is exactly how a factory
// closes over the mock and stops being parameterised.
const SCOPED_READS: readonly ScopedRead[] = [
  { name: 'getPurchaseOrders', run: (svc, s) => svc.procurement.getPurchaseOrders(s) },
  { name: 'getInventory', run: (svc, s) => svc.procurement.getInventory(s) },
  { name: 'getShipments', run: (svc, s) => svc.procurement.getShipments(s) },
  { name: 'getASNs', run: (svc, s) => svc.procurement.getASNs(s) },
  { name: 'getGoodsReceipts', run: (svc, s) => svc.procurement.getGoodsReceipts(s) },
  { name: 'getBuyerInvoices', run: (svc, s) => svc.procurement.getBuyerInvoices(s) },
  { name: 'getSupplierInvoices', run: (svc, s) => svc.procurement.getSupplierInvoices(s) },
  { name: 'getContracts', run: (svc, s) => svc.procurement.getContracts(s) },
  { name: 'getDocuments', run: (svc, s) => svc.procurement.getDocuments(s) },
  { name: 'getStorefrontCatalog', run: (svc, s) => svc.procurement.getStorefrontCatalog(s) },
  { name: 'getStorefrontCerts', run: (svc, s) => svc.procurement.getStorefrontCerts(s) },
  { name: 'getStorefrontProducts', run: (svc, s) => svc.procurement.getStorefrontProducts(s) },
  { name: 'getQuotations', run: (svc, s) => svc.procurement.getQuotations(s) },
  // I3.1 — the canonical compliance registry: supplierId-keyed, so a supplier
  // reads only its own certs and the buyer sees the superset (the FK that closes
  // the name-vs-id split, HALAL-XPERSONA-01).
  { name: 'getComplianceRegistry', run: (svc, s) => svc.risk.getComplianceRegistry(s) },
  // Delivery Agreement surface seam: SchedulingAgreement carries supplierId, so the
  // scoped view-model is isolated per supplier and the buyer sees the superset. The
  // view nests the agreement, so expose its supplierId for the shared assertions.
  {
    name: 'getDeliveryAgreements',
    run: async (svc, s) => ({
      items: (await svc.delivery.getAgreements(s)).items.map((v) => ({
        supplierId: v.agreement.supplierId,
      })),
    }),
  },
];

/**
 * The scoping contract, as a suite. Call once per implementation.
 *
 * @param label  names the implementation in every test title, so a repository
 *               running two adapters can tell which one went red.
 * @param make   returns the target. Called once, in `beforeAll`, and may be
 *               async so an adapter can open a connection or seed a database.
 */
export function describeScopingConformance(
  label: string,
  make: () => ScopingConformanceTarget | Promise<ScopingConformanceTarget>,
): void {
  let svc: IDataService;
  let A: string;
  let B: string;
  let C: string;
  let buyerScope: QueryScope;
  let aScope: QueryScope;
  let bScope: QueryScope;
  let cScope: QueryScope;

  beforeAll(async () => {
    const t = await make();
    svc = t.service;
    A = t.tenants.a;
    B = t.tenants.b;
    C = t.tenants.c;
    // The factory's own population control: three tenants that are not distinct
    // would make every isolation assertion below pass vacuously.
    if (new Set([A, B, C]).size !== 3) {
      throw new Error(`${label}: the three conformance tenants must be distinct, got ${A}/${B}/${C}`);
    }
    buyerScope = { personaType: 'buyer', supplierId: null, businessRoles: t.roles.buyer };
    aScope = { personaType: 'supplier', supplierId: A, businessRoles: t.roles.supplier };
    bScope = { personaType: 'supplier', supplierId: B, businessRoles: t.roles.supplier };
    cScope = { personaType: 'supplier', supplierId: C, businessRoles: t.roles.supplier };
  });

  describe(`${label} — scoping contract: supplierId-scoped reads`, () => {
    it.each(SCOPED_READS)(
      '$name: supplier scope is isolated and buyer is the superset',
      async ({ run }) => {
        const [a, b, c, buyer] = await Promise.all([
          run(svc, aScope),
          run(svc, bScope),
          run(svc, cScope),
          run(svc, buyerScope),
        ]);
        // Isolation: a supplier scope only ever returns its own rows. Three
        // distinct tenants prove it is not a two-party coincidence.
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

  describe(`${label} — scoping contract: non-supplierId scoping models`, () => {
    it('getRFQs: supplier sees only RFQs it is invited to; buyer sees all', async () => {
      const a = (await svc.procurement.getRFQs(aScope)).items;
      const all = (await svc.procurement.getRFQs(buyerScope)).items;
      expect(a.every((r) => r.invitedSupplierIds.includes(A))).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(a.length);
    });

    // ⚠️ **THIS ASSERTION IS SELF-RELATIVE AND CANNOT DETECT A UNIFORM LEAK.**
    // Measured, not suspected: driving this factory with an implementation that
    // ignores `scope.supplierId` entirely killed 25 of its 30 tests — and this
    // was one of the five survivors. Both sides of the comparison widen together
    // under a leak, so "every obligation belongs to a contract I can see" stays
    // true when I can suddenly see every contract.
    //
    // It is carried UNCHANGED anyway, because 1a's ruling is that a partition
    // may not alter what an assertion asserts — strengthening it here would be
    // the weakening rule running in reverse, silently. Recorded as the known
    // hole for the dispatcher-level contract to close, since the fix needs an
    // absolute expectation (obligations of a contract this tenant does NOT own
    // must be absent) and that needs a second tenant's contract id, which is
    // fixture identity. Of the other four survivors, three are buyer-path
    // assertions and one is a non-vacuity check — all correctly insensitive to
    // a supplier-side leak.
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
  });

  describe(`${label} — scoping contract: SCOPE_DENIED on record lookup`, () => {
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
  // so they do not mutate the implementation's stores.
  describe(`${label} — scoping contract: commands (DR-6 amended)`, () => {
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
      await expect(
        svc.commands.dispatch(aScope, confirmOf('po-does-not-exist')),
      ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    });

    it('the buyer lacks the supplier-only po:confirm role (failed, not applied)', async () => {
      const buyerPOs = (await svc.procurement.getPurchaseOrders(buyerScope)).items as { id: string }[];
      const res = await svc.commands.dispatch(buyerScope, confirmOf(buyerPOs[0].id));
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
    });

    it('a supplier submitting another supplier’s ASN is denied', async () => {
      const bAsns = (await svc.procurement.getASNs(bScope)).items as { asnNumber: string }[];
      expect(bAsns.length).toBeGreaterThan(0);
      await expect(
        svc.commands.dispatch(aScope, {
          transitionId: 't_asn_submit',
          entity: 'advanceShipNotice',
          entityId: bAsns[0].asnNumber,
          payload: { carrier: 'Sample Courier', trackingNumber: 'X1', eta: '2026-05-01' },
        }),
      ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    });
  });
}

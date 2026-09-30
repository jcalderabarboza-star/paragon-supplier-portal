// ────────────────────────────────────────────────────────────────────────────
// MockCollaborationService (SDC-4b) — the SDC read seam's mock implementation.
//
// Moves SDC read-scoping from the hooks (sdcSupplierHooks) INTO the service, so
// P1 own-reads and P2 consolidation share ONE scoped source. Mirrors
// MockProcurementService exactly:
//   · P1 own-reads pipe through applySupplierScope (buyer = superset, supplier =
//     own rows only — cross-supplier data can never leak);
//   · P2 consolidation reads are BUYER-GATED — a supplier persona sees nothing
//     (own-only degenerates to empty; a supplier has no cross-supplier
//     consolidation view), the same convention as procurement's buyer-only
//     aggregates (getRequisitions / getSupplierScorecards).
//
// Reads resolve from the LIVE stores (seeded from the SDC-0 fixtures) so a P1
// write is reflected once a consumer repoints onto this service (SDC-4c/4d).
// Publications stay the frozen SOMO fixtures (their producer is the F2 C8 feed,
// not a supplier write). Time comes from the shared sdcClock (SDC-4a), so the
// service and the pure selectors agree on "now". Nothing here dispatches.
// ────────────────────────────────────────────────────────────────────────────

import { applySupplierScope } from '../scoping';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { asnStore } from './stores/asnStore';
import {
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  supplierVisiblePublications,
  currentPublication,
  currentDeclarations,
  consolidationRows,
  supplierCoverageEntries,
  supplierRollups,
  chaseList,
  asnTrackingFor,
  sdcClock,
} from '../../sdc';
import type {
  RequirementResponse,
  InventoryDeclaration,
  IncomingShipmentView,
  ConsolidationRow,
  SupplierCoverageEntry,
  SupplierRollup,
  ChaseEntry,
  ForecastPublication,
} from '../../sdc';
import type {
  ICollaborationService,
  Page,
  PublicationsPage,
  PublicationsQuery,
  PublicationWorkspace,
  QueryScope,
  ASN,
} from '../types';
import { forecastPublicationStore, type PublicationRecord } from './stores/forecastPublicationStore';
import { planVersionOffers } from './publicationFeed';
import type { PublicationDocument } from '../../sdc';

/** B4b — a record as the seam's document: everything but the seed object. */
const asDocument = ({ seed: _seed, ...doc }: PublicationRecord): PublicationDocument => doc;

/** B4a — what was published, from the STORE (the constant is only its seed). */
const published = (): readonly ForecastPublication[] => forecastPublicationStore.publications();

/** The buyer gate for the consolidation reads: only a buyer sees the superset; a
 *  supplier (or a scopeless call) sees nothing — never cross-supplier data. */
const buyerOnly = (scope: QueryScope): boolean => scope.personaType === 'buyer';

export class MockCollaborationService implements ICollaborationService {
  // ─── P1 own-reads (per-supplier isolation) ──────────────────────────────────

  /** The supplier's OWN requirement responses, newest-first. STATUS-ONLY
   *  (FORK-3b-C): the raw submissions the supplier made — never a
   *  consolidation-derived rank/score/sibling row. */
  async getOwnRequirementResponses(
    scope: QueryScope,
  ): Promise<Page<RequirementResponse>> {
    const own = applySupplierScope(scope, requirementResponseStore.all());
    const items = own
      .slice()
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
    return { items };
  }

  /** The supplier's CURRENT SOH per material — the most-recently-added snapshot
   *  per pair (by insertion recency, SDC-4a), sorted by material code. */
  async getOwnInventoryDeclarations(
    scope: QueryScope,
  ): Promise<Page<InventoryDeclaration>> {
    const own = applySupplierScope(scope, inventoryDeclarationStore.all());
    const items = currentDeclarations(own).sort((a, b) =>
      a.materialCode.localeCompare(b.materialCode),
    );
    return { items };
  }

  /** The supplier's OWN reported shipments, newest-first, each with its DISPLAY
   *  lifecycle resolved (a to-paragon leg's state is DERIVED from the linked
   *  ASN's live status — the drift-honesty rule). */
  async getOwnIncomingShipments(
    scope: QueryScope,
  ): Promise<Page<IncomingShipmentView>> {
    const own = applySupplierScope(scope, incomingShipmentStore.all());
    const items = own
      .map((shipment) => {
        // THE TWO AXES. `shipment` carries the supplier's DECLARED lifecycle
        // untouched; `asnTracking` carries Paragon's inbound observation. The
        // second never overwrites the first — see `sdc/shipment.ts`.
        const asnStatus =
          shipment.direction === 'to-paragon' && shipment.asnRef
            ? (asnStore.get(shipment.asnRef)?.status ?? null)
            : null;
        return { shipment, asnTracking: asnTrackingFor(shipment, asnStatus) };
      })
      .sort((a, b) => b.shipment.id.localeCompare(a.shipment.id));
    return { items };
  }

  /** The supplier's OWN ASNs — the to-paragon link-picker source. */
  async getOwnSupplierAsns(scope: QueryScope): Promise<Page<ASN>> {
    return { items: applySupplierScope(scope, asnStore.all()) };
  }

  // ─── B4a · the publications (Design 2 §2.2) ─────────────────────────────────

  /**
   * What was published, for this scope.
   *
   * ⚠️ FLAG-2 IS STRUCTURAL HERE, NOT A PAGE'S HABIT. A buyer reads every
   * published publication. A supplier reads LIVE publications only
   * (`supplierVisiblePublications`), and of each only ITS OWN lines — another
   * supplier's split is another tenancy. Every seed is SIMULATED, so that read
   * is EMPTY today, by design.
   *
   * The sample the supplier page renders under its banner is reached ONLY
   * through `includeSimulatedSample: true`, and the page it returns says so
   * (`sample: true`) — the banner is keyed to that flag, never to a guess. It
   * is offered only when no LIVE publication exists: a real plan is never
   * mixed with a sample one.
   */
  async getPublications(scope: QueryScope, q: PublicationsQuery = {}): Promise<PublicationsPage> {
    const all = published();
    if (scope.personaType === 'buyer') return { items: [...all], sample: false };
    const own = scope.supplierId;
    if (!own) return { items: [], sample: false };
    const ownLines = (p: ForecastPublication): ForecastPublication =>
      Object.freeze({ ...p, lines: Object.freeze(p.lines.filter((l) => l.supplierId === own)) });
    const live = supplierVisiblePublications(all);
    if (live.length > 0 || !q.includeSimulatedSample) return { items: live.map(ownLines), sample: false };
    return { items: all.map(ownLines), sample: true };
  }

  /**
   * B4b — the planner's workspace: every publication in every state, drafts and
   * ledgers included, and the plan versions a draft may be opened from, at both
   * grains. BUYER-ONLY: a supplier reads an empty workspace, never a draft.
   */
  async getPublicationWorkspace(scope: QueryScope): Promise<PublicationWorkspace> {
    if (!buyerOnly(scope)) return { records: [], offers: [] };
    return {
      records: forecastPublicationStore.all().map(asDocument),
      offers: [...planVersionOffers('month'), ...planVersionOffers('week')],
    };
  }

  // ─── P2 consolidation reads (buyer-superset, BUYER-GATED) ────────────────────

  /** The consolidation rows (every current-publication line + its response
   *  state). Buyer-only — a supplier sees nothing. */
  async getConsolidation(scope: QueryScope): Promise<Page<ConsolidationRow>> {
    if (!buyerOnly(scope)) return { items: [] };
    return {
      items: [...consolidationRows(published(), requirementResponseStore.all())],
    };
  }

  /** The per-supplier coverage entries (the ONE modeled projection). Buyer-only. */
  async getCoverage(scope: QueryScope): Promise<Page<SupplierCoverageEntry>> {
    if (!buyerOnly(scope)) return { items: [] };
    return {
      items: [
        ...supplierCoverageEntries(
          published(),
          inventoryDeclarationStore.all(),
          incomingShipmentStore.all(),
          SUPPLIER_MATERIAL_RELATIONSHIPS,
          sdcClock.now(),
        ),
      ],
    };
  }

  /** The pre-scheduler chase list (overdue / partial), as of the shared clock.
   *  Buyer-only. */
  async getChase(scope: QueryScope): Promise<Page<ChaseEntry>> {
    if (!buyerOnly(scope)) return { items: [] };
    const current = currentPublication(published());
    if (current === null) return { items: [] };
    const rows = consolidationRows(published(), requirementResponseStore.all());
    return { items: [...chaseList(current, rows, sdcClock.now())] };
  }

  /** The per-supplier response rollups (responded / partial / silent). Buyer-only. */
  async getRollups(scope: QueryScope): Promise<Page<SupplierRollup>> {
    if (!buyerOnly(scope)) return { items: [] };
    const rows = consolidationRows(published(), requirementResponseStore.all());
    return { items: [...supplierRollups(rows)] };
  }
}

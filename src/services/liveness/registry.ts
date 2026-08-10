// ─────────────────────────────────────────────────────────────────────────────
// LivenessRegistry (F0.6) — the ONE runtime authority for honest-render.
//
// A single map from capability → liveness tier, DERIVED from the behavior-wiring
// census (`WIRED_COMMAND_TARGETS`, the wired-target set — 8 as of SDC-2a). A capability is
// LIVE iff the entity it reads actually dispatches through a wired CommandTarget;
// anything else is SIMULATED. Because the tier is COMPUTED from the live TARGETS
// set — never hand-authored — the registry cannot drift from what the command
// spine really wires: unwire a target and its capability flips to SIMULATED with
// no edit here. Honest-by-construction, not by-convention.
//
// This subsumes the per-component `live={true|false}` discipline: every honest-
// render marker reads ONE authority (`isLive`), so "which surface is live" has a
// single answer. (Mechanism-1, the deploy-env badge in `envBadge.ts`, is a
// DIFFERENT concern — which deploy, not data-liveness — and is intentionally out
// of scope. The ~13 Mechanism-3 static page markers ride a follow-on sweep,
// F0.6-FIND-01.)
//
// Honesty invariant (STRUCTURAL): green ("Live") is reachable only through BOTH
// gates below — a lookup, never a caller-supplied boolean. A SIMULATED/SPEC
// capability, OR a capability still awaiting its real data source, can never render
// green. Proven in registry.test.ts + flipHarness.test.ts.
//
// TWO-GATE model (I3.3 · LIVENESS-DATASOURCE-01). Liveness is gate-1 (wiring). But
// wiring alone is NOT realness: a CommandTarget wired against a SYNTHETIC store
// would flip gate-1 LIVE over fake data — for `compliance` (legally-dated cert
// data) that false "Live" is the worst-case honesty failure. So a harvest-gated
// capability carries a SECOND, operator-verified gate: its real data source must
// have landed. Green requires gate-1 AND gate-2. The Track-R harvest (R0.1) is
// what opens gate-2 for compliance; wiring the target opens gate-1 — BOTH required.
//
// Vocabulary is the #59 runtime three-tier LIVE / SIMULATED / SPEC. (The contract
// docs' RESERVED tier is a seam-swap concept, not a UI marker.) PARTIAL is
// deferred until a marker actually needs it.
// ─────────────────────────────────────────────────────────────────────────────

import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';

/**
 * The honest-render tiers (runtime, #59):
 *  - LIVE      — backed by a real wired CommandTarget; dispatch mutates it.
 *  - SIMULATED — fixture / authored-but-unwired; real shape, no live source.
 *  - SPEC      — zero code (reserved vocabulary; no seeded capability is SPEC yet).
 */
export type Tier = 'LIVE' | 'SIMULATED' | 'SPEC';

/**
 * A honest-render capability — a data domain a surface reads. Deliberately
 * COARSER than a widget (the two PO widgets share `purchaseOrders`; the two
 * invoice widgets share `invoices`): a capability maps to the census, not to a
 * surface id. This is the adjudicated key unit (F0.6 ruling 1).
 */
export type Capability =
  | 'purchaseOrders'
  | 'advanceShipNotices'
  | 'goodsReceipts'
  | 'invoices'
  | 'rfqs'
  | 'purchaseRequisitions'
  | 'inventory'
  | 'risk'
  | 'compliance'
  | 'supplierDocuments'
  | 'commodityIntel'
  | 'forecastPublications'
  | 'deliveryAgreements'
  // ── D-CENSUS-8 — the domains the marker regime never reached ──────────────
  // The registry was authored alongside the transactional lanes and stopped
  // there, so the 13 above are exactly the capabilities that already HAD a
  // marker. The census inverted the finding: the least-real surfaces (supplier
  // master, discovery, registration, contracts, logistics, scoring, analytics,
  // messaging) carried NO marker at all, and a reader trusts an unmarked page
  // more than a marked one. These eight close that hole. Every one is
  // null-backed — no lifecycle CommandTarget reads them — so each derives
  // SIMULATED and green is structurally unreachable, same as `risk`.
  | 'suppliers'
  | 'supplierDiscovery'
  | 'supplierRegistration'
  | 'contracts'
  | 'shipments'
  | 'scorecards'
  | 'analytics'
  | 'messaging'
  // The dashboards' own KPI tiles — NOT the widgets below them, which each carry
  // their own capability marker already. The tiles aggregate across suppliers,
  // POs, supplier-health and production-line fixtures; no single transactional
  // capability describes them, and leaving them the only unmarked figures on an
  // otherwise-marked page is the inversion this batch exists to end.
  | 'dashboard';

// The ONLY hand-authored fact here: which command entity/flow each capability
// reads from (`null` = pure fixture, no lifecycle entity). The TIER is never
// authored — it is DERIVED below from whether that entity is actually wired.
const CAPABILITY_BACKING: Record<Capability, string | null> = {
  purchaseOrders: 'purchaseOrder',
  advanceShipNotices: 'advanceShipNotice',
  goodsReceipts: 'goodsReceipt',
  invoices: 'invoice',
  rfqs: 'rfq',
  // C7-FIND-01a (G1.1) — backed STRUCTURALLY to the now-wired PR CommandTarget, so
  // gate-1 derives LIVE (the intake genuinely dispatches). But there is NO live
  // PRODUCER yet (SOMO = F2/SPEC, internal Grid = G1.2), so it is HARVEST-GATED
  // below → isLive() = false → renders SIMULATED. Wiring alone must NEVER flip green
  // (LIVENESS-DATASOURCE-01). The flip to LIVE is the proven two-edit op: land a
  // producer + drop the harvest entry — exactly compliance's flip shape.
  purchaseRequisitions: 'purchaseRequisition',
  // SDC-3b — repointed from `null` to the now-wired InventoryDeclaration
  // CommandTarget (t_inventorydeclaration_declare): gate-1 now derives LIVE (a
  // declare genuinely dispatches + mutates the store). Gate-2 (the harvest entry
  // below) STAYS SHUT — the SOH shown is SIMULATED fixtures / demo submissions
  // until real supplier identities submit over a live portal (F1), so the pill
  // keeps reading "Sample" and green stays structurally unreachable
  // (LIVENESS-DATASOURCE-01: wiring alone must never flip green). Same two-edit
  // flip shape as compliance / forecastPublications.
  inventory: 'inventoryDeclaration',
  risk: null,
  // I3.1 — repointed from `null` to the now-authored canonical compliance flow.
  // The flow is REGISTERED but NOT a wired CommandTarget → still derives
  // SIMULATED. This is STRONGER honesty than a null backing: unwire-to-honest is
  // structural — a CommandTarget wires it LIVE only post Track-R harvest, and
  // removing that target flips it back to SIMULATED with no edit here.
  compliance: 'compliance',
  // A registered F0.4 flow, but NOT a wired CommandTarget → derives SIMULATED,
  // the same honest result as a pure fixture. (Demonstrates the inert-flow path.)
  supplierDocuments: 'supplierDocument',
  // CI-0 — the Market Intelligence tab reads invented category trend stats with NO
  // lifecycle entity behind them. Null backing → derives SIMULATED → the shared
  // LivenessPill renders amber "Sample"; green is structurally unreachable. When a
  // real should-cost feed lands (Stage-CI), this flips through the same two gates.
  commodityIntel: null,
  // SDC-1 → SDC-2a — the publication-anchored collaboration state (ONE
  // capability for the lane, not four). SDC-2a wired the RequirementResponse
  // CommandTarget (t_requirementresponse_submit), flipping this backing from
  // null to the wired entity: gate-1 now derives LIVE. Gate-2 (the harvest
  // entry below) STAYS SHUT — the publications answered are SIMULATED fixtures
  // until the real SOMO C8 feed lands (F-timeline), so the pill keeps reading
  // "Sample — awaiting SOMO C8 feed" and green stays structurally unreachable
  // (LIVENESS-DATASOURCE-01: wiring alone must never flip green).
  forecastPublications: 'requirementResponse',
  // The delivery drawdown/compliance surface reads the headless delivery domain
  // (SchedulingAgreement + the pure derivations) off SIMULATED fixtures — no
  // lifecycle CommandTarget behind it. Null backing → derives SIMULATED → the
  // shared LivenessPill renders amber "Sample"; green is structurally unreachable.
  // When the real S/4HANA scheduling-agreement feed lands (Pattern B, Stage F), it
  // flips through the same two gates.
  deliveryAgreements: null,
  // ── D-CENSUS-8 — the eight late-marked domains ────────────────────────────
  // All null-backed, DELIBERATELY. Each of these surfaces reads a frozen fixture
  // array through `mockDataService`; none is the read-model of a lifecycle
  // entity. Backing one to a merely-adjacent wired entity is the exact defect
  // this batch files as INVENTORY-REFERENT-01 (`inventory` is backed to
  // `inventoryDeclaration` while BuyerInventoryWidget renders `mockInventory` —
  // so the pill's referent is not the data on screen, and unwire-flips-the-pill
  // stops meaning anything). Null is the honest backing for a fixture read: it
  // derives SIMULATED, and it flips only when a real read-model actually lands.
  suppliers: null,
  supplierDiscovery: null,
  supplierRegistration: null,
  contracts: null,
  shipments: null,
  scorecards: null,
  analytics: null,
  messaging: null,
  dashboard: null,
};

// — Gate-2: harvest gating (LIVENESS-DATASOURCE-01) —————————————————————————————
// A harvest-gated capability reads a SYNTHETIC source today; its entry here means
// "real data source NOT yet landed → stay guarded (never green), even if wired."
// The value is the capability's readiness note (the ONE structural home of the
// "awaiting <source> harvest" marker text — pills + banners read it, no hand-rolled
// literals). The Track-R harvest (R0.1) lands compliance's real cert registry; the
// operator then removes this entry (gate-2 opens) AND wires the CommandTarget
// (gate-1) — BOTH required for green. Proven in flipHarness.test.ts.
export interface HarvestGate {
  /** i18n key for the capability-scoped "awaiting <source> harvest" marker. */
  readonly readinessNoteKey: string;
  /** The harvest that lands this capability's real data source (display token). */
  readonly source: string;
}

const HARVEST_GATED: Partial<Record<Capability, HarvestGate>> = {
  compliance: {
    readinessNoteKey: 'widget.honesty.awaitingHarvest',
    source: 'Track-R',
  },
  // C7-FIND-01a (G1.1) — the PR CommandTarget is wired (gate-1 LIVE), but the real
  // intake PRODUCER has not landed: SOMO's order_creation emission is F2/SPEC and
  // the internal Grid producer is G1.2. Until one lands, the intake dispatches over
  // seed data → gate-2 holds it SIMULATED (never green). This is the two-gate model
  // proving its point in the LIVE registry, not just the harness.
  purchaseRequisitions: {
    readinessNoteKey: 'widget.honesty.awaitingProducer',
    source: 'SOMO / Grid',
  },
  // SDC-1 — the forecast publications the planner consolidates are SIMULATED
  // fixtures on the C8 grain; the real producer is the SOMO C8 feed (deferred
  // sibling seam, F-timeline). Named so the pill reads the SPECIFIC waiting
  // state, not a generic "Sample" — and so wiring alone can never flip green.
  forecastPublications: {
    readinessNoteKey: 'widget.honesty.awaitingC8Feed',
    source: 'SOMO C8',
  },
  // SDC-3b — the InventoryDeclaration CommandTarget is wired (gate-1 LIVE), but
  // the SOH declarations are SIMULATED fixtures / demo submissions until real
  // supplier identities land (F1). Until a live supplier feed exists, gate-2
  // holds inventory SIMULATED (never green) — the same point forecastPublications
  // makes, applied to the SOH object.
  inventory: {
    readinessNoteKey: 'widget.honesty.awaitingSupplierFeed',
    source: 'Supplier feed (F1)',
  },
};

// Membership set built once from the exported census. Reading this — rather than
// re-listing entities — is what makes liveness impossible to drift from wiring.
const WIRED = new Set<string>(WIRED_COMMAND_TARGETS);

/** Every registered capability (stable insertion order). */
export const ALL_CAPABILITIES = Object.keys(CAPABILITY_BACKING) as Capability[];

/** The capability→backing map, exposed read-only (drift-proof test reads it). */
export const capabilityBacking: Readonly<Record<Capability, string | null>> =
  CAPABILITY_BACKING;

/**
 * Gate-1, PURE + INJECTABLE: the wiring tier of a backing entity against a given
 * wired-target set. Extracted so the flip harness can prove SIMULATED→LIVE on a
 * single wiring change WITHOUT mutating the process-wide census. `liveness()`
 * calls it with the real `WIRED` set — there is no second source.
 */
export function livenessFrom(
  backing: string | null,
  wired: ReadonlySet<string>,
): Tier {
  return backing !== null && wired.has(backing) ? 'LIVE' : 'SIMULATED';
}

/**
 * The liveness (gate-1) tier of a capability — DERIVED from the wiring census.
 * LIVE iff its backing entity actually dispatches through a wired CommandTarget.
 * NOTE: gate-1 alone is NOT green for a harvest-gated capability — see `isLive`.
 */
export function liveness(capability: Capability): Tier {
  return livenessFrom(CAPABILITY_BACKING[capability], WIRED);
}

/**
 * Gate-2: whether a capability still awaits its REAL data source. True while a
 * harvest-gated capability's source has not landed — the guarded state that keeps
 * wiring-alone from rendering green (LIVENESS-DATASOURCE-01).
 */
export function awaitsHarvest(capability: Capability): boolean {
  return capability in HARVEST_GATED;
}

/**
 * The capability-scoped readiness note (structural, ONE authority). Non-null only
 * for a harvest-gated capability that has not yet flipped — drives the pill text
 * and the page banner ("awaiting Track-R harvest"). Null for every other tier.
 */
export function readinessNote(capability: Capability): HarvestGate | null {
  return HARVEST_GATED[capability] ?? null;
}

/**
 * The PURE, INJECTABLE two-gate green predicate. Green iff gate-1 (wired ⇒ tier
 * LIVE) AND gate-2 (real data source landed, i.e. NOT awaiting harvest). Encodes
 * LIVENESS-DATASOURCE-01 as executable logic: a wired-but-harvest-pending
 * capability is GUARDED — not green. Proven across every cell in flipHarness.test.ts.
 */
export function isGreenFrom(
  backing: string | null,
  wired: ReadonlySet<string>,
  awaitingHarvest: boolean,
): boolean {
  return livenessFrom(backing, wired) === 'LIVE' && !awaitingHarvest;
}

/**
 * The ONE green predicate every honest-render marker reads. Structurally, green is
 * reachable only through BOTH gates — a SIMULATED/SPEC tier OR a pending harvest
 * can never return true, so a marker can never claim live data a capability lacks.
 */
export function isLive(capability: Capability): boolean {
  return isGreenFrom(
    CAPABILITY_BACKING[capability],
    WIRED,
    awaitsHarvest(capability),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SECOND AXIS (D-CENSUS-8) — feed provenance, separate from wiring.
//
// The census found seven routes where ONE marker cannot tell the truth. On
// /supplier/orders a Confirm genuinely dispatches through a wired CommandTarget,
// mutates the store and writes the DR-10 audit trail — while the orders listed
// are frozen fixtures. A flat amber "Sample" understates the verb; a green
// "Live" overstates the feed. Both are lies of a different sign.
//
// So liveness gets what it always implicitly had: TWO independent questions.
//   · VERB axis — does acting here really do something? → `isLive` (gates 1+2).
//   · FEED axis — is the data on screen real? → `feedProvenance`, here.
//
// This is NOT gate-2 renamed. Gate-2 asks "may this capability ever go green",
// and it is applied inconsistently today (LIVENESS-GATE-ASYMMETRY-01, filed this
// batch, ruled report-only): `purchaseOrders`/`goodsReceipts`/… are wired and
// UNGATED so they render green, while `inventory`/`purchaseRequisitions`/
// `forecastPublications` read equally-synthetic stores and are gated. Until that
// asymmetry is adjudicated, the FEED axis states the fixture fact directly
// rather than inferring it from a gate that does not consistently encode it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where a capability's DISPLAYED data comes from — independent of whether its
 * verbs are wired.
 *  - FIXTURE — a frozen authored array behind `mockDataService`.
 *  - LIVE    — a real upstream feed. Nothing on main is LIVE (see below).
 */
export type FeedProvenance = 'FIXTURE' | 'LIVE';

/**
 * Every capability reads FIXTURE today. This is not an opinion to keep in sync
 * by hand — it is a property of the repo: the backend is greenfield (zero server
 * code, zero datastore clients; `httpDataService` is the designed Phase-F1 swap
 * and is not wired). `feedProvenance.test.ts` pins that fact, so the day a real
 * feed lands, the test fails and forces this map and the marker to move
 * together rather than letting a stale FIXTURE claim sit under live data.
 */
const CAPABILITY_FEED: Record<Capability, FeedProvenance> = Object.freeze(
  Object.fromEntries(
    (Object.keys(CAPABILITY_BACKING) as Capability[]).map((c) => [c, 'FIXTURE']),
  ),
) as Record<Capability, FeedProvenance>;

/** The feed axis: where this capability's displayed data actually comes from. */
export function feedProvenance(capability: Capability): FeedProvenance {
  return CAPABILITY_FEED[capability];
}

/**
 * The verb axis, as a marker-facing predicate: acting on this surface really
 * dispatches through a wired CommandTarget and writes the DR-10 trail — even
 * though `isLive` is false because the FEED is not real. True exactly for the
 * partly-real routes the census asked to be named rather than averaged.
 *
 * DERIVED, never caller-supplied: a page cannot assert "my buttons work". Unwire
 * the target and this goes false with no edit here — the same honest-by-
 * construction property `liveness()` has.
 */
export function dispatchesCommands(capability: Capability): boolean {
  return liveness(capability) === 'LIVE';
}

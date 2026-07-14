// ─────────────────────────────────────────────────────────────────────────────
// LivenessRegistry (F0.6) — the ONE runtime authority for honest-render.
//
// A single map from capability → liveness tier, DERIVED from the behavior-wiring
// census (`WIRED_COMMAND_TARGETS`, the contract package's "6"). A capability is
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
  | 'inventory'
  | 'risk'
  | 'compliance'
  | 'supplierDocuments';

// The ONLY hand-authored fact here: which command entity/flow each capability
// reads from (`null` = pure fixture, no lifecycle entity). The TIER is never
// authored — it is DERIVED below from whether that entity is actually wired.
const CAPABILITY_BACKING: Record<Capability, string | null> = {
  purchaseOrders: 'purchaseOrder',
  advanceShipNotices: 'advanceShipNotice',
  goodsReceipts: 'goodsReceipt',
  invoices: 'invoice',
  rfqs: 'rfq',
  inventory: null,
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

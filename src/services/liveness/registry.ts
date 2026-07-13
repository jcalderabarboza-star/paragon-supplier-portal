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
// Honesty invariant (STRUCTURAL): the only path to a green "Live" pill is
// tier === 'LIVE', and tier is a lookup — never a caller-supplied boolean. A
// SIMULATED/SPEC capability therefore cannot render green. Proven in registry.test.ts.
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

// Membership set built once from the exported census. Reading this — rather than
// re-listing entities — is what makes liveness impossible to drift from wiring.
const WIRED = new Set<string>(WIRED_COMMAND_TARGETS);

/** Every registered capability (stable insertion order). */
export const ALL_CAPABILITIES = Object.keys(CAPABILITY_BACKING) as Capability[];

/** The capability→backing map, exposed read-only (drift-proof test reads it). */
export const capabilityBacking: Readonly<Record<Capability, string | null>> =
  CAPABILITY_BACKING;

/**
 * The liveness tier of a capability — DERIVED from the wiring census. LIVE iff
 * its backing entity actually dispatches through a wired CommandTarget.
 */
export function liveness(capability: Capability): Tier {
  const backing = CAPABILITY_BACKING[capability];
  return backing !== null && WIRED.has(backing) ? 'LIVE' : 'SIMULATED';
}

/**
 * The ONE green predicate every honest-render marker reads. Structurally, green
 * is reachable only through a LIVE tier — a SIMULATED/SPEC capability can never
 * return true, so a marker can never claim live data a capability lacks.
 */
export function isLive(capability: Capability): boolean {
  return liveness(capability) === 'LIVE';
}

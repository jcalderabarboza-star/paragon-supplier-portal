// ────────────────────────────────────────────────────────────────────────────
// A shipment's DELAY, COMPUTED (law 0.5) — the last `stored-in-fixtures`
// display state in the tree.
//
// `'Delayed'` was a member of `ShipmentStatus` and of nothing else: the flow
// declares eight states and `Delayed` was never among them. `shipment.flow.ts`
// has said so since F0.4 in its own header — *"`Delayed` (ETA < clock) is a
// read-time PROJECTION (law 0.5, census G1), NOT a transition-state — it is
// deliberately absent from `states`"* — so the union carried a ninth member the
// machine could not reach. That is `supplierDocument`'s latent exclusion in a
// second entity, and this module closes it.
//
// ── ⚠️ WHAT THE STORED LITERAL WAS COSTING, MEASURED NOT ASSUMED ────────────
//   `BuyerShipments` asks `nextActFor('shipment', <status>)` and its comment
//   read: *"a delayed shipment resolves `silent` and this line renders nothing
//   for it. That silence is honest — the machine has no edge to report."*
//   **The second sentence was false.** Derived over every state:
//
//     nextActFor('shipment', 'Delayed')           -> silent / no-exit
//     nextActFor('shipment', 'Customs Clearance') -> external, owners:['tms']
//
//   The machine HAS an edge from the shipment's real state. It could not be
//   asked, because the cursor held a display literal instead of a state — the
//   exact shape that stopped a renewal verb reaching `doc-001` at #325. The
//   silence was not honesty; it was the exclusion, wearing honesty's clothes.
//
// ── THE RULE, AND WHY IT IS NOT `isPast` ────────────────────────────────────
//   A shipment is delayed when it has NOT ARRIVED and its ETA has PASSED:
//
//     no `actualArrival`  AND  daysUntil(estimatedArrival, now) < 0
//
//   ⚠️ **`< 0`, AND THE ZERO BOUNDARY IS NOT RE-RULED HERE — IT IS READ.**
//   `dayProjection.ts` decides it once and records that `days <= 0` is the
//   MINORITY convention, 1 of 3: `documentExpiry` takes `<= 0`, while
//   `computeStatus` (compliance) and `isOverdue` (invoice) both take `< 0`.
//   That file also states why the other two are not converted — *"each
//   conversion CHANGES WHAT A LIVE SURFACE SAYS"* — and this lane is that case
//   exactly, with a row to name:
//
//     shp-006  stored 'In Transit'  ETA == DECLARED_PRESENT  daysUntil = 0
//
//   Under `<= 0` a shipment whose ETA is TODAY is already late, and shp-006 —
//   which the fixture says is in transit, on time — would be convicted. So this
//   lane joins the majority. **The boundary row and this ruling are the same
//   fact seen twice**, and shp-006 is pinned as a named control in the spec so
//   the day someone "unifies" the conventions, it goes red rather than quiet.
//
// ── AND WHY ARRIVAL ACQUITS, WHICH IS THE OTHER HALF OF THE RULING ──────────
//   `Delayed` is a TRANSIT state, not a terminal verdict on punctuality. The
//   naive rule — `actualArrival > estimatedArrival` — convicts `shp-017`, which
//   arrived one day after its ETA and is stored `Delivered`. A shipment that has
//   ARRIVED is not delayed; it is delivered, late. Lateness after the fact is a
//   performance fact and belongs to a scorecard, not to a transit badge.
//
// ── WHAT IS DELIBERATELY NOT COMPUTED HERE ──────────────────────────────────
//   `delayDays` and `daysInTransit` remain STORED (`dayCounts.ts` registers both
//   as `stored-in-fixtures`, 2 of its 4 such rows). `delayDays` is rendered at
//   three sites in `BuyerShipments`. Computing the STATE while leaving the COUNT
//   stored is a real divergence and it is FILED, not fixed: the count is a
//   second ruling (it is `−daysUntil` only while nothing has arrived) and this
//   batch was scoped to the state. Named rather than left for a reader to find.
// ────────────────────────────────────────────────────────────────────────────

import type { Shipment, ShipmentStatus } from '../../data/mockShipments';
import { daysUntil } from './dayProjection';

/**
 * What a reader sees on a shipment row: the stored flow state, or `'Delayed'`
 * when the clock overrides it.
 *
 * ⚠️ **TITLE CASE, UNLIKE `DocumentDisplayState`, AND THE DIFFERENCE IS
 * REASONED.** That union lowercases because its display vocabulary is entirely
 * distinct from the stored one, so a call site could otherwise confuse them.
 * Here the display vocabulary IS the stored vocabulary plus one member, so
 * lowercasing would rename eight rendered labels — and ripple through
 * `statusLabel`/`statusTone`, which are shared with every other entity — to buy
 * a distinction the extra member already makes.
 */
export type ShipmentDisplayState = ShipmentStatus | 'Delayed';

/** The fields the rule reads. Narrow on purpose: nothing else can influence it. */
export type ShipmentDelayInput = Pick<
  Shipment,
  'status' | 'estimatedArrival' | 'actualArrival'
>;

/**
 * A shipment's display state, COMPUTED (law 0.5).
 *
 * The instant is an ARGUMENT and never a clock read — the same discipline as
 * `documentDisplayState`, `effectiveEnforcement` and `verifyHalalAtReceipt`.
 * `BuyerShipments` hands it `TODAY` (`DECLARED_PRESENT`), which is why the
 * page renders identically at horizons nine hundred days apart.
 */
export function shipmentDisplayState(
  s: ShipmentDelayInput,
  nowIso: string,
): ShipmentDisplayState {
  if (s.actualArrival) return s.status;
  const days = daysUntil(s.estimatedArrival, nowIso);
  // `daysUntil` returns null for an absent or unparseable date. A shipment with
  // no readable ETA is not late — it is un-forecast, and inventing a verdict
  // there would be the clock answering a question the data never asked.
  if (days === null) return s.status;
  // ⚠️ AN EXPLICIT `return 'Delayed'`, NOT A TERNARY, AND THAT IS DELIBERATE.
  // `projectionGate`'s write matcher recognises `status: 'X'`, `return 'X'` and
  // `= 'X'`; a ternary returning the literal is none of those, so the gate would
  // read this module as producing nothing and re-classify the state
  // `produced-by-nothing`. Measured, not guessed — it did exactly that on the
  // first draft. The gate defines what a write LOOKS like, so a producer writes
  // in that shape rather than the gate widening to chase it.
  if (days < 0) return 'Delayed';
  return s.status;
}

/** Is this row delayed at `nowIso`? The predicate, for counts and filters. */
export function isDelayed(s: ShipmentDelayInput, nowIso: string): boolean {
  return shipmentDisplayState(s, nowIso) === 'Delayed';
}

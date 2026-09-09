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
// ── ⚠️ THE COUNTS NOW COME FROM HERE TOO, AND THE PARAGRAPH THAT DEFERRED ──
// ── THEM IS QUOTED RATHER THAN DELETED, BECAUSE ITS CLAIM WAS OVERSTATED ───
//   It read:
//
//     > `delayDays` and `daysInTransit` remain STORED (`dayCounts.ts` registers
//     > both as `stored-in-fixtures`, 2 of its 4 such rows). `delayDays` is
//     > rendered at three sites in `BuyerShipments`. Computing the STATE while
//     > leaving the COUNT stored is a real divergence and it is FILED, not
//     > fixed.
//
//   ⚠️ **"A REAL DIVERGENCE" WAS FALSE AT THE RENDERED INSTANT, AND MEASURING
//   IT IS WHAT DISSOLVED THE FINDING.** `BuyerShipments` pins `TODAY =
//   DECLARED_PRESENT` (`:59`), so the state and the stored number were never
//   read from different clocks. Derived over the corpus: the ONE row carrying
//   `delayDays` stored **6** and the classifier computed **6** at the same
//   instant. They agreed. The defect was not a wrong number on screen — it was
//   that the agreement was a COINCIDENCE OF THE ANCHOR rather than a property,
//   and nothing would have said so if it stopped.
//
//   So these are computed for the reason #318 gave and not for the one this
//   batch was dispatched with: **a stored value must not be a function of the
//   read instant.** Both were. `daysUntilExpiry` and `daysLeft` were retired on
//   that rule and these two were left behind because computing them then would
//   have published FIXTURE AGE as lateness — *"a shipment in transit 116
//   days"*. ⚠️ **THAT REASONING DIED AT #319/#320, NOT HERE:** once the family
//   was anchored, `shiftFields` re-times every date to the declared present, so
//   the computed values ARE the authored ones. Measured before building — 16 of
//   16 rows reproduce their stored literal exactly at `DECLARED_PRESENT`.
//
//   ⚠️ **AND HALF THAT AGREEMENT IS CIRCULAR — SAID PLAINLY, BECAUSE THE OTHER
//   HALF IS THE EVIDENCE.** `FAMILY_ANCHORS.shipment.why` names *"the retired
//   `daysInTransit` back-solve"* as one of the four instruments that CHOSE
//   2026-05-20, so the five IN-FLIGHT rows agreeing is guaranteed by
//   construction and proves nothing. What is independent: the ten ARRIVED rows
//   match `actualArrival − shipDate`, a difference between two stored dates and
//   therefore invariant under ANY shift (10 of 10); and `delayDays` is not
//   named in that `why` at all, so `shp-018` agreeing is one genuinely
//   independent confirmation of the anchor. Stated as one row, not as a set.
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

/**
 * How many days LATE, at `nowIso` — `null` when the shipment is not `Delayed`.
 *
 * ⚠️ **IT LIVES BESIDE THE CLASSIFIER SO THE STATE AND ITS NUMBER CANNOT
 * DISAGREE.** They are the same comparison read two ways: `Delayed` is the
 * SIGN of `daysUntil(estimatedArrival, now)` and this is its MAGNITUDE. Putting
 * the count in another module would let one move without the other, which is
 * the shape this batch exists to remove — the page used to hold two independent
 * answers to *is this shipment late?* and they agreed only because exactly one
 * row of eighteen carried the stored field.
 */
export function daysLate(s: ShipmentDelayInput, nowIso: string): number | null {
  if (!isDelayed(s, nowIso)) return null;
  // Non-null by construction: `isDelayed` is true only when `daysUntil`
  // returned a number, so this re-read cannot be `null`. Asserted rather than
  // defaulted — a `?? 0` here would invent a zero for an unreadable date.
  return -(daysUntil(s.estimatedArrival, nowIso) as number);
}

/** The fields the transit count reads. */
export type ShipmentTransitInput = Pick<Shipment, 'shipDate' | 'actualArrival'>;

/**
 * Days in transit at `nowIso`.
 *
 * ⚠️ **ONE MEANING — ELAPSED TRANSIT — WITH THE ENDPOINT CHOSEN HERE.** Arrival
 * if it happened, `now` if it has not. The "two meanings" this comment used to
 * claim was the STORED field's problem, not the computation's: for ten rows the
 * literal was a closed fact and for five it was a frozen clock read, and one
 * `number` could not say which. One classifier with one clock dissolves that —
 * `documentExpiry`'s shape. What survives as a real property, and is asserted:
 * an ARRIVED row's value is a difference between two STORED dates, so it does
 * not move at any horizon; an in-flight row's does.
 *
 * ⚠️ **`null` BEFORE DEPARTURE, AND THIS IS A REGRESSION THIS FUNCTION SHIPPED
 * AT #331 RATHER THAN A REFINEMENT.** Three rows (`shp-001` · `shp-002` ·
 * `shp-003`) have a `shipDate` in the FUTURE at the declared present — they are
 * `Pending ASN` and have not departed. The first version returned the negative
 * elapsed value, and `BuyerShipments`' timeline guards on TRUTHINESS
 * (`transitDays ? …`), for which `-2` qualifies. **Browser-verified before the
 * fix: the panel rendered `-2 hari`** where the stored field had rendered
 * nothing, because `undefined` is falsy and a negative number is not.
 *
 * **A shipment that has not shipped has not been in transit — that is `null`,
 * not a negative count**, and `null` is also the honest answer for an arrival
 * that precedes its own ship date. The guard is the SIGN rather than a
 * status-word so it cannot drift from the dates it reads.
 */
export function daysInTransit(
  s: ShipmentTransitInput,
  nowIso: string,
): number | null {
  const end = s.actualArrival ?? nowIso;
  const d = daysUntil(s.shipDate, end);
  if (d === null) return null;
  // `0 - d`, NOT `-d`: negating a zero yields `-0`, which `Object.is` and
  // therefore `toBe` treat as distinct from `0`. A day count that is sometimes
  // negative zero is a value nobody would think to assert against, and it was
  // caught by the departure-day probe below rather than by review.
  const elapsed = 0 - d;
  // Not yet departed (or an arrival before its own ship date). No transit to
  // count, and inventing a negative one is the clock answering a question the
  // data never asked — `shipmentDisplayState`'s own rule, one function up.
  if (elapsed < 0) return null;
  return elapsed;
}

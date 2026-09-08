// ─────────────────────────────────────────────────────────────────────────────
// THE DISPLAY STATES — states a surface renders that NO FLOW KNOWS, grouped by
// what actually produces them.
//
// ── ⚠️ THE CLAIM THIS REPLACES, AND WHY THE LABEL WAS THE DEFECT ────────────
//   `PROJECTIONS_EXCLUDED` asserted, verbatim:
//
//       expect(flow.states).not.toContain(projected);
//       for (const t of flow.transitions) expect(t.to).not.toBe(projected);
//
//   That is **"no flow knows this state"**, and it is TRUE of every member —
//   measured, both halves. What was false was the NAME and the comment above it
//   (*"Clock-derived values…"*): only the `computed-at-read` rows below are
//   clock-derived. The rest are written by a fixture, and one is written by
//   nothing at all. **No tally is written here** (`FLOOR-IN-PROSE-01`) — the
//   groups ARE the count and the gate re-derives them every run.
//
//   **A true assertion under a false label is the worst shape available**, because
//   the test goes green and the label is what the next reader believes. Nothing
//   in the suite could distinguish a state computed at read from one hand-stamped
//   into a fixture, so four defects sat inside a passing gate for as long as the
//   constant existed.
//
// ── THE GROUPS ARE CLAIMS WITH MECHANICAL OBLIGATIONS ───────────────────────
//   Each row states WHY it is where it is, and `projectionGate.test.ts` checks
//   that reason against the tree rather than reading it. A row whose premise
//   changes moves group BY DERIVATION and the gate goes red — nobody has to
//   remember. The bilateral shape is `allowlist.ts`'s: declared == derived as
//   SETS, so a member that quietly stops qualifying is as red as one that
//   quietly starts.
//
//     `computed-at-read`     a NON-fixture producer exists AND takes an injected
//                            `now`. Must name `producer`. Law 0.5 honoured: the
//                            value is derived at read and never stored.
//     `stored-in-fixtures`   ≥1 fixture write, ZERO non-fixture writes. Nothing
//                            computes it; the fixture asserts it. This is a DATA
//                            DEFECT held honestly, not a design.
//     `produced-by-nothing`  ZERO writes anywhere. Not stored and not computed —
//                            a union member nothing produces. It gets its own
//                            group because "stored" is a claim it does not meet
//                            either, and folding it in would launder that.
//
// ── ⚠️ `noCommandTarget` IS A STRONGER STATEMENT AND IS TRACKED SEPARATELY ──
//   Several of these entities have no `CommandTarget` at all, so nothing CAN
//   write their states even in principle — a sharper fact than "nothing does".
//   ⚠️ The sentence here first said "three", and adding the flag to `compliance`
//   made it four the same hour — which is why it now names no figure: the
//   `noCommandTarget` rows ARE the set, and the gate pins each one against
//   `WIRED_COMMAND_TARGETS` in both directions. It is a
//   separate flag rather than a fourth group because it is a property of the
//   ENTITY, not of the state: `supplierDocument` IS wired and still produces
//   `Expiring Soon` from nowhere, which is the case a per-entity grouping would
//   have hidden. The gate asserts the flag against `WIRED_COMMAND_TARGETS`, so
//   wiring an entity reddens the claim rather than silently outdating it.
//
//   **No count is written here** (`FLOOR-IN-PROSE-01`) — `DISPLAY_STATES` is the
//   population and the gate re-derives every figure at read time.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducedBy } from './derive';

export interface DisplayStateRow {
  readonly entity: string;
  readonly state: string;
  readonly group: ProducedBy;
  /**
   * `computed-at-read` only: the module that produces it. The gate asserts a
   * non-fixture write site exists IN THIS FILE and that the producing function
   * takes an injected `now` — a producer with its own clock would be law 0.5's
   * defect wearing this group's name.
   */
  readonly producer?: string;
  /** The entity has no `CommandTarget`: nothing CAN write this, not merely does not. */
  readonly noCommandTarget?: true;
}

/**
 * ⚠️ **DECLARED. The gate pins this EQUAL to the derivation, both directions.**
 * Adding a row that the tree does not support is as red as omitting one it does.
 */
export const DISPLAY_STATES: readonly DisplayStateRow[] = [
  // ── computed at read, law 0.5 honoured ──────────────────────────────────
  {
    entity: 'compliance',
    state: 'Expiring',
    group: 'computed-at-read',
    producer: 'src/services/data/complianceProjection.ts',
    // Computed at read AND unwritable: `compliance` has no CommandTarget
    // either. The two facts are orthogonal — the flag is about the ENTITY's
    // write path, the group is about where the VALUE comes from.
    noCommandTarget: true,
  },
  {
    entity: 'compliance',
    state: 'Expired',
    group: 'computed-at-read',
    producer: 'src/services/data/complianceProjection.ts',
    // Computed at read AND unwritable: `compliance` has no CommandTarget
    // either. The two facts are orthogonal — the flag is about the ENTITY's
    // write path, the group is about where the VALUE comes from.
    noCommandTarget: true,
  },
  {
    entity: 'invoice',
    state: 'Overdue',
    group: 'computed-at-read',
    producer: 'src/services/data/invoiceProjection.ts',
  },
  // ⚠️ THESE TWO MOVED OUT OF `stored-in-fixtures` — the group did not change
  // its mind, the TREE changed, and the gate re-derived it. They were fixture
  // literals with zero non-fixture writes until `obligationProjection.ts`
  // landed; the row below is what the derivation now returns, and reverting the
  // producer reddens it without anyone editing this file.
  //
  // `noCommandTarget` STAYS, and the pair is the case that makes the flag worth
  // having: nothing can WRITE an obligation (it is in `getKnownFlows()` ∖
  // `WIRED_COMMAND_TARGETS`) and the display state is nonetheless COMPUTED. The
  // precedent is `compliance` directly above — same combination, and the header
  // says why the two facts are orthogonal.
  {
    entity: 'obligation',
    state: 'Upcoming',
    group: 'computed-at-read',
    producer: 'src/services/data/obligationProjection.ts',
    noCommandTarget: true,
  },
  {
    entity: 'obligation',
    state: 'Overdue',
    group: 'computed-at-read',
    producer: 'src/services/data/obligationProjection.ts',
    noCommandTarget: true,
  },

  // ── stored in fixtures — a data defect, held honestly until it is ruled ──
  // ⚠️ **THE THREE THAT REMAIN DO NOT SHARE ONE DISPOSAL, AND THE DIFFERENCES
  // ARE DERIVED FROM THEIR FLOWS RATHER THAN ASSUMED FROM THE GROUP.** Obligation
  // left this group by being computed; these three cannot follow it for three
  // different reasons, each filed separately:
  //
  //   `contract`  a projection is the ONLY disposal available — all four verbs
  //               are `surfaced: false · external-fact · owner: s4hana`, so this
  //               portal will never own the write. BLOCKED ON A BAND RULING:
  //               `matchesGroup` runs an 0..90 day band while the fixtures are
  //               separable only on [22..61], so building on the shipped band
  //               would re-label ctr-005 (83d) and ctr-006 (62d) from Active to
  //               Expiring. `matchesGroup`'s `expired` arm has no computed half
  //               at all. Deferred by ruling, not by cost.
  //   `shipment`  exactly reconstructable and NOT blocked: `no actualArrival AND
  //               daysUntil(estimatedArrival, now) < 0` selects exactly shp-018,
  //               the one row stored `Delayed`. Its acquittal control is shp-017
  //               — arrived a day late, stored `Delivered` — which a naive
  //               `actual > estimated` rule convicts and the data does not.
  //               Verbs are `external-fact · owner: tms`.
  //   `supplierDocument`  its disposal is a DELETION, not a build: the
  //               classifier already exists (`documentExpiry`) and every
  //               consumer already reads it. The literal is the last thing left.
  //
  // §69's `approvalLevel` remedy — admission as authored data — is NOT the
  // remedy for any of the three: that one was ruled because the value was
  // UNCOMPUTABLE, and all three of these are computable. "Nothing writes it" and
  // "nothing can compute it" are different findings.
  { entity: 'contract', state: 'Expiring', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'contract', state: 'Expired', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'shipment', state: 'Delayed', group: 'stored-in-fixtures', noCommandTarget: true },
  // ⚠️ `supplierDocument` IS a wired CommandTarget and still nothing produces
  // this — so the absence of a writer is not explained by the absence of a
  // write path. That is why `noCommandTarget` is a flag and not the group.
  { entity: 'supplierDocument', state: 'Expiring Soon', group: 'stored-in-fixtures' },

  // ── produced by nothing ─────────────────────────────────────────────────
  // ⚠️ **THIS GROUP IS DELIBERATELY EMPTY, AND THE EMPTINESS IS THE RESULT
  // RATHER THAN AN OVERSIGHT.**
  //
  // Its one member was `supplierDocument/Expired`, described here as *"a
  // `SupplierDocumentStatus` member with ZERO write sites: no fixture holds it,
  // no function returns it, no verb reaches it … renderable by the type and
  // unreachable in fact"*. **That description was accurate, and it is why the
  // member is gone rather than why it stayed** — the operator ruled it RETIRED:
  // a union member no code produces is the fabrication shape, and `Expiring
  // Soon` (a warning window) and `Expired` (a terminal fact) were never a pair
  // to compute together. Re-derived at runtime before the cut, because
  // `writeSites` is a grep and its own limit 1 is "a value reached through a
  // variable": 0 of 16 fixture rows carry it, and no transition in
  // `getFlow('supplierDocument')` targets it.
  //
  // ⚠️ **THE GROUP STAYS DECLARED, AND NO GATE MAY REQUIRE IT TO HOLD A
  // MEMBER.** `producedBy` still returns it and the next state to lose its
  // producer belongs here. A guard anchored on the current population would go
  // RED because the tree IMPROVED — the wrong direction for a guard to point —
  // so `projectionGate.test.ts` proves this arm reachable by firing
  // `producedBy` at a SYNTHETIC state with no writes, and pins the declared
  // groups as a SUBSET of the three rather than equal to them.
];

/** The entities this grouping speaks for — derived, never listed. */
export const DISPLAY_STATE_ENTITIES: readonly string[] = [
  ...new Set(DISPLAY_STATES.map((r) => r.entity)),
];

/**
 * The states no flow knows, for one entity — THE ORIGINAL, TRUE CLAIM.
 *
 * This is what `remainingFlows.test.ts` and `compliance.flow.test.ts` consume:
 * their assertion is unchanged and still correct. What changed is that the
 * grouping no longer tells them the states are computed, because seven of them
 * are not. An entity with no display states answers `[]` — `purchaseRequisition`
 * is the deliberate case (all six of its states are real, and the old constant
 * carried that as a comment; here it is simply the absence of a row).
 */
export function displayStatesOf(entity: string): readonly string[] {
  return DISPLAY_STATES.filter((r) => r.entity === entity).map((r) => r.state);
}

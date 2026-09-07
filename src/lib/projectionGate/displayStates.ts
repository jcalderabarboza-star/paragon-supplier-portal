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

  // ── stored in fixtures — a data defect, held honestly until it is ruled ──
  // Their disposal is filed and NOT taken here: either a `contractProjection` /
  // `shipmentProjection` beside the two that exist, or admission as authored
  // data labelled at the surface (§69's `approvalLevel` remedy).
  { entity: 'contract', state: 'Expiring', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'contract', state: 'Expired', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'shipment', state: 'Delayed', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'obligation', state: 'Upcoming', group: 'stored-in-fixtures', noCommandTarget: true },
  { entity: 'obligation', state: 'Overdue', group: 'stored-in-fixtures', noCommandTarget: true },
  // ⚠️ `supplierDocument` IS a wired CommandTarget and still nothing produces
  // this — so the absence of a writer is not explained by the absence of a
  // write path. That is why `noCommandTarget` is a flag and not the group.
  { entity: 'supplierDocument', state: 'Expiring Soon', group: 'stored-in-fixtures' },

  // ── produced by nothing ─────────────────────────────────────────────────
  // A `SupplierDocumentStatus` member with ZERO write sites: no fixture holds
  // it, no function returns it, no verb reaches it. It is renderable by the
  // type and unreachable in fact — which also means the danger-colour collision
  // with `Rejected` is latent rather than live.
  { entity: 'supplierDocument', state: 'Expired', group: 'produced-by-nothing' },
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

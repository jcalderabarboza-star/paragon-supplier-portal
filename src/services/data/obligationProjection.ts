// ────────────────────────────────────────────────────────────────────────────
// Obligation display projection (law 0.5) — the third entity projection, beside
// `complianceProjection` and `invoiceProjection` and following the same shape:
// a pure function of `(row, now)`, no store, no clock of its own.
//
// ── WHAT THIS RETIRES ───────────────────────────────────────────────────────
//   `obligation/Upcoming` and `obligation/Overdue` were `stored-in-fixtures` in
//   `projectionGate/displayStates.ts`: a fixture literal asserting a clock
//   state, with ZERO non-fixture writes. Measured on 2026-09-08, they had gone
//   FALSE against the wall clock — `obl-003a`, `obl-004a` and `obl-010c` resolve
//   to a due date of 2026-09-08 and store `Upcoming`, while the contract card
//   beside them computes `Days until expiry` from the same clock. **A computed
//   day-count and a stored pill, on one card, disagreeing about one instant.**
//
// ── ⚠️ WHY THERE IS NO WINDOW CONSTANT HERE, AND `documentExpiry` HAS ONE ────
//   `documentExpiry` needs `DOCUMENT_EXPIRING_WINDOW_DAYS` because it puts
//   THREE outcomes on one axis and the two cuts are independent. An obligation
//   has TWO, and the cut is the zero boundary itself — so the constant is
//   `isPast`, which is shared rather than invented here. **A window would be
//   inventing a distinction the data does not carry**, and that is measured,
//   not asserted: see the `In Progress` note below.
//
// ── ⚠️ `In Progress` DOES NOT SURVIVE AS A DISPLAY STATE, AND HERE IS THE ────
// ── MEASUREMENT THAT DECIDED IT, PLUS THE ROUTE BACK ────────────────────────
//   The fixture stores 12 `Upcoming` and 7 `In Progress` rows. Asked whether a
//   due-date WINDOW separates them:
//
//     Upcoming    offsets from the anchor:  8 8 8 37 38 38 52 52 69 83 98 100
//     In Progress offsets from the anchor:  1 7 7 22 22 37 42
//
//   They OVERLAP on [8..42] and SHARE the offset 37. The best single threshold
//   over every width and both directions misclassifies **4 of 19**. Every other
//   stored field was then tested as a discriminator — `category`, `owner`,
//   `recurrence`, `contractId`, `completedDate` — and **every one holds values
//   present under both labels**. The only thing that distinguishes an
//   `Upcoming` row from an `In Progress` row is the literal itself.
//
//   `In Progress` is the flow's `initial` MACHINE state (`obligation.flow.ts`:
//   `states: ['In Progress', 'Completed']`), not a display state. Preserving it
//   on a surface needs a stored field recording that work BEGAN, and no such
//   field exists — inventing one is a data change dressed as a predicate. So
//   the seven rows re-label to `Upcoming`.
//
//   ⚠️ **THE ROUTE BACK WAS FALSE WHEN IT WAS WRITTEN. IT IS QUOTED RATHER
//   THAN DELETED, BECAUSE THE RECORD THAT A ROUTE WAS PROMISED AND DID NOT
//   EXIST IS THE FINDING** (`FALSE-MECHANISM-MUST-NOT-BE-FILED-01`, §70 —
//   caught two batches late, which is the cost this rule predicts: nobody
//   re-measures a route back, because a route back is why you stopped). The
//   sentence that stood here read:
//
//     > **THE ROUTE BACK, because a removal without one is a dead end:**
//     > `In Progress` returns the day `obligation` gets a `CommandTarget` and
//     > `t_obligation_track` can fire — at which point the machine state is
//     > written by a verb rather than authored, and a surface can honestly
//     > show the difference between "tracked" and "not yet". That wiring is
//     > FILED, not built here, and it is the half this projection deliberately
//     > does not wait on: both its verbs are `surfaceable: { surfaced: true }`,
//     > which is what makes obligation different from `contract` and
//     > `shipment` (whose verbs are `external-fact`, owned by s4hana and the
//     > TMS — those will never be ours to write, so a projection is the ONLY
//     > disposal available to them).
//
//   **ITS LAST CLAUSE IS STILL TRUE AND IS THE ONLY PART THAT IS.** Both verbs
//   really are `surfaced: true`, and `obligation.flow.ts` really carries no
//   `owner` and no `external-fact`. **Do not restate how many flow files do**
//   — derive it (`grep -rln external-fact flows/`); the first draft of this
//   sentence said *"one of the thirteen"* against a directory holding twenty,
//   which is `FLOOR-IN-PROSE-01` inside the paragraph correcting a false
//   claim. The five that DO declare it are named because the list is the
//   evidence: `advanceShipNotice` · `contract` · `invoice` · `purchaseOrder` ·
//   `shipment`. **What does not follow is the route.**
//
//   ── WHY A `CommandTarget` RESTORES NOTHING, DERIVED ───────────────────────
//   `getFlow('obligation').states` is `['In Progress', 'Completed']` — TWO
//   members — so `In Progress` means *exists and is not completed*: the exact
//   complement of `Completed`, which is what this file already computes and
//   then splits by the clock into `Upcoming` | `Overdue`. Measured over the
//   fixture at `DECLARED_PRESENT`:
//
//     completedDate present   16     -> the machine's `Completed`
//     completedDate absent    24     -> the machine's `In Progress`, ALL of them
//
//   So wiring the target makes **24** rows `In Progress`, not the seven this
//   projection re-labelled. Restoring it as a DISPLAY state would either
//   collapse `Upcoming` and `Overdue` into it — a strict loss of the day-count
//   this file was built to compute — or add a state **no row can exclusively
//   hold**, because every `In Progress` row is also one of the other two.
//
//   ⚠️ **AND THE VERB DOES NOT RECORD THE MISSING FACT.** `t_obligation_track`
//   is `from: [], to: 'In Progress', trigger: 'creation'` — it records that an
//   obligation EXISTS, never that work BEGAN. The stored field named as
//   missing eight lines above is still missing after the wiring, so the target
//   was never what stood between this projection and the distinction.
//
//   **WHAT THE DISTINCTION ACTUALLY NEEDS IS A THIRD STATE** — a `Tracked`
//   that `t_obligation_track` lands in, and a verb somebody fires when work
//   starts. That is a FLOW AMENDMENT with a new transition, a new atom and a
//   surface to fire it; it is not a wiring batch, and naming it as one is how
//   this sentence stayed plausible for two batches. The i18n reads as cheap
//   and is not: `statusLabel.ts` already carries `'In Progress': 'Sedang
//   Berlangsung'` and `statusTone.ts` maps it to `warning`, so the LABEL is
//   free and the MACHINE is the whole cost.
//
//   ── ⚠️ THREE MECHANISMS OFFERED FOR THIS STATE AND MEASURED FALSE, ────────
//   ── RECORDED SO THE NEXT READER DOES NOT RE-DERIVE THEM ───────────────────
//   §70 withholds a measured-false mechanism from being FILED as a finding; it
//   does not withhold the measurement. Each was checked at the site:
//
//     "`t_obligation_track` goes OUT of `In Progress`, never into it"
//        -> `from: []`, `to: 'In Progress'`. It is the state's SOLE producer.
//     "`t_obligation_create` was its only producer; #234 retired it"
//        -> `git log --all -S t_obligation_create` returns NOTHING. The
//           identifier has never existed in any commit. #234 (`662edc7`) is
//           the mutation-counter batch (§52).
//     "`In Progress` is unreachable by construction"
//        -> it is `initial`, with `in=[t_obligation_track]` and
//           `out=[t_obligation_complete]` — the ONE state in this flow holding
//           both edges. Nothing in `obligation` is unreachable.
//
//   ⚠️ **AND THE STATE IS NOT RETIRABLE EVEN IF IT WERE UNREACHABLE.** Retiring
//   it would delete `t_obligation_track` (its only `to`) and leave
//   `t_obligation_complete` with a `from` naming `Upcoming` / `Overdue` —
//   COMPUTED DISPLAY STATES with no `readState` behind them and no store to
//   hold them. The verb is not repairable by narrowing.
//
// ── ⚠️ THE STORED LITERAL IS LEFT IN PLACE, AND IT HAS A JOB ────────────────
//   `documentExpiry`'s precedent exactly. `ContractObligation.status` keeps its
//   authored value and becomes the ORACLE this projection is asserted against:
//   `obligationProjection.test.ts` re-derives all 40 rows from the fixture and
//   requires ZERO misclassifications on the 24 non-completed and the 12
//   `Upcoming`. Deleting the literal would delete the only independent record
//   of what the fixtures MEANT, and the assertion with it.
// ────────────────────────────────────────────────────────────────────────────

import type { ContractObligation } from '../../data/mockObligations';
import { daysUntil, isPast } from './dayProjection';

/**
 * What a reader sees. NOT `ObligationStatus` — that union also carries
 * `In Progress`, which is a machine state and is deliberately unreachable here.
 * A separate type is what makes that unreachability a `tsc` fact rather than a
 * comment.
 */
export type ObligationDisplayState =
  // ⚠️ Split across lines deliberately, matching `ObligationStatus`'s own shape
  // in `mockObligations.ts`. `projectionGate/derive.ts`'s write-site matcher
  // counts `= 'X'` as a write, so a ONE-LINE alias (`… State = 'Upcoming' | …`)
  // would register the TYPE as a producer and the gate would read
  // `computed-at-read` even if this function were deleted. Keeping the union
  // vertical means the only write sites are the `return`s below — the classifier
  // is what the gate sees, which is what it is supposed to be measuring.
  | 'Upcoming'
  | 'Overdue'
  | 'Completed';

/**
 * An obligation's display state, COMPUTED (law 0.5).
 *
 * `Completed` is decided by `completedDate` ALONE and reads no clock — it is a
 * machine fact, and it wins before the clock is consulted at all. Derived from
 * the fixture: 16 of 16 completed rows carry a `completedDate`, 0 of 24
 * non-completed rows carry one, and 0 completed rows have a future due date, so
 * the field and the stored literal agree perfectly and either could decide it.
 * `completedDate` is chosen because it is the FACT and the literal is the claim.
 */
/**
 * Is this obligation COMPLETE? The one site that decides it, for both readers.
 *
 * ⚠️ **EXTRACTED SO THERE IS ONE RULE AND NOT TWO.** `obligationRollup.ts`'s
 * `met` is the count of complete obligations, and a second copy of
 * `Boolean(completedDate)` over there would be a duplicate source -- the exact
 * shape `Contract.obligationsMet` was, one layer up. The rollup calls this, and
 * `obligationRollup.test.ts` asserts the two agree row for row, so a change here
 * cannot move one and leave the other.
 *
 * ⚠️ **IT TAKES NO CLOCK, AND THAT IS THE TYPE MAKING THE CLAIM.** `Completed`
 * is a machine fact -- 16 of 16 completed rows carry a `completedDate`, 0 of 24
 * non-completed rows do -- so a `nowIso` parameter here would suggest a
 * dependency the predicate does not have, and `obligationRollup` would inherit
 * it. See that file's header for why the absence is load-bearing.
 */
export function isObligationComplete(
  obl: Pick<ContractObligation, 'completedDate'>,
): boolean {
  return Boolean(obl.completedDate);
}

export function obligationDisplay(
  obl: Pick<ContractObligation, 'dueDate' | 'completedDate'>,
  nowIso: string,
): ObligationDisplayState {
  // One `if … return` per outcome, the same shape `documentExpiry` uses — and
  // not a ternary, for a second reason worth stating: `projectionGate`'s
  // write-site matcher recognises `return 'X'` and does NOT see a state inside a
  // conditional expression. A ternary here would leave both states reading
  // `stored-in-fixtures` in the gate while this file computed them, which is a
  // true producer hidden from the instrument that exists to find producers.
  if (isObligationComplete(obl)) return 'Completed';
  if (isPast(daysUntil(obl.dueDate, nowIso))) return 'Overdue';
  return 'Upcoming';
}

/**
 * Display RANK, for sorting a list so the thing that needs acting on is first.
 *
 * Keyed on the DISPLAY state, not the stored one. The map it replaces was
 * `Record<ObligationStatus, number>` with `'In Progress': 1` sitting between
 * `Overdue` and `Upcoming` — a rank for a value no reader can now see.
 */
export const OBLIGATION_DISPLAY_RANK: Record<ObligationDisplayState, number> = {
  Overdue: 0,
  Upcoming: 1,
  Completed: 2,
};

/**
 * Display TONE. `Overdue` is `danger` and `Upcoming` is `info`, both unchanged
 * from the map this replaces.
 *
 * ⚠️ `statusTone.ts` independently maps `Upcoming → 'warning'`, and that
 * disagreement PREDATES this batch — the obligation table has always used its
 * own map. It is carried forward unchanged rather than silently reconciled: a
 * tone change is a design ruling and this batch is about a clock.
 */
export const OBLIGATION_DISPLAY_VARIANT: Record<
  ObligationDisplayState,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Upcoming: 'info',
  Overdue: 'danger',
  Completed: 'success',
};

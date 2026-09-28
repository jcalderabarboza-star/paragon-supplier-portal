// ────────────────────────────────────────────────────────────────────────────
// The intake-line READ PROJECTION (A2 / Design 1 B2) — the producer's record,
// the machine's triage, and the four values that follow from them.
//
// ⚠️ **FOUR FIELDS ARE COMPUTED HERE THAT USED TO BE STORED SOMEWHERE, AND
// EVERY ONE OF THEM COULD PREVIOUSLY DISAGREE WITH THE VALUES BESIDE IT.**
//
//   `planState`        was the literal `'PLANNED'` on every fixture row, while
//                      a pushed line's real answer lived in a page's `useState`
//                      — so the seam said PLANNED about a line the store had
//                      already committed, and a reload restored the lie.
//   `producerAdjusted` was `wasAdjusted`, a hand-authored boolean sitting next
//                      to the two quantities that determine it, with nothing
//                      checking they agreed (A1-R2 retired it).
//   `prNumber`         had no stored form yet and was about to acquire one; it
//                      is derived from the requisition that NAMES this line, so
//                      "one line → at most one PR" is checkable at every read
//                      rather than asserted once at the write.
//   `committedQty`     is the stored half — it is the substance of the act and
//                      nothing else determines it.
//
// ⚠️ **AND THE `prNumber` DERIVATION IS DIRECTIONAL ON PURPOSE.** It reads
// `PurchaseRequisition.intakeLineId`, never the reverse. The requisition is the
// thing that was minted, so it is the thing that can name its origin; a line
// naming a requisition that does not name it back is exactly the orphan a
// stored back-reference produces when a cascade half-fails.
// ────────────────────────────────────────────────────────────────────────────

import type {
  IntakeLine,
  IntakePlanState,
  PrIntakeLine,
  PurchaseRequisition,
} from './types';
import type { IntakeLineState } from '../transitions/flows/intakeLine.flow';
import type { IntakeTriageRecord } from './mock/stores/intakeLineStore';

/**
 * The C6 overlay axis, from the machine's state. A commit is the ONLY exit from
 * PLANNED (C6 §3), so every non-`Committed` state — including `Dismissed` — is
 * still PLANNED: setting a line aside decided nothing about the plan, it
 * decided that nobody is acting on it.
 */
export function planStateOf(state: IntakeLineState): IntakePlanState {
  return state === 'Committed' ? 'committed' : 'PLANNED';
}

/**
 * The PRODUCER's own adjustment — shown, never charged to the planner (A1-R2).
 *
 * ⚠️ **THIS IS NOT THE PLANNER'S OVERRIDE AND THE TWO MUST NOT BE CONFLATED.**
 * The planner's is `committedQty !== acceptedQty`, measured against the
 * producer's delivered quantity, and it is what `INTAKE_OVERRIDE_REASONED`
 * gates on. Reading one as the other is the defect this whole batch is about:
 * the drawer demanded a human justify SOMO's arithmetic while Intake Review
 * pushed a third number for the same requirement.
 */
export function producerAdjusted(line: PrIntakeLine): boolean {
  return line.acceptedQty !== line.suggestedQty;
}

/**
 * Project one producer row into the line the seam delivers.
 *
 * `record` absent ⇒ nobody has acted: `Pending`, which is the born state.
 */
export function projectIntakeLine(
  line: PrIntakeLine,
  record: IntakeTriageRecord | undefined,
  requisitions: readonly PurchaseRequisition[],
): IntakeLine {
  const state = record?.state ?? 'Pending';
  // The requisition that NAMES this line. `find` rather than `filter`: the
  // machine makes a second one unreachable (terminal `Committed` + the
  // cascade's replay key), and `intakeCommitIdempotency.test.ts` is where that
  // claim is proven rather than here, where a defensive count would only hide
  // a breach it could not explain.
  const pr = requisitions.find((r) => r.intakeLineId === line.id);
  return {
    ...line,
    state,
    planState: planStateOf(state),
    producerAdjusted: producerAdjusted(line),
    ...(record?.committedQty !== undefined ? { committedQty: record.committedQty } : {}),
    ...(record?.overrideReason !== undefined && record.overrideReason !== ''
      ? { overrideReason: record.overrideReason }
      : {}),
    ...(pr ? { prNumber: pr.prNumber } : {}),
    ...(record?.committedAt !== undefined ? { committedAt: record.committedAt } : {}),
  };
}

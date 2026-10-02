// ────────────────────────────────────────────────────────────────────────────
// intakeReviewModel (A2) — the PURE triage model behind the intake-review
// surface.
//
// ⚠️ **EVERYTHING THIS MODULE USED TO OWN IS NOW THE MACHINE'S, AND THE FILE IS
// SMALLER BY EXACTLY THAT MUCH.** It held `dismissLine` / `restoreLine` as set
// operations over ephemeral client state, and a `triageStatus` that folded a
// page-local push outcome against a page-local dismissed set. All three were
// honest implementations of a design that was wrong: a dismissal is a DECISION,
// not a view preference, and a page that owns the answer is a page whose answer
// disappears on reload and is invisible to the colleague looking at the same
// queue. `t_intake_dismiss` / `t_intake_restore` / `t_intake_commit` own it now,
// and `IntakeLine.state` is where every surface reads it.
//
// What survives is the one thing that was never state: the summary a reviewer
// reads at the top of the queue, which is a partition of the delivered rows.
// ────────────────────────────────────────────────────────────────────────────

import type { IntakeLine } from '../../services/data/types';
import type { IntakeLineState } from '../../services/transitions/flows/intakeLine.flow';
import { parseSomoIntakeLineId } from '../../services/planning/somoIntake';

/**
 * The commit an *Accept as suggested* fires.
 *
 * ⚠️ **THE QUANTITY IS THE PRODUCER'S `acceptedQty`, AND THE CHANGE FROM
 * `suggestedQty` IS THE POINT OF THE RULING** (A1-R2, C6 §8.3 Amendment 1).
 * This surface used to push `suggestedQty` while the Plan Grid drawer pre-filled
 * `acceptedQty` and demanded a justification for the gap — one requirement, two
 * quantities, and the path that looked more governed was the one making a human
 * account for an act the PRODUCER committed. Both now push the same number, and
 * neither owes a reason for it.
 *
 * ⚠️ **`acceptedQtyRaw` IS THE CANONICAL DIGITS, NOT THE DISPLAY GROUPING.**
 * `INTAKE_QTY_AGREES` re-parses it and refuses unless it lands exactly on the
 * number; `'4.500'` is precisely the token the parser cannot read without a
 * convention, so sending the grouped form would make this surface refuse its
 * own untouched default.
 *
 * ⚠️ **AND THERE IS NO `overrideReason`, STRUCTURALLY.** Accept-as-delivered
 * overrides nothing, so it carries no reason and the cascade carries no
 * `decision` — which is what makes `wasAdjusted` derive as *absent* rather than
 * as `false`.
 */
export interface AcceptCommit {
  readonly lineId: string;
  readonly acceptedQty: number;
  readonly acceptedQtyRaw: string;
}

export function buildAcceptCommit(line: IntakeLine): AcceptCommit {
  return {
    lineId: line.id,
    acceptedQty: line.acceptedQty,
    acceptedQtyRaw: String(line.acceptedQty),
  };
}

export interface TriageCounts {
  readonly total: number;
  readonly pending: number;
  readonly committed: number;
  readonly dismissed: number;
}

/**
 * The review-queue summary — a full partition of the inbound set, keyed on the
 * MACHINE's state rather than on anything this page remembers.
 *
 * ⚠️ **IT IS A PARTITION, AND `INTAKE_LINE_STATES` IS WHAT KEEPS IT ONE.** The
 * counter is built from the state union, so a fourth state added to the flow
 * lands in no bucket and `intakeReviewModel.test.ts` says which — where a
 * hand-written `if/else if/else` would silently fold it into the last branch.
 */
export function triageCounts(lines: readonly IntakeLine[]): TriageCounts {
  const byState: Record<IntakeLineState, number> = {
    Pending: 0,
    Dismissed: 0,
    Committed: 0,
  };
  for (const line of lines) byState[line.state] += 1;
  return {
    total: lines.length,
    pending: byState.Pending,
    committed: byState.Committed,
    dismissed: byState.Dismissed,
  };
}

// ── PLN-3 · the queue as a VIEW of the grid (Design 1 D8) ───────────────────
//
// Intake Review was a page over four authored lines while the grid committed
// generated SOMO lines it never listed — one requirement set, two surfaces, two
// answers (R-PLN P0 #6). The page is retired into the grid's `intake-review`
// view, which reads every line the producers emitted, so the queue is now
// thousands of rows: it opens on the pending ones (`defaultFilter:
// 'pendingIntake'`) and a planner narrows it by state and by text.

/** Which lines the intake view shows: one state, or every line. */
export type IntakeStateFilter = IntakeLineState | 'all';

/** The intake view's opening filter — the pending queue, as the view registry says. */
export const DEFAULT_INTAKE_STATE_FILTER: IntakeStateFilter = 'Pending';

/**
 * The material code a line names, when it names one. A generated SOMO line's id
 * carries it (`pil-somo-<code>@<bucket>`); an authored line carries a display
 * label only (C7 §6.1, GG-4), so it names none.
 */
export function intakeLineCode(line: Pick<IntakeLine, 'id'>): string | null {
  return parseSomoIntakeLineId(line.id)?.materialCode ?? null;
}

/**
 * The lines the intake view shows: those in the chosen state, whose material,
 * code, period or id contains the search text (case-insensitive). An empty
 * search narrows nothing.
 */
export function filterIntakeLines<L extends IntakeLine>(
  lines: readonly L[],
  filter: { readonly state: IntakeStateFilter; readonly query: string },
): readonly L[] {
  const q = filter.query.trim().toLowerCase();
  return lines.filter((line) => {
    if (filter.state !== 'all' && line.state !== filter.state) return false;
    if (q === '') return true;
    const hay = [line.material, intakeLineCode(line) ?? '', line.periodBucket, line.id].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

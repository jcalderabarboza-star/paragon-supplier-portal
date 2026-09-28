// ────────────────────────────────────────────────────────────────────────────
// intakeReviewModel (A2) — the PURE model behind the review surface, headless.
//
// ⚠️ **MOST OF WHAT THIS FILE USED TO PROVE IS NO LONGER TRUE, AND THAT IS THE
// BATCH RATHER THAN A REGRESSION.** It asserted, correctly, that:
//
//   · *"accept-as-suggested pushes THE SUGGESTION — a producer-recorded
//     `acceptedQty` is not silently committed by a triage accept"*, and
//   · *"dismiss is EPHEMERAL — a pure set operation on client state that never
//     touches a line, a payload, or the seam."*
//
// Both were faithful descriptions of a design ruled wrong. The first is exactly
// the defect A1-R2 names: one requirement, two quantities, with this surface
// pushing 5,000 while the drawer pre-filled 4,500 and demanded a justification
// for the gap. The second is F2: a decision held in `useState`, invisible to
// the next seat and gone on reload.
//
// So the specs are DELETED rather than loosened, and the floor follows them
// down. What replaces them asserts the opposite of the first (accept commits
// the DELIVERED quantity) and relocates the second: the triage is a machine
// state, proven against the machine in `intakeMachine.test.ts` and against the
// store in `intakeLineStore.test.ts`, because a set operation is not where it
// lives any more.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import { projectIntakeLine } from '../../services/data/intakeLineProjection';
import { INTAKE_LINE_STATES } from '../../services/transitions/flows/intakeLine.flow';
import type { IntakeLine } from '../../services/data/types';
import { buildAcceptCommit, triageCounts } from './intakeReviewModel';

/** Project a producer row at a chosen triage state — no store, no dispatcher. */
const at = (id: string, state: IntakeLine['state']): IntakeLine =>
  projectIntakeLine(
    PR_INTAKE_LINES.find((l) => l.id === id)!,
    state === 'Committed'
      ? { lineId: id, state, committedQty: 1, committedAt: '2026-09-28T00:00:00.000Z' }
      : { lineId: id, state },
    [],
  );

// NAMED MEMBERS reached through VALUES, not through ids alone: this file's
// claims are about quantities, so a corpus re-anchor that keeps the ids and
// changes the numbers must redden it (`DATA-POPULATION-INSTRUMENT-SURVIVES-
// ITS-CORPUS-01`).
const AS_DELIVERED = PR_INTAKE_LINES.find((l) => l.acceptedQty === l.suggestedQty)!;
const PRODUCER_TRIMMED = PR_INTAKE_LINES.find((l) => l.id === 'pil-somo-002')!;

describe('buildAcceptCommit — Accept commits the PRODUCER’s delivered quantity (A1-R2)', () => {
  it('pins the producer-trimmed specimen, so the reversal is measured not asserted', () => {
    // The row the ruling is about: 5,000 suggested, 4,500 delivered.
    expect([PRODUCER_TRIMMED.suggestedQty, PRODUCER_TRIMMED.acceptedQty]).toEqual([5_000, 4_500]);
  });

  it('commits the DELIVERED quantity — the exact inverse of what it used to push', () => {
    const line = projectIntakeLine(PRODUCER_TRIMMED, undefined, []);
    expect(buildAcceptCommit(line).acceptedQty).toBe(4_500);
    // The old behaviour, named so a regression is caught rather than re-argued.
    expect(buildAcceptCommit(line).acceptedQty).not.toBe(PRODUCER_TRIMMED.suggestedQty);
  });

  it('and is unchanged on a line the producer did not adjust (the two coincide)', () => {
    const line = projectIntakeLine(AS_DELIVERED, undefined, []);
    expect(buildAcceptCommit(line).acceptedQty).toBe(AS_DELIVERED.suggestedQty);
    expect(buildAcceptCommit(line).acceptedQty).toBe(AS_DELIVERED.acceptedQty);
  });

  it('carries NO overrideReason, structurally — accept-as-delivered overrides nothing', () => {
    for (const row of PR_INTAKE_LINES) {
      const commit = buildAcceptCommit(projectIntakeLine(row, undefined, []));
      expect('overrideReason' in commit).toBe(false);
    }
  });

  // ⚠️ **CANONICAL DIGITS, NOT THE DISPLAY GROUPING.** `INTAKE_QTY_AGREES`
  // re-parses this token and refuses unless it lands exactly on the number, and
  // `'4.500'` is precisely the form the parser cannot read without a convention
  // — so sending the grouped string would make Accept refuse its own default.
  it('sends the raw token as canonical digits that re-parse to the number', () => {
    const commit = buildAcceptCommit(projectIntakeLine(PRODUCER_TRIMMED, undefined, []));
    expect(commit.acceptedQtyRaw).toBe('4500');
    expect(Number(commit.acceptedQtyRaw)).toBe(commit.acceptedQty);
  });
});

describe('triageCounts — the review-queue summary, from the MACHINE’s state', () => {
  it('partitions the whole inbound set across pending / committed / dismissed', () => {
    const lines = [
      at('pil-somo-001', 'Committed'),
      at('pil-somo-002', 'Dismissed'),
      at('pil-grid-001', 'Pending'),
      at('pil-grid-002', 'Pending'),
    ];
    const counts = triageCounts(lines);
    expect(counts).toEqual({ total: 4, pending: 2, committed: 1, dismissed: 1 });
    expect(counts.pending + counts.committed + counts.dismissed).toBe(counts.total);
  });

  it('an untriaged set is entirely pending — Pending is the born state', () => {
    const lines = PR_INTAKE_LINES.map((l) => projectIntakeLine(l, undefined, []));
    expect(triageCounts(lines).pending).toBe(PR_INTAKE_LINES.length);
  });

  // ⚠️ **THE PARTITION IS A PROPERTY OF THE STATE UNION, AND THIS IS WHAT
  // KEEPS IT ONE.** A fourth state added to the flow would land in no bucket,
  // and a hand-written if/else would have folded it silently into the last
  // branch instead. The counter is built from the union, so this control is the
  // thing that fires.
  it('every declared state has a bucket — a fourth state reddens this', () => {
    expect([...INTAKE_LINE_STATES].sort()).toEqual(['Committed', 'Dismissed', 'Pending']);
    for (const state of INTAKE_LINE_STATES) {
      const counts = triageCounts([at('pil-somo-001', state)]);
      expect(counts.pending + counts.committed + counts.dismissed).toBe(1);
    }
  });
});

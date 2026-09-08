// ────────────────────────────────────────────────────────────────────────────
// `obligationProjection` — the classifier, held against the AUTHORED literals.
//
// ⚠️ **THE ORACLE IS READ OFF DISK, NOT IMPORTED.** The fixture module applies
// `shiftFields` at load, so `mockObligations` carries RESOLVED dates. What the
// classifier must reproduce is what the fixture AUTHOR meant, and that lives in
// the raw literals — `dueDate` against the family ANCHOR, where `P` cancels
// (`daysUntil(date + (P − A), P) = date − A`). Reading the shifted module and
// evaluating at `P` is the same arithmetic, but it routes the ground truth
// through the very shift the anchor exists to define; §86's rule is that a gate
// must not derive its subject through the code it is probing.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  obligationDisplay,
  OBLIGATION_DISPLAY_RANK,
  OBLIGATION_DISPLAY_VARIANT,
  type ObligationDisplayState,
} from './obligationProjection';
import { isPast, daysUntil } from './dayProjection';
import { FAMILY_ANCHORS } from './fixturePresent';
import { mockObligations } from '../../data/mockObligations';

const MS = 86_400_000;
const dayMs = (v: string) => Date.parse(`${v.slice(0, 10)}T00:00:00.000Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (d: string) => `${d}T00:00:00.000Z`;

/** RAW rows, off disk — upstream of `shiftFields`. */
const raw = (() => {
  // `core.autocrlf` is on: split on /\r?\n/ nowhere needed here because the
  // parser is chunk-based, but the field regexes must not assume a line end.
  const src = readFileSync('src/data/mockObligations.ts', 'utf8');
  const parts = src.split(/id:\s*'(?=obl-)/);
  parts.shift();
  return parts.map((p) => ({
    id: /^([^']+)'/.exec(p)?.[1] ?? '',
    dueDate: /dueDate:\s*'(\d{4}-\d{2}-\d{2})'/.exec(p)?.[1] ?? '',
    status: /status:\s*'([^']*)'/.exec(p)?.[1] ?? '',
    completedDate: /completedDate:\s*'(\d{4}-\d{2}-\d{2})'/.exec(p)?.[1],
  }));
})();

const A = FAMILY_ANCHORS.obligation.anchor;

describe('the population this gate speaks for', () => {
  // ⚠️ EMPTY-INPUT-REPORTS-CLEAN-01 — every assertion below is a `.every` or a
  // filtered count, and all of them pass vacuously over an empty parse. This
  // runs FIRST and asserts MEMBERSHIP, never a bare count.
  it('parses every authored obligation, with both controls', () => {
    expect(raw.length).toBeGreaterThan(30);
    expect(raw.map((r) => r.id)).toContain('obl-003a'); // known-true member
    expect(raw.map((r) => r.id)).not.toContain('obl-999z'); // known-false
    expect(raw.every((r) => r.id && r.dueDate && r.status)).toBe(true);
    // the shifted module and the raw parse describe the SAME rows
    expect(raw.length).toBe(mockObligations.length);
    expect(new Set(raw.map((r) => r.id))).toEqual(
      new Set(mockObligations.map((o) => o.id)),
    );
  });
});

describe('obligationDisplay — zero misclassified against the authored literals', () => {
  const nonCompleted = raw.filter((r) => r.status !== 'Completed');
  const storedUpcoming = raw.filter((r) => r.status === 'Upcoming');
  const storedOverdue = raw.filter((r) => r.status === 'Overdue');
  const storedCompleted = raw.filter((r) => r.status === 'Completed');

  it('the four authored populations are all non-empty', () => {
    // The counts are NOT pinned — the fixture may legitimately grow. What is
    // pinned is that each arm of the classifier has something to classify, so
    // none of the assertions below can pass by having nothing to look at.
    for (const [label, rows] of [
      ['non-completed', nonCompleted],
      ['Upcoming', storedUpcoming],
      ['Overdue', storedOverdue],
      ['Completed', storedCompleted],
    ] as const) {
      expect(rows.length, label).toBeGreaterThan(0);
    }
  });

  it('⚠️ every stored `Overdue` computes Overdue at the anchor — zero misses', () => {
    const missed = storedOverdue.filter(
      (r) => obligationDisplay(r, at(A)) !== 'Overdue',
    );
    expect(missed.map((r) => r.id)).toEqual([]);
  });

  it('⚠️ every stored `Upcoming` computes Upcoming at the anchor — zero misses', () => {
    const missed = storedUpcoming.filter(
      (r) => obligationDisplay(r, at(A)) !== 'Upcoming',
    );
    expect(missed.map((r) => r.id)).toEqual([]);
  });

  it('⚠️ no NON-completed row computes Completed, and every completed row does', () => {
    // The other direction of the same claim: the classifier must not invent a
    // Completed, and must not miss one. Both are checked because a rule that
    // only ever answers Completed would pass the two tests above by vacuity on
    // an empty non-completed set — which is exactly the shape §86 warns about.
    expect(
      nonCompleted.filter((r) => obligationDisplay(r, at(A)) === 'Completed'),
    ).toEqual([]);
    expect(
      storedCompleted.filter((r) => obligationDisplay(r, at(A)) !== 'Completed'),
    ).toEqual([]);
  });

  it('the seven `In Progress` rows re-label to Upcoming — the ruled cost, asserted', () => {
    // Ruling 2: `In Progress` does not survive as a display state. This is the
    // price, named rather than absorbed — and it is an assertion so that a
    // future row authored `In Progress` with a PAST due date shows up here as
    // Overdue rather than silently joining the majority.
    const inProgress = raw.filter((r) => r.status === 'In Progress');
    expect(inProgress.length).toBeGreaterThan(0);
    for (const r of inProgress) {
      expect(obligationDisplay(r, at(A)), r.id).toBe('Upcoming');
    }
  });
});

describe('the zero boundary — `days <= 0` is PAST, and it is read not restated', () => {
  it('a row due EXACTLY at `now` reads Overdue, and one day later reads Upcoming', () => {
    const due = '2026-06-01';
    expect(obligationDisplay({ dueDate: due }, at(due))).toBe('Overdue');
    expect(
      obligationDisplay({ dueDate: due }, at(iso(dayMs(due) - MS))),
    ).toBe('Upcoming');
    // …and the day AFTER the due date is still Overdue — the control that says
    // the boundary is a boundary and not an off-by-one that only fires on one
    // exact day.
    expect(
      obligationDisplay({ dueDate: due }, at(iso(dayMs(due) + MS))),
    ).toBe('Overdue');
  });

  it('`isPast` is the shared statement, and `documentExpiry` agrees with it', () => {
    expect(isPast(0)).toBe(true);
    expect(isPast(1)).toBe(false);
    expect(isPast(-1)).toBe(true);
    expect(isPast(null)).toBe(false);
    // The classifier must not have its own opinion: whatever `isPast` says of
    // the day-count is what the display state says. Checked across the boundary
    // rather than at it, so a re-inlined `< 0` in either place goes red.
    for (const offset of [-2, -1, 0, 1, 2]) {
      const now = at(iso(dayMs('2026-06-01') - offset * MS));
      const days = daysUntil('2026-06-01', now);
      expect(obligationDisplay({ dueDate: '2026-06-01' }, now)).toBe(
        isPast(days) ? 'Overdue' : 'Upcoming',
      );
    }
  });

  it('⚠️ Completed WINS over a past due date — the clock is never consulted', () => {
    // The ruled precedence, and the case a "past due ⇒ Overdue" rule gets wrong.
    const row = { dueDate: '2020-01-01', completedDate: '2020-01-05' };
    expect(isPast(daysUntil(row.dueDate, at('2026-06-01')))).toBe(true);
    expect(obligationDisplay(row, at('2026-06-01'))).toBe('Completed');
    // …and it is `completedDate` that decides, not the due date being old.
    expect(obligationDisplay({ dueDate: '2020-01-01' }, at('2026-06-01'))).toBe(
      'Overdue',
    );
  });

  it('an unparseable due date does not manufacture an alarm', () => {
    // `daysUntil` conflates absent and unparseable by ruling; `isPast(null)` is
    // false, so the answer is Upcoming rather than a fabricated Overdue. The
    // DTO makes this unreachable (`dueDate: string`, and all authored rows
    // parse) — asserted so the choice is recorded, not because input reaches it.
    expect(obligationDisplay({ dueDate: 'not-a-date' }, at('2026-06-01'))).toBe(
      'Upcoming',
    );
  });
});

describe('the display maps are total over the display union', () => {
  it('every display state has a rank and a variant, and nothing else does', () => {
    const states: ObligationDisplayState[] = ['Upcoming', 'Overdue', 'Completed'];
    expect(Object.keys(OBLIGATION_DISPLAY_RANK).sort()).toEqual([...states].sort());
    expect(Object.keys(OBLIGATION_DISPLAY_VARIANT).sort()).toEqual([...states].sort());
    // Overdue sorts first — the row that needs acting on is the one at the top.
    expect(OBLIGATION_DISPLAY_RANK.Overdue).toBeLessThan(
      OBLIGATION_DISPLAY_RANK.Upcoming,
    );
    expect(OBLIGATION_DISPLAY_RANK.Upcoming).toBeLessThan(
      OBLIGATION_DISPLAY_RANK.Completed,
    );
    // `In Progress` is a MACHINE state and must not be reachable here. A key
    // added for it is the shape ruling 2 forbids, so it is asserted absent.
    expect(Object.keys(OBLIGATION_DISPLAY_VARIANT)).not.toContain('In Progress');
  });
});

describe('⚠️ the shifted fixture agrees with the raw parse at `P`', () => {
  it('every resolved row classifies the same as its raw row at the anchor', () => {
    // The bridge between the two representations, asserted rather than assumed:
    // if `shiftFields` ever stopped shifting `dueDate`, or shifted it by the
    // wrong family, this is where it shows — the raw-at-anchor and
    // resolved-at-P answers would diverge.
    const P = iso(
      dayMs(A) +
        Math.round(
          (Date.parse(`${mockObligations[0].dueDate}T00:00:00.000Z`) -
            dayMs(raw[0].dueDate)) /
            MS,
        ) *
          MS,
    );
    const byId = new Map(raw.map((r) => [r.id, r]));
    for (const o of mockObligations) {
      const r = byId.get(o.id)!;
      expect(obligationDisplay(o, at(P)), o.id).toBe(
        obligationDisplay(r, at(A)),
      );
    }
  });
});

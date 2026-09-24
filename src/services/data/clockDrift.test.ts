// ────────────────────────────────────────────────────────────────────────────
// The drift reader, asserted at PINNED instants — never at the wall clock.
//
// This file can never decay: every `today` below is a literal, and every
// reading instant is supplied explicitly. The real-clock evaluation is
// `clockDrift.live.test.ts`, excluded from the default run; the REAL reading
// instants are derived and pinned in `lib/readingInstantGate/readingInstant.
// test.ts`, which is where a claim about how this tree reads belongs.
//
// ⚠️ **RULE 4 — PROBE IT BOTH WAYS.** Every verdict is asserted with a
// known-GOOD input as well as a known-BAD one. A drift guard that only ever
// says FALSE is as useless as one that never does, and the failure mode of an
// instrument nobody has seen ACCEPT is that it gets believed when it fires.
//
// ── ⚠️ WHAT THE REBIND BOUGHT THIS FILE, STATED BECAUSE IT IS A GAIN ────────
//   The version that stood here could not reach `ok` / `warn` / `FALSE`
//   THROUGH `familyDrift` at all. Every family short-circuited on an empty
//   stored-state population, so the arms were probed only through the
//   extracted `driftVerdict`, and its own header said so:
//
//     '`ok` / `warn` / `FALSE` are therefore unreachable from shipped data.'
//
//   The instant is now an INPUT, so the arms are reachable end to end by
//   handing `familyDrift` a `WALL` instant. `driftVerdict`'s direct probes are
//   KEPT unchanged beside them — a rule probed at two levels is not a
//   duplicated assertion, it is the difference between "the rule is right" and
//   "the function applies the rule".
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  familyDrift,
  driftReport,
  falsifiedFamilies,
  unresolvedFamilies,
  formatDriftReport,
  driftVerdict,
  wallReadFamilies,
  waitingFooter,
  reachesVerdict,
  VERDICT_PARTITION,
  type ReadingInstants,
} from './clockDrift';
import { DECLARED_PRESENT, FAMILY_ANCHORS, type FixtureFamily } from './fixturePresent';
import type { FamilyInstant } from '../../lib/readingInstantGate/derive';

const MS = 86_400_000;
const dayMs = (v: string) => Date.parse(`${v}T00:00:00.000Z`);
const plus = (d: string, n: number) =>
  new Date(dayMs(d) + n * MS).toISOString().slice(0, 10);

const FAMILIES = Object.keys(FAMILY_ANCHORS) as FixtureFamily[];

/** Every family at one instant — the shape `driftReport` consumes. */
const all = (i: FamilyInstant): ReadingInstants =>
  Object.fromEntries(FAMILIES.map((f) => [f, i])) as ReadingInstants;

/** A family that really has a window, derived — never named as a literal. */
const WINDOWED = FAMILIES.filter((f) => FAMILY_ANCHORS[f].window !== null);
const UNWINDOWED = FAMILIES.filter((f) => FAMILY_ANCHORS[f].window === null);

describe('the population this module reports on', () => {
  it('POPULATION CONTROL — both shapes exist, so no claim below is vacuous', () => {
    // §42b / EMPTY-INPUT-REPORTS-CLEAN-01. Every test in this file reasons
    // about a windowed family or an unwindowed one; over an empty either they
    // would all pass having examined nothing.
    expect(WINDOWED.length).toBeGreaterThan(0);
    expect(UNWINDOWED.length).toBeGreaterThan(0);
  });

  it('every family appears exactly once in the report', () => {
    const reported = driftReport(DECLARED_PRESENT, all('P')).map((d) => d.family);
    expect([...reported].sort()).toEqual([...FAMILIES].sort());
  });
});

describe('the non-numeric answers are distinct, and each names its own branch', () => {
  it('⚠️ no window wins over EVERY instant — the branch order, probed', () => {
    // The window branch is FIRST. Handing an unwindowed family the instant
    // most likely to unseat it (WALL, the one that produces arithmetic) must
    // still return `no-window-declared`: headroom is a distance to a window
    // edge and there is no edge, whatever clock the family is read at.
    for (const f of UNWINDOWED) {
      for (const i of ['WALL', 'P', 'UNRESOLVED', 'NO-CALL-SITES'] as FamilyInstant[]) {
        const d = familyDrift(f, plus(DECLARED_PRESENT, 900), i);
        expect(d.verdict, `${f} @ ${i}`).toBe('no-window-declared');
        expect(d.headroomDays, `${f} @ ${i}`).toBeNull();
      }
    }
  });

  it('⚠️ a family read at P is `read-at-present` and can NEVER be FALSE', () => {
    // THE CENTRAL CLAIM OF THE REBIND. A family whose labels are computed
    // against DECLARED_PRESENT renders the same thing on every calendar day,
    // so no distance from the wall clock can falsify it. Swept across a wide
    // range in BOTH directions rather than asserted at one date — the old
    // arithmetic produced spurious NEGATIVE headroom for exactly these
    // families (measured: contract −4, obligation −7 on 2026-09-15).
    for (const f of WINDOWED) {
      for (const n of [-1219, -40, -1, 0, 1, 18, 40, 400, 1219]) {
        const d = familyDrift(f, plus(DECLARED_PRESENT, n), 'P');
        expect(d.verdict, `${f} @ P${n}`).toBe('read-at-present');
        expect(d.headroomDays, `${f} @ P${n}`).toBeNull();
        expect(d.verdict, `${f} @ P${n}`).not.toBe('FALSE');
      }
    }
    expect(falsifiedFamilies(plus(DECLARED_PRESENT, 1219), all('P'))).toEqual([]);
  });

  it('a family nothing projects is `not-projected`, not `read-at-present`', () => {
    // Different facts: one says the read happens at P, the other says there is
    // no read. Collapsing them would report a family as deliberately anchored
    // when in truth nothing looks at it.
    const f = WINDOWED[0];
    expect(familyDrift(f, DECLARED_PRESENT, 'NO-CALL-SITES').verdict).toBe(
      'not-projected',
    );
    expect(familyDrift(f, DECLARED_PRESENT, 'P').verdict).toBe('read-at-present');
  });

  it('⚠️ an instant the instrument could not follow is NOT a pass', () => {
    // The direction that matters: `unresolved-instant` must never be reported
    // as one of the safe verdicts. An unclassified read is a read that might
    // be drifting.
    const f = WINDOWED[0];
    const d = familyDrift(f, DECLARED_PRESENT, 'UNRESOLVED');
    expect(d.verdict).toBe('unresolved-instant');
    expect(['ok', 'read-at-present', 'not-projected']).not.toContain(d.verdict);
    expect(unresolvedFamilies(DECLARED_PRESENT, all('UNRESOLVED')).map((x) => x.family))
      .toEqual(WINDOWED);
    // CONTROL, the other direction: over a resolved tree it names nobody.
    expect(unresolvedFamilies(DECLARED_PRESENT, all('P'))).toEqual([]);
  });

  it('the four non-numeric verdicts are pairwise distinct', () => {
    const f = WINDOWED[0];
    const got = [
      familyDrift(UNWINDOWED[0], DECLARED_PRESENT, 'P').verdict,
      familyDrift(f, DECLARED_PRESENT, 'P').verdict,
      familyDrift(f, DECLARED_PRESENT, 'NO-CALL-SITES').verdict,
      familyDrift(f, DECLARED_PRESENT, 'UNRESOLVED').verdict,
    ];
    expect(new Set(got).size).toBe(4);
  });
});

describe('⚠️ a WALL-read family keeps the arithmetic — and the arms are reachable', () => {
  // What the previous version of this file could not do. `familyDrift` is now
  // exercised end to end on every arm, not only through `driftVerdict`.
  const f = WINDOWED[0];
  const tol = FAMILY_ANCHORS[f].toleranceDays;

  it('KNOWN-GOOD FIRST — at P itself a wall-read family is `ok` with headroom', () => {
    const d = familyDrift(f, DECLARED_PRESENT, 'WALL');
    expect(d.verdict).toBe('ok');
    expect(d.headroomDays).not.toBeNull();
    expect(d.headroomDays!).toBeGreaterThanOrEqual(0);
  });

  it('⚠️ far enough out it goes FALSE — and `falsifiedFamilies` names it', () => {
    // Derived, not a literal date: walk forward until the family's own window
    // is left. A hardcoded day would decay the moment an anchor moved.
    let day = 0;
    while (day < 5000 && familyDrift(f, plus(DECLARED_PRESENT, day), 'WALL').verdict !== 'FALSE') day++;
    expect(day, 'a wall-read family must become FALSE at some finite date').toBeLessThan(5000);
    const bad = falsifiedFamilies(plus(DECLARED_PRESENT, day), { ...all('P'), [f]: 'WALL' });
    expect(bad.map((x) => x.family)).toContain(f);
    // …and the SAME family at the SAME date, read at P, is not falsified.
    expect(
      falsifiedFamilies(plus(DECLARED_PRESENT, day), all('P')).map((x) => x.family),
    ).not.toContain(f);
  });

  it('MIXED counts as wall-read — one drifting surface is enough', () => {
    let day = 0;
    while (day < 5000 && familyDrift(f, plus(DECLARED_PRESENT, day), 'WALL').verdict !== 'FALSE') day++;
    expect(familyDrift(f, plus(DECLARED_PRESENT, day), 'MIXED').verdict).toBe('FALSE');
  });

  it('the declared tolerance still decides the warn line', () => {
    if (tol === null) return;
    const over = familyDrift(f, plus(DECLARED_PRESENT, tol + 1), 'WALL');
    expect(['warn', 'FALSE']).toContain(over.verdict);
    const under = familyDrift(f, plus(DECLARED_PRESENT, tol), 'WALL');
    expect(under.verdict).toBe('ok');
  });
});

describe('⚠️ the verdict RULE still has every arm, probed directly', () => {
  it('each arm, at its own boundary', () => {
    // UNCHANGED from before the rebind: `driftVerdict` was not touched, and
    // these are the assertions that say so.
    expect(driftVerdict(5, 3, 7)).toBe('ok'); //   inside tolerance
    expect(driftVerdict(5, 7, 7)).toBe('ok'); //   exactly at it
    expect(driftVerdict(5, 8, 7)).toBe('warn'); // past tolerance, inside window
    expect(driftVerdict(5, -8, 7)).toBe('warn'); // signed, not a magnitude
    expect(driftVerdict(-1, 8, 7)).toBe('FALSE'); // past the window wins
    expect(driftVerdict(0, 8, 7)).toBe('warn'); //  the window boundary is inclusive
    expect(driftVerdict(5, 999, null)).toBe('ok'); // no declared tolerance
    expect(new Set(['ok', 'warn', 'FALSE']).size).toBe(3);
  });

  it('⚠️ the off-centre asymmetry, kept from the family that demonstrated it', () => {
    // `supplierDocument` sat 40 days from its early edge and 41 from its late
    // one, so it warned for exactly one day forwards and none backwards. That
    // asymmetry is a property of the RULE and survives the family.
    const TOL = 40;
    expect(driftVerdict(41 - 40, TOL, TOL)).toBe('ok');
    expect(driftVerdict(41 - 41, TOL + 1, TOL)).toBe('warn');
    expect(driftVerdict(-1, TOL + 2, TOL)).toBe('FALSE');
  });
});

describe('⚠️ the verdict is the one its own inputs entail — derived, never asked', () => {
  it('for every family and every instant, independently derived', () => {
    // §86: the expectation is computed from `FAMILY_ANCHORS` (upstream) and the
    // instant (an INPUT), never by asking `familyDrift`. A predicate that read
    // the module under test would move the population and the assertion
    // together and could not tell a kill from an empty run.
    const seen = new Set<string>();
    for (const i of ['P', 'WALL', 'UNRESOLVED', 'NO-CALL-SITES'] as FamilyInstant[]) {
      for (const d of driftReport(DECLARED_PRESENT, all(i))) {
        const hasWindow = FAMILY_ANCHORS[d.family].window !== null;
        if (!hasWindow) expect(d.verdict, `${d.family}@${i}`).toBe('no-window-declared');
        else if (i === 'UNRESOLVED') expect(d.verdict, `${d.family}@${i}`).toBe('unresolved-instant');
        else if (i === 'NO-CALL-SITES') expect(d.verdict, `${d.family}@${i}`).toBe('not-projected');
        else if (i === 'P') expect(d.verdict, `${d.family}@${i}`).toBe('read-at-present');
        else expect(['ok', 'warn', 'FALSE'], `${d.family}@${i}`).toContain(d.verdict);
        seen.add(d.verdict);
      }
    }
    // Every branch was actually exercised — otherwise the loop asserts a rule
    // nothing met.
    for (const v of ['no-window-declared', 'read-at-present', 'not-projected', 'unresolved-instant', 'ok']) {
      expect(seen, v).toContain(v);
    }
  });
});

describe('what the report says when there is nothing to watch', () => {
  it('⚠️ WAITING, not retired — and it names what it now waits FOR', () => {
    // The old footer waited on a `stored-in-fixtures` display row, which law
    // 0.5 forbids anyone to author — a wait that could never end. The new one
    // waits on a wall-clock read, which a page can acquire in one line.
    const lines = waitingFooter([]);
    expect(lines.join(' ')).toContain('WAITING, not retired');
    expect(lines.join(' ')).toContain('readingInstantGate');
    expect(lines.join(' ')).toContain('new Date()');
    // …and it must NOT still be describing the retired question.
    expect(lines.join(' ')).not.toContain('DISPLAY_STATES');
    expect(lines.join(' ')).not.toContain('stored-in-fixtures');
  });

  it('and says nothing at all while one family is wall-read', () => {
    expect(waitingFooter([WINDOWED[0]])).toEqual([]);
  });

  it('the footer tracks the POPULATION, not the formatter', () => {
    expect(formatDriftReport(DECLARED_PRESENT, all('P'))).toContain('WAITING');
    expect(
      formatDriftReport(DECLARED_PRESENT, { ...all('P'), [WINDOWED[0]]: 'WALL' }),
    ).not.toContain('WAITING');
  });

  it('wallReadFamilies is derived from the instants it is given', () => {
    expect(wallReadFamilies(DECLARED_PRESENT, all('P'))).toEqual([]);
    expect(
      wallReadFamilies(DECLARED_PRESENT, { ...all('P'), [WINDOWED[0]]: 'WALL' }),
    ).toEqual([WINDOWED[0]]);
    // MIXED is in the population too.
    expect(
      wallReadFamilies(DECLARED_PRESENT, { ...all('P'), [WINDOWED[0]]: 'MIXED' }),
    ).toEqual([WINDOWED[0]]);
  });
});

describe('the report a person reads', () => {
  it('names every family, the present it measured against, and the instant', () => {
    const out = formatDriftReport(DECLARED_PRESENT, all('P'));
    expect(out).toContain(DECLARED_PRESENT);
    for (const f of FAMILIES) expect(out).toContain(f);
    expect(out).toContain('reading instant');
    expect(out).toMatch(/read-at-present|no-window-declared/);
  });

  it('⚠️ a FALSE row is legible as such', () => {
    const f = WINDOWED[0];
    let day = 0;
    while (day < 5000 && familyDrift(f, plus(DECLARED_PRESENT, day), 'WALL').verdict !== 'FALSE') day++;
    const out = formatDriftReport(plus(DECLARED_PRESENT, day), { ...all('P'), [f]: 'WALL' });
    expect(out).toContain('FALSE');
    expect(out).toContain('WALL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WHICH ROWS REACHED THE VERDICT RULE — and the tolerance that decided nothing.
//
// ⚠️ **TWO INDEPENDENT DERIVATIONS OF ONE FACT, PINNED TOGETHER.**
// `reachesVerdict` reads the VERDICT; `headroomDays !== null` reads the value
// `familyDrift` only computes on the path that calls `driftVerdict`. They must
// agree on every family at every date — and because they are computed from
// different fields, a change that moves one without the other goes red instead
// of silently re-partitioning the table.
// ─────────────────────────────────────────────────────────────────────────────

describe('the tolerance that decided nothing', () => {
  it('⚠️ the partition covers EVERY verdict — no member may be absent', () => {
    // Exhaustive by type at the declaration; this asserts the same thing over
    // the values, so a member added with a wrong side is caught by ONE of the
    // two. Both sides must be non-empty or the partition is not a partition.
    const members = Object.keys(VERDICT_PARTITION);
    expect(members.length).toBeGreaterThan(4);
    expect(Object.values(VERDICT_PARTITION).some((v) => v)).toBe(true);
    expect(Object.values(VERDICT_PARTITION).some((v) => !v)).toBe(true);
  });

  it('⚠️ agrees with headroomDays on every family, both directions', () => {
    // the live tree — every family read at P
    for (const d of driftReport(DECLARED_PRESENT, all('P'))) {
      expect(reachesVerdict(d)).toBe(d.headroomDays !== null);
    }
    // and a tree where a windowed family IS wall-read, so the other side of
    // the partition is exercised rather than asserted over one case
    const f = WINDOWED[0];
    const wall = driftReport(DECLARED_PRESENT, { ...all('P'), [f]: 'WALL' });
    const row = wall.find((d) => d.family === f)!;
    expect(reachesVerdict(row)).toBe(true);
    expect(row.headroomDays).not.toBeNull();
    for (const d of wall) expect(reachesVerdict(d)).toBe(d.headroomDays !== null);
  });

  it('⚠️ an inert tolerance is parenthesised; a live one is not', () => {
    const f = WINDOWED[0];
    const inert = formatDriftReport(DECLARED_PRESENT, all('P'));
    const tol = FAMILY_ANCHORS[f].toleranceDays;
    expect(tol).not.toBeNull();
    expect(inert).toContain(`(${tol})`);

    const live = formatDriftReport(DECLARED_PRESENT, { ...all('P'), [f]: 'WALL' });
    const liveRow = live.split('\n').find((l) => l.trimStart().startsWith(f))!;
    expect(liveRow).toContain(String(tol));
    expect(liveRow).not.toContain(`(${tol})`);
  });

  it('⚠️ the footer count is DERIVED, not a literal', () => {
    // Today every family is read at P, so the count is 0 — but asserting "0"
    // would pin the tree's current shape, not the arithmetic. Make one family
    // wall-read and the count must MOVE. That is what separates a derived
    // number from a literal that happens to be right (`FLOOR-IN-PROSE-01`).
    const f = WINDOWED[0];
    const n = driftReport(DECLARED_PRESENT, all('P')).length;
    expect(formatDriftReport(DECLARED_PRESENT, all('P'))).toContain(
      `0 of ${n} families reach driftVerdict`,
    );
    expect(
      formatDriftReport(DECLARED_PRESENT, { ...all('P'), [f]: 'WALL' }),
    ).toContain(`1 of ${n} families reach driftVerdict`);
  });
});

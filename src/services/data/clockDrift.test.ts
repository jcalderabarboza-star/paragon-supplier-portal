// ────────────────────────────────────────────────────────────────────────────
// The drift reader, asserted at PINNED instants — never at the wall clock.
//
// This file can never decay: every `today` below is a literal. The real-clock
// evaluation is `clockDrift.live.test.ts`, excluded from the default run.
//
// ⚠️ **RULE 4 — PROBE IT BOTH WAYS.** Every verdict is asserted with a
// known-GOOD input as well as a known-BAD one. A drift guard that only ever
// says FALSE is as useless as one that never does, and the failure mode of an
// instrument nobody has seen ACCEPT is that it gets believed when it fires.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  familyDrift,
  driftReport,
  falsifiedFamilies,
  formatDriftReport,
  driftVerdict,
} from './clockDrift';
import { DECLARED_PRESENT, FAMILY_ANCHORS, type FixtureFamily } from './fixturePresent';
import { DISPLAY_STATES } from '../../lib/projectionGate/displayStates';

const MS = 86_400_000;
const dayMs = (v: string) => Date.parse(`${v}T00:00:00.000Z`);
const plus = (d: string, n: number) =>
  new Date(dayMs(d) + n * MS).toISOString().slice(0, 10);

describe('the population, and the join this module depends on', () => {
  it('every family appears exactly once in the report', () => {
    const families = Object.keys(FAMILY_ANCHORS) as FixtureFamily[];
    expect(families.length).toBeGreaterThan(0);
    const reported = driftReport(DECLARED_PRESENT).map((d) => d.family);
    expect([...reported].sort()).toEqual([...families].sort());
  });

  it('⚠️ the family key and the DISPLAY_STATES entity key are the SAME strings', () => {
    // The join is by identity. If either vocabulary is ever renamed, this
    // module would silently report every family as `computed` — a guard that
    // has quietly stopped looking. Asserted as an INTERSECTION being non-empty
    // rather than as an equality: `compliance` and `invoice` are display-state
    // entities with no fixture family, which is legitimate.
    const families = new Set(Object.keys(FAMILY_ANCHORS));
    const entities = new Set(DISPLAY_STATES.map((r) => r.entity));
    const shared = [...families].filter((f) => entities.has(f));
    expect(shared).toContain('contract');
    expect(shared).toContain('supplierDocument');
    expect(shared.length).toBeGreaterThan(1);
  });
});

describe('the unbound answers are distinct, and each says why', () => {
  it('a family with no coherent window is `no-stored-clock-state`', () => {
    // shipment/goodsReceipt/inventory store no clock-derived state to decay —
    // their anchors are EVIDENCED, not solved for, so `window` is null.
    const d = familyDrift('inventory', plus(DECLARED_PRESENT, 900));
    expect(d.verdict).toBe('no-stored-clock-state');
    expect(d.headroomDays).toBeNull();
    // …even 900 days out. An unbound family cannot be falsified by the clock.
    expect(falsifiedFamilies(plus(DECLARED_PRESENT, 900)).map((x) => x.family))
      .not.toContain('inventory');
  });

  it('⚠️ obligation is `computed` — it LEFT the bound set by being projected', () => {
    // The property this module exists to have: bound-ness is derived from
    // DISPLAY_STATES, so the batch that computed obligation's display states
    // removed it from the drift population with no edit here.
    const d = familyDrift('obligation', plus(DECLARED_PRESENT, 400));
    expect(d.verdict).toBe('computed');
    expect(d.readerVisibleStates).toEqual([]);
    // …and it has a window, which is what separates this from the answer above.
    expect(FAMILY_ANCHORS.obligation.window).not.toBeNull();
  });

  it('the two unbound reasons are not interchangeable', () => {
    expect(familyDrift('inventory', DECLARED_PRESENT).verdict).toBe(
      'no-stored-clock-state',
    );
    expect(familyDrift('obligation', DECLARED_PRESENT).verdict).toBe('computed');
  });
});

describe('a BOUND family — ok, warn and FALSE, each shown at its own instant', () => {
  // `supplierDocument` is the stable probe: it is bound (its `Expiring Soon`
  // literal is still what a reader sees), it has a real window, and its
  // tolerance is wide enough that all three verdicts are reachable without
  // contriving a date.
  const F: FixtureFamily = 'supplierDocument';
  const A = FAMILY_ANCHORS[F].anchor;
  const [LO, HI] = FAMILY_ANCHORS[F].window!;
  const TOL = FAMILY_ANCHORS[F].toleranceDays!;

  it('KNOWN-GOOD FIRST: at `P` itself the family is `ok` with full headroom', () => {
    const d = familyDrift(F, DECLARED_PRESENT);
    expect(d.verdict).toBe('ok');
    expect(d.driftDays).toBe(0);
    expect(d.headroomDays).toBe(TOL); // the anchor sits `tolerance` from its nearer edge
    expect(d.readerVisibleStates.length).toBeGreaterThan(0);
  });

  it('inside the declared tolerance it stays `ok`, in BOTH directions', () => {
    expect(familyDrift(F, plus(DECLARED_PRESENT, TOL)).verdict).toBe('ok');
    expect(familyDrift(F, plus(DECLARED_PRESENT, -TOL)).verdict).toBe('ok');
  });

  it('⚠️ its warn band is ONE-SIDED, because the anchor is not centred', () => {
    // `supplierDocument` does not share its anchor, so `toleranceDays` is the
    // distance to its NEARER edge — 40, the early one — while the late edge is
    // 41 away. So the warn band is exactly ONE day forwards and ZERO days
    // backwards, and the family goes straight from `ok` to `FALSE` in the
    // direction that breaks first.
    //
    // ⚠️ THIS IS THE ASSERTION I EXPECTED TO WRITE AS "the warn band is empty",
    // and the probe said otherwise. Recorded as measured rather than smoothed:
    // an off-centre anchor makes the two directions different, which is the
    // whole reason `toleranceDays` became "the nearer edge" at #320 instead of
    // `round(span / 2)`.
    expect(familyDrift(F, DECLARED_PRESENT).headroomDays).toBe(TOL);
    const lateRoom = (dayMs(HI) - dayMs(A)) / MS;
    const earlyRoom = (dayMs(A) - dayMs(LO)) / MS;
    expect(Math.min(lateRoom, earlyRoom)).toBe(TOL);

    // forwards: one day of warn, then false
    expect(familyDrift(F, plus(DECLARED_PRESENT, TOL)).verdict).toBe('ok');
    expect(familyDrift(F, plus(DECLARED_PRESENT, lateRoom)).verdict).toBe(
      lateRoom > TOL ? 'warn' : 'ok',
    );
    expect(familyDrift(F, plus(DECLARED_PRESENT, lateRoom + 1)).verdict).toBe('FALSE');
    // backwards: the nearer edge, so no warn band at all
    expect(familyDrift(F, plus(DECLARED_PRESENT, -earlyRoom)).verdict).toBe('ok');
    expect(familyDrift(F, plus(DECLARED_PRESENT, -(earlyRoom + 1))).verdict).toBe(
      'FALSE',
    );
  });

  it('⚠️ WHO CAN WARN IS DERIVED — `contract` left the set, `supplierDocument` holds it', () => {
    // This test used to read *"WARN IS REACHABLE, and only on a SHARED anchor
    // — `contract` shows it"*, and probed `contract` directly: it declared 7
    // (measured against the contract ∩ obligation intersection, because the
    // pair holds one anchor) while its own window left 12, and those five days
    // were the warn band. `contract` became `computed` on 2026-09-08 and left
    // the bound population — `clockDrift`'s design working, not a regression:
    // bound-ness is derived upstream from `DISPLAY_STATES`, so a family that
    // gains a projection leaves with nobody editing this file.
    //
    // ⚠️ **AND THE REPLACEMENT I FIRST WROTE CLAIMED `warn` HAD BECOME
    // UNREACHABLE. THE SWEEP SAID OTHERWISE AND IT IS RECORDED AS MEASURED
    // RATHER THAN SMOOTHED.** `supplierDocument` still warns, for the other
    // reason entirely: its anchor is OFF-CENTRE (40 days from the early edge,
    // 41 from the late one), so there is exactly one forward day past its
    // declared tolerance and still inside its window. Two different mechanisms
    // produce a warn band — a shared anchor and an off-centre one — and losing
    // the first did not remove the second.
    //
    // So the membership is SWEPT rather than listed: every family across its
    // own full window, both directions.
    const warners: string[] = [];
    for (const family of Object.keys(FAMILY_ANCHORS) as FixtureFamily[]) {
      const a = FAMILY_ANCHORS[family];
      if (a.window === null || a.toleranceDays === null) continue;
      const span = (dayMs(a.window[1]) - dayMs(a.window[0])) / MS;
      for (let k = -span - 2; k <= span + 2; k += 1) {
        if (familyDrift(family, plus(DECLARED_PRESENT, k)).verdict === 'warn') {
          warners.push(`${family} @ ${k}d`);
        }
      }
    }
    // Exactly one day, on exactly one family — the late edge of the off-centre
    // anchor. `contract` is absent, and its absence is the ruling landing.
    expect(warners).toEqual(['supplierDocument @ 41d']);
    expect(warners.some((w) => w.startsWith('contract'))).toBe(false);
    expect(familyDrift('contract', DECLARED_PRESENT).verdict).toBe('computed');

    // CONTROL, both ways — the sweep is a real instrument: over the same range
    // it also finds `ok` and `FALSE`, so neither the single hit nor the
    // `contract` absence is a loop that never ran.
    const seen = new Set<string>();
    for (const family of Object.keys(FAMILY_ANCHORS) as FixtureFamily[]) {
      const a = FAMILY_ANCHORS[family];
      if (a.window === null) continue;
      const span = (dayMs(a.window[1]) - dayMs(a.window[0])) / MS;
      for (let k = -span - 2; k <= span + 2; k += 1) {
        seen.add(familyDrift(family, plus(DECLARED_PRESENT, k)).verdict);
      }
    }
    expect([...seen].sort()).toEqual(['FALSE', 'computed', 'ok', 'warn']);
  });
  it('⚠️ the verdict RULE still has a warn arm, probed directly', () => {
    // The branch no family can currently reach, measured at the rule instead
    // of through data that cannot exercise it — `EMPTY-INPUT-REPORTS-CLEAN-01`
    // is what an assertion over an unreachable population would be worth.
    expect(driftVerdict(5, 3, 7)).toBe('ok'); //  inside tolerance
    expect(driftVerdict(5, 7, 7)).toBe('ok'); //  exactly at it
    expect(driftVerdict(5, 8, 7)).toBe('warn'); // past tolerance, inside window
    expect(driftVerdict(5, -8, 7)).toBe('warn'); // signed, not a magnitude
    expect(driftVerdict(-1, 8, 7)).toBe('FALSE'); // past the window wins
    expect(driftVerdict(5, 999, null)).toBe('ok'); // no declared tolerance
  });
  it('⚠️ past its OWN window it is FALSE — a reader is seeing a wrong state', () => {
    // The late edge: the origin `anchor + drift` leaves the window.
    const overLate = plus(DECLARED_PRESENT, (dayMs(HI) - dayMs(A)) / MS + 1);
    const d = familyDrift(F, overLate);
    expect(d.verdict).toBe('FALSE');
    expect(d.headroomDays).toBeLessThan(0);
    expect(falsifiedFamilies(overLate).map((x) => x.family)).toContain(F);
    // …and the day BEFORE that is not FALSE. The boundary is a boundary.
    const lastGood = plus(DECLARED_PRESENT, (dayMs(HI) - dayMs(A)) / MS);
    expect(familyDrift(F, lastGood).verdict).not.toBe('FALSE');
    expect(falsifiedFamilies(lastGood).map((x) => x.family)).not.toContain(F);
  });

  it('the EARLY edge falsifies too — drift is signed, not a magnitude', () => {
    const overEarly = plus(DECLARED_PRESENT, -((dayMs(A) - dayMs(LO)) / MS + 1));
    expect(familyDrift(F, overEarly).verdict).toBe('FALSE');
    expect(
      familyDrift(F, plus(DECLARED_PRESENT, -((dayMs(A) - dayMs(LO)) / MS)))
        .verdict,
    ).not.toBe('FALSE');
  });
});

describe('`toleranceDays` now has a reader, and the report says so', () => {
  it('the declared tolerance decides the warn line for every bound family', () => {
    for (const d of driftReport(DECLARED_PRESENT)) {
      if (d.verdict === 'no-stored-clock-state' || d.verdict === 'computed') continue;
      expect(d.toleranceDays, d.family).not.toBeNull();
      const over = familyDrift(d.family, plus(DECLARED_PRESENT, d.toleranceDays! + 1));
      expect(['warn', 'FALSE'], d.family).toContain(over.verdict);
    }
  });

  it('formatDriftReport names every family and the present it measured against', () => {
    const out = formatDriftReport(DECLARED_PRESENT);
    expect(out).toContain(DECLARED_PRESENT);
    for (const f of Object.keys(FAMILY_ANCHORS)) expect(out).toContain(f);
    // A report that renders a verdict nobody can read is not a reader.
    expect(out).toMatch(/ok|warn|FALSE|computed|no-stored-clock-state/);
  });
});

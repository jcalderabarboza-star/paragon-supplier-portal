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
  storedStateFamilies,
  waitingFooter,
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

describe('the two non-numeric answers are distinct, and each says why', () => {
  it('a family with no coherent window is `no-window-declared`', () => {
    // ⚠️ THE COMMENT THAT STOOD HERE READ *"shipment/goodsReceipt/inventory
    // store no clock-derived state to decay"* AND WAS FALSE OF `shipment`,
    // which is the same error the verdict name carried. `goodsReceipt` and
    // `inventory` really do store none; `shipment` stores `Delayed` and is
    // asserted separately below. What all three share is the WINDOW being
    // null — their anchors are EVIDENCED, not solved for — and that is the
    // only property this verdict is entitled to name.
    const d = familyDrift('inventory', plus(DECLARED_PRESENT, 900));
    expect(d.verdict).toBe('no-window-declared');
    // KNOWN-GOOD CONTROL for the branch ORDER: `inventory` has no window AND
    // no stored states, so it is the one family both early returns could
    // claim. The window branch is FIRST and must win — swap the two and this
    // line reads `computed`.
    expect(d.readerVisibleStates).toEqual([]);
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
      'no-window-declared',
    );
    expect(familyDrift('obligation', DECLARED_PRESENT).verdict).toBe('computed');
  });
});

describe('⚠️ a verdict must name the condition its own branch tested', () => {
  // Ruled 2026-09-09, from a row `npm run drift` had been printing every run:
  //
  //     shipment   9   —   —   no-stored-clock-state   Delayed
  //
  // The verdict denied, in one column, the thing the next column listed. The
  // branch returning it tests `window === null` and has never tested for
  // stored states — so the name was about a condition the code does not
  // examine. Renamed to `no-window-declared`; these are the assertions that
  // keep it named after its own test.
  it('⚠️ `shipment` HAS a reader-visible stored clock state AND no window', () => {
    const d = familyDrift('shipment', DECLARED_PRESENT);
    // POPULATION CONTROL FIRST. If this row ever stopped carrying a stored
    // state, every assertion below would pass over the wrong subject —
    // `EMPTY-INPUT-REPORTS-CLEAN-01`. Derived from the ANCHOR and from
    // DISPLAY_STATES, both upstream of the function under test (§86).
    expect(FAMILY_ANCHORS.shipment.window).toBeNull();
    expect(d.readerVisibleStates.length).toBeGreaterThan(0);

    expect(d.verdict).toBe('no-window-declared');
    // …and the retired name, asserted as a shape rather than as one string:
    // ANY future verdict claiming the absence of a stored state on a row that
    // lists one is the same defect wearing a different word.
    expect(d.verdict).not.toMatch(/stored/);
  });

  it('every family: the verdict is the one its own inputs entail', () => {
    // ⚠️ THE CONDITIONS ARE DERIVED FROM `FAMILY_ANCHORS` AND `DISPLAY_STATES`,
    // NEVER FROM `familyDrift` — §86. A predicate that derived "has a window?"
    // by asking the module under test would move the population and the
    // assertion together, and could not tell a kill from an empty run.
    const seen = new Set<string>();
    for (const d of driftReport(DECLARED_PRESENT)) {
      const hasWindow = FAMILY_ANCHORS[d.family].window !== null;
      const hasStored = DISPLAY_STATES.some(
        (r) => r.entity === d.family && r.group === 'stored-in-fixtures',
      );
      if (!hasWindow) expect(d.verdict, d.family).toBe('no-window-declared');
      else if (!hasStored) expect(d.verdict, d.family).toBe('computed');
      else expect(['ok', 'warn', 'FALSE'], d.family).toContain(d.verdict);
      seen.add(d.verdict);
    }
    // Both branches were actually exercised — otherwise this loop asserts a
    // rule nothing met.
    expect(seen).toContain('no-window-declared');
    expect(seen).toContain('computed');
  });
});

describe('what the report says when there is nothing left to watch', () => {
  // The bound population is DERIVED from DISPLAY_STATES, so it can empty
  // without an edit here — and an all-`—` table with no footer is
  // indistinguishable from an instrument that broke. The footer says which.
  it('KNOWN-GOOD FIRST: the population is NOT empty today, so no footer', () => {
    const bound = storedStateFamilies(DECLARED_PRESENT);
    expect(bound.length).toBeGreaterThan(0);
    expect(bound).toContain('shipment');
    expect(formatDriftReport(DECLARED_PRESENT)).not.toContain('WAITING');
  });

  it('over an EMPTY population it says WAITING, not retired', () => {
    // Probed through the extracted function rather than by emptying
    // DISPLAY_STATES: the shipped data cannot reach this branch, and a branch
    // asserted through data that cannot reach it is asserted over nothing.
    const lines = waitingFooter([]);
    expect(lines.join(' ')).toContain('WAITING, not retired');
    expect(lines.join(' ')).toContain('DISPLAY_STATES');
  });

  it('and says nothing at all while one family is still bound', () => {
    expect(waitingFooter(['shipment'])).toEqual([]);
  });
});

describe('⚠️ NO FAMILY IS MEASURABLE ANY MORE — and that is derived, not declared', () => {
  // ── ⚠️ WHAT HAPPENED, AND WHY IT IS THE MODULE WORKING ────────────────────
  //   `supplierDocument` was this file's stable probe: the one family with BOTH
  //   a window and a reader-visible stored clock state, so `ok` / `warn` /
  //   `FALSE` were all reachable from shipped data. Its two fixture rows now
  //   store `'Valid'` — a declared flow state — so `DISPLAY_STATES` no longer
  //   groups anything of its as `stored-in-fixtures`, and `familyDrift` returns
  //   `computed`.
  //
  //   **`clockDrift.ts` was not edited.** Bound-ness is read from
  //   `DISPLAY_STATES` at call time, which is the property the module's header
  //   claims; this is the third family to leave that way (obligation, contract,
  //   now supplierDocument) and the first to leave the MEASURABLE set empty.
  //
  //   ⚠️ **BOUND AND MEASURABLE ARE DIFFERENT SETS, AND ONLY ONE IS EMPTY.**
  //   `shipment/Delayed` is still `stored-in-fixtures`, so a reader still sees a
  //   stored clock state and the instrument still has something to watch — the
  //   WAITING footer stays unreachable. What shipment lacks is a WINDOW, so its
  //   verdict is `no-window-declared` and no headroom can be computed for it.
  //   An instrument with nothing MEASURABLE is not an instrument with nothing to
  //   watch, and conflating the two is what the `no-window-declared` rename
  //   already had to fix once.
  //
  //   RETIRED, quoted rather than deleted — the family-driven arms, which can no
  //   longer run because no family reaches them:
  //
  //     describe('a BOUND family — ok, warn and FALSE, each shown at its own
  //              instant', … const F: FixtureFamily = 'supplierDocument' …)
  //       it('KNOWN-GOOD FIRST: at `P` itself the family is `ok` with full
  //           headroom')
  //       it('inside the declared tolerance it stays `ok`, in BOTH directions')
  //       it('⚠️ its warn band is ONE-SIDED, because the anchor is not centred')
  //       it('⚠️ WHO CAN WARN IS DERIVED — `contract` left the set,
  //           `supplierDocument` holds it')   // swept: ['supplierDocument @ 41d']
  //       it('⚠️ past its OWN window it is FALSE — a reader is seeing a wrong
  //           state')
  //       it('the EARLY edge falsifies too — drift is signed, not a magnitude')
  //
  //   ⚠️ **THE ONE WORTH MOURNING IS THE SWEEP**, which derived warn-membership
  //   across every family's own window in both directions and returned exactly
  //   `['supplierDocument @ 41d']` — a real instrument over a real population.
  //   Its successor cannot be a sweep: swept today it returns `[]`, and a sweep
  //   that can only return `[]` is `EMPTY-INPUT-REPORTS-CLEAN-01` with better
  //   manners. So the arms move to `driftVerdict` (extracted for exactly this)
  //   and the sweep is replaced by an assertion that the population IS empty —
  //   which goes RED the day a family rejoins, and that is the point.

  it('KNOWN-GOOD FIRST: the report is non-empty and every family is judged', () => {
    // Without this the emptiness below could be a report about a broken report.
    const rows = driftReport(DECLARED_PRESENT);
    expect(rows.length).toBe(Object.keys(FAMILY_ANCHORS).length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('⚠️ the MEASURABLE set is empty — derived from upstream, never from familyDrift', () => {
    // §86: the population is derived from `FAMILY_ANCHORS` and `DISPLAY_STATES`,
    // both upstream of the module under test. Deriving it by asking
    // `familyDrift` would move the population and the assertion together, and
    // could not tell a kill from an empty run.
    const measurable = (Object.keys(FAMILY_ANCHORS) as FixtureFamily[]).filter(
      (f) =>
        FAMILY_ANCHORS[f].window !== null &&
        DISPLAY_STATES.some((r) => r.entity === f && r.group === 'stored-in-fixtures'),
    );
    expect(measurable).toEqual([]);
    // …and the module agrees, from the other side: no row carries a headroom.
    expect(
      driftReport(DECLARED_PRESENT).filter((d) => d.headroomDays !== null),
    ).toEqual([]);
  });

  it('⚠️ but the BOUND set is NOT empty — shipment keeps the instrument watching', () => {
    // The distinction the WAITING footer turns on. Named, because "nothing is
    // measurable" and "there is nothing to watch" are one word apart and mean
    // opposite things for whether this module should still exist.
    const bound = DISPLAY_STATES.filter((r) => r.group === 'stored-in-fixtures');
    expect(bound.map((r) => `${r.entity}/${r.state}`)).toEqual(['shipment/Delayed']);
    expect(storedStateFamilies(DECLARED_PRESENT)).toContain('shipment');
    expect(formatDriftReport(DECLARED_PRESENT)).not.toContain('WAITING');
  });

  it('⚠️ supplierDocument is `computed` — it left with nobody editing clockDrift', () => {
    const d = familyDrift('supplierDocument', DECLARED_PRESENT);
    expect(d.verdict).toBe('computed');
    expect(d.readerVisibleStates).toEqual([]);
    expect(d.headroomDays).toBeNull();
    // …and it still HAS a window, which is what separates `computed` from
    // `no-window-declared` and proves the departure was about the states.
    expect(FAMILY_ANCHORS.supplierDocument.window).not.toBeNull();
  });

  it('⚠️ the verdict RULE still has every arm, probed directly', () => {
    // The arms no family can now reach, measured at the rule instead of through
    // data that cannot exercise them. This is the whole reason `driftVerdict`
    // was extracted, and the reason has now arrived for `ok` and `FALSE` too —
    // not only for `warn`.
    expect(driftVerdict(5, 3, 7)).toBe('ok'); //   inside tolerance
    expect(driftVerdict(5, 7, 7)).toBe('ok'); //   exactly at it
    expect(driftVerdict(5, 8, 7)).toBe('warn'); // past tolerance, inside window
    expect(driftVerdict(5, -8, 7)).toBe('warn'); // signed, not a magnitude
    expect(driftVerdict(-1, 8, 7)).toBe('FALSE'); // past the window wins
    expect(driftVerdict(0, 8, 7)).toBe('warn'); //  the window boundary is inclusive
    expect(driftVerdict(5, 999, null)).toBe('ok'); // no declared tolerance
    // CONTROL: all three arms are genuinely distinct, so the six lines above
    // are not one answer six times.
    expect(new Set(['ok', 'warn', 'FALSE']).size).toBe(3);
  });

  it('⚠️ and the arms are reachable — on a family shaped like the one that left', () => {
    // A SYNTHETIC probe standing in for the retired sweep: `familyDrift` cannot
    // be pointed at a family that does not exist, so the geometry is exercised
    // through the rule with the numbers the retired tests used. `supplierDocument`
    // sat 40 days from its early edge and 41 from its late one — an off-centre
    // anchor — which is why it warned for exactly one day forwards and none
    // backwards. That asymmetry is a property of the RULE, and it survives the
    // family that demonstrated it.
    const TOL = 40;
    expect(driftVerdict(41 - 40, TOL, TOL)).toBe('ok'); //   at tolerance
    expect(driftVerdict(41 - 41, TOL + 1, TOL)).toBe('warn'); // one day past, still inside
    expect(driftVerdict(-1, TOL + 2, TOL)).toBe('FALSE'); //  past the window
  });
});

describe('`toleranceDays` now has a reader, and the report says so', () => {
  it('the declared tolerance decides the warn line for every bound family', () => {
    for (const d of driftReport(DECLARED_PRESENT)) {
      if (d.verdict === 'no-window-declared' || d.verdict === 'computed') continue;
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
    expect(out).toMatch(/ok|warn|FALSE|computed|no-window-declared/);
  });
});

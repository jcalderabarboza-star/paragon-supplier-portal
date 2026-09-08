// ────────────────────────────────────────────────────────────────────────────
// THE DRIFT READER — the instrument that gives `toleranceDays` a consumer.
//
// ⚠️ **THE DEFECT THIS CLOSES: A DECLARED NUMBER WITH NO READER.**
// `FAMILY_ANCHORS[f].toleranceDays` says how far the wall clock may drift from
// `DECLARED_PRESENT` before a stored clock-state a READER SEES goes false.
// Until this module, nothing in the tree compared `DECLARED_PRESENT` to a real
// clock at all — `fixturePresent.guard.test.ts` holds every family against its
// own ANCHOR, which is clock-independent by construction and therefore green on
// the day a family goes false. Measured: on 2026-09-08 the obligation family
// had already tipped, all 4471 tests were green, and nothing anywhere could
// have said so.
//
// ── ⚠️ WHY THIS IS NOT A TEST IN THE SUITE, STATED PLAINLY ──────────────────
//   **A guard that goes red on a calendar day is its own problem.** An
//   assertion here would redden every unrelated PR from the day a family's
//   headroom runs out, and the remedy (`MANDATE_LEAD_DAYS` is a RULING, not an
//   edit) is not something a PR author can take. That is the shape CP-3a
//   already rejected for the floor: *"a floor that gets edited routinely is not
//   a floor."*
//
//   So the split is: this module is PURE and is asserted at PINNED instants by
//   `clockDrift.test.ts`, inside the normal suite, where it can never decay.
//   The REAL-CLOCK evaluation lives in `clockDrift.live.test.ts`, which
//   `vitest.config.ts` excludes from the default run and `npm run drift`
//   executes on purpose — and which CI runs on the SCHEDULE trigger only, the
//   half of `gates.yml` that exists precisely to catch a break with no commit
//   involved.
//
// ── ⚠️ BOUND-NESS IS DERIVED UPSTREAM OF THIS MODULE, NOT DECLARED IN IT ────
//   A family is drift-bound iff a reader can still SEE one of its stored
//   clock-states — which is exactly what `projectionGate/displayStates.ts`
//   already declares, bilaterally and mutation-probed, as `stored-in-fixtures`.
//   Reading it from there rather than restating it here means **obligation left
//   the bound set the moment its rows became `computed-at-read`, with nobody
//   editing this file**, and a family whose projection is deleted rejoins the
//   same way. §86: derive the population from something the change cannot
//   reach, never from the thing under test.
// ────────────────────────────────────────────────────────────────────────────

import { DISPLAY_STATES } from '../../lib/projectionGate/displayStates';
import {
  DECLARED_PRESENT,
  FAMILY_ANCHORS,
  type FixtureFamily,
} from './fixturePresent';

const MS_PER_DAY = 86_400_000;
const dayMs = (v: string): number => Date.parse(`${v.slice(0, 10)}T00:00:00.000Z`);
const diffDays = (a: string, b: string): number =>
  Math.round((dayMs(a) - dayMs(b)) / MS_PER_DAY);

/**
 * Why a family is or is not exposed to wall-clock drift.
 *
 * The two `unbound` answers are deliberately DISTINCT rather than one "n/a":
 * they become bound again for different reasons, and collapsing them would hide
 * which. `no-stored-clock-state` returns if a clock literal is ever authored
 * into the family; `computed` returns if its projection is deleted.
 */
export type DriftVerdict =
  | 'no-stored-clock-state'
  | 'computed'
  | 'ok'
  | 'warn'
  | 'FALSE';

export interface FamilyDrift {
  readonly family: FixtureFamily;
  /** `today − DECLARED_PRESENT`, in whole days. Negative before `P`. */
  readonly driftDays: number;
  /** The declared allowance. `null` where the family has no coherent window. */
  readonly toleranceDays: number | null;
  /**
   * Days of drift still available before this family's OWN window is exhausted
   * — the instant at which a reader actually sees a false state. `null` when
   * the family is unbound.
   *
   * ⚠️ Deliberately NOT the same number as `toleranceDays`, and the difference
   * is not a defect in either. `toleranceDays` is measured against the shared
   * INTERSECTION for `contract` and `obligation` (they hold one anchor, so the
   * pair is only as free as the constraint they JOINTLY satisfy) while this is
   * measured against the family's own window. So `contract` declares 7 and has
   * 12, and it warns before it lies — which is the direction a guard should
   * err in.
   */
  readonly headroomDays: number | null;
  readonly verdict: DriftVerdict;
  /** The display states that make this family bound. Empty when it is not. */
  readonly readerVisibleStates: readonly string[];
}

/**
 * Which of this family's display states a reader still sees as a STORED
 * literal. Derived from `DISPLAY_STATES`; the entity key and the family key are
 * the same string by construction, which `clockDrift.test.ts` asserts rather
 * than assumes.
 */
function readerVisibleStoredStates(family: FixtureFamily): string[] {
  return DISPLAY_STATES.filter(
    (r) => r.entity === family && r.group === 'stored-in-fixtures',
  ).map((r) => r.state);
}

/** One family's exposure to the wall clock at `todayIso` (`YYYY-MM-DD`). */
export function familyDrift(
  family: FixtureFamily,
  todayIso: string,
): FamilyDrift {
  const a = FAMILY_ANCHORS[family];
  const driftDays = diffDays(todayIso, DECLARED_PRESENT);
  const states = readerVisibleStoredStates(family);

  if (a.window === null) {
    return {
      family,
      driftDays,
      toleranceDays: a.toleranceDays,
      headroomDays: null,
      verdict: 'no-stored-clock-state',
      readerVisibleStates: states,
    };
  }
  if (states.length === 0) {
    return {
      family,
      driftDays,
      toleranceDays: a.toleranceDays,
      headroomDays: null,
      verdict: 'computed',
      readerVisibleStates: states,
    };
  }

  // The family reads as though today were `anchor + drift`: its dates were
  // shifted by `P − anchor` once, at module load, and the clock has moved on
  // since. So the question "is a stored state still true?" is "is that origin
  // still inside the family's coherent window?".
  const [lo, hi] = a.window;
  const originMs = dayMs(a.anchor) + driftDays * MS_PER_DAY;
  const origin = new Date(originMs).toISOString().slice(0, 10);
  // ⚠️ THE EDGES ARE INCLUSIVE, AND FOR `contract` THAT COSTS EXACTLY ONE DAY
  // — because the zero question is unresolved in the predicate the window was
  // derived from. `FAMILY_ANCHORS.contract.window`'s late bound came from
  // `matchesGroup`'s `daysToExpiry >= 0` arm, which treats a contract expiring
  // TODAY as still Expiring. The boundary this tree just RULED (`isPast`:
  // `days <= 0` is past) says the opposite, and under it contract's headroom is
  // one day shorter than reported here. The number is left as the WINDOW
  // declares it rather than silently re-derived: the contract band is deferred
  // by ruling, and quietly moving its edge under a different convention is
  // exactly the re-labelling that deferral exists to prevent. Flagged so the
  // ruling has the discrepancy in front of it.
  const headroomDays = Math.min(
    diffDays(origin, lo), // room before the EARLY edge (drift going backwards)
    diffDays(hi, origin), // room before the LATE edge (drift going forwards)
  );

  const verdict: DriftVerdict =
    headroomDays < 0
      ? 'FALSE'
      : a.toleranceDays !== null && Math.abs(driftDays) > a.toleranceDays
        ? 'warn'
        : 'ok';

  return {
    family,
    driftDays,
    toleranceDays: a.toleranceDays,
    headroomDays,
    verdict,
    readerVisibleStates: states,
  };
}

/** Every family, at `todayIso`. The order is `FAMILY_ANCHORS`' own. */
export function driftReport(todayIso: string): readonly FamilyDrift[] {
  return (Object.keys(FAMILY_ANCHORS) as FixtureFamily[]).map((f) =>
    familyDrift(f, todayIso),
  );
}

/**
 * The families whose stored clock-states a reader can see and which the wall
 * clock has already falsified. **Non-empty means a surface is lying today.**
 */
export function falsifiedFamilies(
  todayIso: string,
): readonly FamilyDrift[] {
  return driftReport(todayIso).filter((d) => d.verdict === 'FALSE');
}

/** A fixed-width table for a terminal. One row per family, verdict last. */
export function formatDriftReport(todayIso: string): string {
  const rows = driftReport(todayIso);
  const head =
    `  ${'family'.padEnd(17)}${'drift'.padStart(6)}${'tol'.padStart(6)}` +
    `${'headroom'.padStart(10)}  verdict   reader-visible stored states`;
  const body = rows.map((d) => {
    const tol = d.toleranceDays === null ? '—' : String(d.toleranceDays);
    const head = d.headroomDays === null ? '—' : String(d.headroomDays);
    return (
      `  ${d.family.padEnd(17)}${String(d.driftDays).padStart(6)}` +
      `${tol.padStart(6)}${head.padStart(10)}  ${d.verdict.padEnd(9)} ` +
      (d.readerVisibleStates.join(', ') || '—')
    );
  });
  return [
    `  DECLARED_PRESENT = ${DECLARED_PRESENT}   today = ${todayIso}`,
    '',
    head,
    '  ' + '─'.repeat(head.length - 2),
    ...body,
  ].join('\n');
}

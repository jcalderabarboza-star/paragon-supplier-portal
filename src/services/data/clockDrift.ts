// ────────────────────────────────────────────────────────────────────────────
// THE DRIFT READER — the instrument that gives `toleranceDays` a consumer.
//
// ⚠️ **THE DEFECT THIS CLOSES: A DECLARED NUMBER WITH NO READER.**
// `FAMILY_ANCHORS[f].toleranceDays` is the DECLARED WARNING THRESHOLD for how
// far the wall clock may drift from `DECLARED_PRESENT`.
//
// ── ⚠️ TOLERANCE IS NOT THE NUMBER THAT DECIDES FALSITY. HEADROOM IS. ──────
//   The sentence that stood here read *"`toleranceDays` says how far the wall
//   clock may drift … before a stored clock-state a READER SEES goes false"*,
//   and it is retired rather than deleted because it is the misreading itself:
//   an operator took the tip date off it on 2026-09-09 and got the wrong day.
//
//   Read `driftVerdict` — the two numbers enter it separately and only one is
//   about truth. **`headroomDays` < 0 is what returns `FALSE`**: it is the
//   distance from `anchor + drift` to the NEARER EDGE of the family's coherent
//   window, so it is the instant a reader actually sees a false state.
//   **`toleranceDays` only ever returns `warn`.** They are different numbers,
//   they are not derived from each other, and **headroom is the smaller of the
//   two on this tree today** — a family can be inside its declared tolerance and
//   already out of window, which is the direction that costs a reader.
//
//   So the honest reading of a row is: **`tol` is when this instrument starts
//   complaining; `headroom` is when the fixture starts lying.** Do not subtract
//   `drift` from `tol` to get a tip date — that arithmetic is not what the
//   module computes. Run `npm run drift` and read `headroom`; no count is
//   written into this comment, because a count in prose is the class this
//   repository files as `FLOOR-IN-PROSE-01`.
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
// ── ⚠️ WHAT THIS INSTRUMENT NOW RESTS ON — ONE POINT OF TRUST, MEASURED ─────
//   **As of #325 no family is MEASURABLE, and this module is proven only by its
//   own synthetic probes.** Derived, at the time of writing, from
//   `FAMILY_ANCHORS` x `DISPLAY_STATES` — both upstream of here, so the
//   derivation does not run through the thing it describes:
//
//     MEASURABLE (a window AND reader-visible stored states) : none
//     BOUND AT ALL (a stored-in-fixtures row)                : none  (#329)
//
//   ⚠️ **`shipment/Delayed` LEFT AT #329 AND THE BOUND SET IS NOW EMPTY.** It
//   became `computed-at-read` (`shipmentDisplayState.ts`), so this instrument
//   watches nothing and `waitingFooter` is REACHABLE FROM SHIPPED DATA for the
//   first time. **This module was not edited to make that happen** — bound-ness
//   is read from `DISPLAY_STATES` at call time, which is the property claimed
//   two paragraphs down, now demonstrated in the direction that costs something.
//   WAITING, NOT RETIRED: the set repopulates the day a fixture writes a display
//   state nothing computes, with nobody editing this file.
//
//   `ok` / `warn` / `FALSE` are therefore unreachable from shipped data.
//   `clockDrift.test.ts` exercises them through `driftVerdict` — extracted for
//   exactly this — and asserts the emptiness itself, so the day a family
//   rejoins the claim goes red with nobody editing either file.
//
//   ⚠️ **THE EXPOSURE BELOW IS QUOTED AS WRITTEN AND ITS FIRST HALF IS SPENT.**
//   `shipment` no longer keeps the BOUND set non-empty; a reader sees `Delayed`
//   still, but computed, so the instrument has NO subject and the WAITING footer
//   is reachable. The CROSS-CHECK half stands unchanged and is now the whole
//   exposure. As written:
//
//   ⚠️ **AND HERE IS THE EXPOSURE, WHICH IS NOT THE EMPTINESS.** `shipment`
//   keeps the BOUND set non-empty (a reader really does see `Delayed`), so the
//   instrument still has a subject and the WAITING footer stays unreachable —
//   that half is fine. What is thin is the CROSS-CHECK: **if `shipment` ever
//   gains a window, this module goes live again against exactly one family,
//   with no second family to disagree with it.** Every arm it takes on that
//   day will have been verified only by probes this repository wrote for
//   itself. A wrong headroom would render as a number nobody could contradict.
//
//   The remedy is NOT obvious and is deliberately not taken here. A PERMANENT
//   SYNTHETIC FAMILY — a fixture family existing only to keep the arms
//   reachable — was considered and measured against this tree's own rulings:
//
//     · `FAMILY_ANCHORS`' header states that **each anchor is derived from its
//       own family and no family is bent to another.** A family with no
//       fixtures has no own-ness to derive from; its window would be authored,
//       which is the shape §69 ruled on for `approvalLevel` — authored data
//       admitted as authored, never dressed as computed.
//     · It would make `driftReport` name an entity no surface renders, and
//       `FixtureFamily` is consumed by `shiftFields`, so the synthetic member
//       would be offered at every shift call site as a real choice.
//     · And it would not buy the cross-check it is meant to buy: a family
//       written to exercise the arms agrees with the arms by construction.
//       `EMPTY-INPUT-REPORTS-CLEAN-01`'s cousin — a subject built to be found.
//
//   So the honest reading is that a synthetic family is a FIXTURE INVENTING A
//   SUBJECT, and the current shape — real subject, synthetic probes, the
//   emptiness asserted — is better than that. What is missing here is a probe
//   that fires this instrument at a defect the tree really had; that kind
//   existed once (`dayProjection.test.ts`'s pre-anchor-geometry probe, retired
//   with its subject at #325). Still filed, still not fixed here.
//
//   ⚠️ **THE GENERAL RULE HAS LEFT THIS COMMENT AND NOW GOVERNS EVERY
//   INSTRUMENT IN THE TREE: `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`, in
//   `CLAUDE.md` under "PROBE THE GUARD BOTH WAYS".** It was stated here first
//   and read as local to this module, which it never was — the sentence
//   applies to all 67 derived instruments, and a rule that governs 67 things
//   from inside one of them is a rule most of its subjects will never see.
//   What stays here is the part that IS local: this module has no real-defect
//   probe available to it, because its subject was retired rather than fixed.
//   ⚠️ AND THE TREE DOES NOT HOLD NONE — that half of the sentence was
//   measured false when the rule was promoted. `chartPalette.guard.test.tsx`
//   and `thirdPartyIdentifiers.test.ts` both carry one.
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
 * Why a family is or is not MEASURABLE against wall-clock drift.
 *
 * The two non-numeric answers are deliberately DISTINCT rather than one "n/a":
 * a family leaves them for different reasons, and collapsing them would hide
 * which. `no-window-declared` is left when a coherent window is derived for the
 * family; `computed` is left when a clock literal is authored back into it.
 *
 * ⚠️ **`no-window-declared` WAS CALLED `no-stored-clock-state`, AND THAT NAME
 * WAS FALSE ON A ROW THE REPORT PRINTED EVERY RUN.** The branch that returns it
 * tests `window === null` — it has never tested for stored states, and it is
 * checked BEFORE the stored-state branch. `shipment` declares no window AND
 * carries a reader-visible stored clock state (`Delayed`,
 * `projectionGate/displayStates.ts`), so `npm run drift` printed:
 *
 * ```
 *   shipment   9   —   —   no-stored-clock-state   Delayed
 * ```
 *
 * — a verdict denying, in one column, the thing the next column lists. **A
 * verdict must name the condition its own branch tested**, and this one now
 * does. Note what the rename does NOT claim: `shipment` is still drift-BOUND
 * (a reader sees a stored clock state), it is simply not MEASURABLE here,
 * because headroom is a distance to a window edge and it has no window.
 * `unmeasurable` and `unbound` are different facts and the old name conflated
 * them.
 */
export type DriftVerdict =
  | 'no-window-declared'
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

/**
 * The verdict rule, EXTRACTED so it can be probed without a family that
 * exercises it.
 *
 * ⚠️ **`warn` IS CURRENTLY UNREACHABLE FROM ANY FAMILY, AND THAT IS WHY THIS
 * IS A FUNCTION RATHER THAN AN INLINE TERNARY.** `warn` needs a family whose
 * DECLARED tolerance is stricter than its own window allows, which only happens
 * on a SHARED anchor — and `contract`, the one family that had it, became
 * `computed` on 2026-09-08 and left the bound population. An unreachable branch
 * asserted through data that cannot reach it is
 * `EMPTY-INPUT-REPORTS-CLEAN-01`: the assertion passes over nothing. Probing
 * the rule directly is what keeps the branch measured while no data exercises
 * it, and `clockDrift.test.ts` ALSO derives the unreachability rather than
 * asserting it, so the day a shared anchor comes back the claim goes red.
 */
export function driftVerdict(
  headroomDays: number,
  driftDays: number,
  toleranceDays: number | null,
): DriftVerdict {
  if (headroomDays < 0) return 'FALSE';
  if (toleranceDays !== null && Math.abs(driftDays) > toleranceDays) return 'warn';
  return 'ok';
}

/** One family's exposure to the wall clock at `todayIso` (`YYYY-MM-DD`). */
export function familyDrift(
  family: FixtureFamily,
  todayIso: string,
): FamilyDrift {
  const a = FAMILY_ANCHORS[family];
  const driftDays = diffDays(todayIso, DECLARED_PRESENT);
  const states = readerVisibleStoredStates(family);

  // ⚠️ **THIS BRANCH IS FIRST AND TESTS THE WINDOW, NOT THE STATES** — which is
  // why its verdict may not mention states. A family reaching here can still be
  // carrying `states`; `shipment` does. See `DriftVerdict`.
  if (a.window === null) {
    return {
      family,
      driftDays,
      toleranceDays: a.toleranceDays,
      headroomDays: null,
      verdict: 'no-window-declared',
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

  const verdict = driftVerdict(headroomDays, driftDays, a.toleranceDays);

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

/**
 * The families a reader still sees a STORED clock-state on — the drift
 * population, derived rather than declared.
 *
 * ⚠️ **WHAT THIS INSTRUMENT BECOMES WHEN THIS GOES EMPTY, STATED BEFORE
 * IT DOES.** The report says nothing today about its own end state, and a
 * reader arriving at an all-`—` table cannot tell a finished instrument from
 * a broken one. It is **WAITING, NOT RETIRED**, and that is DERIVED rather
 * than chosen: bound-ness is read from `DISPLAY_STATES` at call time, so a
 * family REJOINS the population the moment a `stored-in-fixtures` row is
 * authored, **with nobody editing this file**. A retired instrument is one
 * that cannot come back; this one comes back by itself. That is the same
 * property the header claims for departures, asserted in the other direction.
 *
 * ⚠️ **AND IT IS NOT EMPTY TODAY, WHICH IS WHY THIS IS WRITTEN NOW
 * RATHER THAN THEN.** `shipment` keeps the population non-empty on its own
 * (`displayStates.ts`), so the footer below is unreachable from the shipped
 * data and is probed directly instead — the same reason `driftVerdict` was
 * extracted as a function. **No membership is written here**: `driftReport`
 * derives it every run, and `clockDrift.test.ts` asserts the WAITING line
 * appears over an empty population and never over a non-empty one.
 */
export function storedStateFamilies(
  todayIso: string,
): readonly FixtureFamily[] {
  return driftReport(todayIso)
    .filter((d) => d.readerVisibleStates.length > 0)
    .map((d) => d.family);
}

/**
 * The footer a report prints when nothing is left to watch. Separated from
 * `formatDriftReport` so it can be probed without an empty population.
 */
export function waitingFooter(
  boundFamilies: readonly FixtureFamily[],
): readonly string[] {
  if (boundFamilies.length > 0) return [];
  return [
    '',
    '  No family carries a reader-visible stored clock state.',
    '  This instrument is WAITING, not retired: the population is derived',
    '  from DISPLAY_STATES at read time, so a family rejoins the moment a',
    '  `stored-in-fixtures` row is authored — with no edit to clockDrift.',
  ];
}

/** A fixed-width table for a terminal. One row per family, verdict last. */
export function formatDriftReport(todayIso: string): string {
  const rows = driftReport(todayIso);
  // ⚠️ DERIVED, NEVER A LITERAL. The verdict column was `padEnd(9)` against
  // a union whose longest member has never been 9 characters, so the last
  // column ran ragged on exactly the rows a reader most needs to line up.
  // Widening it to a fresh number would be the same defect with a fresher
  // value; this reads the rows it is about to print.
  const vw = Math.max(...rows.map((d) => d.verdict.length));
  const head =
    `  ${'family'.padEnd(17)}${'drift'.padStart(6)}${'tol'.padStart(6)}` +
    `${'headroom'.padStart(10)}  ${'verdict'.padEnd(vw)}  reader-visible stored states`;
  const body = rows.map((d) => {
    const tol = d.toleranceDays === null ? '—' : String(d.toleranceDays);
    const head = d.headroomDays === null ? '—' : String(d.headroomDays);
    return (
      `  ${d.family.padEnd(17)}${String(d.driftDays).padStart(6)}` +
      `${tol.padStart(6)}${head.padStart(10)}  ${d.verdict.padEnd(vw)}  ` +
      (d.readerVisibleStates.join(', ') || '—')
    );
  });
  return [
    `  DECLARED_PRESENT = ${DECLARED_PRESENT}   today = ${todayIso}`,
    '',
    head,
    '  ' + '─'.repeat(head.length - 2),
    ...body,
    ...waitingFooter(storedStateFamilies(todayIso)),
  ].join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// The DEMO PRESENT — the one instant a clock-derived read is asserted against.
//
// CP-0 sweep batch 1 (2e-c-6-FIND-01, restated as a CLASS). A fixture date that
// feeds a computed-at-read state (Overdue / Expiring / stale) is only stable if
// it sits on the PAST side of the clock. A date on the FUTURE side is a dated
// assertion with an undeclared expiry: true until one specific unnamed day, then
// false for ever. `inv-brl-0051` and `inv-giv-0892` are both due 2026-08-01, so
// on 2026-08-02 the suite began failing with no commit involved.
//
// The fixtures are NOT the defect. Read at the instant they were authored for —
// 2026-07-06 — the invoice set is exactly coherent: ONE overdue row, `inv-evo-0188`,
// the row whose own comment says "Intended OVERDUE demo row". The defect is that
// two tests asserted a clock-derived label while reading the REAL wall clock.
// Every other clock-aware spec in this repo already pins its `now`:
// `invoiceProjection.test.ts` and `complianceProjection.test.ts` pass a literal,
// the dispatcher specs inject `now: () => '2026-07-06T00:00:00.000Z'`, and the
// SDC loop reads `sdcClock` (`SDC_SIMULATED_NOW`). These two forgot to, and were
// the only two in the suite that did — verified empirically by running the whole
// suite under shifted clocks at +30d/+90d/+180d/+1y/+2y/+3y/+5y, where these two
// specs are the ONLY failures at every horizon.
//
// Re-anchoring the fixture dates instead was rejected, and the rejection is
// already canon: 2e-c-6-FIND-01 rules out "computing `asOf` from `new Date()` at
// fixture load" because it puts a clock read inside seed data and makes every
// spec that reads the fixture time-dependent. A literal future date cannot express
// "not yet due" permanently, so the honest place to declare the reading instant is
// the spec, not the seed.
//
// SCOPE: this pins the TEST clock only. The running demo still reads the wall
// clock and therefore still drifts (five overdue invoices today, not one) — that
// is the demo-present canon question, which is the operator's to decide and is
// deliberately NOT settled here.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, afterEach } from 'vitest';

import { DECLARED_PRESENT } from '../services/data/fixturePresent';

/**
 * The instant the fixture set is coherent at.
 *
 * ⚠️ **RETIRED ONTO `DECLARED_PRESENT` — IT USED TO BE A SECOND PRESENT, AND
 * THAT IS WHAT MADE IT A LIABILITY RATHER THAN A PIN.** It read the literal
 * `'2026-07-06T00:00:00.000Z'`, the day the invoice corpus was authored for.
 * That was accurate and it was load-bearing: the whole point above is that a
 * clock-derived label must be asserted at a declared instant, not at the wall
 * clock. What it could not do was keep the SHIPPED demo honest — the pin lives
 * in the specs, the browser does not import it, and the invoice fixtures went on
 * ageing past the running app until five of the six open rows computed `Overdue`
 * and three of the five buyer labels had no reachable member. **The suite stayed
 * green throughout, because the suite was the one thing pinned.**
 *
 * `invoice` is now a real anchored family (`fixturePresent.ts`), so the corpus is
 * shifted to `DECLARED_PRESENT` at module load and is coherent THERE. Two
 * declared presents would now disagree by 56 days, and the tree has already
 * ruled on that shape: `SDC_SIMULATED_NOW` and the three page-local `TODAY` pins
 * were retired onto `P` for exactly this reason — **there is ONE declared
 * present.** The authored instant is not lost; it survives as this family's
 * corroborating evidence in `FAMILY_ANCHORS.invoice`, which records that it
 * lands inside the independently-swept window.
 *
 * ⚠️ **THE PROPERTY THE SPECS RELY ON IS UNCHANGED:** this is still a frozen
 * instant that reads no wall clock, so nothing here can begin failing on a day
 * nobody committed. What changed is WHICH frozen instant, and that it is now the
 * same one the fixtures are shifted to.
 */
export const DEMO_NOW = `${DECLARED_PRESENT}T00:00:00.000Z`;

/**
 * Pin `Date` to the demo present for the surrounding suite.
 *
 * Applies a constant OFFSET rather than freezing the instant, so `setTimeout`,
 * TanStack Query's internals, and React Testing Library's `waitFor` keep
 * advancing on real time — only the calendar day the code reads moves. Timers
 * are never faked. Call at the top level of a spec file or inside a `describe`.
 */
export function usePinnedDemoClock(now: string = DEMO_NOW): void {
  let real: DateConstructor;

  beforeEach(() => {
    real = globalThis.Date;
    const offset = real.parse(now) - real.now();
    globalThis.Date = new Proxy(real, {
      construct: (target, args) =>
        args.length === 0
          ? new target(real.now() + offset)
          : new target(...(args as ConstructorParameters<DateConstructor>)),
      get: (target, prop, receiver) =>
        prop === 'now' ? () => real.now() + offset : Reflect.get(target, prop, receiver),
    }) as DateConstructor;
  });

  afterEach(() => {
    globalThis.Date = real;
  });
}

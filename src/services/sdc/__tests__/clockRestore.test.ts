// ────────────────────────────────────────────────────────────────────────────
// SDC-CLOCK-RESTORE-01 — SET IMPLIES RESTORE, on the one global that has a setter.
//
// `sdcClock` (`src/services/sdc/clock.ts`) is a module-level `let` with an
// exported `set()` and `reset()`. It is the single source of "now" for the SDC
// loop — both the display selectors and the write stamps.
//
// ⚠️ **WHY THIS IS A REAL HAZARD AND NOT A TIDINESS RULE.** Vitest isolates per
// FILE, so nothing leaks across specs. But WITHIN a file, a `set()` with no
// restoring hook silently re-dates every test that follows it — and the SDC
// selectors are latest-by-timestamp, so a wrong "now" does not throw, it
// silently picks a different record. The failure would surface as an unrelated
// assertion in an unrelated test, which is the most expensive shape a test
// defect has.
//
// Today every caller restores. **That is a fact about today, and the difference
// between a fact and an invariant is this file.**
//
// DERIVED, NEVER LISTED: the population is every file that calls `sdcClock.set`,
// recomputed from source at read time. A list written today would not fail
// informatively when the next caller lands — it would simply not mention it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { sdcClock, SDC_SIMULATED_NOW } from '../clock';

const SRC = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SELF = '/src/services/sdc/__tests__/clockRestore.test.ts';

/**
 * A hook that restores the clock for every test in the file that declares it.
 *
 * The 400-character window is deliberate: a restoring hook commonly resets
 * several stores together, so `sdcClock.reset()` is rarely the first statement.
 * The window is bounded so the match cannot wander out of the hook it started in.
 */
const RESTORING_HOOK = /(beforeEach|afterEach)\s*\(([\s\S]{0,400}?)sdcClock\.reset\(\)/;

describe('SDC-CLOCK-RESTORE-01 — every simulated-clock setter restores', () => {
  // ── POPULATION GUARD FIRST, ASSERTING MEMBERSHIP ──────────────────────────
  it('the source scan sees the clock module and a known-true caller', () => {
    expect(Object.keys(SRC).length).toBeGreaterThan(100);
    expect(SRC['/src/services/sdc/clock.ts']).toBeTruthy();

    // A known-true caller. If the scan stops seeing this, the derivation below
    // is reporting on its own matcher rather than on the tree.
    expect(SRC['/src/services/data/mock/sdcObjectsCommand.test.ts']).toMatch(/sdcClock\.set\(/);

    // `import.meta.glob` excludes the module it is written in — asserted, not
    // assumed, because THIS file calls `sdcClock.set` in its last test and would
    // otherwise be its own first false positive.
    expect(SRC[SELF]).toBeUndefined();
  });

  it('⚠️ every file that SETS the simulated clock also RESTORES it in a hook', () => {
    const setters = Object.keys(SRC).filter((p) => /sdcClock\.set\(/.test(SRC[p] ?? ''));

    // Known-good control BEFORE the assertion that depends on it: an empty
    // `setters` would make the filter below vacuously empty, which is
    // `EMPTY-INPUT-REPORTS-CLEAN-01` in one line.
    expect(setters.length).toBeGreaterThan(0);
    expect(setters).toContain('/src/services/data/mock/sdcObjectsCommand.test.ts');

    const unrestored = setters.filter((p) => !RESTORING_HOOK.test(SRC[p] ?? ''));

    expect(
      unrestored,
      'A file overrides the SIMULATED clock and never restores it. Every test\n' +
        'AFTER the set() in that file silently runs on a different "now", and the\n' +
        'SDC selectors are latest-by-timestamp — so this surfaces as an unrelated\n' +
        'assertion failing in an unrelated test. Add `afterEach(() => sdcClock.reset())`\n' +
        'or move the set inside a test that restores it.\n' +
        `Offenders:\n  ${unrestored.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⚠️ BILATERAL — the matcher accepts a restoring file and rejects a non-restoring one', () => {
    // The sweep above is probed in one direction only by construction: it went
    // green against a tree where nothing is broken, which is exactly how a
    // matcher that could no longer detect the defect would also look.
    const restoring =
      "afterEach(() => sdcClock.reset());\nit('x', () => { sdcClock.set('2026-01-01'); });";
    const notRestoring = "it('x', () => { sdcClock.set('2026-01-01'); });";
    // and the shape that actually occurs in this tree — a hook resetting several
    // stores, with the clock reset partway down.
    const multiReset =
      'beforeEach(() => {\n  someStore.reset();\n  otherStore.reset();\n  sdcClock.reset();\n});';

    expect(RESTORING_HOOK.test(restoring)).toBe(true);
    expect(RESTORING_HOOK.test(multiReset)).toBe(true);
    expect(RESTORING_HOOK.test(notRestoring)).toBe(false);
  });

  it('reset() genuinely returns the default — the seam the whole gate depends on', () => {
    // If `reset()` did not restore, every restoring hook above would be
    // decorative and this gate would certify a defect it cannot see.
    sdcClock.set('2026-07-20T00:00:00.000Z');
    expect(sdcClock.now()).toBe('2026-07-20T00:00:00.000Z');
    sdcClock.reset();
    expect(sdcClock.now()).toBe(SDC_SIMULATED_NOW);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// §44 — `SET IMPLIES RESTORE` ON THE ONE GLOBAL THAT HAS A SETTER.
//
// The arc that produced this file opened on a reported hazard — "a global any
// suite can perturb and no suite must restore, leaking into every later test in
// the file" — and named the injected chaos rate as its subject. That was wrong:
// `withChaos` holds no module state at all (§44 / `chaosAmbience.test.ts`).
//
// BUT THE HAZARD SHAPE IS REAL AND THE TREE DOES CONTAIN EXACTLY ONE INSTANCE
// OF IT — just not the one reported. `sdcClock` (`src/services/sdc/clock.ts`)
// is a module-level `let` with an exported `set()` and `reset()`. Vitest
// isolates per FILE, so nothing leaks across specs; but WITHIN a file, a `set()`
// with no restoring hook silently re-dates every test that follows it, and the
// SDC selectors are latest-by-timestamp — the exact collision SDC-4a was opened
// to fix.
//
// Today every caller restores. That is a fact about this morning, not an
// invariant, and the difference between the two is this file. It is the pin the
// original dispatch was reaching for, moved onto the construct that actually
// has the shape.
//
// DERIVED, NEVER LISTED: the population is every file that calls `sdcClock.set`,
// recomputed from source at read time. A list written today would not fail
// informatively when the sixth caller lands — it would simply not mention it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { sdcClock, SDC_SIMULATED_NOW } from '../clock';

const SRC = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SELF = '/src/services/sdc/__tests__/clockRestore.test.ts';

/** A hook that restores the clock for every test in the file that declares it. */
const RESTORING_HOOK = /(beforeEach|afterEach)\s*\(([\s\S]{0,400}?)sdcClock\.reset\(\)/;

describe('§44 — sdcClock: every setter restores', () => {
  // ── POPULATION GUARD FIRST, ASSERTING MEMBERSHIP ──────────────────────────
  it('the source scan sees the clock module and its known callers', () => {
    expect(Object.keys(SRC).length).toBeGreaterThan(100);
    expect(SRC['/src/services/sdc/clock.ts']).toBeTruthy();
    // A known-true caller. If the scan ever stops seeing this, the derivation
    // below is reporting on its own matcher and not on the tree.
    expect(SRC['/src/services/data/mock/sdcObjectsCommand.test.ts']).toMatch(/sdcClock\.set\(/);
    // `import.meta.glob` excludes the module it is written in — asserted, not
    // assumed, because this file contains the string `sdcClock.set` in prose
    // and would otherwise be its own first false positive.
    expect(SRC[SELF]).toBeUndefined();
  });

  it('⚠️ every file that SETS the simulated clock also RESTORES it in a hook', () => {
    const setters = Object.keys(SRC).filter((p) => /sdcClock\.set\(/.test(SRC[p] ?? ''));

    // Known-good control BEFORE the assertion that depends on it: an empty
    // `setters` would make the `every` below vacuously true, which is
    // `EMPTY-INPUT-REPORTS-CLEAN-01` in one line.
    expect(setters.length).toBeGreaterThan(0);
    expect(setters).toContain('/src/services/data/mock/sdcObjectsCommand.test.ts');

    const unrestored = setters.filter((p) => !RESTORING_HOOK.test(SRC[p] ?? ''));

    expect(
      unrestored,
      'A file overrides the SIMULATED clock and never restores it. Every test\n' +
        'AFTER the set() in that file silently runs on a different "now", and the\n' +
        'SDC selectors are latest-by-timestamp. Add `afterEach(() => sdcClock.reset())`\n' +
        'or move the set inside a test that restores it.\n' +
        `Offenders:\n  ${unrestored.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⚠️ BILATERAL — the matcher accepts a restoring file and rejects a non-restoring one', () => {
    // The guard above is probed in one direction only by construction: it went
    // green against a tree where nothing is broken, which is exactly how a
    // matcher that can no longer detect the defect would also look.
    const restoring = "afterEach(() => sdcClock.reset());\nit('x', () => { sdcClock.set('2026-01-01'); });";
    const notRestoring = "it('x', () => { sdcClock.set('2026-01-01'); });";

    expect(RESTORING_HOOK.test(restoring)).toBe(true);
    expect(RESTORING_HOOK.test(notRestoring)).toBe(false);
  });

  it('reset() genuinely returns the default — the seam the pin depends on', () => {
    sdcClock.set('2026-07-20T00:00:00.000Z');
    expect(sdcClock.now()).toBe('2026-07-20T00:00:00.000Z');
    sdcClock.reset();
    expect(sdcClock.now()).toBe(SDC_SIMULATED_NOW);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// §44 — THE INJECTION-AMBIENCE PIN.
//
// An arc spent three dispatches on a hazard that did not exist: an "injected
// 1-in-20 failure reset globally in a beforeEach", then "a flakiness bomb at
// 5% on every settle path", then "injection fires only on sapBoundary
// transitions". All three were measured false. What no reading produced — and
// what this file exists to make un-loseable — is the shape of the truth:
//
//   · `withChaos` holds NO module state. The rate is a field on a caller-
//     supplied config; there is no setter, no reset, nothing for a hook to
//     clobber. The failure mode the arc feared is impossible BY CONSTRUCTION.
//   · Injection is therefore never ambient. It is applied by ONE non-spec
//     module (`main.tsx`), behind `DEV && VITE_CHAOS === 'on'`, and by specs
//     that construct their own wrapped instance and pass it per test.
//   · INJECTION-REACHABLE AND SETTLE-REACHABLE ARE TWO DIFFERENT POPULATIONS,
//     and the arc's last inversion was merging them. `withChaos` proxies every
//     method of every sub-service, so injection is reachable from any read
//     through `mockDataService` — while the spec that actually exercises
//     post → submitted → settle builds `MockCommandService` directly and never
//     reaches the injector at all. Measured: at a forced rate of 1.0, 351 tests
//     across 52 files went red and that settle spec stayed GREEN.
//
// THE GATE IS THE SECOND BULLET. If injection ever becomes ambient — a wrapped
// default service, a `.env` that sets `VITE_CHAOS`, a helper that wraps on
// import — every spec in the tree inherits a probabilistic failure it never
// asked for, and the suite becomes flaky in a way no single test names. That is
// a real hazard; it is simply not the one that was reported. This file is the
// difference between "I measured that today" and "it cannot regress silently".
//
// ⚠️ EVERY ASSERTION HERE IS BILATERAL OR MEMBERSHIP-BASED, NEVER A COUNT.
// A count over an empty derivation reads as clean (`EMPTY-INPUT-REPORTS-CLEAN-01`,
// §42b), so the population guard is the FIRST test and it asserts a known-true
// member is present. The behavioural probe runs its known-GOOD and known-BAD
// inputs through the SAME instrument in the SAME test, so neither can be
// believed alone (§39b / §40e).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService } from './mockDataService';
import { withChaos } from './withChaos';

/**
 * Raw source of every module in the tree.
 *
 * ⚠️ `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN IN, so this scan
 * cannot see THIS file — which imports `withChaos` for the known-bad control
 * two tests down. Recorded rather than worked around, in the house's own
 * idiom: a check that cannot see itself must say so, or the next reader takes
 * its silence for coverage. The exclusion is asserted below, not assumed.
 */
const SRC = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SELF = '/src/services/data/mock/chaosAmbience.test.ts';

const isSpec = (path: string) => /\.test\.tsx?$/.test(path);

/** Files whose text imports the `withChaos` module, by import specifier. */
const importsWithChaos = (path: string) =>
  /from\s+'[^']*withChaos'/.test(SRC[path] ?? '');

describe('§44 — injection is never ambient', () => {
  // ── 1. POPULATION GUARD — FIRST, AND IT ASSERTS MEMBERSHIP ────────────────
  it('the source scan is non-empty and contains known-true members', () => {
    // Without this, every derivation below would return an empty set and every
    // assertion would pass while examining nothing.
    expect(Object.keys(SRC).length).toBeGreaterThan(100);
    expect(SRC['/src/main.tsx']).toBeTruthy();
    expect(SRC['/src/services/data/mock/withChaos.ts']).toBeTruthy();
    expect(SRC['/src/services/data/mock/mockDataService.ts']).toBeTruthy();

    // The self-exclusion this file's header claims — asserted, not assumed.
    expect(SRC[SELF]).toBeUndefined();
  });

  // ── 2. THE APPLICATION SITE ───────────────────────────────────────────────
  it('exactly ONE non-spec module applies withChaos, and it is env-gated', () => {
    const appliers = Object.keys(SRC).filter((p) => !isSpec(p) && importsWithChaos(p));

    // Known-good FIRST: the one legitimate applier must be found before the
    // equality below is worth anything. A matcher that found nothing would
    // otherwise satisfy the equality by returning an empty set.
    expect(appliers).toContain('/src/main.tsx');
    expect(appliers).toEqual(['/src/main.tsx']);

    // And its use is gated, so the production bundle tree-shakes it out.
    const main = SRC['/src/main.tsx'];
    expect(main).toMatch(/import\.meta\.env\.DEV/);
    expect(main).toMatch(/VITE_CHAOS/);
  });

  it('the mock service does not wrap itself — no injection at the definition site', () => {
    expect(importsWithChaos('/src/services/data/mock/mockDataService.ts')).toBe(false);
    // The shared test harness must hand out the plain mock, not a wrapped one.
    expect(SRC['/src/test/test-utils.tsx']).toMatch(/service\s*=\s*mockDataService/);
    expect(importsWithChaos('/src/test/test-utils.tsx')).toBe(false);
  });

  // ── 3. THE BEHAVIOURAL PROBE — BOTH DIRECTIONS, ONE INSTRUMENT ────────────
  it('⚠️ BILATERAL — the default service is not proxy-wrapped, and the probe reddens on one that is', () => {
    // `chaosProxy` mints a NEW async closure on every property read, so method
    // identity is unstable through it. A raw service hands back the same
    // prototype method every time. That difference is deterministic — it needs
    // no rate, no clock and no randomness to observe, which is what makes it a
    // gate rather than a flake.
    const sameMethodTwice = (svc: typeof mockDataService) =>
      svc.suppliers.list === svc.suppliers.list;

    // KNOWN-BAD first, so a probe that can no longer detect wrapping cannot
    // pass by finding nothing: a wrapped service MUST fail this.
    const wrapped = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
    expect(sameMethodTwice(wrapped)).toBe(false);

    // KNOWN-GOOD: the service the whole suite actually reads through.
    expect(sameMethodTwice(mockDataService)).toBe(true);
  });

  // ── 4. THE TWO POPULATIONS, AND THAT THEY ARE NOT THE SAME ONE ────────────
  it('injection-reachable ≠ settle-reachable — exhibited by a member of one that is absent from the other', () => {
    const readsThroughTheService = (path: string) =>
      isSpec(path) && /\bmockDataService\b/.test(SRC[path] ?? '');

    const injectionReachable = Object.keys(SRC).filter(readsThroughTheService);

    // Membership, never a count (§42b) — the figure moves every time a spec is
    // added, and a count here would be a number in prose wearing a test.
    expect(injectionReachable).toContain('/src/services/data/scoping.contract.test.ts');

    // THE POINT. This spec drives t_gr_post → submitted → settle → MAT-DOC
    // against the REAL MockCommandService and the real stores. It is the most
    // settle-reachable spec in the tree, and it is NOT injection-reachable:
    // it constructs its own service and never touches `mockDataService`.
    // Measured at a forced rate of 1.0 — all of its tests stayed green while
    // 351 others went red.
    const settleSpec = '/src/services/data/mock/goodsReceiptCommand.test.ts';
    expect(SRC[settleSpec]).toBeTruthy(); // the member exists before we assert absence
    expect(SRC[settleSpec]).toMatch(/new MockCommandService\(\)/);
    expect(injectionReachable).not.toContain(settleSpec);
  });
});

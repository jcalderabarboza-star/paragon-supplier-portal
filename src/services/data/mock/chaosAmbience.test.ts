// ────────────────────────────────────────────────────────────────────────────
// CHAOS-AMBIENCE-01 — the chaos injector is APPLIED, never AMBIENT.
//
// `withChaos` wraps a data service in a Proxy that adds latency and a failure
// rate. The rate lives on a caller-supplied config; the module holds no mutable
// state, so there is nothing a hook could clobber and no way for one spec to
// leave injection switched on for the next.
//
// ⚠️ **WHAT THIS GATE PROTECTS IS THE APPLICATION SITE, NOT THE MODULE.** The
// hazard is not that `withChaos` is stateful — it is not. The hazard is that it
// becomes AMBIENT: a `mockDataService` that wraps itself at the definition site,
// a `test-utils` that hands out a wrapped instance, or a second non-spec module
// that applies it outside the env gate. Any of those gives every spec in the
// tree a probabilistic failure it never asked for, and the suite goes flaky in a
// way no single test names — because no single test asked for it.
//
// Today exactly one non-spec module applies it, behind `DEV && VITE_CHAOS`, so
// the production bundle tree-shakes it out. **That is a fact about today. This
// file is what makes it an invariant.**
//
// ⚠️ EVERY ASSERTION IS BILATERAL OR MEMBERSHIP-BASED, NEVER A COUNT. A count
// over an empty derivation reads as clean (`EMPTY-INPUT-REPORTS-CLEAN-01`), so
// the population guard is the FIRST test and it asserts known-true membership.
// The behavioural probe runs its known-GOOD and known-BAD inputs through the
// SAME instrument in the SAME test, so neither can be believed alone.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService } from './mockDataService';
import { withChaos } from './withChaos';

/**
 * Raw source of every module in the tree.
 *
 * ⚠️ `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN IN, so this scan
 * cannot see THIS file — which imports `withChaos` two lines up for the
 * known-bad control. That exclusion is load-bearing (without it this spec would
 * be its own first false positive) and it is ASSERTED below, never assumed: a
 * check that cannot see itself has to say so, or the next reader mistakes its
 * silence for coverage.
 */
const SRC = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SELF = '/src/services/data/mock/chaosAmbience.test.ts';

const isSpec = (path: string): boolean => /\.test\.tsx?$/.test(path);

/**
 * Source with comments removed.
 *
 * ⚠️ **THIS IS NOT TIDINESS — A MUTATION PROBE CAUGHT THE GATE WITHOUT IT.**
 * `main.tsx` explains its env gate in a comment that contains the string
 * `VITE_CHAOS`. Asserting the gate against RAW text therefore passed on a
 * mutant that had DELETED the gate and kept the comment: the assertion was
 * satisfied by prose describing the mechanism rather than by the mechanism.
 * That is the same defect class this gate exists to catch, one level up, so
 * every claim about code below is made against `codeOnly()`.
 */
const codeOnly = (src: string): string =>
  (src ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** A file APPLIES the injector iff its CODE imports the module by specifier. */
const importsWithChaos = (path: string): boolean =>
  /from\s+'[^']*withChaos'/.test(codeOnly(SRC[path] ?? ''));

describe('CHAOS-AMBIENCE-01 — injection is never ambient', () => {
  // ── 1 · POPULATION GUARD, FIRST, BY MEMBERSHIP ────────────────────────────
  it('the source scan is non-empty and holds known-true members', () => {
    // Without this every derivation below could return an empty set, and every
    // assertion would pass while examining nothing.
    expect(Object.keys(SRC).length).toBeGreaterThan(100);
    expect(SRC['/src/main.tsx']).toBeTruthy();
    expect(SRC['/src/services/data/mock/withChaos.ts']).toBeTruthy();
    expect(SRC['/src/services/data/mock/mockDataService.ts']).toBeTruthy();
    expect(SRC['/src/test/test-utils.tsx']).toBeTruthy();

    // The self-exclusion the header claims — asserted, not assumed.
    expect(SRC[SELF]).toBeUndefined();
  });

  // ── 2 · THE APPLICATION SITE ──────────────────────────────────────────────
  it('exactly ONE non-spec module applies withChaos, and it is env-gated', () => {
    const appliers = Object.keys(SRC).filter((p) => !isSpec(p) && importsWithChaos(p));

    // Known-good FIRST: the one legitimate applier must be FOUND before the
    // equality is worth anything. A matcher that found nothing would otherwise
    // satisfy the equality by returning an empty set.
    expect(appliers).toContain('/src/main.tsx');
    expect(appliers).toEqual(['/src/main.tsx']);

    // And its use is gated, so the production bundle tree-shakes it out.
    // ⚠️ Asserted on the GUARD EXPRESSION, against comment-stripped source. A
    // token-presence check passed a mutant that deleted the gate and kept the
    // comment explaining it.
    const mainCode = codeOnly(SRC['/src/main.tsx']);
    expect(mainCode).toMatch(
      /import\.meta\.env\.DEV\s*&&\s*import\.meta\.env\.VITE_CHAOS\s*===\s*'on'/,
    );
    // and the injector is applied in that guard's TRUE branch, not beside it
    expect(mainCode).toMatch(/\?\s*withChaos\(/);
  });

  it('⚠️ codeOnly() actually strips — the helper the two claims above rest on', () => {
    // Without this, `codeOnly` could return '' and every assertion made through
    // it would pass over nothing, or return its input unchanged and re-admit the
    // comment that defeated the probe.
    expect(codeOnly("// VITE_CHAOS=on\nconst a = 1;")).not.toMatch(/VITE_CHAOS/);
    expect(codeOnly('/* VITE_CHAOS */ const b = 2;')).not.toMatch(/VITE_CHAOS/);
    expect(codeOnly("const c = 'VITE_CHAOS';")).toMatch(/VITE_CHAOS/);
    // a URL's `//` must not eat the rest of the line
    expect(codeOnly("const u = 'https://a.example'; const d = 3;")).toMatch(/const d = 3/);
    // and the real file still has its code after stripping
    expect(codeOnly(SRC['/src/main.tsx']).length).toBeGreaterThan(200);
  });

  it('the service does not wrap itself, and the shared harness hands out the plain mock', () => {
    expect(importsWithChaos('/src/services/data/mock/mockDataService.ts')).toBe(false);
    expect(SRC['/src/test/test-utils.tsx']).toMatch(/service\s*=\s*mockDataService/);
    expect(importsWithChaos('/src/test/test-utils.tsx')).toBe(false);
  });

  // ── 3 · THE BEHAVIOURAL PROBE — BOTH DIRECTIONS, ONE INSTRUMENT ───────────
  it('⚠️ BILATERAL — the default service is not proxy-wrapped, and the probe reddens on one that is', () => {
    // The Proxy mints a NEW closure on every property read, so method identity
    // is unstable through it; a raw service hands back the same prototype method
    // every time. That difference is DETERMINISTIC — no rate, no clock, no
    // randomness — which is what makes this a gate rather than a flake.
    const sameMethodTwice = (svc: typeof mockDataService): boolean =>
      svc.suppliers.list === svc.suppliers.list;

    // KNOWN-BAD FIRST, so a probe that can no longer detect wrapping cannot pass
    // by finding nothing: a wrapped service MUST fail this.
    const wrapped = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
    expect(sameMethodTwice(wrapped)).toBe(false);

    // KNOWN-GOOD: the service the whole suite actually reads through.
    expect(sameMethodTwice(mockDataService)).toBe(true);
  });

  // ── 4 · TWO POPULATIONS THAT LOOK LIKE ONE ────────────────────────────────
  it('injection-reachable ≠ settle-reachable — exhibited by a member of one absent from the other', () => {
    const injectionReachable = Object.keys(SRC).filter(
      (p) => isSpec(p) && /\bmockDataService\b/.test(SRC[p] ?? ''),
    );

    // Membership, never a count — the figure moves every time a spec is added,
    // and a count here would be a number in prose wearing a test.
    expect(injectionReachable).toContain(
      '/src/services/contracts/conformance/scoping.mock.test.ts',
    );

    // THE POINT: the spec that most thoroughly drives the settle path builds its
    // OWN MockCommandService and never touches `mockDataService`, so it is not
    // injection-reachable at all. Conflating the two populations is how an
    // investigation concludes that injection reaches a path it cannot reach.
    const settleSpec = '/src/services/data/mock/goodsReceiptCommand.test.ts';
    expect(SRC[settleSpec], 'the member must exist before its absence means anything').toBeTruthy();
    expect(SRC[settleSpec]).toMatch(/new MockCommandService\(\)/);
    expect(injectionReachable).not.toContain(settleSpec);
  });
});

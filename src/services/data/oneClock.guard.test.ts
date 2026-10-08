// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b · ONE CLOCK — no receiving or compliance read uses the wall clock.
//
// Operator ruling (2026-10-08): *"every certificate/ruling read in the sample
// world uses the declared present (31 Aug 2026), receiving included; pin that no
// receiving/compliance read uses the wall clock."*
//
// What it replaces, measured at OPS-2: the receiving form judged a certificate
// at `new Date()` while the Compliance page judged the same registry at the
// declared present — so one certificate read valid on one page and expired on
// the other, and every MUI-legacy certificate was going to stop passing at
// receipt on the mandate date with nobody touching the data.
//
// ── THE POPULATION IS DERIVED, NOT LISTED ───────────────────────────────────
//   A module is IN if its code calls one of the reads this ruling is about: a
//   certificate verdict, a certificate's projected status, an applicability
//   ruling, an enforcement mode, the receipt predicate, or the service reads
//   that feed them. A module that starts calling one tomorrow joins with nobody
//   editing this file.
//
// ── WHAT IS ASSERTED ─────────────────────────────────────────────────────────
//   None of them contains a wall-clock read: `new Date()` with no argument, or
//   `Date.now()`. A `new Date(something)` is arithmetic on a given instant and
//   is not one.
//
// ── ⚠️ ITS LIMIT, STATED ─────────────────────────────────────────────────────
//   This is a scan of the modules that CALL the reads. An instant read from a
//   clock in a module that calls none of them, and then handed in as an
//   argument, is outside it. Two behavioural specs cover that door for the two
//   surfaces that exist — the form (`ops2Receiving.page.test.tsx`, "ONE CLOCK")
//   and the dispatcher (`ops2bEnforcement.test.ts`, ruling 2) — by moving the
//   wall clock and showing nothing follows it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

const SOURCES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The reads the ruling is about — a call, or a hook that performs one. */
const READS: readonly RegExp[] = [
  /\bverifyHalalAtReceipt\(/,
  /\bschemeValid\(/,
  /\bcomputeStatus\(/,
  /\breceiptComplianceBlocks\(/,
  /\beffectiveEnforcement\(/,
  /\bhalalAtReceipt\b/,
  /\bbpomAtReceipt\b/,
  /\bhalalUnderRuling\(/,
  /\bbpomUnderRuling\(/,
  /\brulingInForce\(/,
  /\buseComplianceRegistry\(/,
  /\buseMaterialRulings\(/,
  /\bgetComplianceRegistry\(/,
  /\bgetMaterialRulings\(/,
];

/** A read of the wall clock. */
const WALL_CLOCK = /\bnew Date\(\s*\)|\bDate\.now\(\s*\)/;

const codeOf = (text: string): string =>
  text
    .split(/\r?\n/)
    .filter((l) => !/^\s*(?:\/\/|\/\*|\*)/.test(l))
    .join('\n');

const isSpec = (path: string) => path.includes('.test.') || path.startsWith('/src/test/');

const population = (): string[] =>
  Object.entries(SOURCES)
    .filter(([path]) => !isSpec(path))
    .filter(([, text]) => {
      const code = codeOf(text);
      return READS.some((r) => r.test(code));
    })
    .map(([path]) => path)
    .sort();

describe('OPS-2b · ONE CLOCK — receiving and compliance reads stay off the wall clock', () => {
  it('the population is real — it holds the surfaces and the gate by name, and not an unrelated module', () => {
    const pop = population();
    // Membership, never a count.
    expect(pop).toContain('/src/components/v2-features/GRInspectionWizard.tsx');
    expect(pop).toContain('/src/pages-v2/BuyerCompliance.tsx');
    expect(pop).toContain('/src/pages-v2/compliance/MaterialApplicabilityPanel.tsx');
    expect(pop).toContain('/src/services/data/receiptCompliance.ts');
    expect(pop).toContain('/src/services/data/mock/receiptComplianceHook.ts');
    expect(pop).toContain('/src/services/data/halalVerification.ts');
    expect(pop).toContain('/src/services/data/complianceProjection.ts');
    // KNOWN-ABSENT — a module that makes none of these reads is not swept in,
    // and no spec is.
    expect(pop).not.toContain('/src/pages-v2/BuyerInvoices.tsx');
    expect(pop.some(isSpec)).toBe(false);
    // This file cannot see itself (the glob excludes the module it is in).
    expect(SOURCES['/src/services/data/oneClock.guard.test.ts']).toBeUndefined();
  });

  it('⚠️ no member reads the wall clock', () => {
    const offenders = population().filter((path) => WALL_CLOCK.test(codeOf(SOURCES[path])));
    expect(
      offenders,
      'A RECEIVING OR COMPLIANCE READ USES THE WALL CLOCK. Judge at the declared present ' +
        '(`DECLARED_PRESENT_INSTANT`), or take the instant as an argument.',
    ).toEqual([]);
  });

  it('the matcher fires both ways — on the read this batch removed, and not on arithmetic or prose', () => {
    // KNOWN-BAD: the exact line the receiving form shipped until OPS-2b.
    expect(WALL_CLOCK.test('const inspectionInstant = useMemo(() => new Date().toISOString(), []);')).toBe(true);
    // And the stamp the ruling target shipped.
    expect(WALL_CLOCK.test('      setAt: new Date().toISOString(),')).toBe(true);
    expect(WALL_CLOCK.test('const now = Date.now();')).toBe(true);
    // KNOWN-GOOD: an instant built from a given value is not a clock read…
    expect(WALL_CLOCK.test('new Date(Date.parse(`${DECLARED_PRESENT}T09:00:00.000Z`) - WEEK_MS)')).toBe(false);
    expect(WALL_CLOCK.test('new Date(value).toISOString()')).toBe(false);
    // …and a comment that quotes the retired line is not code.
    expect(WALL_CLOCK.test(codeOf('  // It read `new Date().toISOString()`, the wall clock.\n  const x = 1;'))).toBe(false);
  });

  it('a module that makes a read AND reads the clock is caught — fired at a synthetic member', () => {
    const synthetic = 'const v = verifyHalalAtReceipt(s, m, registry, new Date().toISOString());';
    expect(READS.some((r) => r.test(codeOf(synthetic)))).toBe(true);
    expect(WALL_CLOCK.test(codeOf(synthetic))).toBe(true);
  });
});

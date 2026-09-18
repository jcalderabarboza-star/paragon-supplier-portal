// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE PSL READ DOES NOT DEPEND ON THE WALL CLOCK.
//
// ⚠️ **ANCHORING THE CORPUS IS ONLY HALF OF IT, AND THE INVOICE LANE PAID FOR
// THAT LESSON.** `#354` made `invoice` a real anchored family and the thing that
// READ it was still calling `new Date()`, so the partition was correct on the
// day of the merge and decayed from there — measured day by day: both
// `Pending Match` and `Approved` rendered ZERO forty days after `P`, with nobody
// touching a file. CI runs this suite daily at 00:17 UTC on `main` with no
// commit involved, which is the run that would find it.
//
// ⚠️ **AND `clockDrift` WILL NOT SAY SO FOR THIS FAMILY.** It binds to families
// a reader can still see a STORED clock-state on; `psl` stores none (law 0.5 —
// every display state is computed at read), so `familyDrift` returns `computed`
// before it ever computes headroom. The scheduled drift gate is silent for
// `psl` at every date. That is exactly why the property is asserted HERE.
//
// ── THE TWO HALVES, AND WHY NEITHER ALONE IS ENOUGH ─────────────────────────
//   1. SOURCE — no PSL module reads the ambient clock. Catches a `new Date()`
//      that is added but never exercised by a fixture.
//   2. BEHAVIOUR — the same reads under three wildly separated wall clocks
//      produce byte-identical output. Catches a clock read that arrives through
//      a helper the source scan does not name.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { DECLARED_PRESENT } from './fixturePresent';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import { bestPslStatus, effectiveValidUntil, listingsForSupplier, pslDisplayStatus } from './pslProjection';
import { pslStatusFor } from './pslSourcingSeam';

const PSL_SOURCES = [
  'src/services/data/pslListing.ts',
  'src/services/data/pslProjection.ts',
  'src/services/data/pslSourcingSeam.ts',
  // ⚠️ PSL P2 — the gate's decision module AND the hook file that supplies its
  // instant. `policies.ts` is the one place in the transitions layer that names
  // `DECLARED_PRESENT`, so it is the one place a `new Date()` could be
  // substituted for it; leaving it out would have made the "no PSL module reads
  // the ambient clock" claim true of everything except the file where it
  // matters most. The matcher convicts only a ZERO-ARGUMENT `new Date()`, so
  // this file's `new Date(asOf)` — which parses a caller's argument — is
  // correctly acquitted, and the bilateral control below says so.
  'src/services/data/rfqSourcingGate.ts',
  'src/services/transitions/policies.ts',
  'src/services/data/mock/fixtures/pslListings.ts',
  'src/components/v2-features/PslStatusCell.tsx',
  'src/components/v2-features/PslListingsSection.tsx',
].map((p) => resolve(process.cwd(), p));

/** Everything a surface renders for the PSL, as one comparable blob. */
function readEverything(): string {
  const suppliers = [...new Set(PSL_LISTINGS.map((r) => r.supplierId)), 'sup-001'];
  return JSON.stringify(
    suppliers.map((id) => ({
      id,
      standing: pslStatusFor(id, null, DECLARED_PRESENT),
      best: bestPslStatus(
        PSL_LISTINGS.filter((r) => r.supplierId === id),
        DECLARED_PRESENT,
      ),
      rows: listingsForSupplier(PSL_LISTINGS, id, DECLARED_PRESENT).map((r) => ({
        id: r.id,
        shown: pslDisplayStatus(r, DECLARED_PRESENT),
        until: effectiveValidUntil(r),
      })),
    })),
  );
}

const RealDate = globalThis.Date;

/** Move the ambient wall clock by `days`, leaving explicit arguments alone.
 *  An OFFSET PROXY rather than fake timers: fake timers freeze an instant, and
 *  a frozen instant cannot distinguish "reads no clock" from "reads a clock
 *  that happens not to be moving". */
function withClockOffset<T>(days: number, fn: () => T): T {
  const shift = days * 86_400_000;
  // ⚠️ `...args: unknown[]` RATHER THAN `ConstructorParameters<typeof Date>`:
  // that helper resolves to the ZERO-ARGUMENT overload, so `args.length === 0`
  // typechecks as always-true and the forwarding branch reads as dead code. The
  // proxy must forward every overload verbatim — a `new Date(iso)` inside the
  // shifted window must still parse its argument, or the "identical output"
  // claim would be measuring a broken Date rather than a clock-free read.
  class ShiftedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + shift);
      else super(...(args as [string]));
    }
    static now(): number {
      return RealDate.now() + shift;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

afterEach(() => {
  globalThis.Date = RealDate;
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the probe reads something, and the probe itself works', () => {
  it('the rendered blob is substantial and names real rows', () => {
    const blob = readEverything();
    expect(blob.length).toBeGreaterThan(400);
    expect(blob).toContain('psl-001');
    expect(blob).toContain('NOT_LISTED'); // sup-001 holds none
    expect(blob).toContain('LAPSED'); // sup-007 holds only dead rows
  });

  it('⚠️ THE CLOCK PROXY ACTUALLY MOVES THE CLOCK', () => {
    // Without this the "identical under three clocks" claim below is satisfied
    // by a proxy that does nothing — `EMPTY-INPUT-REPORTS-CLEAN-01` with a
    // clock attached, and the reading that gets believed.
    const here = new Date().getTime();
    const there = withClockOffset(500, () => new Date().getTime());
    expect(Math.round((there - here) / 86_400_000)).toBe(500);
    expect(globalThis.Date).toBe(RealDate); // and it restored
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE READ IS IDENTICAL UNDER EVERY WALL CLOCK', () => {
  it('three clocks, separated by years, produce byte-identical output', () => {
    const base = readEverything();
    for (const days of [-900, 0, 900]) {
      expect(withClockOffset(days, readEverything), `offset ${days}`).toBe(base);
    }
  });

  it('⚠️ and the INJECTED instant still changes the answer — the reads are not frozen', () => {
    // The other direction. If `readEverything` were insensitive to time
    // altogether, the assertion above would hold for a function that computes
    // nothing. This proves the projection is live and merely not AMBIENT.
    const far = new RealDate(RealDate.parse(DECLARED_PRESENT) + 2000 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(pslStatusFor('sup-002', null, DECLARED_PRESENT).kind).toBe('IN_FORCE');
    expect(pslStatusFor('sup-002', null, far).kind).toBe('LAPSED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ NO PSL MODULE READS THE AMBIENT CLOCK', () => {
  it('not one carries `new Date()` or `Date.now()`', () => {
    const offenders: string[] = [];
    for (const file of PSL_SOURCES) {
      const code = stripSourceComments(readFileSync(file, 'utf8'), 'blank', file);
      // `new Date(x)` is fine — it parses an argument the caller supplied.
      // `new Date()` with NO argument, and `Date.now()`, are the ambient reads.
      if (/new\s+Date\s*\(\s*\)/.test(code)) offenders.push(`${file}: new Date()`);
      if (/\bDate\s*\.\s*now\s*\(/.test(code)) offenders.push(`${file}: Date.now()`);
    }
    expect(offenders).toEqual([]);
  });

  it('⚠️ the matcher can fire, and comments do not trip it', () => {
    // KNOWN-GOOD: the matcher finds the real thing in a synthetic string.
    expect(/new\s+Date\s*\(\s*\)/.test('const x = new Date();')).toBe(true);
    // KNOWN-BAD, the one that matters: a PSL module whose PROSE says
    // "new Date()" must not be convicted. `pslProjection.ts` does not say it,
    // so the control is built here rather than assumed from the tree.
    const commented = stripSourceComments(
      '// never call new Date() here\nconst y = 1;\n',
      'blank',
      'probe.ts',
    );
    expect(/new\s+Date\s*\(\s*\)/.test(commented)).toBe(false);
  });
});

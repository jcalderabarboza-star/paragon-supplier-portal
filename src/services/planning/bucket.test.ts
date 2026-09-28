// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE BUCKET PARSE — probed BOTH WAYS, because a parser that refuses everything
// looks exactly like a parser that refuses the right things.
//
// ⚠️ **THE KNOWN-GOOD COMES FIRST AND IT IS NOT DECORATION.** Heuristic rule 4:
// *assert a known-GOOD input passes before you believe a known-BAD input failed.*
// The cheapest wrong implementation here — `return { ok: false, … }` — passes
// every refusal assertion in this file and would ship looking like a working
// gate.
//
// ⚠️ **THE W53 PAIR IS THE ONE ASSERTION THAT CANNOT BE FAKED BY A REGEX**, and
// it is the reason this file pins two years rather than one. `2026-W53` is REAL
// (1 January 2026 is a Thursday, so the ISO year 2026 holds 53 weeks) and
// `2027-W53` DOES NOT EXIST (1 January 2027 is a Friday; 2027 holds 52). Both
// match `WEEK_RE` identically. A syntactic parser accepts both; only one that
// resolves the week to an ISO year can tell them apart — and a test that pinned
// only the refusal would pass against an implementation that refused every W53.
//
// ⚠️ **NO CLOCK IS READ, AND THIS FILE IS WHERE THAT IS ASSERTED** — boundaries
// are computed from the id (law 0.5). Every instant below is therefore a fixed
// expected value, not a relative one, and the suite is clock-invariant by
// construction rather than by a `vi.setSystemTime`.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HORIZON_BUCKETS,
  parseBucket,
  parseHorizon,
  type BucketGrain,
} from './bucket';

/** Narrow or fail loudly — a bare `if (!o.ok) return` would pass vacuously. */
function accepted(raw: string): { id: string; grain: BucketGrain; startUtc: string; endUtc: string } {
  const outcome = parseBucket(raw);
  expect(outcome.ok, `${raw} was REFUSED and this assertion needs it accepted`).toBe(true);
  if (!outcome.ok) throw new Error('unreachable');
  return outcome.bucket;
}

describe('⚠️ KNOWN-GOOD FIRST — the parse accepts the grains the operator ruled in', () => {
  it('a month parses, with half-open UTC boundaries computed from the id', () => {
    expect(accepted('2026-08')).toEqual({
      id: '2026-08',
      grain: 'month',
      startUtc: '2026-08-01T00:00:00.000Z',
      endUtc: '2026-09-01T00:00:00.000Z',
    });
  });

  it('December rolls into the next January rather than into month 13', () => {
    const december = accepted('2026-12');
    expect(december.startUtc).toBe('2026-12-01T00:00:00.000Z');
    expect(december.endUtc).toBe('2027-01-01T00:00:00.000Z');
  });

  it('an ISO week parses to its Monday, seven days wide', () => {
    const w33 = accepted('2026-W33');
    expect(w33.grain).toBe('week');
    expect(w33.startUtc).toBe('2026-08-10T00:00:00.000Z');
    expect(w33.endUtc).toBe('2026-08-17T00:00:00.000Z');
    // A Monday, asserted rather than assumed: ISO weeks start on Monday and
    // `getUTCDay()` for Monday is 1.
    expect(new Date(w33.startUtc).getUTCDay()).toBe(1);
  });

  it('week 1 of 2026 opens in DECEMBER 2025 — the ISO year is not the calendar year', () => {
    // The week containing 4 January 2026 (a Sunday) opens on Monday 29 December
    // 2025.
    expect(accepted('2026-W01').startUtc).toBe('2025-12-29T00:00:00.000Z');
  });

  it('⚠️ week 1 is the week containing 4 JANUARY, not the week containing 1 January', () => {
    // ⚠️ **THIS ASSERTION EXISTS BECAUSE A MUTATION PROBE CAUGHT THE ONE ABOVE
    // BEING BLIND TO THE DEFECT IT WAS WRITTEN FOR.** Swapping `Date.UTC(year, 0, 4)`
    // for `Date.UTC(year, 0, 1)` — the wrong anchor, and the plausible mistake —
    // left the 2026 case UNCHANGED at 2025-12-29, because 1 January 2026 is a
    // Thursday and therefore sits in the same ISO week as 4 January. The probe went
    // red on an unrelated test, which is a kill that names the wrong thing.
    //
    // 2027 separates them: 1 January 2027 is a FRIDAY, so the week containing it
    // opens Monday 28 December 2026 and belongs to ISO year 2026, while ISO week 1
    // of 2027 opens Monday 4 January 2027. A 1-January anchor returns the earlier
    // Monday and is a full week out for every week of that year.
    expect(accepted('2027-W01').startUtc).toBe('2027-01-04T00:00:00.000Z');
    // And the control that makes the pair mean something: the 2026 case really is
    // insensitive to the anchor, so it could never have carried this assertion.
    expect(accepted('2026-W01').startUtc).toBe('2025-12-29T00:00:00.000Z');
  });

  it('⚠️ a REAL week 53 is accepted — 2026 has one', () => {
    const w53 = accepted('2026-W53');
    expect(w53.startUtc).toBe('2026-12-28T00:00:00.000Z');
    expect(w53.endUtc).toBe('2027-01-04T00:00:00.000Z');
  });

  it('the boundaries abut exactly — one bucket ends where the next begins', () => {
    expect(accepted('2026-08').endUtc).toBe(accepted('2026-09').startUtc);
    expect(accepted('2026-W33').endUtc).toBe(accepted('2026-W34').startUtc);
  });
});

describe('⚠️ THE REFUSALS — quarters by ruling, and everything that is not a bucket', () => {
  it('a QUARTER is refused, and it is the form the tree actually carries', () => {
    // ⚠️ THE FORM IS NO LONGER IN THE PRODUCT TREE, AND THAT IS WHY THIS
    // ASSERTION MATTERS MORE RATHER THAN LESS. It used to sit on two rows of
    // `fixtures/prIntake.ts`, rendering as an em dash on the requisitions page;
    // the operator ruled those rows into real buckets on 2026-09-28, so this spec
    // is now the ONLY thing in the tree that still exercises the quarter form.
    // Delete it and nothing anywhere would notice the parser starting to accept
    // one.
    expect(parseBucket('2026-Q3')).toEqual({
      ok: false,
      reason: 'UNPARSEABLE_BUCKET',
      raw: '2026-Q3',
    });
  });

  it('a DATE is refused — a bucket is never a date', () => {
    expect(parseBucket('2026-08-01').ok).toBe(false);
    expect(parseBucket('2026-08-01T00:00:00.000Z').ok).toBe(false);
  });

  it('a week the ISO year does not hold is refused — 2027 has no week 53', () => {
    expect(parseBucket('2027-W53')).toEqual({
      ok: false,
      reason: 'UNPARSEABLE_BUCKET',
      raw: '2027-W53',
    });
  });

  it('out-of-range and mis-shaped forms are refused, one by one', () => {
    for (const raw of [
      '2026-8', // unpadded month
      '2026-13', // month 13
      '2026-00', // month 0
      '2026-W0', // unpadded week
      '2026-W00', // week 0
      '2026-W54', // beyond any ISO year
      '2026', // a year is not a bucket
      '26-08', // two-digit year
      'FY26-08', // a prefix
      '2026-08 ', // trailing space
      '', // nothing
    ]) {
      expect(parseBucket(raw), raw).toEqual({ ok: false, reason: 'UNPARSEABLE_BUCKET', raw });
    }
  });
});

describe('⚠️ A HORIZON HOLDS ONE GRAIN', () => {
  it('KNOWN-GOOD — a single-grain horizon parses and keeps the caller order', () => {
    const months = parseHorizon(['2026-09', '2026-08', '2026-10']);
    expect(months.ok).toBe(true);
    if (!months.ok) throw new Error('unreachable');
    expect(months.grain).toBe('month');
    // Order preserved, NOT sorted — a view owns its ordering.
    expect(months.buckets.map((b) => b.id)).toEqual(['2026-09', '2026-08', '2026-10']);

    const weeks = parseHorizon(['2026-W33', '2026-W34']);
    expect(weeks.ok).toBe(true);
    if (!weeks.ok) throw new Error('unreachable');
    expect(weeks.grain).toBe('week');
  });

  it('a MIXED-grain horizon is refused, in both orders', () => {
    expect(parseHorizon(['2026-08', '2026-W33'])).toEqual({
      ok: false,
      reason: 'MIXED_GRAIN_IN_HORIZON',
      raw: '2026-08,2026-W33',
    });
    // Both orders, because a "first member wins" implementation passes one of them.
    expect(parseHorizon(['2026-W33', '2026-08']).ok).toBe(false);
    expect(
      (parseHorizon(['2026-W33', '2026-08']) as { reason: string }).reason,
    ).toBe('MIXED_GRAIN_IN_HORIZON');
  });

  it('an unparseable member names ITSELF, not the whole horizon', () => {
    // The offending member is what a reader has to go and fix. A refusal that
    // echoed the whole array would name twelve buckets and blame all of them.
    expect(parseHorizon(['2026-08', '2026-Q3', '2026-10'])).toEqual({
      ok: false,
      reason: 'UNPARSEABLE_BUCKET',
      raw: '2026-Q3',
    });
  });

  it('an EMPTY horizon is refused rather than answered with a guessed grain', () => {
    expect(parseHorizon([])).toEqual({ ok: false, reason: 'EMPTY_HORIZON', raw: '' });
  });
});

describe('the horizon default is a REGISTRY value, and every grain has one', () => {
  it('⚠️ BILATERAL — the defaults cover exactly the grains, no more and no fewer', () => {
    // The NUMBERS are the operator's registry values and are theirs to change;
    // pinning them here would only assert a constant equals itself. What must
    // never happen is a grain added with no depth, or a depth left behind by a
    // grain that left — so the KEY SET is what is pinned, both directions,
    // against the union's own members.
    const grains: readonly BucketGrain[] = ['month', 'week'];
    expect(Object.keys(DEFAULT_HORIZON_BUCKETS).sort()).toEqual([...grains].sort());
    for (const g of grains) {
      expect(Number.isInteger(DEFAULT_HORIZON_BUCKETS[g]), g).toBe(true);
      expect(DEFAULT_HORIZON_BUCKETS[g], g).toBeGreaterThan(0);
    }
  });

  it('a default horizon of each grain really parses at that depth', () => {
    // The depths are only meaningful if a horizon of that length is legal, which
    // is a property of the parse rather than of the constant.
    const months = Array.from({ length: DEFAULT_HORIZON_BUCKETS.month }, (_, i) =>
      `2026-${String(i + 1).padStart(2, '0')}`,
    );
    const monthOutcome = parseHorizon(months);
    expect(monthOutcome.ok).toBe(true);
    if (!monthOutcome.ok) throw new Error('unreachable');
    expect(monthOutcome.buckets).toHaveLength(DEFAULT_HORIZON_BUCKETS.month);

    const weeks = Array.from({ length: DEFAULT_HORIZON_BUCKETS.week }, (_, i) =>
      `2026-W${String(i + 1).padStart(2, '0')}`,
    );
    const weekOutcome = parseHorizon(weeks);
    expect(weekOutcome.ok).toBe(true);
    if (!weekOutcome.ok) throw new Error('unreachable');
    expect(weekOutcome.buckets).toHaveLength(DEFAULT_HORIZON_BUCKETS.week);
  });
});

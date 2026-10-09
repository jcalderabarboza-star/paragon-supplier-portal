// ────────────────────────────────────────────────────────────────────────────
// E2E-1 · ONE CLOCK — an exchange rate's age is read against the declared
// present, like every deadline on the page it sits on.
//
// Operator ruling (2026-10-09), "as receiving": found on the end-to-end walk,
// where a rate dated on the declared present — the day every countdown on the
// same page counted from — was refused as older than seven days, and a rate
// dated on the wall-clock day was accepted.
//
// Held here:
//   1. the three modules that judge a rate's date read no wall clock;
//   2. moving the wall clock moves no verdict (the behavioural half — a scan
//      alone cannot see an instant handed in from elsewhere);
//   3. the boundary sits where the ruling puts it: a rate dated on the declared
//      present is current and not in the future; one dated a day later is in
//      the future; one older than the limit is stale.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, afterEach, vi } from 'vitest';
import { isStalePin, pinAgeDays, type FxPin } from './fxPin';
import { scoreQuotations, type ScorableQuote } from './quoteScore';
import { FX_PIN_MAX_AGE_DAYS } from './currencyPolicy';
import { readFxVintage } from '../pages-v2/sourcing/fxRateInput';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';

const SOURCES = import.meta.glob(
  ['/src/lib/fxPin.ts', '/src/lib/quoteScore.ts', '/src/pages-v2/sourcing/fxRateInput.ts'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const DAY = 86_400_000;
const fromPresent = (n: number) =>
  new Date(Date.parse(DECLARED_PRESENT) + n * DAY).toISOString().slice(0, 10);
const pin = (asOf: string): FxPin => ({
  quote: 'USD',
  base: 'IDR',
  rate: 17_000,
  asOf,
  pinnedAt: `${asOf}T00:00:00.000Z`,
  source: 'MANUAL',
  liveness: 'SIMULATED',
});
const MIXED: ScorableQuote[] = [
  { id: 'a', unitPrice: 27_500, currency: 'IDR', leadTimeDays: 14, complianceScore: 90, reliabilityScore: 90 },
  { id: 'b', unitPrice: 1.65, currency: 'USD', leadTimeDays: 14, complianceScore: 90, reliabilityScore: 90 },
];
const WALL_CLOCK = /\bnew Date\(\s*\)|\bDate\.now\(\s*\)/;

afterEach(() => {
  vi.useRealTimers();
});

describe('E2E-1 · the population and the matcher', () => {
  it('the three modules are read, and each holds the read it is here for', () => {
    expect(Object.keys(SOURCES).sort()).toEqual([
      '/src/lib/fxPin.ts',
      '/src/lib/quoteScore.ts',
      '/src/pages-v2/sourcing/fxRateInput.ts',
    ]);
    expect(SOURCES['/src/lib/fxPin.ts']).toContain('export function isStalePin');
    expect(SOURCES['/src/lib/quoteScore.ts']).toContain('isStalePin(p, now)');
    expect(SOURCES['/src/pages-v2/sourcing/fxRateInput.ts']).toContain('export function readFxVintage');
  });

  it('the matcher finds a wall-clock read and passes arithmetic on a given instant', () => {
    expect(WALL_CLOCK.test('now: Date = new Date()')).toBe(true);
    expect(WALL_CLOCK.test('const t = Date.now();')).toBe(true);
    expect(WALL_CLOCK.test('new Date(DECLARED_PRESENT_INSTANT)')).toBe(false);
    expect(WALL_CLOCK.test('new Date(pin.asOf).getTime()')).toBe(false);
  });
});

describe('E2E-1 · no module that judges a rate date reads the wall clock', () => {
  it.each(Object.keys(SOURCES))('%s', (path) => {
    expect(WALL_CLOCK.test(SOURCES[path])).toBe(false);
  });
});

describe('E2E-1 · the verdicts do not follow the wall clock', () => {
  const verdicts = () => ({
    onPresent: isStalePin(pin(DECLARED_PRESENT)),
    atLimit: isStalePin(pin(fromPresent(-FX_PIN_MAX_AGE_DAYS))),
    pastLimit: isStalePin(pin(fromPresent(-FX_PIN_MAX_AGE_DAYS - 1))),
    age: pinAgeDays(pin(fromPresent(-3))),
    vintageOnPresent: readFxVintage(DECLARED_PRESENT),
    vintageDayAfter: readFxVintage(fromPresent(1)),
    ranked: scoreQuotations(MIXED, { pins: [pin(DECLARED_PRESENT)] }).kind,
    refused: scoreQuotations(MIXED, { pins: [pin(fromPresent(-FX_PIN_MAX_AGE_DAYS - 1))] }),
  });

  it('a rate dated on the declared present is current; one past the limit is stale', () => {
    const v = verdicts();
    expect(v.onPresent).toBe(false);
    expect(v.atLimit).toBe(false);
    expect(v.pastLimit).toBe(true);
    expect(v.age).toBe(3);
    expect(v.vintageOnPresent).toEqual({ ok: true, value: DECLARED_PRESENT });
    expect(v.vintageDayAfter).toEqual({ ok: false, reason: 'FUTURE_VINTAGE' });
    expect(v.ranked).toBe('scored');
    expect(v.refused).toEqual({ kind: 'refused', reason: 'FX_STALE', currencies: ['USD'] });
  });

  it.each([
    ['a year before the declared present', -365],
    ['forty days after it', 40],
    ['five years after it', 5 * 365],
  ])('the same verdicts with the wall clock %s', (_label, days) => {
    const baseline = verdicts();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.parse(DECLARED_PRESENT) + days * DAY));
    // The control: the wall clock really did move.
    expect(new Date().toISOString().slice(0, 10)).toBe(fromPresent(days));
    expect(verdicts()).toEqual(baseline);
  });
});

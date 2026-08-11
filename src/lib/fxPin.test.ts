import { describe, it, expect } from 'vitest';
import {
  effectivePin,
  isStalePin,
  isUsableRate,
  pinAgeDays,
  pinHistory,
  type FxPin,
} from './fxPin';
import { FX_PIN_MAX_AGE_DAYS } from './currencyPolicy';

const pin = (over: Partial<FxPin> = {}): FxPin => ({
  quote: 'USD',
  base: 'IDR',
  rate: 17_250,
  asOf: '2026-07-30',
  pinnedAt: '2026-07-30T09:00:00.000Z',
  source: 'MANUAL',
  liveness: 'SIMULATED',
  ...over,
});

const NOW = new Date('2026-07-31T09:00:00.000Z');

describe('effectivePin — the ledger has a head, and it is derived', () => {
  it('returns undefined when nothing has been pinned for that currency', () => {
    expect(effectivePin(undefined, 'USD')).toBeUndefined();
    expect(effectivePin([], 'USD')).toBeUndefined();
    expect(effectivePin([pin({ quote: 'EUR' })], 'USD')).toBeUndefined();
  });

  it('THE D-1 SUPERSESSION — the LATEST pin wins, and the prior one SURVIVES', () => {
    // The whole freeze, in one assertion pair. A moved rate is a new entry; the
    // basis an earlier comparison was ranked on is still on the record, because
    // nothing was overwritten to make room for the new one.
    const older = pin({ rate: 16_000, pinnedAt: '2026-07-01T00:00:00.000Z' });
    const newer = pin({ rate: 17_250, pinnedAt: '2026-07-20T00:00:00.000Z' });
    const ledger = [older, newer];

    expect(effectivePin(ledger, 'USD')!.rate).toBe(17_250);
    expect(pinHistory(ledger, 'USD')).toEqual([older, newer]);
    expect(pinHistory(ledger, 'USD')).toHaveLength(2);
  });

  it('is order-INDEPENDENT — the ledger is read by pinnedAt, not by luck', () => {
    // A store that appended out of order, or a fixture authored newest-first,
    // must not change which rate is in force.
    const older = pin({ rate: 16_000, pinnedAt: '2026-07-01T00:00:00.000Z' });
    const newer = pin({ rate: 17_250, pinnedAt: '2026-07-20T00:00:00.000Z' });
    expect(effectivePin([newer, older], 'USD')!.rate).toBe(17_250);
    expect(effectivePin([older, newer], 'USD')!.rate).toBe(17_250);
  });

  it('breaks a same-instant tie by ledger position — the later append wins', () => {
    // At equal `pinnedAt` there is no other ordering that exists; appending is
    // the only evidence of which came second.
    const a = pin({ rate: 1, pinnedAt: '2026-07-20T00:00:00.000Z' });
    const b = pin({ rate: 2, pinnedAt: '2026-07-20T00:00:00.000Z' });
    expect(effectivePin([a, b], 'USD')!.rate).toBe(2);
  });

  it('keeps currencies separate — a EUR pin is not a USD basis', () => {
    const usd = pin({ quote: 'USD', rate: 17_250 });
    const eur = pin({ quote: 'EUR', rate: 18_600, pinnedAt: '2026-07-31T00:00:00.000Z' });
    expect(effectivePin([usd, eur], 'USD')!.rate).toBe(17_250);
    expect(effectivePin([usd, eur], 'EUR')!.rate).toBe(18_600);
  });
});

describe('isStalePin — measured from the RATE, not from the decision to use it', () => {
  it('a rate from today is fresh', () => {
    expect(isStalePin(pin({ asOf: '2026-07-31' }), NOW)).toBe(false);
  });

  it(`a rate exactly ${FX_PIN_MAX_AGE_DAYS} days old is still fresh — the threshold is a ceiling`, () => {
    const asOf = new Date(NOW.getTime() - FX_PIN_MAX_AGE_DAYS * 86_400_000).toISOString();
    expect(isStalePin(pin({ asOf }), NOW)).toBe(false);
  });

  it(`a rate one day past ${FX_PIN_MAX_AGE_DAYS} days is stale`, () => {
    const asOf = new Date(NOW.getTime() - (FX_PIN_MAX_AGE_DAYS + 1) * 86_400_000).toISOString();
    expect(isStalePin(pin({ asOf }), NOW)).toBe(true);
  });

  it('reads asOf, NOT pinnedAt — an old rate pinned today is still an old rate', () => {
    // The distinction that makes staleness mean anything. A buyer recording a
    // three-week-old rate this morning has not made it current, and measuring
    // from `pinnedAt` would say they had.
    const stale = pin({
      asOf: '2026-07-01', // 30 days before NOW
      pinnedAt: '2026-07-31T08:00:00.000Z', // pinned an hour ago
    });
    expect(isStalePin(stale, NOW)).toBe(true);
  });

  it('an UNREADABLE vintage is treated as stale, never as fresh', () => {
    // Defaulting the other way would rank on a rate whose age nobody can
    // establish — an unparseable date is not evidence of currency.
    expect(isStalePin(pin({ asOf: 'not-a-date' }), NOW)).toBe(true);
    expect(isStalePin(pin({ asOf: '' }), NOW)).toBe(true);
  });
});

describe('pinAgeDays — a refusal can say HOW stale, not merely that it is', () => {
  it('counts whole days from the vintage', () => {
    expect(pinAgeDays(pin({ asOf: '2026-07-31T09:00:00.000Z' }), NOW)).toBe(0);
    expect(pinAgeDays(pin({ asOf: '2026-07-24T09:00:00.000Z' }), NOW)).toBe(7);
  });

  it('returns null for an unreadable vintage rather than a made-up number', () => {
    expect(pinAgeDays(pin({ asOf: 'nonsense' }), NOW)).toBeNull();
  });
});

describe('isUsableRate — the 4a-FIND-01 class, closed at the rate', () => {
  it('accepts a finite positive rate', () => {
    expect(isUsableRate(17_250)).toBe(true);
    expect(isUsableRate(0.0001)).toBe(true);
  });

  it.each<[unknown, string]>([
    [0, 'zero — a division that produces nonsense'],
    [-1, 'negative — an inverted comparison'],
    [NaN, 'NaN — which `typeof x === "number"` would have admitted'],
    [Infinity, 'Infinity'],
    ['17250', 'a numeric STRING, which would coerce silently elsewhere'],
    [null, 'null'],
    [undefined, 'absent'],
  ])('refuses %s (%s)', (value) => {
    expect(isUsableRate(value)).toBe(false);
  });
});

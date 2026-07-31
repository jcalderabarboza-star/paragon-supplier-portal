import { describe, it, expect } from 'vitest';
import {
  BID_CURRENCIES,
  BASE_CURRENCY,
  isBidCurrency,
  type BidCurrency,
} from './currencyPolicy';
import { sourcingEn, sourcingId } from './i18n/sourcing';
import { SPREAD_BASIS, type SilentReason } from './shouldCostSpread';

describe('currencyPolicy — the ruling itself', () => {
  it('permits exactly the three currencies the operator ruled on', () => {
    // Not a smoke test: this array IS the ruling. Anything added here without a
    // ruling should fail review at this line, and anything the ruling adds later
    // (CNY) should land here and nowhere else.
    expect(BID_CURRENCIES).toEqual(['IDR', 'USD', 'EUR']);
  });

  it('leads with the base currency, so the form defaults to what it renders first', () => {
    expect(BID_CURRENCIES[0]).toBe(BASE_CURRENCY);
  });

  it('names a base currency that is itself permissible', () => {
    // A base currency outside the permitted list would make every currency-absent
    // quotation unrepresentable the moment it was read back.
    expect(BID_CURRENCIES).toContain(BASE_CURRENCY);
  });
});

describe('isBidCurrency — the string→policy boundary', () => {
  it.each(BID_CURRENCIES)('accepts %s', (c) => {
    expect(isBidCurrency(c)).toBe(true);
  });

  it.each([
    ['CNY', 'a real currency that is not permitted (the CNY-is-config case)'],
    ['idr', 'the right currency in the wrong case'],
    ['', 'the empty string'],
    ['IDR ', 'a permitted code with trailing whitespace'],
    ['Rp', 'a currency SYMBOL rather than an ISO code'],
  ])('refuses %s — %s', (value) => {
    expect(isBidCurrency(value)).toBe(false);
  });

  it('does not accept a substring of a permitted code', () => {
    // Guards the predicate against ever being written as a `.some(startsWith)`
    // or an `.includes()` over the joined string.
    expect(isBidCurrency('US')).toBe(false);
    expect(isBidCurrency('USDX')).toBe(false);
  });
});

describe('policy is wider than capability, never narrower', () => {
  // The should-cost engine prices two of the three permitted currencies. That gap
  // is deliberate (D-4) — a currency being legal to bid in does not conjure a
  // commodity basket or an FX pair to price it against — but it must only ever
  // open in ONE direction.
  //
  // 2e-c-5 — read from the ENGINE'S OWN table rather than a local copy of it.
  // This spec used to hand-list `['IDR','USD']`, which meant the guard against
  // policy/capability drift could itself drift from the capability it guarded.
  const SPREAD_CURRENCIES = Object.keys(SPREAD_BASIS) as readonly string[];

  it('permits every currency the should-cost engine can price', () => {
    // If this fails, an engine branch exists for a currency nobody may bid in:
    // dead code at best, and at worst a branch reachable through some other path
    // that policy no longer sanctions.
    for (const c of SPREAD_CURRENCIES) {
      expect(isBidCurrency(c)).toBe(true);
    }
  });

  it('permits at least one currency the engine cannot price', () => {
    // The inverse guard, and the reason `currency-unsupported` exists. If this
    // ever fails, the gap has closed and the honest-silence branch is dead —
    // which is a fine outcome, but it must be a decision, not a drift.
    const unpriceable = BID_CURRENCIES.filter(
      (c) => !SPREAD_CURRENCIES.includes(c),
    );
    expect(unpriceable).toEqual(['EUR']);
  });
});

describe('every honest silence can actually be said, in both languages', () => {
  // The reason a spread is absent is only honest if the surface can render it.
  // A `SilentReason` with no string renders its own key at the buyer — which
  // would be a new, sillier kind of dishonesty.
  const REASONS: readonly SilentReason[] = [
    'unmapped',
    'tail',
    'unit-mismatch',
    'currency-unsupported',
  ];

  it.each(REASONS)('renders reason %s in EN and ID', (reason) => {
    const key = `sourcing.cmp.spread.silent.${reason}`;
    expect(sourcingEn[key]).toBeTruthy();
    expect(sourcingId[key]).toBeTruthy();
    // Not the same string in both locales — an untranslated ID entry is a
    // copy-paste, not a translation.
    expect(sourcingId[key]).not.toBe(sourcingEn[key]);
  });
});

describe('the type derives from the list (compile-level, asserted here)', () => {
  it('accepts every list member where a BidCurrency is required', () => {
    // If `BidCurrency` were ever re-hand-written beside `BID_CURRENCIES` and the
    // two drifted, this assignment stops compiling — which is the whole point of
    // the file. The runtime expectation is incidental; the type-check is the test.
    const all: BidCurrency[] = [...BID_CURRENCIES];
    expect(all).toHaveLength(BID_CURRENCIES.length);
  });
});

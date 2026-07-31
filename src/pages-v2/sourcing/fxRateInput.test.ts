import { describe, it, expect } from 'vitest';
import { readFxRate, readFxVintage } from './fxRateInput';

// The CP-0 signature defect at the worst possible field. A misread BID loses one
// supplier the award; a misread RATE re-denominates every foreign bid on the RFQ
// and decides it. These specs exist so that never becomes a `Number()` call.
describe('readFxRate — the ONE read of a typed exchange rate', () => {
  it('reads an unambiguous rate', () => {
    expect(readFxRate('17250')).toEqual({ ok: true, value: 17_250 });
  });

  it('THE LOCK — "17.250" REFUSES rather than being guessed', () => {
    // 17,250 in Indonesian, 17.25 in English. A 1000× difference on the basis
    // the whole comparison is ranked against, and both readings are legitimate,
    // so there is no honest way to pick one. Same ruling as readBidPrice: no
    // convention hint, so an ambiguous token refuses.
    const r = readFxRate('17.250');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'AMBIGUOUS_QTY' });
  });

  it('accepts a token both conventions agree on', () => {
    // "17250.5" reads the same either way, so there is nothing to refuse.
    expect(readFxRate('17250.5')).toEqual({ ok: true, value: 17_250.5 });
  });

  it('refuses a blank — an untouched field is not a rate', () => {
    expect(readFxRate('')).toMatchObject({ ok: false, reason: 'EMPTY_QTY' });
    expect(readFxRate('   ')).toMatchObject({ ok: false, reason: 'EMPTY_QTY' });
  });

  it.each(['abc', 'Rp 17250', '17250 IDR', '1e5'])('refuses unreadable token %s', (raw) => {
    expect(readFxRate(raw)).toMatchObject({ ok: false, reason: 'NOT_NUMERIC' });
  });

  it('refuses ZERO by its own name — readable, and not a rate', () => {
    // Distinct from NOT_NUMERIC on purpose: the buyer typed something the
    // parser understood perfectly, and the refusal is a domain rule. A zero
    // rate would value every foreign bid at nothing and hand the award to it.
    expect(readFxRate('0')).toMatchObject({ ok: false, reason: 'ZERO_RATE' });
  });

  it('refuses a negative — the parser never admits the sign at all', () => {
    // `normalizeQty` only accepts [\d.,], so a minus is NOT_NUMERIC before any
    // domain rule runs. Asserted so the guard is not "simplified" later on the
    // assumption that a sign check exists downstream.
    expect(readFxRate('-17250')).toMatchObject({ ok: false, reason: 'NOT_NUMERIC' });
  });

  it('accepts a small fractional rate — not every pair is thousands-scaled', () => {
    // EUR/USD-shaped rates are ~1.08. The gate must not assume a rupiah-sized
    // number just because rupiah is the base today.
    expect(readFxRate('1.08')).toEqual({ ok: true, value: 1.08 });
  });
});

describe('readFxVintage — a rate is only a fact AS OF a date', () => {
  const NOW = new Date('2026-07-31T09:00:00.000Z');

  it('accepts a past date', () => {
    expect(readFxVintage('2026-07-30', NOW)).toEqual({ ok: true, value: '2026-07-30' });
  });

  it('accepts today', () => {
    expect(readFxVintage('2026-07-31', NOW)).toEqual({ ok: true, value: '2026-07-31' });
  });

  it('THE LOCK — refuses a FUTURE vintage', () => {
    // Beyond being incoherent (a rate cannot have been true tomorrow), a future
    // vintage DEFEATS THE STALENESS GATE outright: a rate dated next month
    // never ages past FX_PIN_MAX_AGE_DAYS, so it would rank forever without
    // ever asking to be superseded.
    expect(readFxVintage('2026-08-01', NOW)).toMatchObject({
      ok: false,
      reason: 'FUTURE_VINTAGE',
    });
  });

  it('refuses a blank', () => {
    expect(readFxVintage('', NOW)).toMatchObject({ ok: false, reason: 'EMPTY_VINTAGE' });
  });

  it('refuses an unreadable date', () => {
    expect(readFxVintage('last Tuesday', NOW)).toMatchObject({
      ok: false,
      reason: 'UNREADABLE_VINTAGE',
    });
  });

  it('compares at DAY granularity, not by instant', () => {
    // "Today" must stay acceptable all day, whatever the clock's time — a rate
    // stated as of today is not in the future because it is 23:00 somewhere.
    expect(readFxVintage('2026-07-31', new Date('2026-07-31T00:00:01.000Z')).ok).toBe(true);
    expect(readFxVintage('2026-07-31', new Date('2026-07-31T23:59:59.000Z')).ok).toBe(true);
  });
});

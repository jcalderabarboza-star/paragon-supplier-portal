// CP-0 · W1 · 2e-b — the two integer counts on the quote form, headlessly.
//
// At the PURE layer for the same reason the price spec is (Correction-2): both
// fields were `type="number"`, and jsdom implements the number-input
// value-sanitization algorithm faithfully, so "2,5" and "1.500" arrived as ""
// and half the refusals below were literally untypeable through the DOM. Testing
// the primitive proves each rule regardless of what the input element does — and
// every negation is paired with the positive twin that shows the refusal is a
// rule, not a broken field.

import { describe, it, expect } from 'vitest';
import { readLeadTimeDays, readMoq } from './quotationCounts';

describe('readLeadTimeDays — the ONE read of a supplier lead-time promise', () => {
  it('reads an unambiguous lead time in each unit', () => {
    expect(readLeadTimeDays('14', 'days')).toEqual({ ok: true, days: 14 });
    expect(readLeadTimeDays('3', 'weeks')).toEqual({ ok: true, days: 21 });
  });

  it('refuses the ID/EN thousands collision rather than guessing', () => {
    expect(readLeadTimeDays('1.500', 'days')).toEqual({
      ok: false,
      reason: 'AMBIGUOUS_QTY',
    });
    // POSITIVE TWIN — same intent, typed unambiguously.
    expect(readLeadTimeDays('1500', 'days')).toEqual({ ok: true, days: 1500 });
  });

  it('refuses text and a negative promise', () => {
    expect(readLeadTimeDays('two weeks', 'weeks')).toEqual({
      ok: false,
      reason: 'NOT_NUMERIC',
    });
    expect(readLeadTimeDays('-5', 'days')).toEqual({
      ok: false,
      reason: 'NOT_NUMERIC',
    });
    // POSITIVE TWIN
    expect(readLeadTimeDays('5', 'days')).toEqual({ ok: true, days: 5 });
  });

  it('refuses a blank lead time — the field is required, and blank is not 0', () => {
    expect(readLeadTimeDays('', 'days')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
    expect(readLeadTimeDays('   ', 'weeks')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
  });

  describe('a lead time is a WHOLE number of days', () => {
    it('refuses a fractional day count — in either unit', () => {
      expect(readLeadTimeDays('2,5', 'days')).toEqual({
        ok: false,
        reason: 'FRACTIONAL_DAYS',
      });
      // The conversion happens INSIDE the parse, so "2,5 weeks" (17.5 days) is
      // caught for the same reason — it cannot slip through by being whole in
      // the unit the supplier happened to pick.
      expect(readLeadTimeDays('2,5', 'weeks')).toEqual({
        ok: false,
        reason: 'FRACTIONAL_DAYS',
      });
    });

    it('POSITIVE TWIN — the neighbouring whole answers are both accepted', () => {
      expect(readLeadTimeDays('17', 'days')).toEqual({ ok: true, days: 17 });
      expect(readLeadTimeDays('18', 'days')).toEqual({ ok: true, days: 18 });
      expect(readLeadTimeDays('3', 'weeks')).toEqual({ ok: true, days: 21 });
    });
  });

  describe('the domain rule: zero is not a lead time (2e-b)', () => {
    it('refuses a typed zero by NAME — not as "unreadable", not as "blank"', () => {
      expect(readLeadTimeDays('0', 'days')).toEqual({
        ok: false,
        reason: 'ZERO_LEAD_TIME',
      });
      expect(readLeadTimeDays('0', 'weeks')).toEqual({
        ok: false,
        reason: 'ZERO_LEAD_TIME',
      });
      expect(readLeadTimeDays('0', 'days')).not.toEqual(readLeadTimeDays('', 'days'));
      expect(readLeadTimeDays('0', 'days')).not.toEqual(readLeadTimeDays('x', 'days'));
    });

    it('POSITIVE TWIN — the fastest real promise is accepted; only zero refuses', () => {
      expect(readLeadTimeDays('1', 'days')).toEqual({ ok: true, days: 1 });
    });
  });
});

describe('readMoq — a stated minimum, or an honest silence', () => {
  it('reads a whole quantity', () => {
    expect(readMoq('10000')).toEqual({ ok: true, units: 10_000 });
  });

  it('BLANK IS LEGAL — it is the field\'s documented default, not a refusal', () => {
    // "Leave blank if same as RFQ qty". `null` says the supplier stated no
    // minimum of their own; it is NOT flattened into a stated 0.
    expect(readMoq('')).toEqual({ ok: true, units: null });
    expect(readMoq('   ')).toEqual({ ok: true, units: null });
  });

  it('a typed ZERO is legal here, and is a DIFFERENT fact from blank', () => {
    // Unlike a price or a lead time, "no minimum at all" is a real, harmless
    // claim that enters no ranking — which is why the zero rule is per-field.
    expect(readMoq('0')).toEqual({ ok: true, units: 0 });
    expect(readMoq('0')).not.toEqual(readMoq(''));
  });

  it('refuses the thousands collision rather than guessing', () => {
    // "10.000" is ten thousand or ten — a 1000× difference in whether this
    // supplier can fill the order at all.
    expect(readMoq('10.000')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    // POSITIVE TWIN
    expect(readMoq('10000')).toEqual({ ok: true, units: 10_000 });
  });

  it('refuses text and a fractional unit count', () => {
    expect(readMoq('ten thousand')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    expect(readMoq('10,5')).toEqual({ ok: false, reason: 'FRACTIONAL_UNITS' });
    // POSITIVE TWIN
    expect(readMoq('11')).toEqual({ ok: true, units: 11 });
  });
});

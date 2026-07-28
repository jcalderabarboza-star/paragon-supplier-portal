// CP-0 · W1 · 2e-b-1 — the lead-time read, headlessly, in all four states.
//
// At the PURE layer for the reason Correction-2 keeps insisting on: the live
// field was `type="number"`, and jsdom implements the number-input
// value-sanitization algorithm faithfully — so "abc" arrived as "" and the
// refusal under test was not merely untested, it was UNTYPEABLE. Worse, with
// blank now legal, a browser-erased "abc" would look exactly like an honest
// absence. Testing the primitive proves each state regardless of the element,
// and every negation is paired with the positive twin that shows the refusal is
// a rule rather than a broken field.

import { describe, it, expect } from 'vitest';
import { readLeadTimeDays } from './quotationLeadTime';

const ok = (days: number | null, ack = false) => ({
  ok: true,
  days,
  requiresSameDayAck: ack,
});

describe('readLeadTimeDays — four states, and no fabricated number in any of them', () => {
  describe('BLANK → absent (legal, and NOT a score)', () => {
    it('reads an empty field as an absence, never as a zero', () => {
      // The whole batch in one assertion: `days` is null, not 0. On the
      // absolute axis a 0 is 100 — the best possible lead-time score — so a
      // blank that resolved to 0 would make silence the strongest promise on
      // the form.
      expect(readLeadTimeDays('', 'days')).toEqual(ok(null));
      expect(readLeadTimeDays('   ', 'weeks')).toEqual(ok(null));
    });

    it('is NOT a refusal — the field is optional', () => {
      expect(readLeadTimeDays('', 'days').ok).toBe(true);
    });

    it('is a DIFFERENT outcome from a stated 0', () => {
      expect(readLeadTimeDays('', 'days')).not.toEqual(readLeadTimeDays('0', 'days'));
    });
  });

  describe('UNREADABLE → refused (never defaulted, never truncated)', () => {
    it('refuses text — the token the number field used to erase to ""', () => {
      expect(readLeadTimeDays('abc', 'days')).toEqual({
        ok: false,
        reason: 'NOT_NUMERIC',
      });
      // A negative promise needs no branch of its own — the parser rejects the
      // sign before any convention is considered.
      expect(readLeadTimeDays('-5', 'days')).toEqual({
        ok: false,
        reason: 'NOT_NUMERIC',
      });
    });

    it('refuses a fractional day rather than truncating it', () => {
      // "3.5" is the FIND-05 token. The retired path answered it with 3 — a
      // promise one day earlier than the supplier made, and enough to take a
      // recommendation from an honest 4-day rival.
      expect(readLeadTimeDays('3.5', 'days')).toEqual({
        ok: false,
        reason: 'FRACTIONAL_DAYS',
      });
      // The conversion happens INSIDE the parse, so a fraction cannot slip
      // through by being whole in the unit the supplier happened to pick.
      expect(readLeadTimeDays('2,5', 'weeks')).toEqual({
        ok: false,
        reason: 'FRACTIONAL_DAYS',
      });
    });

    it('refuses the ID/EN thousands collision rather than guessing', () => {
      expect(readLeadTimeDays('1.500', 'days')).toEqual({
        ok: false,
        reason: 'AMBIGUOUS_QTY',
      });
    });

    it('THE LOCK — no unreadable value produces a number, least of all 0', () => {
      for (const raw of ['abc', '3.5', '1.500', '-5', '4 days']) {
        const out = readLeadTimeDays(raw, 'days');
        expect(out.ok).toBe(false);
        expect(out).not.toHaveProperty('days');
      }
    });

    it('POSITIVE TWIN — the same intents, typed readably, are all accepted', () => {
      expect(readLeadTimeDays('4', 'days')).toEqual(ok(4));
      expect(readLeadTimeDays('1500', 'days')).toEqual(ok(1500));
      expect(readLeadTimeDays('3', 'weeks')).toEqual(ok(21));
    });
  });

  describe('INTEGER ≥ 1 → scored normally', () => {
    it('reads whole days and whole weeks', () => {
      expect(readLeadTimeDays('14', 'days')).toEqual(ok(14));
      expect(readLeadTimeDays('2', 'weeks')).toEqual(ok(14));
    });

    it('owes no acknowledgement', () => {
      expect(readLeadTimeDays('1', 'days').ok && readLeadTimeDays('1', 'days')).toEqual(ok(1));
    });
  });

  describe('INTEGER 0 → legal, best, and ack-owed', () => {
    it('is ACCEPTED — same-day supply is real (the 2e-b-1 reversal)', () => {
      // Deliberately not a refusal: an earlier ruling refused it, and was
      // reversed. A supplier who can ship same-day is entitled to say so.
      expect(readLeadTimeDays('0', 'days').ok).toBe(true);
    });

    it('flags the same-day acknowledgement as owed — for a 0 in EITHER unit', () => {
      expect(readLeadTimeDays('0', 'days')).toEqual(ok(0, true));
      expect(readLeadTimeDays('0', 'weeks')).toEqual(ok(0, true));
    });

    it('is the ONLY value that owes one', () => {
      // The gate exists because 0 is both legitimate AND the value a typo or a
      // parse artifact produces. It must not spread to ordinary promises.
      for (const raw of ['1', '4', '14', '90']) {
        expect(readLeadTimeDays(raw, 'days').ok && readLeadTimeDays(raw, 'days')).toMatchObject({
          requiresSameDayAck: false,
        });
      }
      expect(readLeadTimeDays('', 'days')).toMatchObject({ requiresSameDayAck: false });
    });
  });
});

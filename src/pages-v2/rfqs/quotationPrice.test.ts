// CP-0 · W1 · 2e-a — the bid-price read, headlessly.
//
// This spec exists at the PURE layer on purpose (Correction-2). The live field
// was `type="number"`, and a number input's value-sanitization algorithm erases
// every comma/space token before React — or a jsdom test — ever sees it. So the
// comma branches below were literally untypeable and untestable through the DOM
// until ruling 6.2 flipped the field to text. Testing the primitive directly
// means each refusal is confirmable regardless of what any input element does
// with it, and each negation is paired with the positive twin that proves the
// refusal is a rule and not a broken field.

import { describe, it, expect } from 'vitest';
import { readBidPrice } from './quotationPrice';

describe('readBidPrice — the ONE read of a supplier bid price', () => {
  it('reads an unambiguous price', () => {
    expect(readBidPrice('15000')).toEqual({ ok: true, value: 15_000 });
    expect(readBidPrice('4500')).toEqual({ ok: true, value: 4_500 });
  });

  it('refuses the catastrophic ID/EN thousands collision rather than guessing', () => {
    // "1.500" is 1500 in Indonesian and 1.5 in English. The retired
    // parseFloat recipe silently chose 1.5 — a 1000× underbid that anchors
    // `minPrice` for the whole RFQ and takes the award.
    expect(readBidPrice('1.500')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    expect(readBidPrice('15.000')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    // POSITIVE TWIN — the same intent, typed unambiguously, is accepted. The
    // refusal is about readability, not about disliking the number.
    expect(readBidPrice('1500')).toEqual({ ok: true, value: 1_500 });
    expect(readBidPrice('15000')).toEqual({ ok: true, value: 15_000 });
  });

  it('reads a decimal that is legal under only ONE convention', () => {
    // "1,5" cannot be EN comma-thousands (that needs 3 trailing digits), so it
    // is unambiguously 1.5 — no refusal needed, and no guess made.
    expect(readBidPrice('1,5')).toEqual({ ok: true, value: 1.5 });
  });

  it('READS a fully-formatted price correctly — the token the number field used to eat', () => {
    // "15.000,50" is legal under ID only (EN cannot make "000,50" a fraction), so
    // there is nothing to be ambiguous about: it is fifteen thousand and fifty
    // cents, and it is now read as such. It never got that far before — the
    // `type="number"` field deleted the comma outright, so the supplier was told
    // "required field missing" for a price they had just typed, and the `|| 0`
    // stood ready to turn it into Rp 0 if it ever reached the builder.
    expect(readBidPrice('15.000,50')).toEqual({ ok: true, value: 15_000.5 });
    // Its EN twin reads to the same number, so that one is unambiguous too.
    expect(readBidPrice('15,000.50')).toEqual({ ok: true, value: 15_000.5 });
  });

  it('refuses text, currency chrome and separators it cannot resolve', () => {
    expect(readBidPrice('Rp 15.000')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    expect(readBidPrice('15 000')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    expect(readBidPrice('abc')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    // A negative bid needs no branch of its own — the parser rejects the sign.
    expect(readBidPrice('-15000')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    // POSITIVE TWIN
    expect(readBidPrice('15000')).toEqual({ ok: true, value: 15_000 });
  });

  it('refuses a blank price — a blank field is not a number', () => {
    expect(readBidPrice('')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
    expect(readBidPrice('   ')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
  });

  describe('the domain rule: zero is not a bid (JJ ruling, 2e-a)', () => {
    it('refuses a typed zero by NAME — not as "unreadable", not as "blank"', () => {
      expect(readBidPrice('0')).toEqual({ ok: false, reason: 'ZERO_PRICE' });
      expect(readBidPrice('0,00')).toEqual({ ok: false, reason: 'ZERO_PRICE' });
      expect(readBidPrice('0.00')).toEqual({ ok: false, reason: 'ZERO_PRICE' });
    });

    it('is a DIFFERENT refusal from an unreadable one — the supplier is told which rule', () => {
      // A zero reads perfectly; it is simply not an offer. Collapsing it into
      // NOT_NUMERIC would tell the supplier to fix their typing when what they
      // need to fix is their bid.
      expect(readBidPrice('0')).not.toEqual(readBidPrice('abc'));
      expect(readBidPrice('0')).not.toEqual(readBidPrice(''));
    });

    it('POSITIVE TWIN — the smallest real price is accepted; only zero itself refuses', () => {
      expect(readBidPrice('1')).toEqual({ ok: true, value: 1 });
      expect(readBidPrice('0,01')).toEqual({ ok: true, value: 0.01 });
    });
  });
});

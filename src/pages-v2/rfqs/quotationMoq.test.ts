// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · 2e-b-2 — the minimum-order-quantity read, and the three states it
// can honestly be in (FIND-02).
//
// The defect this locks is not a misreading — it is a DISAPPEARANCE. The field
// existed, accepted input, and threw it away. So the first thing asserted here
// is the positive: a stated minimum is a value, blank is an answer, and the two
// are different facts (Correction-2).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readMoq } from './quotationMoq';

describe('readMoq — a stated minimum is preserved exactly', () => {
  it('reads a plain quantity as itself', () => {
    const r = readMoq('10000');
    expect(r.ok && r.moq).toBe(10_000);
  });

  it('reads a token that is only legal one way — no hint needed', () => {
    // "50,00" cannot be EN thousands (a group must be exactly 3 digits), so the
    // only reading left is the ID decimal one. The parser takes it because there
    // is nothing to be ambiguous WITH.
    expect(readMoq('50,00')).toEqual({ ok: true, moq: 50 });
  });

  it('reads a fractional minimum — no whole-number rule here, deliberately', () => {
    // Lead time gets FRACTIONAL_DAYS because a delivery promise is whole days.
    // A minimum order quantity is denominated in the RFQ's UOM — 2.5 KG is an
    // ordinary commercial minimum, and refusing it would block a legal bid.
    expect(readMoq('2.5')).toEqual({ ok: true, moq: 2.5 });
  });

  it('surrounding whitespace is not an input error', () => {
    expect(readMoq('  10000  ')).toEqual({ ok: true, moq: 10_000 });
  });
});

describe('readMoq — BLANK is an ANSWER ("same as RFQ qty"), never a refusal', () => {
  it('an empty field resolves to a stated absence, not an error', () => {
    // The field's own documented default. `normalizeQty` names emptiness
    // EMPTY_QTY, which is right for a required field and wrong here; the domain
    // ruling lives at this layer, where the field's meaning is known.
    expect(readMoq('')).toEqual({ ok: true, moq: null });
    expect(readMoq('   ')).toEqual({ ok: true, moq: null });
  });

  it('THE LOCK — an absent minimum is `null`, and null is not zero', () => {
    const r = readMoq('');
    expect(r.ok && r.moq).toBeNull();
    // The whole reason absence has its own value: `0` would be a different
    // claim ("my minimum is nothing") sharing a slot with "I said nothing",
    // and every `|| 0` in the portal's history has collapsed exactly this pair.
    expect(r.ok && r.moq === 0).toBe(false);
  });
});

describe('readMoq — a stated value that cannot be read REFUSES', () => {
  it('refuses a non-numeric token instead of dropping it', () => {
    // The retired path dropped this and every other value silently. Refusing is
    // the smaller change in behaviour AND the honest one: the supplier typed a
    // constraint, so they are told it did not land.
    expect(readMoq('abc')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
  });

  it('refuses an ambiguous token rather than guessing a 1000× error', () => {
    // "1.500" is 1500 in Indonesian and 1.5 in English. A minimum order
    // quantity read 1000× low is not a smaller constraint — it is a wrong fact
    // shown to a buyer as a commercial term.
    expect(readMoq('1.500')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    // The ordinary way a supplier writes ten thousand is ambiguous BOTH ways
    // round, which is why the field's hint asks for digits only.
    expect(readMoq('10,000')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    expect(readMoq('10.000')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
  });

  it('refuses a stated ZERO by name — a minimum of nothing is not a minimum', () => {
    expect(readMoq('0')).toEqual({ ok: false, reason: 'ZERO_MOQ' });
    // Named, not folded into "unreadable": the supplier who typed 0 needs to be
    // told to clear the field, not told their digits were illegible.
  });

  it('refuses a negative quantity (NOT_NUMERIC, at the parser)', () => {
    expect(readMoq('-5')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
  });

  it('COUNTERFACTUAL — the retired treatments both produce a wrong fact', () => {
    // What the surface used to do with these tokens, stated as the two shapes
    // this module now makes unexpressible:
    //   · DROP  — `readMoq('abc')` → nothing, indistinguishable from blank, so
    //     an unreadable constraint became "no minimum";
    //   · `|| 0` — the coercion habit this arc has been retiring, which turns
    //     the same token into a stated minimum of zero.
    const dropped = readMoq('abc');
    expect(dropped.ok).toBe(false); // NOT silently the blank case
    expect(readMoq('abc')).not.toEqual(readMoq('')); // the two are distinguishable
  });
});

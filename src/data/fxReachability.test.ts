// ────────────────────────────────────────────────────────────────────────────
// CP-0 · 2e-c-6 — the reachability fixtures are what they claim to be.
//
// A demo fixture is a claim about what a human will see. Left unguarded it rots
// silently: someone edits a price, the neutral pair stops being neutral, and the
// smoke script keeps saying what the screen no longer says. QA-PERSONA-01 is
// exactly this — reachability is a property of the fixture set, not a guarantee
// — so the properties the smoke script depends on are pinned here.
//
// These specs read the SHIPPED fixtures. They are not a second copy of them.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockRfqs } from './mockRfqs';
import { mockQuotations, type Quotation } from './mockQuotations';
import { scoreQuotations, type ScorableQuote } from '../lib/quoteScore';
import { effectivePin, pinHistory, isStalePin } from '../lib/fxPin';
import { FX_PIN_MAX_AGE_DAYS, BASE_CURRENCY, type BidCurrency } from '../lib/currencyPolicy';
import type { FxPin } from '../lib/fxPin';

const rfq = (id: string) => {
  const found = mockRfqs.find((r) => r.id === id);
  if (!found) throw new Error(`fixture ${id} is missing`);
  return found;
};
const quotesFor = (rfqId: string) => mockQuotations.filter((q) => q.rfqId === rfqId);

/** The surface's own boundary: absent currency resolves to base, once. */
const scorable = (q: Quotation): ScorableQuote => ({
  id: q.id,
  unitPrice: q.unitPrice,
  currency: q.currency ?? BASE_CURRENCY,
  leadTimeDays: q.leadTimeDays,
  complianceScore: q.complianceScore,
  reliabilityScore: q.reliabilityScore,
});

const priceOf = (scores: readonly { quoteId: string; priceScore: number }[], id: string) =>
  scores.find((s) => s.quoteId === id)!.priceScore;

describe('rfq-012 — the mixed-currency neutral fixture', () => {
  const quotes = quotesFor('rfq-012');

  it('carries exactly one rupiah bid and one dollar bid', () => {
    expect(quotes.map((q) => q.id)).toEqual(['qt-012a', 'qt-012b']);
    expect(quotes.map((q) => q.currency)).toEqual(['IDR', 'USD']);
  });

  it('THE NEUTRALITY — identical on every scored axis except the money', () => {
    // The fixture's entire value is that currency is the only thing that can
    // move the recommendation. If a later edit separates the two bids on lead
    // time or compliance, the demonstration silently becomes a different one.
    const [a, b] = quotes;
    expect(b.leadTimeDays).toBe(a.leadTimeDays);
    expect(b.complianceScore).toBe(a.complianceScore);
    expect(b.reliabilityScore).toBe(a.reliabilityScore);
    expect(b.paymentTermsOffered).toBe(a.paymentTermsOffered);
    expect(b.validUntil).toBe(a.validUntil);
    expect(b.submittedAt).toBe(a.submittedAt);
    expect(b.moq).toBe(a.moq);
  });

  it('is DELIBERATELY UNPINNED — the cold-boot state is the refusal', () => {
    expect(rfq('rfq-012').fxPins).toBeUndefined();
  });

  it('THE FIRST OUTCOME — it refuses FX_UNPINNED, naming USD', () => {
    const outcome = scoreQuotations(quotes.map(scorable));
    expect(outcome).toEqual({
      kind: 'refused',
      reason: 'FX_UNPINNED',
      currencies: ['USD'],
    });
  });

  it('THE SECOND OUTCOME — a recorded rate ranks it, and the rupiah bid wins', () => {
    // What the smoke script's step 4 produces. 1.65 USD × 17,250 = 28,462.50 IDR
    // against a 27,500 IDR bid: the two offers are about 3.5% apart — a genuine
    // commercial call — and the domestic bid is the better one by a little.
    const pins: FxPin[] = [
      {
        quote: 'USD',
        base: 'IDR',
        rate: 17_250,
        asOf: '2026-05-18',
        pinnedAt: '2026-05-18T00:00:00.000Z',
        source: 'MANUAL',
        liveness: 'SIMULATED',
      },
    ];
    const outcome = scoreQuotations(quotes.map(scorable), {
      pins,
      now: new Date('2026-05-20T00:00:00.000Z'),
    });
    if (outcome.kind !== 'scored') throw new Error(`expected scored, got ${outcome.reason}`);

    expect(priceOf(outcome.scores, 'qt-012a')).toBe(100);
    expect(priceOf(outcome.scores, 'qt-012b')).toBe(97);
    expect(outcome.scores.find((s) => s.topRanked)!.quoteId).toBe('qt-012a');
    expect(outcome.basis.currency).toBe('IDR');
    expect(outcome.basis.homogeneous).toBe(false);
  });

  it('THE WITNESS — ignore the currency and the WRONG supplier is recommended', () => {
    // The defect the refusal exists to prevent (2e-c-2-FIND-01), reproduced on
    // the shipped fixture. Declare both bids rupiah — which is exactly what the
    // engine saw before currency reached it — and ratio-to-best compares the
    // bare numerals 27,500 and 1.65. The honest rupiah bid does not merely lose:
    // it scores ZERO on price, the worst value the axis has, and the
    // recommendation flips to a supplier who is not actually cheaper.
    const blind = quotes.map((q) => ({ ...scorable(q), currency: 'IDR' as BidCurrency }));
    const outcome = scoreQuotations(blind);
    if (outcome.kind !== 'scored') throw new Error('the currency-blind set should score');

    expect(priceOf(outcome.scores, 'qt-012a')).toBe(0);
    expect(priceOf(outcome.scores, 'qt-012b')).toBe(100);
    expect(outcome.scores.find((s) => s.topRanked)!.quoteId).toBe('qt-012b');
  });
});

describe('rfq-013 — the pinned twin', () => {
  const twelve = quotesFor('rfq-012');
  const thirteen = quotesFor('rfq-013');

  it('THE CONTROL — its bids are identical to rfq-012’s, so only the pin differs', () => {
    // Asserted structurally rather than by eye: if the two RFQs ever diverge on
    // anything but their ledgers, the pair stops isolating the pin and the
    // fixture quietly starts teaching something else.
    const commercial = (q: Quotation) => ({
      unitPrice: q.unitPrice,
      currency: q.currency,
      leadTimeDays: q.leadTimeDays,
      complianceScore: q.complianceScore,
      reliabilityScore: q.reliabilityScore,
      paymentTermsOffered: q.paymentTermsOffered,
      validUntil: q.validUntil,
      submittedAt: q.submittedAt,
      supplierId: q.supplierId,
    });
    expect(thirteen.map(commercial)).toEqual(twelve.map(commercial));
  });

  it('carries an APPEND-ONLY ledger of two pins — the superseded one kept', () => {
    const pins = rfq('rfq-013').fxPins!;
    expect(pins).toHaveLength(2);
    expect(pinHistory(pins, 'USD')).toHaveLength(2);
    // Derived, not read off the array's last position.
    expect(effectivePin(pins, 'USD')!.rate).toBe(17_310);
    expect(pins[0].rate).toBe(17_180);
  });

  it('every seeded pin is honestly marked SIMULATED and MANUAL', () => {
    for (const pin of rfq('rfq-013').fxPins!) {
      expect(pin.liveness).toBe('SIMULATED');
      expect(pin.source).toBe('MANUAL');
      expect(pin.base).toBe(BASE_CURRENCY);
    }
  });

  it('THE THIRD OUTCOME — it refuses FX_STALE, and will do so forever', () => {
    // Measured against the real clock, then against a far future one. This is
    // the property that makes the fixture non-decaying: a literal vintage can
    // hold "stale" permanently, and can hold "fresh" for exactly
    // FX_PIN_MAX_AGE_DAYS days. So the fixture owns the refusal, and the ranked
    // outcome is produced by a buyer recording a rate under their own clock.
    for (const now of [new Date(), new Date('2031-01-01T00:00:00.000Z')]) {
      expect(scoreQuotations(thirteen.map(scorable), { pins: rfq('rfq-013').fxPins, now })).toEqual({
        kind: 'refused',
        reason: 'FX_STALE',
        currencies: ['USD'],
      });
    }
  });

  it('was FRESH the day after its vintage — staleness is elapsed time, not a malformed pin', () => {
    // The positive twin. Without it, a pin refused for being unreadable would
    // pass the spec above and look identical from the outside.
    const pin = effectivePin(rfq('rfq-013').fxPins, 'USD')!;
    expect(isStalePin(pin, new Date('2026-05-17T00:00:00.000Z'))).toBe(false);
    expect(
      scoreQuotations(thirteen.map(scorable), {
        pins: rfq('rfq-013').fxPins,
        now: new Date('2026-05-17T00:00:00.000Z'),
      }).kind,
    ).toBe('scored');
  });

  it('turns stale exactly FX_PIN_MAX_AGE_DAYS after the vintage, not after the pinning', () => {
    // `asOf` is what ages, never `pinnedAt` — an old rate recorded this morning
    // is an old rate. Both pins here were recorded on their own vintage date, so
    // this also states which field the boundary is measured from.
    const pin = effectivePin(rfq('rfq-013').fxPins, 'USD')!;
    const vintage = new Date(pin.asOf).getTime();
    const day = 86_400_000;
    expect(isStalePin(pin, new Date(vintage + FX_PIN_MAX_AGE_DAYS * day))).toBe(false);
    expect(isStalePin(pin, new Date(vintage + (FX_PIN_MAX_AGE_DAYS + 1) * day))).toBe(true);
  });
});

describe('the arc’s other fixtures are undisturbed (the additive fence)', () => {
  it('rfq-009 still has NO recorded basis — it is the FX specs’ test bench', () => {
    expect(rfq('rfq-009').fxPins).toBeUndefined();
  });

  it('rfq-009 is homogeneous USD, so it scores with no pin at all', () => {
    const outcome = scoreQuotations(quotesFor('rfq-009').map(scorable));
    if (outcome.kind !== 'scored') throw new Error('the homogeneous exemption is broken');
    expect(outcome.basis.homogeneous).toBe(true);
    expect(outcome.basis.currency).toBe('USD');
    expect(outcome.basis.pins).toEqual([]);
  });

  it('rfq-012 and rfq-013 are the ONLY mixed-currency fixtures', () => {
    // States the reachability fact the smoke script rests on. If a later fixture
    // introduces a third mixed set, this fails and the script gets revisited —
    // rather than a buyer meeting an unexplained refusal on an RFQ nobody
    // documented.
    const mixed = mockRfqs
      .filter((r) => {
        const currencies = new Set(quotesFor(r.id).map((q) => q.currency ?? BASE_CURRENCY));
        return currencies.size > 1;
      })
      .map((r) => r.id);
    expect(mixed).toEqual(['rfq-012', 'rfq-013']);
  });
});

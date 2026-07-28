import { describe, it, expect } from 'vitest';
import {
  scoreQuotations,
  CRITERIA_WEIGHTS,
  AXIS_LIVENESS,
  COMPOSITE_LIVENESS,
  type ScorableQuote,
  type CriteriaWeights,
} from './quoteScore';
import { mockQuotations } from '../data/mockQuotations';

// A minimal two-quote set with hand-verifiable arithmetic. A is cheaper AND
// faster AND higher on the external axes, so it is unambiguously top-ranked.
const A: ScorableQuote = {
  id: 'A',
  unitPrice: 100,
  leadTimeDays: 10,
  complianceScore: 90,
  reliabilityScore: 80,
};
const B: ScorableQuote = {
  id: 'B',
  unitPrice: 200,
  leadTimeDays: 20,
  complianceScore: 70,
  reliabilityScore: 60,
};

describe('scoreQuotations — LIVE axes derive from the quote set', () => {
  it('priceScore: the cheapest quote anchors 100, others scale by ratio-to-best', () => {
    const [a, b] = scoreQuotations([A, B]);
    expect(a.priceScore).toBe(100); // 100 is the min → 100
    expect(b.priceScore).toBe(50); // 100/200 → 50
  });

  it('leadTimeScore: the fastest quote anchors 100, others scale by ratio-to-best', () => {
    const [a, b] = scoreQuotations([A, B]);
    // ── CP-0 · W1 · 2e-b-1 — the lead-time axis is no longer ratio-to-best ──
    // This spec asserted 10 → 100 / 20 → 50, i.e. that a lead time is scored
    // RELATIVE to the fastest bid in the set. Under the 2e-b-1 ruling the axis
    // is ABSOLUTE and linear — `max(0, 100 - days×2)` — because a 0-day lead
    // time must be the best score, and ratio-to-best cannot express that (a
    // `best` of 0 zeroes every rival). 10 → 80, 20 → 60: A still beats B, but
    // it beats it by the size of the real difference rather than by a ratio.
    expect(a.leadTimeScore).toBe(80); // 100 - 10×2
    expect(b.leadTimeScore).toBe(60); // 100 - 20×2
  });

  it('the lead-time axis is ABSOLUTE — a quote scores the same with or without rivals', () => {
    // The property ratio-to-best did not have, and the reason the axis changed:
    // a delivery promise is a fact about the supplier, not about the field.
    const [alone] = scoreQuotations([A]);
    const [withRival] = scoreQuotations([A, { ...B, leadTimeDays: 1 }]);
    expect(alone.leadTimeScore).toBe(80);
    expect(withRival.leadTimeScore).toBe(80);
  });

  it('a same-day (0-day) lead time is the BEST score, and does not zero its rivals', () => {
    // The ruling, and the thing ratio-to-best could not do: under it, a `best`
    // of 0 made `best/value` 0 for everyone, so one same-day quote collapsed the
    // whole set. Here 0 → 100 and B keeps the score its own promise earns.
    const [sameDay, b] = scoreQuotations([{ ...A, leadTimeDays: 0 }, B]);
    expect(sameDay.leadTimeScore).toBe(100);
    expect(b.leadTimeScore).toBe(60);
  });

  it('a lead time past the 50-day floor bottoms out at 0 rather than going negative', () => {
    const [slow] = scoreQuotations([{ ...A, leadTimeDays: 90 }]);
    expect(slow.leadTimeScore).toBe(0);
  });

  describe('an UNSTATED lead time is absent, not zero (2e-b-1)', () => {
    it('scores null — never a number nobody offered', () => {
      const [none] = scoreQuotations([{ ...A, leadTimeDays: null }]);
      expect(none.leadTimeScore).toBeNull();
    });

    it('THE LOCK — silence is NOT the best score', () => {
      // The defect this axis change would otherwise have created: on an
      // absolute scale, a defaulted 0 is 100. An absent lead time must not be
      // reachable as the maximum.
      const [none] = scoreQuotations([{ ...A, leadTimeDays: null }]);
      expect(none.leadTimeScore).not.toBe(100);
      expect(none.leadTimeScore).not.toBe(0); // and not the worst either
    });

    it('drops the axis from the composite instead of inventing a value', () => {
      // Weights renormalise over the axes actually stated, so the quote is
      // judged on price/compliance/reliability — neither rewarded nor punished
      // for the silence.
      const [none] = scoreQuotations([{ ...A, leadTimeDays: null }]);
      const w = CRITERIA_WEIGHTS;
      const expected = Math.round(
        (100 * w.price + 90 * w.compliance + 80 * w.reliability) /
          (w.price + w.compliance + w.reliability),
      );
      expect(none.composite).toBe(expected);
    });

    it('POSITIVE TWIN — stating a lead time still scores it normally', () => {
      const [stated] = scoreQuotations([A]);
      expect(stated.leadTimeScore).toBe(80);
    });
  });

  // Retitled from "a single quote is trivially best in its own set
  // (price/leadTime = 100)". Only PRICE is trivially best alone now — the
  // lead-time axis is absolute, so a lone 10-day quote scores the 80 its own
  // promise earns rather than a 100 it earned only by having no rival.
  it('a single quote anchors PRICE at 100; its lead time is scored on its own merits', () => {
    const [only] = scoreQuotations([A]);
    expect(only.priceScore).toBe(100);
    expect(only.leadTimeScore).toBe(80);
  });

  // Retitled from "guards a non-positive price/lead value to 0". The guard
  // still holds for PRICE — a zero price is not an offer and cannot anchor a
  // ratio. It is deliberately REVERSED for the lead time: 2e-b-1 rules that 0
  // days is same-day supply and therefore the best possible score, which is why
  // it is ack-gated at the input rather than guarded here.
  it('guards a non-positive PRICE to 0; a 0-day lead time is the best score, not a guarded one', () => {
    const [z] = scoreQuotations([{ ...A, id: 'Z', unitPrice: 0, leadTimeDays: 0 }, B]);
    expect(z.priceScore).toBe(0);
    expect(z.leadTimeScore).toBe(100);
    expect(Number.isFinite(z.composite)).toBe(true);
  });

  it('a negative lead time is not a promise — it scores as absent, never as best', () => {
    // Nothing in the UI can produce one (the parser rejects the sign), but the
    // engine is public: a nonsense value must not fall through to 100.
    const [neg] = scoreQuotations([{ ...A, leadTimeDays: -5 }]);
    expect(neg.leadTimeScore).toBeNull();
  });
});

describe('scoreQuotations — external axes are declared SIMULATED, passed through untouched', () => {
  it('compliance/reliability are the input values verbatim (never recomputed)', () => {
    const [a] = scoreQuotations([A, B]);
    expect(a.complianceScore).toBe(90);
    expect(a.reliabilityScore).toBe(80);
  });

  it('AXIS_LIVENESS marks price/leadTime LIVE and compliance/reliability SIMULATED', () => {
    expect(AXIS_LIVENESS.price).toBe('live');
    expect(AXIS_LIVENESS.leadTime).toBe('live');
    expect(AXIS_LIVENESS.compliance).toBe('simulated');
    expect(AXIS_LIVENESS.reliability).toBe('simulated');
  });
});

describe('scoreQuotations — composite is a weighted roll-up with weakest-link liveness', () => {
  it('composite = Σ(axis × weight), rounded', () => {
    const [a, b] = scoreQuotations([A, B]);
    // The lead-time terms moved with the axis (2e-b-1): A's 10 days scores 80
    // rather than a ratio-derived 100, and B's 20 days scores 60 rather than 50.
    // A: 100*.3 + 80*.2 + 90*.25 + 80*.25 = 30+16+22.5+20 = 88.5 → 89
    expect(a.composite).toBe(89);
    // B: 50*.3 + 60*.2 + 70*.25 + 60*.25 = 15+12+17.5+15 = 59.5 → 60
    expect(b.composite).toBe(60);
  });

  it('composite liveness is SIMULATED while any weighted axis is SIMULATED', () => {
    expect(COMPOSITE_LIVENESS).toBe('simulated');
    const [a] = scoreQuotations([A, B]);
    expect(a.compositeLiveness).toBe('simulated');
  });

  it('composite flips LIVE only when the SIMULATED axes carry no weight (two-gate on a derived score)', () => {
    const liveOnly: CriteriaWeights = {
      price: 0.6,
      leadTime: 0.4,
      compliance: 0,
      reliability: 0,
    };
    const [a] = scoreQuotations([A, B], liveOnly);
    expect(a.compositeLiveness).toBe('live');
  });

  it('honours a weights override for the composite value', () => {
    const priceOnly: CriteriaWeights = {
      price: 1,
      leadTime: 0,
      compliance: 0,
      reliability: 0,
    };
    const [a, b] = scoreQuotations([A, B], priceOnly);
    expect(a.composite).toBe(100);
    expect(b.composite).toBe(50);
  });
});

describe('scoreQuotations — topRanked = argmax(composite), carrying composite liveness', () => {
  it('marks exactly one quote top-ranked: the highest composite', () => {
    const scored = scoreQuotations([A, B]);
    expect(scored.filter((s) => s.topRanked)).toHaveLength(1);
    expect(scored.find((s) => s.topRanked)?.quoteId).toBe('A');
  });

  it('breaks a composite tie deterministically (first in input order wins)', () => {
    const twin: ScorableQuote = { ...A, id: 'A2' };
    const scored = scoreQuotations([A, twin]);
    expect(scored.filter((s) => s.topRanked)).toHaveLength(1);
    expect(scored.find((s) => s.topRanked)?.quoteId).toBe('A');
  });
});

describe('scoreQuotations — pure & deterministic', () => {
  it('returns [] for an empty set without throwing', () => {
    expect(scoreQuotations([])).toEqual([]);
  });

  it('preserves input order and produces identical output across calls', () => {
    const first = scoreQuotations([A, B]);
    const second = scoreQuotations([A, B]);
    expect(first.map((s) => s.quoteId)).toEqual(['A', 'B']);
    expect(first).toEqual(second);
  });

  it('does not mutate its inputs', () => {
    const input: ScorableQuote[] = [{ ...A }, { ...B }];
    const snapshot = JSON.parse(JSON.stringify(input));
    scoreQuotations(input);
    expect(input).toEqual(snapshot);
  });
});

describe('scoreQuotations — computes from data, not the stored fixture literal', () => {
  it('recomputes priceScore for rfq-001 (differs from the hand-authored literal)', () => {
    const rfq001 = mockQuotations.filter((q) => q.rfqId === 'rfq-001');
    const scored = scoreQuotations(rfq001);
    const cheapest = scored.find((s) => s.quoteId === 'qt-001c'); // unitPrice 188_000 = min
    // Fixture literal for qt-001c.priceScore is 93; the engine derives 100 (it is
    // the cheapest in the set). The drawer showing 100 proves it computes.
    expect(cheapest?.priceScore).toBe(100);
    expect(cheapest?.priceScore).not.toBe(93);
  });

  it('the weights are a fixed governed constant summing to 1 (C6-LOCK)', () => {
    const total =
      CRITERIA_WEIGHTS.price +
      CRITERIA_WEIGHTS.leadTime +
      CRITERIA_WEIGHTS.compliance +
      CRITERIA_WEIGHTS.reliability;
    expect(total).toBeCloseTo(1, 10);
  });
});

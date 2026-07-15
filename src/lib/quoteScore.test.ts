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
    expect(a.leadTimeScore).toBe(100); // 10 is the min → 100
    expect(b.leadTimeScore).toBe(50); // 10/20 → 50
  });

  it('a single quote is trivially best in its own set (price/leadTime = 100)', () => {
    const [only] = scoreQuotations([A]);
    expect(only.priceScore).toBe(100);
    expect(only.leadTimeScore).toBe(100);
  });

  it('guards a non-positive price/lead value to 0 (no NaN/Infinity)', () => {
    const [z] = scoreQuotations([{ ...A, id: 'Z', unitPrice: 0, leadTimeDays: 0 }, B]);
    expect(z.priceScore).toBe(0);
    expect(z.leadTimeScore).toBe(0);
    expect(Number.isFinite(z.composite)).toBe(true);
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
    // A: 100*.3 + 100*.2 + 90*.25 + 80*.25 = 30+20+22.5+20 = 92.5 → 93
    expect(a.composite).toBe(93);
    // B: 50*.3 + 50*.2 + 70*.25 + 60*.25 = 15+10+17.5+15 = 57.5 → 58
    expect(b.composite).toBe(58);
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

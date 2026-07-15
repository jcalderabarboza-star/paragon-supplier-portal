// ────────────────────────────────────────────────────────────────────────────
// Quote-scoring primitive (F0.3-FIND-01) — the governed engine that mints the
// comparison score axes so the buyer drawer COMPUTES them instead of reading
// hand-authored fixture literals (the fabricated-score root cause).
//
// Honest-by-construction, on two rulings:
//
//  • AXIS-HONESTY SPLIT (FORK-3B). price + leadTime are LIVE — deterministic
//    ratio-to-best rankings computed from the quote data in hand. compliance +
//    reliability are DECLARED-SIMULATED external-data axes (compliance = the I3
//    surface, still SIMULATED; reliability = needs real OTIF history): their
//    inputs are passed through VERBATIM, never recomputed from fixture
//    supplier-attributes — recomputing would dress SIMULATED data as LIVE.
//
//  • WEAKEST-LINK LIVENESS. The composite (and the topRanked flag it drives) is
//    LIVE only when EVERY weighted axis is LIVE — DERIVED from AXIS_LIVENESS, not
//    hardcoded, so it auto-flips the day compliance+reliability get real sources
//    (two-gate discipline on a derived score). Today it reads SIMULATED.
//
// C6-LOCK: CRITERIA_WEIGHTS are governed platform truth — a fixed scoring policy,
// NOT a user-editable formula. This module is pure (no I/O, no clock, no store).
// ────────────────────────────────────────────────────────────────────────────

export type Liveness = 'live' | 'simulated';

export interface CriteriaWeights {
  price: number;
  leadTime: number;
  compliance: number;
  reliability: number;
}

/**
 * The governed scoring policy (C6-LOCK). Fixed platform truth, weights sum to 1.
 * Not user-authored — the portal's one blessed weighting, never a per-user knob.
 */
export const CRITERIA_WEIGHTS: CriteriaWeights = {
  price: 0.3,
  leadTime: 0.2,
  compliance: 0.25,
  reliability: 0.25,
};

/**
 * Per-axis data liveness. LIVE axes derive from the quote set; SIMULATED axes
 * are external-data inputs with no real source yet (see the header ruling).
 */
export const AXIS_LIVENESS: Record<keyof CriteriaWeights, Liveness> = {
  price: 'live',
  leadTime: 'live',
  compliance: 'simulated',
  reliability: 'simulated',
};

/** Weakest-link over the weighted axes — derived, so it flips when data lands. */
function livenessFor(weights: CriteriaWeights): Liveness {
  const axes = Object.keys(weights) as (keyof CriteriaWeights)[];
  const anySimulated = axes.some(
    (a) => weights[a] > 0 && AXIS_LIVENESS[a] === 'simulated',
  );
  return anySimulated ? 'simulated' : 'live';
}

/** The composite's liveness under the default policy — SIMULATED today. */
export const COMPOSITE_LIVENESS: Liveness = livenessFor(CRITERIA_WEIGHTS);

/** The minimal quote shape the engine needs (structurally a `Quotation` subset). */
export interface ScorableQuote {
  id: string;
  unitPrice: number;
  leadTimeDays: number;
  complianceScore: number;
  reliabilityScore: number;
}

export interface QuoteScore {
  quoteId: string;
  /** LIVE — ratio-to-best over the RFQ's quote set (cheapest = 100). */
  priceScore: number;
  /** LIVE — ratio-to-best over the RFQ's quote set (fastest = 100). */
  leadTimeScore: number;
  /** SIMULATED — the input value, passed through untouched. */
  complianceScore: number;
  /** SIMULATED — the input value, passed through untouched. */
  reliabilityScore: number;
  /** Weighted roll-up of the four axes. */
  composite: number;
  /** Weakest-link liveness of the composite (SIMULATED while any input is). */
  compositeLiveness: Liveness;
  /** argmax(composite) across the set — carries the composite's liveness. */
  topRanked: boolean;
}

/**
 * Lower-is-better ratio-to-best: the best (lowest) value anchors 100, the rest
 * scale proportionally. Deterministic, single-quote-safe, guarded against a
 * non-positive or non-finite input so a degenerate value can never yield
 * NaN/Infinity.
 */
function ratioToBest(value: number, best: number): number {
  if (value <= 0 || !Number.isFinite(best) || best <= 0) return 0;
  return Math.round((best / value) * 100);
}

/**
 * Score a set of quotes for ONE RFQ. Pure: order-preserving, input-immutable,
 * deterministic. Returns [] for an empty set.
 */
export function scoreQuotations(
  quotes: readonly ScorableQuote[],
  weights: CriteriaWeights = CRITERIA_WEIGHTS,
): QuoteScore[] {
  if (quotes.length === 0) return [];

  const positive = (xs: number[]) => xs.filter((x) => x > 0);
  const minPrice = Math.min(...positive(quotes.map((q) => q.unitPrice)));
  const minLead = Math.min(...positive(quotes.map((q) => q.leadTimeDays)));
  const compositeLiveness = livenessFor(weights);

  const scored: QuoteScore[] = quotes.map((q) => {
    const priceScore = ratioToBest(q.unitPrice, minPrice);
    const leadTimeScore = ratioToBest(q.leadTimeDays, minLead);
    const composite = Math.round(
      priceScore * weights.price +
        leadTimeScore * weights.leadTime +
        q.complianceScore * weights.compliance +
        q.reliabilityScore * weights.reliability,
    );
    return {
      quoteId: q.id,
      priceScore,
      leadTimeScore,
      complianceScore: q.complianceScore,
      reliabilityScore: q.reliabilityScore,
      composite,
      compositeLiveness,
      topRanked: false,
    };
  });

  // argmax(composite); the first quote to reach the max wins a tie (stable).
  let topIdx = 0;
  for (let i = 1; i < scored.length; i += 1) {
    if (scored[i].composite > scored[topIdx].composite) topIdx = i;
  }
  scored[topIdx].topRanked = true;

  return scored;
}

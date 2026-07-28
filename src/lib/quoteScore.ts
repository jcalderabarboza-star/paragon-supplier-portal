// ────────────────────────────────────────────────────────────────────────────
// Quote-scoring primitive (F0.3-FIND-01) — the governed engine that mints the
// comparison score axes so the buyer drawer COMPUTES them instead of reading
// hand-authored fixture literals (the fabricated-score root cause).
//
// Honest-by-construction, on two rulings:
//
//  • AXIS-HONESTY SPLIT (FORK-3B). price + leadTime are LIVE — deterministic
//    rankings computed from the quote data in hand (price ratio-to-best;
//    leadTime absolute-linear since 2e-b-1, see below). compliance +
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

/**
 * LEAD-TIME AXIS POLICY (CP-0 · W1 · 2e-b-1, operator ruling — a DELIBERATE
 * change to C6-LOCK, not a bug fix).
 *
 * The lead-time axis no longer uses ratio-to-best. It is now ABSOLUTE and
 * LINEAR: `max(0, 100 - days × 2)`. Zero days scores 100.
 *
 * Why the axis had to change rather than just the input gate: the ruling is
 * that a 0-day lead time is REAL (same-day supply) and therefore best. Under
 * ratio-to-best that is not merely wrong, it is incoherent — `best/value` with
 * `best = 0` scores every rival 0, so one same-day quote would zero the whole
 * set. A linear scale is the coherent way to express "fewer days is better and
 * zero is the floor", and it is what the ruling specifies.
 *
 * What this changes for existing data: lead-time scores are no longer relative
 * to the RFQ's fastest bid. A 14-day quote scores 72 whether or not a 7-day
 * rival exists. Price stays ratio-to-best (it is a competitive axis in a way an
 * absolute delivery promise is not).
 */
export const LEAD_TIME_PENALTY_PER_DAY = 2;

/**
 * The lead-time axis for ONE quote. `null` in ⇒ `null` out: an omitted optional
 * lead time is scored on NO axis at all (see `scoreQuotations`), never on a
 * fabricated one — silence must not be readable as "same day".
 */
export function leadTimeScoreFor(days: number | null | undefined): number | null {
  if (days == null || !Number.isFinite(days) || days < 0) return null;
  return Math.max(0, 100 - days * LEAD_TIME_PENALTY_PER_DAY);
}

/** The minimal quote shape the engine needs (structurally a `Quotation` subset). */
export interface ScorableQuote {
  id: string;
  unitPrice: number;
  /** OPTIONAL (2e-b-1). Absent = the supplier stated no lead time. */
  leadTimeDays?: number | null;
  complianceScore: number;
  reliabilityScore: number;
}

export interface QuoteScore {
  quoteId: string;
  /** LIVE — ratio-to-best over the RFQ's quote set (cheapest = 100). */
  priceScore: number;
  /**
   * LIVE — absolute linear scale, `max(0, 100 - days×2)`; same-day = 100.
   * `null` when the supplier stated no lead time: the axis is DROPPED from that
   * quote's composite (weights renormalise over the axes actually stated), so
   * an omitted lead time is neither rewarded nor punished. A number here would
   * be one nobody offered.
   */
  leadTimeScore: number | null;
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
  const compositeLiveness = livenessFor(weights);

  const scored: QuoteScore[] = quotes.map((q) => {
    const priceScore = ratioToBest(q.unitPrice, minPrice);
    // Absolute, not ratio-to-best (2e-b-1) — and `null` when unstated.
    const leadTimeScore = leadTimeScoreFor(q.leadTimeDays);
    // The composite rolls up only the axes this quote actually HAS, renormalised
    // over their weights. With all four present the divisor is 1 and this is the
    // original arithmetic exactly; with the lead time unstated the quote is
    // judged on price/compliance/reliability rather than on an invented number.
    const axes: readonly (readonly [number, number])[] = [
      [priceScore, weights.price],
      ...(leadTimeScore === null
        ? []
        : ([[leadTimeScore, weights.leadTime]] as const)),
      [q.complianceScore, weights.compliance],
      [q.reliabilityScore, weights.reliability],
    ];
    const totalWeight = axes.reduce((sum, [, w]) => sum + w, 0);
    const composite =
      totalWeight === 0
        ? 0
        : Math.round(axes.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight);
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

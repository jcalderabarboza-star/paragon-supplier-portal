// ────────────────────────────────────────────────────────────────────────────
// Should-cost-vs-quote spread (CI-2, Layer 5) — the resolver that puts the
// validated should-cost engine next to a real supplier quote. Pure: no I/O, no
// clock, no store. It CONSUMES computeShouldCost (C6-LOCK: the engine is never
// modified here — CI-2 reads it, does not tune it).
//
// Honest-by-construction, on the CI-2 adjudication:
//
//  • TWO HARD GATES → HONEST SILENCE. A spread is only meaningful when the quoted
//    material maps to a MODELABLE basket AND the quote is priced in a MASS unit
//    (KG/MT) — should-cost is IDR/kg. A tail material (no basket) or a per-piece /
//    per-litre quote returns `silent`, never a fabricated percentage. The three
//    silence reasons are explicit: 'unmapped' | 'tail' | 'unit-mismatch'.
//
//  • BAND, NOT A VERDICT. The should-cost is a BAND; the quote is a point. So the
//    spread is a RANGE, not a number: the quote measured against the cheap end of
//    the band is the largest premium, against the pricey end the smallest. The
//    spread inherits the should-cost band width — it can never render tighter than
//    the model's own uncertainty.
//
//  • INHERITED LIVENESS. The spread carries the should-cost's feed liveness
//    (SIMULATED in CI-1/CI-2) and its permanent MODELED epistemic. A spread vs a
//    SIMULATED basket is a rehearsal reference — the surface marks it as such and
//    never renders it as a hard "this quote is overpriced" state.
// ────────────────────────────────────────────────────────────────────────────

import {
  computeShouldCost,
  type Material,
  type RootBenchmark,
  type FxRate,
  type FeedLiveness,
  type CostBand,
} from './shouldCost';

/** The quote-side units the resolver accepts. Only mass units yield a spread. */
export type QuoteUom = 'KG' | 'PCS' | 'L' | 'MT';

/** Kilograms per tonne — the MT→kg normalization so a per-MT quote compares to an
 *  IDR/kg should-cost. The only unit conversion CI-2 performs. */
export const KG_PER_MT = 1000;

/** Why a quote has no should-cost spread — always explicit, never a fake number. */
export type SilentReason = 'unmapped' | 'tail' | 'unit-mismatch';

/** The spread as a RANGE (fractions, e.g. 0.08 = +8%), inheriting the band width.
 *  low ≤ mid ≤ high: low measures the quote against the priciest should-cost (the
 *  smallest premium), high against the cheapest (the largest premium). */
export interface SpreadBand {
  readonly lowPct: number;
  readonly midPct: number;
  readonly highPct: number;
}

export interface SpreadResult {
  readonly kind: 'spread';
  /** The spread range vs the modeled should-cost band. */
  readonly spread: SpreadBand;
  /** The modeled should-cost band (IDR/kg) the spread is measured against. */
  readonly shouldCost: CostBand;
  /** The quote's unit price normalized to IDR/kg (÷1000 for MT, identity for KG). */
  readonly quoteIdrPerKg: number;
  /** Inherited from the should-cost: SIMULATED in CI-1/CI-2 (weakest-link feed). */
  readonly liveness: FeedLiveness;
  /** Permanent — a spread off a model is still a model. */
  readonly epistemic: 'MODELED';
  readonly vintage: string;
  readonly coeffVersion: string;
}

export interface SilentResult {
  readonly kind: 'silent';
  readonly reason: SilentReason;
}

export type QuoteSpread = SpreadResult | SilentResult;

/** The pure inputs the resolver binds against (real fixtures in the app, tiny
 *  inline scaffolds in tests — mirrors the quoteScore/shouldCost purity contract). */
export interface SpreadDeps {
  /** materialId → `sc-*` basket id (the SIMULATED join, commodityMaterialMap.ts). */
  readonly join: Readonly<Record<string, string>>;
  /** The should-cost materials, keyed for lookup by their `sc-*` id. */
  readonly materials: Readonly<Record<string, Material>>;
  readonly roots: Readonly<Record<string, RootBenchmark>>;
  readonly fx: FxRate;
}

const MASS_UOM: ReadonlySet<QuoteUom> = new Set<QuoteUom>(['KG', 'MT']);

/** Normalize a mass-unit quote price to IDR/kg. Caller guarantees a mass unit. */
function toIdrPerKg(unitPriceIdr: number, uom: QuoteUom): number {
  return uom === 'MT' ? unitPriceIdr / KG_PER_MT : unitPriceIdr;
}

/**
 * Resolve the should-cost-vs-quote spread for ONE quoted line. Pure & total:
 * every path returns a discriminated result, never throws for a business reason.
 *
 * Gate order (each a distinct honest-silence reason):
 *   1. join miss                → silent 'unmapped'
 *   2. mapped material is tail  → silent 'tail'         (no basket at all)
 *   3. non-mass quote unit      → silent 'unit-mismatch' (IDR/pcs ≠ IDR/kg)
 *   4. otherwise                → spread (banded, MODELED, inherited liveness)
 */
export function spreadForQuote(
  materialId: string | undefined,
  uom: QuoteUom,
  unitPriceIdr: number,
  deps: SpreadDeps,
): QuoteSpread {
  const scId = materialId ? deps.join[materialId] : undefined;
  const material = scId ? deps.materials[scId] : undefined;
  if (!material) return { kind: 'silent', reason: 'unmapped' };

  // Tail is decided before the unit gate: a tail material has no should-cost at
  // all, so 'tail' is the more fundamental silence (holds for any quote unit).
  if (material.tail) return { kind: 'silent', reason: 'tail' };

  if (!MASS_UOM.has(uom)) return { kind: 'silent', reason: 'unit-mismatch' };

  const sc = computeShouldCost(material, deps.roots, deps.fx);
  // A modelable material always yields a modeled (non-tail) result; this guard is
  // structural insurance so the type narrows and a future tail-flip stays honest.
  if (sc.tail) return { kind: 'silent', reason: 'tail' };

  const quoteIdrPerKg = toIdrPerKg(unitPriceIdr, uom);
  const { low, mid, high } = {
    low: sc.band.lowIdrPerKg,
    mid: sc.band.midIdrPerKg,
    high: sc.band.highIdrPerKg,
  };

  // The quote is a point; the should-cost is a band → the spread is a range.
  // vs the pricey end (high) = smallest premium = the LOW spread bound;
  // vs the cheap end (low)   = largest premium  = the HIGH spread bound.
  const spread: SpreadBand = {
    lowPct: (quoteIdrPerKg - high) / high,
    midPct: (quoteIdrPerKg - mid) / mid,
    highPct: (quoteIdrPerKg - low) / low,
  };

  return {
    kind: 'spread',
    spread,
    shouldCost: sc.band,
    quoteIdrPerKg,
    liveness: sc.liveness,
    epistemic: 'MODELED',
    vintage: sc.vintage,
    coeffVersion: sc.coeffVersion,
  };
}

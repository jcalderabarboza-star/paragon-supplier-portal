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
//    (KG/MT). A tail material (no basket) or a per-piece / per-litre quote returns
//    `silent`, never a fabricated percentage. The unit gate is DIMENSIONAL —
//    independent of currency. The three silence reasons stay explicit.
//
//  • BAND, NOT A VERDICT. The should-cost is a BAND; the quote is a point. So the
//    spread is a RANGE, not a number, inheriting the band width — it can never
//    render tighter than the model's own uncertainty.
//
//  • CURRENCY = ENGINE-NATIVE (the CI-2 currency-leg ruling A). The engine is
//    USD-NATIVE: roots are USD/kg and `basisCostUsdPerKg` is a pure, FX-FREE
//    figure; the IDR band is `basisCostUsdPerKg × spotFX`. So:
//      - an IDR quote compares against the FX-applied IDR band → `fxApplied:true`,
//        liveness = basket ⊕ FX (the MORE-modeled branch: IDR required the FX leg);
//      - a USD quote compares against the native USD basis → `fxApplied:false`,
//        liveness = basket-only (FX-free, the cleaner branch).
//    There is NO IDR→USD conversion (USD is the base, not the target); converting
//    the IDR band back by ÷FX would be a dishonest double-FX round-trip. The spread
//    renders in the QUOTE's own currency; IDR is never presented as the basis for a
//    USD deal. Both derivable from already-exposed fields — zero engine change.
//
//  • INHERITED LIVENESS + EPISTEMIC. The spread carries its branch's feed liveness
//    (SIMULATED in CI-1/CI-2) and the permanent MODELED epistemic. A spread vs a
//    SIMULATED basket is a rehearsal reference — the surface marks it, never a hard
//    "this quote is overpriced" state.
// ────────────────────────────────────────────────────────────────────────────

import {
  computeShouldCost,
  weakestLink,
  type Material,
  type RootBenchmark,
  type FxRate,
  type FeedLiveness,
} from './shouldCost';

/** The quote-side units the resolver accepts. Only mass units yield a spread. */
export type QuoteUom = 'KG' | 'PCS' | 'L' | 'MT';

/** The currency a quote is priced in. IDR = domestic (FX-applied should-cost);
 *  USD = foreign (the engine-native, FX-free should-cost basis). */
export type SpreadCurrency = 'IDR' | 'USD';

/** Kilograms per tonne — the MT→kg normalization so a per-MT quote compares to a
 *  per-kg should-cost. The only unit conversion CI-2 performs. */
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

/** The modeled should-cost band the spread is measured against, in the quote's
 *  currency (IDR/kg for a domestic quote, USD/kg for a foreign one). */
export interface ModeledBand {
  readonly lowPerKg: number;
  readonly midPerKg: number;
  readonly highPerKg: number;
}

export interface SpreadResult {
  readonly kind: 'spread';
  /** The currency the spread + modeled band are expressed in (the quote's own). */
  readonly currency: SpreadCurrency;
  /** The spread range vs the modeled should-cost band. */
  readonly spread: SpreadBand;
  /** The modeled should-cost band (per kg, in `currency`). */
  readonly shouldCost: ModeledBand;
  /** The quote's unit price normalized to per-kg, in `currency` (÷1000 for MT). */
  readonly quotePerKg: number;
  /** Feed liveness of THIS branch: IDR = basket ⊕ FX; USD = basket-only. SIMULATED
   *  in CI-1/CI-2 either way. */
  readonly liveness: FeedLiveness;
  /** Permanent — a spread off a model is still a model. */
  readonly epistemic: 'MODELED';
  /** True only for the IDR branch (the should-cost was pushed through FX). Drives
   *  the "FX-converted / more-modeled" marker; false for the FX-free USD branch. */
  readonly fxApplied: boolean;
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

/** Normalize a mass-unit quote price to per-kg. Caller guarantees a mass unit. */
function toPerKg(unitPrice: number, uom: QuoteUom): number {
  return uom === 'MT' ? unitPrice / KG_PER_MT : unitPrice;
}

/**
 * Resolve the should-cost-vs-quote spread for ONE quoted line. Pure & total:
 * every path returns a discriminated result, never throws for a business reason.
 *
 * Gate order (each a distinct honest-silence reason):
 *   1. join miss                → silent 'unmapped'
 *   2. mapped material is tail  → silent 'tail'         (no basket at all)
 *   3. non-mass quote unit      → silent 'unit-mismatch' (dimensional, any currency)
 *   4. otherwise                → spread in the quote's currency (banded, MODELED)
 */
export function spreadForQuote(
  materialId: string | undefined,
  uom: QuoteUom,
  unitPrice: number,
  currency: SpreadCurrency,
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

  const quotePerKg = toPerKg(unitPrice, uom);

  // Basket-only feed liveness (FX-FREE) — the USD branch inherits THIS; the IDR
  // branch inherits sc.liveness (which already weakest-links FX in). weakestLink
  // over just the basket roots. (In CI-2 both are SIMULATED; this keeps the USD
  // branch honest the day feeds diverge at CI-3 — no engine change needed.)
  const basketLiveness = weakestLink(
    material.basket.map((c) => deps.roots[c.rootId].liveness),
  );

  // Engine-native branch (ruling A). USD: the pure FX-free basis ± the governed
  // band pct. IDR: the FX-applied band the engine already produced.
  const pct = sc.band.pct;
  const band: ModeledBand =
    currency === 'USD'
      ? {
          lowPerKg: sc.basisCostUsdPerKg * (1 - pct),
          midPerKg: sc.basisCostUsdPerKg,
          highPerKg: sc.basisCostUsdPerKg * (1 + pct),
        }
      : {
          lowPerKg: sc.band.lowIdrPerKg,
          midPerKg: sc.band.midIdrPerKg,
          highPerKg: sc.band.highIdrPerKg,
        };

  // The quote is a point; the should-cost is a band → the spread is a range.
  // vs the pricey end (high) = smallest premium = the LOW spread bound;
  // vs the cheap end (low)   = largest premium  = the HIGH spread bound.
  const spread: SpreadBand = {
    lowPct: (quotePerKg - band.highPerKg) / band.highPerKg,
    midPct: (quotePerKg - band.midPerKg) / band.midPerKg,
    highPct: (quotePerKg - band.lowPerKg) / band.lowPerKg,
  };

  return {
    kind: 'spread',
    currency,
    spread,
    shouldCost: band,
    quotePerKg,
    liveness: currency === 'USD' ? basketLiveness : sc.liveness,
    epistemic: 'MODELED',
    fxApplied: currency !== 'USD',
    vintage: sc.vintage,
    coeffVersion: sc.coeffVersion,
  };
}

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
import type { BidCurrency } from './currencyPolicy';

/** The quote-side units the resolver accepts. Only mass units yield a spread. */
export type QuoteUom = 'KG' | 'PCS' | 'L' | 'MT';

// ── The pricing basis, and the currencies that have one (CP-0 · 2e-c-5) ──────
//
// `SpreadCurrency = 'IDR' | 'USD'` is RETIRED. It was named for a currency and
// was really an enumeration of ENGINE BRANCHES, and that conflation is what made
// it load-bearing: it was the only thing turning a wrong branch into a compile
// error, so it could not be widened without fixing the branches in the same
// change. Both halves land here together.
//
// The replacement states the branch and DERIVES the type from it, so the two can
// never disagree:
//
//   • `SpreadBasis` names what the engine actually does — price the quote in its
//     own engine-native unit, or push the model through FX to reach the quote.
//   • `SPREAD_BASIS` maps each priceable currency to its branch. It is the ONE
//     place that says which currencies the engine can price at all.
//   • `PriceableCurrency` is `keyof SPREAD_BASIS` — derived, never hand-listed.
//
// WHY ONLY TWO ENTRIES. The should-cost engine is USD-native (roots are
// `valueUsdPerKg`) and carries exactly ONE FX pair (`FxRate.idrPerUsd`). So USD
// needs no conversion and IDR has a pair; every other currency has neither, and
// no amount of branching invents one.
//
// D-4 (operator ruling) — a EUR bid gets HONEST SILENCE, never a euro routed
// through the rupiah band. A second rate pair means a second feed to keep honest
// and a second thing to go stale, hand-maintained until API_EXHGRATE arrives at
// F1+ and gives both legs at once. The accepted cost is stated plainly: a buyer
// sees no should-cost signal on a EUR bid. Adding EUR later is ONE entry here
// plus its feed — not a re-branching.

/** How the engine reaches a comparable should-cost for a quote's currency. */
export type SpreadBasis =
  /** The quote is already in the engine's native unit — no FX involved at all. */
  | 'ENGINE_NATIVE'
  /** The modeled band was pushed through the FX pair to meet the quote. */
  | 'FX_CONVERTED';

/**
 * The currencies this engine can price, and the branch each one takes. THE ONE
 * place that decides; `PriceableCurrency` and the resolver's gate both read it.
 */
export const SPREAD_BASIS = {
  USD: 'ENGINE_NATIVE',
  IDR: 'FX_CONVERTED',
} as const satisfies Partial<Record<BidCurrency, SpreadBasis>>;

/** A bid currency the engine has a branch for. DERIVED from `SPREAD_BASIS`. */
export type PriceableCurrency = keyof typeof SPREAD_BASIS;

/** Can this engine price a quote in `currency` at all? The gate the resolver
 *  runs first, and the one that keeps every branch below total. */
export function isPriceableCurrency(currency: BidCurrency): currency is PriceableCurrency {
  return currency in SPREAD_BASIS;
}

/** Kilograms per tonne — the MT→kg normalization so a per-MT quote compares to a
 *  per-kg should-cost. The only unit conversion CI-2 performs. */
export const KG_PER_MT = 1000;

/** Why a quote has no should-cost spread — always explicit, never a fake number.
 *
 *  'currency-unsupported' (2e-c-1) is the POLICY-vs-CAPABILITY gap made visible:
 *  `BidCurrency` says what a supplier may bid in, `SpreadCurrency` says what this
 *  engine can price against, and the first is deliberately wider than the second.
 *  A bid in a currency with no engine branch has no reference — not a mapping
 *  failure, not a unit failure, so none of the other three reasons may stand in
 *  for it.
 *
 *  2e-c-5 — the resolver now RAISES this itself, as its FIRST gate (2e-c-3-FIND-03
 *  closed). It was briefly raised by the buyer surface instead, because the
 *  resolver's `currency` parameter was a 2-union that made a wrong branch a
 *  compile error; that union is retired and the gate has moved in, so a second
 *  consumer cannot forget to make the same decision. */
export type SilentReason =
  | 'unmapped'
  | 'tail'
  | 'unit-mismatch'
  | 'currency-unsupported';

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
  readonly currency: PriceableCurrency;
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
  /**
   * WHICH BRANCH produced this spread (2e-c-5). Replaces `fxApplied: boolean`.
   *
   * The boolean was computed `currency !== 'USD'` — which is "not the
   * engine-native branch", not "FX was applied". The two coincided only while
   * the engine had exactly one non-FX currency, and they came apart the moment a
   * third currency existed: a EUR quote would have reported `fxApplied: true`,
   * asserting a conversion that never happened, through a pair that does not
   * exist.
   *
   * Naming the BRANCH rather than renaming the boolean is deliberate. A boolean
   * whose meaning is "the other branch" is the same defect with a better label;
   * the surface wants to know what the engine did, and now it is told.
   * `basis === 'FX_CONVERTED'` drives the FX-converted marker.
   */
  readonly basis: SpreadBasis;
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
 * Gate order (each a distinct honest-silence reason). Ordered by how FUNDAMENTAL
 * the obstacle is, which is the same doctrine that already put 'tail' ahead of
 * the unit gate:
 *   1. no branch for the currency → silent 'currency-unsupported' (2e-c-5)
 *   2. join miss                  → silent 'unmapped'
 *   3. mapped material is tail    → silent 'tail'          (no basket at all)
 *   4. non-mass quote unit        → silent 'unit-mismatch' (dimensional)
 *   5. otherwise                  → spread in the quote's currency (banded, MODELED)
 *
 * The currency gate is FIRST because it is the most fundamental of the four: an
 * unmapped material could be mapped and a tail material could gain a basket, but
 * a currency with no branch cannot be priced for ANY material, so no amount of
 * fixing the other three would produce a spread. It is also what makes every
 * branch below total — after this line `currency` is a `PriceableCurrency`, so
 * the basis lookup cannot miss.
 */
export function spreadForQuote(
  materialId: string | undefined,
  uom: QuoteUom,
  unitPrice: number,
  currency: BidCurrency,
  deps: SpreadDeps,
): QuoteSpread {
  // 2e-c-5 — THE GATE, moved in from the buyer surface (2e-c-3-FIND-03 closed).
  // It sat at the one call site while `SpreadCurrency` was a 2-union, because the
  // union itself refused a wrong currency at compile time. The union is retired,
  // so the refusal has to live where it cannot be forgotten: a second consumer
  // now inherits it instead of having to remember it.
  if (!isPriceableCurrency(currency)) {
    return { kind: 'silent', reason: 'currency-unsupported' };
  }

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

  // ONE branch decision, read from the policy table, replacing three separate
  // `currency === 'USD'` ternaries (band, liveness, fxApplied). Three tests of
  // the same fact is three chances to disagree — and each of them silently
  // treated "not USD" as "IDR", which is exactly how a EUR quote would have been
  // measured against the rupiah band and rendered as a −99.99% spread.
  const basis: SpreadBasis = SPREAD_BASIS[currency];

  // Basket-only feed liveness (FX-FREE) — the ENGINE_NATIVE branch inherits THIS;
  // FX_CONVERTED inherits sc.liveness (which already weakest-links FX in).
  // weakestLink over just the basket roots. (In CI-2 both are SIMULATED; this
  // keeps the native branch honest the day feeds diverge at CI-3 — no engine
  // change needed.)
  const basketLiveness = weakestLink(
    material.basket.map((c) => deps.roots[c.rootId].liveness),
  );

  // Ruling A. ENGINE_NATIVE: the pure FX-free basis ± the governed band pct.
  // FX_CONVERTED: the FX-applied band the engine already produced.
  const pct = sc.band.pct;
  const band: ModeledBand =
    basis === 'ENGINE_NATIVE'
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
    liveness: basis === 'ENGINE_NATIVE' ? basketLiveness : sc.liveness,
    epistemic: 'MODELED',
    basis,
    vintage: sc.vintage,
    coeffVersion: sc.coeffVersion,
  };
}

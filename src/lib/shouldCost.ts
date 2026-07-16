// ────────────────────────────────────────────────────────────────────────────
// Should-cost engine (CI-1, Layer 2) — the governed commodity analogue of
// quoteScore.ts. Pure: no I/O, no clock, no store. Given a material's basket of
// root benchmarks + the governed coefficient set, it computes a should-cost as a
// permanently-MODELED, banded figure over honestly-marked (CI-1: SIMULATED) feeds.
//
// Honest-by-construction, on the canon of Commodity_Intelligence_Module_Build_Plan
// §2/§3/§5 and the RM/PM taxonomy:
//
//  • TWO ORTHOGONAL AXES. FeedLiveness (SIMULATED < SNAPSHOT < STALE < LIVE) is a
//    property of the FEED — it lives on the roots + FX and rolls up weakest-link.
//    Epistemic MODELED is a property of the NUMBER — permanent, independent of feed
//    liveness (a should-cost off LIVE roots is STILL a model). The two never merge:
//    epistemic is not a LivenessRegistry field (that would reconflate them).
//
//  • BAND, NOT A POINT. Every modeled figure renders as a band. The band carries
//    the governed cyclical MARGIN uncertainty AND the CO-PRODUCT-CREDIT uncertainty
//    (the credit is a governed CONSTANT in CI-1 — its uncertainty is expressed as a
//    wider band, not a fake precise adjustment; §0 ruling). The mid is the internal
//    central estimate; the export guard (CI-2) keeps the point off supplier exports.
//
//  • TAIL = HONEST SILENCE. A material with no modelable benchmark (actives,
//    fragrance) carries NO basket and returns a no-benchmark flag — never a
//    fabricated number.
//
// C6-LOCK: the coefficient set below is governed platform truth — a fixed policy,
// NOT a user-editable formula. SIMULATED root/FX VALUES are fixture-owned
// (commodityBaskets.ts), corrected against Paragon's real master later; the engine
// and its logic do not change when real data lands — only the data it reads.
// ────────────────────────────────────────────────────────────────────────────

/** Where a material is priced. Baked into the schema from CI-1 (the domestic feed
 *  lands at CI-3, but the export-ban backtest needs the dimension present now). */
export type Basis = 'domestic' | 'international';

/** The FEED liveness lattice (§3). Full 4-state union typed now; only SIMULATED is
 *  exercised in CI-1. SNAPSHOT arrives with CI-1.5 vendored history, STALE/LIVE with
 *  CI-3 real feeds — no type migration needed then, just new values. */
export type FeedLiveness = 'SIMULATED' | 'SNAPSHOT' | 'STALE' | 'LIVE';

/** The NUMBER epistemics (§3). A should-cost is permanently MODELED; OBSERVED is
 *  reserved for a real benchmark cell / supplier quote (never produced here). */
export type Epistemic = 'MODELED' | 'OBSERVED';

/** The governed cost-behaviour classes the coefficient set is keyed on. Distinct
 *  from the operator-correctable material GROUP (MG-xx): the class is platform
 *  policy (does this class carry a co-product credit? what conversion cost?), the
 *  group is a reporting bucket. The specialty tail has no class — it never computes. */
export type MaterialClass =
  | 'RM_OLEO' // oleochemical RM (surfactants/esters/humectants) — carries a credit
  | 'RM_PETRO' // petro-derived RM (glycols, preservatives) — no co-product credit
  | 'PM_PLASTIC' // rigid + flexible plastic packaging
  | 'PM_GLASS' // glass packaging (energy/soda-ash driven)
  | 'PM_METAL' // aluminium / tinplate (LME-linked)
  | 'PM_PAPER'; // paper / board (pulp-linked)

// ─── Governed C6-LOCK coefficient set (USD/kg unless noted) ───────────────────
// A fixed platform policy. Values are CI-1 placeholders (SIMULATED in spirit, but
// GOVERNED — one blessed source, never a per-user knob), corrected as the module
// matures. The coefficient-set VERSION below stamps every output for provenance.

export const COEFF_VERSION = 'ci-1.0.0';

/** Energy/labour conversion cost added per class. */
export const CONVERSION_COST: Record<MaterialClass, number> = {
  RM_OLEO: 0.3,
  RM_PETRO: 0.25,
  PM_PLASTIC: 0.2,
  PM_GLASS: 0.4,
  PM_METAL: 0.3,
  PM_PAPER: 0.3,
};

/** Governed CONSTANT co-product credit, subtracted (0 where the class has none).
 *  The CPO/biodiesel proxy-spread refinement is deferred to CI-5 (§0 ruling). */
export const CO_PRODUCT_CREDIT: Record<MaterialClass, number> = {
  RM_OLEO: 0.1,
  RM_PETRO: 0,
  PM_PLASTIC: 0,
  PM_GLASS: 0,
  PM_METAL: 0,
  PM_PAPER: 0,
};

/** Governed CYCLICAL margin band per class: `center` is the margin added to the
 *  basis (USD/kg); `pct` is the band half-width it contributes to the output. */
export const MARGIN_BAND: Record<MaterialClass, { center: number; pct: number }> = {
  RM_OLEO: { center: 0.15, pct: 0.08 },
  RM_PETRO: { center: 0.12, pct: 0.07 },
  PM_PLASTIC: { center: 0.1, pct: 0.06 },
  PM_GLASS: { center: 0.08, pct: 0.06 },
  PM_METAL: { center: 0.12, pct: 0.07 },
  PM_PAPER: { center: 0.09, pct: 0.05 },
};

/** Extra band half-width a class with a co-product credit carries, because that
 *  credit is a governed CONSTANT — its uncertainty is honestly widened, not faked. */
export const CREDIT_BAND_WIDENING = 0.05;

/** Governed import duty / levy-wedge by basis: the fiscal wedge (§5 duties term).
 *  Domestic carries the export-levy effect; international carries import duty. */
export const DUTIES: Record<Basis, number> = {
  domestic: 0.02,
  international: 0.05,
};

/** Governed freight by basis (§5 freight term; Drewry/index at CI-3). International
 *  bears ocean freight, domestic a minimal inland leg. */
export const FREIGHT: Record<Basis, number> = {
  domestic: 0.03,
  international: 0.12,
};

/** Governed FX pass-through — 100% in CI-1 (spot × 1.0). Per-origin pass-through
 *  calibration from quote history is deferred to CI-5. */
export const FX_PASSTHROUGH = 1.0;

// ─── Fixture-owned input shapes (SIMULATED values live in commodityBaskets.ts) ─

/** A public commodity root benchmark. In CI-1 every value is SIMULATED. */
export interface RootBenchmark {
  readonly id: string;
  readonly label: string;
  readonly valueUsdPerKg: number;
  readonly liveness: FeedLiveness;
  readonly asOf: string; // ISO date; the vintage source
}

/** The spot FX feed (IDR per USD). SIMULATED in CI-1. */
export interface FxRate {
  readonly idrPerUsd: number;
  readonly liveness: FeedLiveness;
  readonly asOf: string;
}

/** One weighted root in a material's basket. The weight is a TECHNICAL coefficient
 *  (includes process yield) — NOT a recipe share; weights need not sum to 1. */
export interface BasketComponent {
  readonly rootId: string;
  readonly weight: number;
  readonly lagNote?: string;
}

interface MaterialBase {
  readonly id: string;
  readonly name: string;
  readonly group: string; // MG-xx (operator-correctable reporting bucket)
  readonly sapType: 'ROH' | 'VERP';
}

/** A material the engine can model: a governed class + a non-empty basket + basis. */
export interface ModelableMaterial extends MaterialBase {
  readonly materialClass: MaterialClass;
  readonly basis: Basis;
  readonly basket: readonly BasketComponent[];
  readonly tail?: false;
}

/** A specialty-tail material: no modelable benchmark, honest silence, no number. */
export interface TailMaterial extends MaterialBase {
  readonly basket: null;
  readonly tail: true;
  readonly reason: string;
}

export type Material = ModelableMaterial | TailMaterial;

// ─── Engine output ────────────────────────────────────────────────────────────

/** The rendered figure: a band in IDR/kg, never a bare point. */
export interface CostBand {
  readonly lowIdrPerKg: number;
  readonly midIdrPerKg: number;
  readonly highIdrPerKg: number;
  readonly pct: number; // band half-width (fraction)
}

export interface ShouldCost {
  readonly materialId: string;
  readonly tail: false;
  readonly epistemic: 'MODELED'; // permanent, regardless of feed liveness
  readonly basis: Basis;
  readonly basisCostUsdPerKg: number; // shouldCost_basis, before FX
  readonly band: CostBand; // × spotFX, banded
  readonly liveness: FeedLiveness; // weakest-link across the inputs
  readonly vintage: string; // oldest as-of among the inputs
  readonly coeffVersion: string;
}

export interface TailShouldCost {
  readonly materialId: string;
  readonly tail: true;
  readonly reason: string; // "no modelable benchmark" — never a number
}

export type ShouldCostResult = ShouldCost | TailShouldCost;

// ─── Weakest-link lattice (generalises quoteScore.livenessFor to 4 states) ─────

const LIVENESS_ORDER: Record<FeedLiveness, number> = {
  SIMULATED: 0,
  SNAPSHOT: 1,
  STALE: 2,
  LIVE: 3,
};

/** The composite feed-liveness of a set of inputs = the LOWEST state among them.
 *  A basket output can never be fresher than its stalest root (§2 invariant). */
export function weakestLink(states: readonly FeedLiveness[]): FeedLiveness {
  return states.reduce((lo, s) =>
    LIVENESS_ORDER[s] < LIVENESS_ORDER[lo] ? s : lo,
  );
}

// ─── The engine ───────────────────────────────────────────────────────────────

const round = (n: number): number => Math.round(n);

/**
 * Compute a material's should-cost per build-plan §5. Pure & deterministic; does
 * not mutate its inputs. A tail material short-circuits to honest silence.
 *
 *   shouldCost_basis = Σ(weightᵢ × benchmarkᵢ) + conversion − coProductCredit
 *                      + freight(basis) + duties(basis) + marginCenter
 *   mid IDR/kg       = basis × spotFX × passthrough
 *   band             = mid × (1 ∓ pct),  pct = marginPct (+ creditWidening if any)
 */
export function computeShouldCost(
  material: Material,
  roots: Readonly<Record<string, RootBenchmark>>,
  fx: FxRate,
): ShouldCostResult {
  if (material.tail) {
    return { materialId: material.id, tail: true, reason: material.reason };
  }

  const cls = material.materialClass;
  const used = material.basket.map((c) => {
    const root = roots[c.rootId];
    if (!root) throw new Error(`unknown root benchmark: ${c.rootId}`);
    return { root, weight: c.weight };
  });

  const basketSum = used.reduce((s, u) => s + u.weight * u.root.valueUsdPerKg, 0);
  const basisCostUsdPerKg =
    basketSum +
    CONVERSION_COST[cls] -
    CO_PRODUCT_CREDIT[cls] +
    FREIGHT[material.basis] +
    DUTIES[material.basis] +
    MARGIN_BAND[cls].center;

  const mid = basisCostUsdPerKg * fx.idrPerUsd * FX_PASSTHROUGH;
  const pct =
    MARGIN_BAND[cls].pct + (CO_PRODUCT_CREDIT[cls] > 0 ? CREDIT_BAND_WIDENING : 0);

  const feedStates: FeedLiveness[] = [...used.map((u) => u.root.liveness), fx.liveness];
  const vintage = [...used.map((u) => u.root.asOf), fx.asOf].reduce((a, b) =>
    a < b ? a : b,
  );

  return {
    materialId: material.id,
    tail: false,
    epistemic: 'MODELED',
    basis: material.basis,
    basisCostUsdPerKg,
    band: {
      lowIdrPerKg: round(mid * (1 - pct)),
      midIdrPerKg: round(mid),
      highIdrPerKg: round(mid * (1 + pct)),
      pct,
    },
    liveness: weakestLink(feedStates),
    vintage,
    coeffVersion: COEFF_VERSION,
  };
}

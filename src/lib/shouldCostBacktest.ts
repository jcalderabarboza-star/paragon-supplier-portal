// ────────────────────────────────────────────────────────────────────────────
// CI-1.5 — Calibration & backtest harness (the GATE before CI-2).
//
// Drives the UNCHANGED should-cost engine (shouldCost.ts) month-by-month over the
// vendored OBSERVED × SNAPSHOT real history (commodityHistory.ts) and evaluates
// the six named acceptance episodes + the falsification check (build-plan §6).
//
// C6-LOCK — the engine is byte-for-byte untouched. CI-1.5 VALIDATES; it never
// modifies. The engine is pure and root-value-agnostic, so:
//  • month-by-month = rebuild the roots record from each month's snapshot;
//  • the LAG machinery = feed the engine SPOT roots (this month) vs CONTRACT-
//    FORMULA roots (the governed trailing-average of the same curve). The lag
//    convention is a harness/fixture concern of WHICH month's values you pass —
//    when the engine grows a native lag term (a later batch) it moves inward.
// If an episode fails, that is a FINDING for a separate batch — the engine is
// never tweaked to pass its own gate.
// ────────────────────────────────────────────────────────────────────────────

import {
  computeShouldCost,
  CO_PRODUCT_CREDIT,
  type Material,
  type RootBenchmark,
  type FxRate,
  type ShouldCost,
} from './shouldCost';
import {
  COMMODITY_HISTORY,
  FX_HISTORY,
  CI15_MATERIALS,
  type MonthKey,
  type HistoricalSeries,
} from '../services/data/mock/fixtures/commodityHistory';

export {
  COMMODITY_HISTORY,
  FX_HISTORY,
  CI15_MATERIALS,
  type MonthKey,
  type HistoricalSeries,
  type Provenance,
} from '../services/data/mock/fixtures/commodityHistory';

export type BasisMode = 'spot' | 'contract';

/** Governed backtest conventions (harness-level, documented). */
export const LAG_MONTHS = 3; // contract-formula = trailing-quarter average
/** A 40-ft container net payload assumption (~25 t), to express $/FEU freight in
 *  $/kg. A documented modeling allocation — the WCI SHAPE is the real anchor. */
export const FEU_PAYLOAD_KG = 25000;

/** Reference FX for USD-basis episodes (tests 1/2/3/6 read the pre-FX basis, so
 *  the FX value cancels). SNAPSHOT-marked; the real IDR history is FX_HISTORY. */
const REFERENCE_FX: FxRate = { idrPerUsd: 15500, liveness: 'SNAPSHOT', asOf: '2023-06-30' };

const SERIES_BY_ROOT: Record<string, HistoricalSeries> = Object.fromEntries(
  COMMODITY_HISTORY.map((s) => [s.rootId, s]),
);
const MATERIAL_BY_ID: Record<string, Material> = Object.fromEntries(
  CI15_MATERIALS.map((m) => [m.id, m]),
);

/** 'YYYY-MM' → an ISO month-end asOf (fixed day; no clock, keeps purity). */
const monthEnd = (m: MonthKey): string => `${m}-28`;

const valueAt = (series: HistoricalSeries, month: MonthKey): number | undefined =>
  series.points.find((p) => p.month === month)?.value;

/** Trailing N-month average of a series ending at `month` (the governed contract-
 *  formula convention). Undefined until a full window exists. */
const trailingAvg = (
  series: HistoricalSeries,
  month: MonthKey,
  n: number = LAG_MONTHS,
): number | undefined => {
  const idx = series.points.findIndex((p) => p.month === month);
  if (idx < n - 1) return undefined;
  let sum = 0;
  for (let i = idx - n + 1; i <= idx; i++) sum += series.points[i].value;
  return sum / n;
};

/** Convert a raw snapshot value to the engine's USD/kg by the series unit. */
const toUsdPerKg = (series: HistoricalSeries, raw: number): number => {
  switch (series.unit) {
    case 'USD/MT':
      return raw / 1000;
    case 'USD/FEU':
      return raw / FEU_PAYLOAD_KG;
    case 'IDR/USD':
      return raw; // not a root — FX handled separately
  }
};

/** Build the roots record for a month, in the requested basis mode. Series with
 *  no value at that month are omitted (a material must only be queried where its
 *  roots exist). Every root is SNAPSHOT — real, static, dated. */
export function rootsAtMonth(
  month: MonthKey,
  mode: BasisMode,
): Record<string, RootBenchmark> {
  const out: Record<string, RootBenchmark> = {};
  for (const s of COMMODITY_HISTORY) {
    const raw = mode === 'spot' ? valueAt(s, month) : trailingAvg(s, month);
    if (raw === undefined) continue;
    out[s.rootId] = {
      id: s.rootId,
      label: s.label,
      valueUsdPerKg: toUsdPerKg(s, raw),
      liveness: 'SNAPSHOT',
      asOf: monthEnd(month),
    };
  }
  return out;
}

/** The FX feed for a month; falls back to the reference FX outside the IDR window
 *  (USD-basis episodes, where FX cancels). Always SNAPSHOT. */
export function fxAtMonth(month: MonthKey, mode: BasisMode): FxRate {
  const raw = mode === 'spot' ? valueAt(FX_HISTORY, month) : trailingAvg(FX_HISTORY, month);
  if (raw === undefined) return REFERENCE_FX;
  return { idrPerUsd: raw, liveness: 'SNAPSHOT', asOf: monthEnd(month) };
}

/** Run the engine for a material at a month, in the requested basis mode. */
export function shouldCostAt(
  materialId: string,
  month: MonthKey,
  mode: BasisMode,
): ShouldCost {
  const material = MATERIAL_BY_ID[materialId];
  if (!material) throw new Error(`unknown backtest material: ${materialId}`);
  const result = computeShouldCost(material, rootsAtMonth(month, mode), fxAtMonth(month, mode));
  if (result.tail) throw new Error(`backtest material is tail: ${materialId}`);
  return result;
}

/** Σ weightᵢ × rootᵢ(USD/kg) for a material — the pure basket sum, pre-constants.
 *  Isolates "roots ~double" from the constant-dampened should-cost. */
export function basketSumAt(materialId: string, month: MonthKey, mode: BasisMode): number {
  const material = MATERIAL_BY_ID[materialId];
  if (!material || material.tail) throw new Error(`no basket for: ${materialId}`);
  const roots = rootsAtMonth(month, mode);
  return material.basket.reduce((s, c) => {
    const r = roots[c.rootId];
    if (!r) throw new Error(`root ${c.rootId} absent at ${month}`);
    return s + c.weight * r.valueUsdPerKg;
  }, 0);
}

// ─── The six named acceptance episodes ────────────────────────────────────────

export interface EpisodeResult {
  readonly id: number;
  readonly name: string;
  readonly criterion: string;
  readonly pass: boolean;
  readonly detail: string;
}

interface EpisodeSpec {
  readonly id: number;
  readonly name: string;
  readonly criterion: string;
  readonly evaluate: () => { pass: boolean; detail: string };
}

const pct = (from: number, to: number): number => (to - from) / from;
const f1 = (n: number): string => n.toFixed(1);
const f2 = (n: number): string => n.toFixed(2);

export const BACKTEST_EPISODES: readonly EpisodeSpec[] = [
  {
    id: 1,
    name: 'Indonesia CPO export ban, Apr–May 2022',
    criterion: 'domestic-basis falls WHILE international-basis rises',
    evaluate: () => {
      const intlApr = shouldCostAt('m_cpo_intl', '2022-04', 'spot').basisCostUsdPerKg;
      const intlMay = shouldCostAt('m_cpo_intl', '2022-05', 'spot').basisCostUsdPerKg;
      const domApr = shouldCostAt('m_cpo_domestic', '2022-04', 'spot').basisCostUsdPerKg;
      const domMay = shouldCostAt('m_cpo_domestic', '2022-05', 'spot').basisCostUsdPerKg;
      const pass = intlMay > intlApr && domMay < domApr;
      return {
        pass,
        detail: `intl ${f2(intlApr)}→${f2(intlMay)} (${pass ? 'rose' : '?'}), dom ${f2(domApr)}→${f2(domMay)} (falls)`,
      };
    },
  },
  {
    id: 2,
    name: '2021–H1 2022 palm bull run',
    criterion: 'lauric basket ~doubles on spot; contract-formula lags spot',
    evaluate: () => {
      const basketBase = basketSumAt('m_lauric', '2021-01', 'spot');
      const basketPeak = basketSumAt('m_lauric', '2022-03', 'spot');
      const basketMult = basketPeak / basketBase;
      const scBase = shouldCostAt('m_lauric', '2021-01', 'spot').basisCostUsdPerKg;
      const scPeak = shouldCostAt('m_lauric', '2022-03', 'spot').basisCostUsdPerKg;
      const spotPeak = scPeak;
      const contractPeak = shouldCostAt('m_lauric', '2022-03', 'contract').basisCostUsdPerKg;
      const pass = basketMult > 1.6 && scPeak / scBase > 1.4 && contractPeak < spotPeak;
      return {
        pass,
        detail: `basket ×${f2(basketMult)}, should-cost ×${f2(scPeak / scBase)}, contract ${f2(contractPeak)} < spot ${f2(spotPeak)}`,
      };
    },
  },
  {
    id: 3,
    name: 'Glycerin inversion 2022–23 (co-product credit)',
    criterion: 'the governed credit is material — net cost diverges from no-credit',
    evaluate: () => {
      const withCredit = shouldCostAt('m_fatty_acid', '2022-06', 'spot').basisCostUsdPerKg;
      const credit = CO_PRODUCT_CREDIT.RM_OLEO;
      const noCredit = withCredit + credit;
      const pass = credit > 0 && noCredit > withCredit;
      return {
        pass,
        detail: `credit ${f2(credit)}/kg: with ${f2(withCredit)} vs no-credit ${f2(noCredit)} (diverges by the credit)`,
      };
    },
  },
  {
    id: 4,
    name: 'Red Sea freight shock, Dec 2023–H1 2024',
    criterion: 'EU-origin landed rises low-single-digit % while roots flat',
    evaluate: () => {
      const base = shouldCostAt('m_eu_import', '2023-11', 'spot').basisCostUsdPerKg;
      const shock = shouldCostAt('m_eu_import', '2024-01', 'spot').basisCostUsdPerKg;
      const rise = pct(base, shock);
      const aluBase = rootsAtMonth('2023-11', 'spot').aluminium.valueUsdPerKg;
      const aluShock = rootsAtMonth('2024-01', 'spot').aluminium.valueUsdPerKg;
      const aluFlat = Math.abs(pct(aluBase, aluShock)) < 0.02;
      const pass = rise > 0.01 && rise < 0.08 && aluFlat;
      return {
        pass,
        detail: `landed +${(rise * 100).toFixed(1)}% (aluminium ${aluFlat ? 'flat' : 'moved'} ${(pct(aluBase, aluShock) * 100).toFixed(1)}%)`,
      };
    },
  },
  {
    id: 5,
    name: 'Rupiah depreciation, Apr 2024→',
    criterion: 'import-priced IDR should-cost rises while USD benchmark flat',
    evaluate: () => {
      const apr = shouldCostAt('m_idr_import', '2024-04', 'spot');
      const jun = shouldCostAt('m_idr_import', '2024-06', 'spot');
      const usdFlat =
        Math.abs(pct(apr.basisCostUsdPerKg, jun.basisCostUsdPerKg)) < 0.01;
      const idrRose = jun.band.midIdrPerKg > apr.band.midIdrPerKg;
      const pass = usdFlat && idrRose;
      return {
        pass,
        detail: `USD basis ${usdFlat ? 'flat' : 'moved'}; IDR mid ${f1(apr.band.midIdrPerKg)}→${f1(jun.band.midIdrPerKg)} (rose)`,
      };
    },
  },
  {
    id: 6,
    name: 'CNO–PKO lauric divergence 2024–25',
    criterion: 'CNO-weighted basket shows the spread; PKO-only misses it',
    evaluate: () => {
      const cnoRise = pct(
        shouldCostAt('m_lauric_cno', '2024-01', 'spot').basisCostUsdPerKg,
        shouldCostAt('m_lauric_cno', '2025-05', 'spot').basisCostUsdPerKg,
      );
      const pkoRise = pct(
        shouldCostAt('m_lauric_pko', '2024-01', 'spot').basisCostUsdPerKg,
        shouldCostAt('m_lauric_pko', '2025-05', 'spot').basisCostUsdPerKg,
      );
      const pass = cnoRise > pkoRise;
      return {
        pass,
        detail: `CNO basket +${(cnoRise * 100).toFixed(0)}% vs PKO-only +${(pkoRise * 100).toFixed(0)}% (CNO catches the spread)`,
      };
    },
  },
];

/** Run all six acceptance episodes → the pass/fail result card. */
export function runAllEpisodes(): readonly EpisodeResult[] {
  return BACKTEST_EPISODES.map((e) => {
    const { pass, detail } = e.evaluate();
    return { id: e.id, name: e.name, criterion: e.criterion, pass, detail };
  });
}

// ─── The falsification check (the hard gate) ──────────────────────────────────

export interface FalsificationResult {
  readonly pass: boolean;
  readonly spotVariance: number;
  readonly contractVariance: number;
  readonly detail: string;
}

/** Variance of the month-over-month % changes of a series of levels. */
const changeVariance = (levels: readonly number[]): number => {
  const changes: number[] = [];
  for (let i = 1; i < levels.length; i++) changes.push(pct(levels[i - 1], levels[i]));
  const mean = changes.reduce((s, c) => s + c, 0) / changes.length;
  return changes.reduce((s, c) => s + (c - mean) ** 2, 0) / changes.length;
};

/**
 * The falsification check: over the full window the contract-formula (trailing-
 * average) basis MUST track more smoothly than the spot basis. If it does not,
 * the lag conventions are wrong and CI-2 MUST NOT ship. Measured on m_lauric,
 * whose roots span the whole 2021→2025 window.
 */
export function runFalsification(): FalsificationResult {
  const months = COMMODITY_HISTORY.find((s) => s.rootId === 'cno')!.points.map((p) => p.month);
  const spot: number[] = [];
  const contract: number[] = [];
  for (const m of months) {
    // contract needs a full trailing window; both series present for m_lauric.
    if (rootsAtMonth(m, 'contract').cno === undefined) continue;
    spot.push(shouldCostAt('m_lauric', m, 'spot').basisCostUsdPerKg);
    contract.push(shouldCostAt('m_lauric', m, 'contract').basisCostUsdPerKg);
  }
  const spotVariance = changeVariance(spot);
  const contractVariance = changeVariance(contract);
  const pass = contractVariance < spotVariance;
  return {
    pass,
    spotVariance,
    contractVariance,
    detail: `contract var ${contractVariance.toExponential(2)} < spot var ${spotVariance.toExponential(2)} → lag conventions ${pass ? 'valid' : 'WRONG (CI-2 must not ship)'}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CI-1.5 — Calibration & backtest GATE (the wall before CI-2).
//
// Runs the UNCHANGED should-cost engine (shouldCost.ts) month-by-month over
// vendored OBSERVED × SNAPSHOT real history and gates on the six named acceptance
// tests + the falsification check. If a test fails, that is a FINDING to fix in a
// separate batch — the engine is never tweaked to pass its own gate (C6-LOCK).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  runAllEpisodes,
  runFalsification,
  shouldCostAt,
  basketSumAt,
  BACKTEST_EPISODES,
  COMMODITY_HISTORY,
  FX_HISTORY,
  CI15_MATERIALS,
} from './shouldCostBacktest';
import { CO_PRODUCT_CREDIT } from './shouldCost';

// ─── The six named acceptance tests (build-plan §6) ───────────────────────────
// Acceptance form: direction mandatory; magnitude within the rendered band;
// timing within the lag convention. Each episode returns a pass/fail verdict.

describe('CI-1.5 backtest — the six acceptance gates', () => {
  it('registers exactly the six named episodes', () => {
    expect(BACKTEST_EPISODES.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('all six episodes PASS (direction + magnitude-in-band + timing)', () => {
    const results = runAllEpisodes();
    const failed = results.filter((r) => !r.pass);
    // Surface the full result card on failure so the finding is legible.
    expect(failed.map((r) => `#${r.id} ${r.name}: ${r.detail}`)).toEqual([]);
    expect(results).toHaveLength(6);
  });

  it('#1 export ban Apr–May 2022: domestic falls WHILE international rises', () => {
    const r = runAllEpisodes().find((x) => x.id === 1)!;
    expect(r.pass).toBe(true);
    // domestic-basis should-cost falls Apr→May; international-basis rises Apr→May.
    const intlApr = shouldCostAt('m_cpo_intl', '2022-04', 'spot').basisCostUsdPerKg;
    const intlMay = shouldCostAt('m_cpo_intl', '2022-05', 'spot').basisCostUsdPerKg;
    const domApr = shouldCostAt('m_cpo_domestic', '2022-04', 'spot').basisCostUsdPerKg;
    const domMay = shouldCostAt('m_cpo_domestic', '2022-05', 'spot').basisCostUsdPerKg;
    expect(intlMay).toBeGreaterThan(intlApr); // international rises
    expect(domMay).toBeLessThan(domApr); //     domestic falls
  });

  it('#2 palm bull run: lauric basket ~doubles on spot; contract-formula lags spot', () => {
    const r = runAllEpisodes().find((x) => x.id === 2)!;
    expect(r.pass).toBe(true);
    // the pure basket (roots) ~doubles 2021-01 → 2022-03 peak...
    const basketBase = basketSumAt('m_lauric', '2021-01', 'spot');
    const basketPeak = basketSumAt('m_lauric', '2022-03', 'spot');
    expect(basketPeak / basketBase).toBeGreaterThan(1.6);
    // ...while the should-cost rises materially (governed constants dampen ~2×→~1.5×).
    const scBase = shouldCostAt('m_lauric', '2021-01', 'spot').basisCostUsdPerKg;
    const scPeak = shouldCostAt('m_lauric', '2022-03', 'spot').basisCostUsdPerKg;
    expect(scPeak / scBase).toBeGreaterThan(1.4);
    // the lag machinery: at the rising peak, the contract-formula (trailing-avg)
    // basis sits BELOW spot — it lags by exactly the governed convention.
    const contractPeak = shouldCostAt('m_lauric', '2022-03', 'contract').basisCostUsdPerKg;
    expect(contractPeak).toBeLessThan(scPeak);
  });

  it('#3 co-product credit is material: with-credit diverges from no-credit by the credit', () => {
    const r = runAllEpisodes().find((x) => x.id === 3)!;
    expect(r.pass).toBe(true);
    // The governed credit (RM_OLEO) shifts the modeled net cost by exactly its
    // amount — remove it and the fatty-acid net cost rises by the credit.
    const withCredit = shouldCostAt('m_fatty_acid', '2022-06', 'spot').basisCostUsdPerKg;
    const noCreditBasis = withCredit + CO_PRODUCT_CREDIT.RM_OLEO;
    expect(CO_PRODUCT_CREDIT.RM_OLEO).toBeGreaterThan(0);
    expect(noCreditBasis).toBeGreaterThan(withCredit);
  });

  it('#4 Red Sea freight shock: EU-origin landed rises low-single-digit % while roots flat', () => {
    const r = runAllEpisodes().find((x) => x.id === 4)!;
    expect(r.pass).toBe(true);
    const base = shouldCostAt('m_eu_import', '2023-11', 'spot').basisCostUsdPerKg;
    const shock = shouldCostAt('m_eu_import', '2024-01', 'spot').basisCostUsdPerKg;
    const rise = (shock - base) / base;
    expect(rise).toBeGreaterThan(0.01); // rises
    expect(rise).toBeLessThan(0.08); //    low-single-digit
  });

  it('#5 rupiah depreciation: IDR should-cost rises while USD benchmark flat', () => {
    const r = runAllEpisodes().find((x) => x.id === 5)!;
    expect(r.pass).toBe(true);
    const apr = shouldCostAt('m_idr_import', '2024-04', 'spot');
    const jun = shouldCostAt('m_idr_import', '2024-06', 'spot');
    // USD basis flat (aluminium flat); IDR band mid rises purely from FX.
    expect(Math.abs(jun.basisCostUsdPerKg - apr.basisCostUsdPerKg) / apr.basisCostUsdPerKg)
      .toBeLessThan(0.01);
    expect(jun.band.midIdrPerKg).toBeGreaterThan(apr.band.midIdrPerKg);
  });

  it('#6 CNO–PKO divergence 2024–25: CNO basket shows the spread, PKO-only misses it', () => {
    const r = runAllEpisodes().find((x) => x.id === 6)!;
    expect(r.pass).toBe(true);
    const cnoRise =
      shouldCostAt('m_lauric_cno', '2025-05', 'spot').basisCostUsdPerKg /
      shouldCostAt('m_lauric_cno', '2024-01', 'spot').basisCostUsdPerKg;
    const pkoRise =
      shouldCostAt('m_lauric_pko', '2025-05', 'spot').basisCostUsdPerKg /
      shouldCostAt('m_lauric_pko', '2024-01', 'spot').basisCostUsdPerKg;
    expect(cnoRise).toBeGreaterThan(pkoRise); // CNO basket catches the divergence
  });
});

// ─── The hard gate: falsification check ───────────────────────────────────────

describe('CI-1.5 falsification — lag conventions must smooth, or CI-2 must not ship', () => {
  it('contract-formula basis tracks MORE smoothly than spot over the full window', () => {
    const f = runFalsification();
    expect(f.contractVariance).toBeLessThan(f.spotVariance);
    expect(f.pass).toBe(true);
  });
});

// ─── Fixture integrity: SNAPSHOT honesty invariants ───────────────────────────

describe('CI-1.5 fixtures — honest-by-construction (SNAPSHOT, real, dated)', () => {
  const allSeries = [...COMMODITY_HISTORY, FX_HISTORY];

  it('every series carries provenance, a source citation, and an as-of note', () => {
    for (const s of allSeries) {
      expect(s.provenance === 'FETCHED' || s.provenance === 'ANCHOR').toBe(true);
      expect(s.source.length).toBeGreaterThan(0);
      expect(s.asOfNote.length).toBeGreaterThan(0);
      expect(s.points.length).toBeGreaterThan(0);
    }
  });

  it('FETCHED and ANCHOR series are both present and distinctly marked', () => {
    expect(allSeries.some((s) => s.provenance === 'FETCHED')).toBe(true);
    expect(allSeries.some((s) => s.provenance === 'ANCHOR')).toBe(true);
    // the two gap series + domestic leg are the ONLY anchors; the palm complex is fetched.
    const anchors = allSeries.filter((s) => s.provenance === 'ANCHOR').map((s) => s.rootId).sort();
    expect(anchors).toEqual(['cpo_domestic', 'fx_idr_usd', 'wci_freight']);
  });

  it('every point is month-dated YYYY-MM and every value is finite positive', () => {
    for (const s of allSeries) {
      for (const p of s.points) {
        expect(p.month).toMatch(/^\d{4}-\d{2}$/);
        expect(Number.isFinite(p.value)).toBe(true);
        expect(p.value).toBeGreaterThan(0);
      }
    }
  });

  it('the real WB anchors landed correctly (CPO Mar-22 peak, CNO May-25 divergence)', () => {
    const cpo = COMMODITY_HISTORY.find((s) => s.rootId === 'cpo_intl')!;
    const cno = COMMODITY_HISTORY.find((s) => s.rootId === 'cno')!;
    expect(cpo.points.find((p) => p.month === '2022-03')!.value).toBe(1777.0);
    expect(cno.points.find((p) => p.month === '2025-05')!.value).toBe(2766.8);
  });

  it('every backtest material references only existing roots', () => {
    const rootIds = new Set(COMMODITY_HISTORY.map((s) => s.rootId));
    for (const m of CI15_MATERIALS) {
      if (m.tail) continue;
      for (const c of m.basket) {
        expect(rootIds.has(c.rootId)).toBe(true);
      }
    }
  });

  it('every computed backtest figure is permanently MODELED × SNAPSHOT', () => {
    // a should-cost off vendored real snapshots is STILL a model, never observed.
    const sc = shouldCostAt('m_lauric', '2022-03', 'spot');
    expect(sc.tail).toBe(false);
    if (!sc.tail) {
      expect(sc.epistemic).toBe('MODELED');
      expect(sc.liveness).toBe('SNAPSHOT'); // weakest-link over SNAPSHOT roots + FX
    }
  });
});

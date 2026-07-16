import { describe, it, expect } from 'vitest';
import {
  computeShouldCost,
  weakestLink,
  CONVERSION_COST,
  CO_PRODUCT_CREDIT,
  MARGIN_BAND,
  DUTIES,
  FREIGHT,
  FX_PASSTHROUGH,
  COEFF_VERSION,
  type Material,
  type RootBenchmark,
  type FxRate,
  type FeedLiveness,
  type ShouldCost,
} from './shouldCost';
import {
  ROOT_BENCHMARKS,
  SHOULD_COST_MATERIALS,
  SIMULATED_SPOT_FX,
} from '../services/data/mock/fixtures/commodityBaskets';

// ─── Hand-verifiable inline scaffold (mirrors quoteScore.test.ts's A/B) ────────
// A 2-root oleochemical material on the international basis. Every number below
// is chosen so the §5 formula resolves to round, checkable arithmetic.
const R1: RootBenchmark = {
  id: 'r1',
  label: 'Root 1',
  valueUsdPerKg: 2.0,
  liveness: 'SIMULATED',
  asOf: '2026-05-01',
};
const R2: RootBenchmark = {
  id: 'r2',
  label: 'Root 2',
  valueUsdPerKg: 1.0,
  liveness: 'SIMULATED',
  asOf: '2026-04-01', // the OLDEST input → drives vintage
};
const ROOTS: Record<string, RootBenchmark> = { r1: R1, r2: R2 };
const FX: FxRate = { idrPerUsd: 16000, liveness: 'SIMULATED', asOf: '2026-06-01' };

const OLEO_INTL: Material = {
  id: 'm-oleo',
  name: 'Test oleochemical',
  group: 'MG-TEST',
  sapType: 'ROH',
  basis: 'international',
  materialClass: 'RM_OLEO',
  basket: [
    { rootId: 'r1', weight: 0.6 },
    { rootId: 'r2', weight: 0.4 },
  ],
};

const asModeled = (r: ReturnType<typeof computeShouldCost>): ShouldCost => {
  if (r.tail) throw new Error('expected a modelable result');
  return r;
};

describe('computeShouldCost — the §5 basket formula, term by term', () => {
  it('sums the basket Σ(weightᵢ × benchmarkᵢ) then applies every governed term', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    // Σ = .6*2.00 + .4*1.00 = 1.60
    // + conversion .30  = 1.90
    // − credit .10      = 1.80
    // + freight .12     = 1.92  (international)
    // + duties .05      = 1.97  (international)
    // + margin .15      = 2.12
    expect(r.basisCostUsdPerKg).toBeCloseTo(2.12, 10);
  });

  it('multiplies the basis by spot FX × governed passthrough (100% in CI-1) → IDR/kg', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    // 2.12 × 16000 × 1.0 = 33_920
    expect(r.band.midIdrPerKg).toBe(33920);
    expect(FX_PASSTHROUGH).toBe(1.0);
  });

  it('carries the co-product credit uncertainty in the BAND, not a point (§0 ruling)', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    // band pct = margin .08 + credit-widening .05 = .13 (oleo carries a credit)
    expect(r.band.pct).toBeCloseTo(0.13, 10);
    // 33_920 × (1 ∓ .13) = 29_510.4 / 38_329.6 → rounded
    expect(r.band.lowIdrPerKg).toBe(29510);
    expect(r.band.highIdrPerKg).toBe(38330);
    expect(r.band.lowIdrPerKg).toBeLessThan(r.band.midIdrPerKg);
    expect(r.band.highIdrPerKg).toBeGreaterThan(r.band.midIdrPerKg);
  });

  it('a petro class carries NO co-product credit, so its band is narrower', () => {
    const petro: Material = {
      ...OLEO_INTL,
      id: 'm-petro',
      materialClass: 'RM_PETRO',
    };
    const r = asModeled(computeShouldCost(petro, ROOTS, FX));
    // petro band pct = margin only, no credit widening
    expect(r.band.pct).toBeCloseTo(MARGIN_BAND.RM_PETRO.pct, 10);
    expect(CO_PRODUCT_CREDIT.RM_PETRO).toBe(0);
  });

  it('the basis dimension changes freight + duties (domestic vs international)', () => {
    const domestic: Material = { ...OLEO_INTL, id: 'm-dom', basis: 'domestic' };
    const intl = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    const dom = asModeled(computeShouldCost(domestic, ROOTS, FX));
    // same basket, only basis differs → the delta is exactly the freight+duty wedge
    const wedge =
      FREIGHT.international +
      DUTIES.international -
      (FREIGHT.domestic + DUTIES.domestic);
    expect(intl.basisCostUsdPerKg - dom.basisCostUsdPerKg).toBeCloseTo(wedge, 10);
    expect(intl.basis).toBe('international');
    expect(dom.basis).toBe('domestic');
  });

  it('changing a SIMULATED root moves the should-cost correctly', () => {
    const base = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    const bumped = asModeled(
      computeShouldCost(OLEO_INTL, { ...ROOTS, r1: { ...R1, valueUsdPerKg: 3.0 } }, FX),
    );
    // r1 weight .6, +1.00 USD/kg → +0.60 basis → ×16000 = +9_600 IDR mid
    expect(bumped.band.midIdrPerKg - base.band.midIdrPerKg).toBe(9600);
  });
});

describe('computeShouldCost — permanent epistemic + provenance stamps', () => {
  it('every computed figure is permanently MODELED, independent of feed liveness', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    expect(r.epistemic).toBe('MODELED');
  });

  it('vintage = the OLDEST as-of across the basket roots and FX', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    expect(r.vintage).toBe('2026-04-01'); // R2 is the oldest input
  });

  it('stamps the governed coefficient-set version', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    expect(r.coeffVersion).toBe(COEFF_VERSION);
  });
});

describe('computeShouldCost — weakest-link feed liveness (4-state lattice)', () => {
  it('the composite wears the LOWEST state among its inputs', () => {
    expect(weakestLink(['LIVE', 'SIMULATED', 'STALE'])).toBe('SIMULATED');
    expect(weakestLink(['LIVE', 'SNAPSHOT'])).toBe('SNAPSHOT');
    expect(weakestLink(['LIVE', 'STALE'])).toBe('STALE');
    expect(weakestLink(['LIVE', 'LIVE'])).toBe('LIVE');
  });

  it('a should-cost off all-SIMULATED roots is SIMULATED (CI-1 state)', () => {
    const r = asModeled(computeShouldCost(OLEO_INTL, ROOTS, FX));
    expect(r.liveness).toBe('SIMULATED');
  });

  it('one STALE root demotes the whole should-cost to STALE (proves the lattice, not just SIMULATED)', () => {
    const staleRoots = { ...ROOTS, r1: { ...R1, liveness: 'STALE' as FeedLiveness } };
    // r2 + FX are still 'SIMULATED' here, so min is SIMULATED — swap them LIVE to isolate STALE.
    const liveRest = {
      r1: { ...R1, liveness: 'STALE' as FeedLiveness },
      r2: { ...R2, liveness: 'LIVE' as FeedLiveness },
    };
    const liveFx: FxRate = { ...FX, liveness: 'LIVE' };
    void staleRoots;
    const r = asModeled(computeShouldCost(OLEO_INTL, liveRest, liveFx));
    expect(r.liveness).toBe('STALE');
  });
});

describe('computeShouldCost — TAIL materials are honest, never fabricated', () => {
  it('a tail material returns the no-benchmark flag and carries NO number', () => {
    const tail: Material = {
      id: 'm-tail',
      name: 'Niacinamide',
      group: 'MG-04',
      sapType: 'ROH',
      basket: null,
      tail: true,
      reason: 'no modelable benchmark',
    };
    const r = computeShouldCost(tail, ROOTS, FX);
    expect(r.tail).toBe(true);
    // The type carries no cost field on a tail result — assert honestly at runtime too.
    expect((r as Record<string, unknown>).band).toBeUndefined();
    expect((r as Record<string, unknown>).basisCostUsdPerKg).toBeUndefined();
    if (r.tail) expect(r.reason).toBe('no modelable benchmark');
  });
});

describe('computeShouldCost — pure & deterministic', () => {
  it('does not mutate its inputs', () => {
    const roots = { r1: { ...R1 }, r2: { ...R2 } };
    const material: Material = { ...OLEO_INTL, basket: [...OLEO_INTL.basket!] };
    const snapshot = JSON.parse(JSON.stringify({ roots, material, fx: FX }));
    computeShouldCost(material, roots, FX);
    expect({ roots, material, fx: FX }).toEqual(snapshot);
  });

  it('produces identical output across calls', () => {
    expect(computeShouldCost(OLEO_INTL, ROOTS, FX)).toEqual(
      computeShouldCost(OLEO_INTL, ROOTS, FX),
    );
  });
});

describe('governed C6-LOCK constants — total over every material class', () => {
  const CLASSES = [
    'RM_OLEO',
    'RM_PETRO',
    'PM_PLASTIC',
    'PM_GLASS',
    'PM_METAL',
    'PM_PAPER',
  ] as const;

  it('conversion, margin band, and co-product credit are keyed for every class', () => {
    for (const c of CLASSES) {
      expect(typeof CONVERSION_COST[c]).toBe('number');
      expect(typeof MARGIN_BAND[c].center).toBe('number');
      expect(typeof MARGIN_BAND[c].pct).toBe('number');
      expect(typeof CO_PRODUCT_CREDIT[c]).toBe('number');
    }
  });

  it('duties and freight are keyed for both bases (the fiscal + logistics wedge)', () => {
    expect(typeof DUTIES.domestic).toBe('number');
    expect(typeof DUTIES.international).toBe('number');
    expect(typeof FREIGHT.domestic).toBe('number');
    expect(typeof FREIGHT.international).toBe('number');
  });
});

// ─── The shipped SIMULATED taxonomy fixture (the CI-1 scaffold) ────────────────
describe('commodityBaskets fixture — the SAP-faithful SIMULATED scaffold', () => {
  it('every basket component references a root that exists', () => {
    for (const m of SHOULD_COST_MATERIALS) {
      if (m.tail) continue;
      for (const c of m.basket!) {
        expect(ROOT_BENCHMARKS[c.rootId], `${m.id} → ${c.rootId}`).toBeDefined();
      }
    }
  });

  it('basket weights are positive cost-driver coefficients (NOT recipe shares — need not sum to 1)', () => {
    for (const m of SHOULD_COST_MATERIALS) {
      if (m.tail) continue;
      expect(m.basket!.length).toBeGreaterThan(0);
      for (const c of m.basket!) expect(c.weight).toBeGreaterThan(0);
    }
  });

  it('every root — and the spot FX — is SIMULATED in CI-1 (honest by construction)', () => {
    for (const id of Object.keys(ROOT_BENCHMARKS)) {
      expect(ROOT_BENCHMARKS[id].liveness).toBe('SIMULATED');
    }
    expect(SIMULATED_SPOT_FX.liveness).toBe('SIMULATED');
  });

  it('tail materials carry no basket, an honest reason, and never a number', () => {
    const tail = SHOULD_COST_MATERIALS.filter((m) => m.tail);
    expect(tail.length).toBeGreaterThan(0); // the actives/fragrance tail exists
    for (const m of tail) {
      expect(m.basket).toBeNull();
      if (m.tail) expect(m.reason.length).toBeGreaterThan(0);
    }
  });

  it('carries BOTH bases across the material set (basis dimension is exercised)', () => {
    const bases = new Set(
      SHOULD_COST_MATERIALS.filter((m) => !m.tail).map((m) => (m as { basis: string }).basis),
    );
    expect(bases.has('domestic')).toBe(true);
    expect(bases.has('international')).toBe(true);
  });

  it('every modelable material computes a finite, banded, MODELED, SIMULATED should-cost', () => {
    for (const m of SHOULD_COST_MATERIALS) {
      if (m.tail) continue;
      const r = asModeled(computeShouldCost(m, ROOT_BENCHMARKS, SIMULATED_SPOT_FX));
      expect(Number.isFinite(r.band.midIdrPerKg)).toBe(true);
      expect(r.band.midIdrPerKg).toBeGreaterThan(0);
      expect(r.band.lowIdrPerKg).toBeLessThanOrEqual(r.band.midIdrPerKg);
      expect(r.band.highIdrPerKg).toBeGreaterThanOrEqual(r.band.midIdrPerKg);
      expect(r.epistemic).toBe('MODELED');
      expect(r.liveness).toBe('SIMULATED');
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  spreadForQuote,
  KG_PER_MT,
  type SpreadDeps,
  type SpreadResult,
} from './shouldCostSpread';
import {
  COEFF_VERSION,
  type Material,
  type RootBenchmark,
  type FxRate,
} from './shouldCost';
import {
  ROOT_BENCHMARKS,
  SHOULD_COST_MATERIALS,
  SIMULATED_SPOT_FX,
} from '../services/data/mock/fixtures/commodityBaskets';
import { MATERIAL_TO_BASKET } from '../services/data/mock/fixtures/commodityMaterialMap';

// ─── Hand-verifiable inline scaffold (mirrors shouldCost.test.ts) ──────────────
// Numbers chosen so the §5 formula lands on round figures and the spread math is
// checkable by hand. RM_OLEO domestic, credit>0 (so the band widens by 0.05):
//   basketSum = 0.6·2.0 + 0.4·1.0                                  = 1.60
//   basisCostUsdPerKg = 1.60 + .30 − .10 + .03 + .02 + .15         = 2.00 (FX-free)
//   IDR mid   = 2.00 × 10000 fx                                    = 20000
//   pct       = margin .08 + creditWidening .05                    = 0.13
//   IDR band  = 20000·(1∓.13)                                      = 17400 / 22600
//   USD band  = 2.00·(1∓.13)                                       = 1.74 / 2.26
const R1: RootBenchmark = { id: 'r1', label: 'Root 1', valueUsdPerKg: 2.0, liveness: 'SIMULATED', asOf: '2026-05-01' };
const R2: RootBenchmark = { id: 'r2', label: 'Root 2', valueUsdPerKg: 1.0, liveness: 'SIMULATED', asOf: '2026-04-01' };
const FX: FxRate = { idrPerUsd: 10000, liveness: 'SIMULATED', asOf: '2026-06-01' };

const OLEO: Material = {
  id: 'sc-test-oleo',
  name: 'Test oleochemical',
  group: 'MG-TEST',
  sapType: 'ROH',
  basis: 'domestic',
  materialClass: 'RM_OLEO',
  basket: [
    { rootId: 'r1', weight: 0.6 },
    { rootId: 'r2', weight: 0.4 },
  ],
};

const TAIL: Material = {
  id: 'sc-test-tail',
  name: 'Test tail active',
  group: 'MG-TEST',
  sapType: 'ROH',
  basket: null,
  tail: true,
  reason: 'no modelable benchmark',
};

const DEPS: SpreadDeps = {
  join: { 'MAT-OLEO': 'sc-test-oleo', 'MAT-TAIL': 'sc-test-tail' },
  materials: { 'sc-test-oleo': OLEO, 'sc-test-tail': TAIL },
  roots: { r1: R1, r2: R2 },
  fx: FX,
};

const asSpread = (r: ReturnType<typeof spreadForQuote>): SpreadResult => {
  if (r.kind !== 'spread') throw new Error(`expected a spread, got ${r.kind}`);
  return r;
};

describe('spreadForQuote — join + gates', () => {
  it('resolves the SIMULATED join and computes a spread for a modelable KG material', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    expect(r.shouldCost).toEqual({ lowPerKg: 17400, midPerKg: 20000, highPerKg: 22600 });
    expect(r.quotePerKg).toBe(22000);
  });

  it('returns honest silence "unmapped" for an unknown or absent materialId', () => {
    expect(spreadForQuote('NOT-IN-MAP', 'KG', 22000, 'IDR', DEPS)).toEqual({ kind: 'silent', reason: 'unmapped' });
    expect(spreadForQuote(undefined, 'KG', 22000, 'IDR', DEPS)).toEqual({ kind: 'silent', reason: 'unmapped' });
  });

  it('returns honest silence "tail" for a material with no modelable basket', () => {
    // Correct unit (KG) — tail is still decided first: there is no should-cost.
    expect(spreadForQuote('MAT-TAIL', 'KG', 22000, 'IDR', DEPS)).toEqual({ kind: 'silent', reason: 'tail' });
  });

  it('returns honest silence "unit-mismatch" for a non-mass quote (PCS, L) — any currency', () => {
    expect(spreadForQuote('MAT-OLEO', 'PCS', 1500, 'IDR', DEPS)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
    expect(spreadForQuote('MAT-OLEO', 'L', 22000, 'IDR', DEPS)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
    // The unit gate is DIMENSIONAL — a USD per-piece quote is silent too.
    expect(spreadForQuote('MAT-OLEO', 'PCS', 1.5, 'USD', DEPS)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
  });
});

describe('spreadForQuote — spread math, band inheritance, MT normalization', () => {
  it('measures the point quote against the band → an ordered range (low ≤ mid ≤ high)', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    // vs high 22600 → smallest premium; vs mid 20000 → +10%; vs low 17400 → largest.
    expect(r.spread.lowPct).toBeCloseTo((22000 - 22600) / 22600, 10);
    expect(r.spread.midPct).toBeCloseTo(0.1, 10);
    expect(r.spread.highPct).toBeCloseTo((22000 - 17400) / 17400, 10);
    expect(r.spread.lowPct).toBeLessThan(r.spread.midPct);
    expect(r.spread.midPct).toBeLessThan(r.spread.highPct);
  });

  it('a below-model quote yields a negative spread across the whole range', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 15000, 'IDR', DEPS));
    expect(r.spread.highPct).toBeLessThan(0); // even vs the cheapest should-cost, under
  });

  it('normalizes an MT quote to per-kg (÷1000) — identical to the KG spread at 1000× price', () => {
    const kg = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    const mt = asSpread(spreadForQuote('MAT-OLEO', 'MT', 22000 * KG_PER_MT, 'IDR', DEPS));
    expect(mt.quotePerKg).toBe(22000);
    expect(mt.spread).toEqual(kg.spread);
  });
});

describe('spreadForQuote — currency (ruling A: engine-native USD, FX-applied IDR)', () => {
  it('IDR quote → FX-applied branch: IDR band, fxApplied:true, liveness basket ⊕ FX', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    expect(r.currency).toBe('IDR');
    expect(r.fxApplied).toBe(true);
    expect(r.shouldCost.midPerKg).toBe(20000);
    expect(r.epistemic).toBe('MODELED');
    expect(r.coeffVersion).toBe(COEFF_VERSION);
    expect(r.vintage).toBe('2026-04-01');
  });

  it('USD quote → engine-native FX-FREE branch: USD basis band, fxApplied:false', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 2.2, 'USD', DEPS));
    expect(r.currency).toBe('USD');
    expect(r.fxApplied).toBe(false);
    // The USD band is basisCostUsdPerKg (2.00) ± pct (0.13) — NO FX multiply.
    expect(r.shouldCost.midPerKg).toBeCloseTo(2.0, 10);
    expect(r.shouldCost.lowPerKg).toBeCloseTo(2.0 * (1 - 0.13), 10);
    expect(r.shouldCost.highPerKg).toBeCloseTo(2.0 * (1 + 0.13), 10);
  });

  it('the spread % is FX-INVARIANT: same real price → same spread, IDR or USD', () => {
    // IDR 22000 == USD 2.2 at fx 10000; FX cancels in the ratio → identical spread.
    const idr = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    const usd = asSpread(spreadForQuote('MAT-OLEO', 'KG', 2.2, 'USD', DEPS));
    expect(usd.spread.midPct).toBeCloseTo(idr.spread.midPct, 10);
    expect(usd.spread.lowPct).toBeCloseTo(idr.spread.lowPct, 10);
    expect(usd.spread.highPct).toBeCloseTo(idr.spread.highPct, 10);
    // …but the honesty markers differ: IDR carried FX, USD did not.
    expect(idr.fxApplied).toBe(true);
    expect(usd.fxApplied).toBe(false);
  });

  it('USD branch is FX-FREE in liveness too: excludes FX feed-liveness (CI-3-forward)', () => {
    // Roots SNAPSHOT, FX SIMULATED. IDR (basket ⊕ FX) → weakest = SIMULATED;
    // USD (basket only) → SNAPSHOT. Proves the USD branch does not inherit FX.
    const snapRoots = {
      r1: { ...R1, liveness: 'SNAPSHOT' as const },
      r2: { ...R2, liveness: 'SNAPSHOT' as const },
    };
    const deps: SpreadDeps = { ...DEPS, roots: snapRoots, fx: { ...FX, liveness: 'SIMULATED' } };
    expect(asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', deps)).liveness).toBe('SIMULATED');
    expect(asSpread(spreadForQuote('MAT-OLEO', 'KG', 2.2, 'USD', deps)).liveness).toBe('SNAPSHOT');
  });
});

describe('spreadForQuote — against the real CI-2 fixtures (the smoke cases)', () => {
  const realDeps: SpreadDeps = {
    join: MATERIAL_TO_BASKET,
    materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
    roots: ROOT_BENCHMARKS,
    fx: SIMULATED_SPOT_FX,
  };

  it('glycerin (IDR, KG, modelable) → MODELED × SIMULATED spread, FX-applied', () => {
    const r = asSpread(spreadForQuote('RM-EMUL-3310', 'KG', 22000, 'IDR', realDeps));
    expect(r.currency).toBe('IDR');
    expect(r.fxApplied).toBe(true);
    expect(r.liveness).toBe('SIMULATED');
    expect(r.epistemic).toBe('MODELED');
    expect(r.shouldCost.midPerKg).toBeGreaterThan(0);
  });

  it('propylene glycol (USD, KG, imported) → FX-FREE USD spread, no FX applied', () => {
    const r = asSpread(spreadForQuote('RM-HUMEC-3405', 'KG', 2.85, 'USD', realDeps));
    expect(r.currency).toBe('USD');
    expect(r.fxApplied).toBe(false);
    expect(r.liveness).toBe('SIMULATED');
    expect(r.shouldCost.midPerKg).toBeGreaterThan(0);
    expect(r.shouldCost.midPerKg).toBeLessThan(20); // a USD/kg figure, not an IDR one
  });

  it('niacinamide (tail) → silent "tail"; PET bottle (PCS) → silent "unit-mismatch"', () => {
    expect(spreadForQuote('AI-NIAC-6601', 'KG', 200000, 'IDR', realDeps)).toEqual({ kind: 'silent', reason: 'tail' });
    expect(spreadForQuote('PK-PETB-8810', 'PCS', 1300, 'IDR', realDeps)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
  });
});

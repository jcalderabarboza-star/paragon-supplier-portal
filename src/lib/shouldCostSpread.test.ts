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
// Numbers chosen so the §5 formula lands on round IDR/kg and the spread math is
// checkable by hand. RM_OLEO domestic, credit>0 (so the band widens by 0.05):
//   basketSum = 0.6·2.0 + 0.4·1.0                       = 1.60
//   basis     = 1.60 + conv .30 − credit .10 + freight .03 + duties .02 + margin .15 = 2.00
//   mid       = 2.00 × 10000 fx                          = 20000
//   pct       = margin .08 + creditWidening .05          = 0.13
//   low/high  = 20000·(1∓.13)                            = 17400 / 22600
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
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, DEPS));
    expect(r.shouldCost).toEqual({ lowIdrPerKg: 17400, midIdrPerKg: 20000, highIdrPerKg: 22600, pct: 0.13 });
    expect(r.quoteIdrPerKg).toBe(22000);
  });

  it('returns honest silence "unmapped" for an unknown or absent materialId', () => {
    expect(spreadForQuote('NOT-IN-MAP', 'KG', 22000, DEPS)).toEqual({ kind: 'silent', reason: 'unmapped' });
    expect(spreadForQuote(undefined, 'KG', 22000, DEPS)).toEqual({ kind: 'silent', reason: 'unmapped' });
  });

  it('returns honest silence "tail" for a material with no modelable basket', () => {
    // Correct unit (KG) — tail is still decided first: there is no should-cost.
    expect(spreadForQuote('MAT-TAIL', 'KG', 22000, DEPS)).toEqual({ kind: 'silent', reason: 'tail' });
  });

  it('returns honest silence "unit-mismatch" for a non-mass quote (PCS, L)', () => {
    expect(spreadForQuote('MAT-OLEO', 'PCS', 1500, DEPS)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
    expect(spreadForQuote('MAT-OLEO', 'L', 22000, DEPS)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
  });
});

describe('spreadForQuote — spread math, band inheritance, MT normalization', () => {
  it('measures the point quote against the band → an ordered range (low ≤ mid ≤ high)', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, DEPS));
    // vs high 22600 → smallest premium; vs mid 20000 → +10%; vs low 17400 → largest.
    expect(r.spread.lowPct).toBeCloseTo((22000 - 22600) / 22600, 10);
    expect(r.spread.midPct).toBeCloseTo(0.1, 10);
    expect(r.spread.highPct).toBeCloseTo((22000 - 17400) / 17400, 10);
    expect(r.spread.lowPct).toBeLessThan(r.spread.midPct);
    expect(r.spread.midPct).toBeLessThan(r.spread.highPct);
  });

  it('a below-model quote yields a negative spread across the whole range', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 15000, DEPS));
    expect(r.spread.highPct).toBeLessThan(0); // even vs the cheapest should-cost, under
  });

  it('normalizes an MT quote to IDR/kg (÷1000) — identical to the KG spread at 1000× price', () => {
    const kg = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, DEPS));
    const mt = asSpread(spreadForQuote('MAT-OLEO', 'MT', 22000 * KG_PER_MT, DEPS));
    expect(mt.quoteIdrPerKg).toBe(22000);
    expect(mt.spread).toEqual(kg.spread);
  });

  it('inherits the should-cost liveness (SIMULATED) and permanent MODELED epistemic', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, DEPS));
    expect(r.liveness).toBe('SIMULATED');
    expect(r.epistemic).toBe('MODELED');
    expect(r.coeffVersion).toBe(COEFF_VERSION);
    expect(r.vintage).toBe('2026-04-01'); // the oldest input as-of
  });
});

describe('spreadForQuote — against the real CI-2 fixtures (the smoke cases)', () => {
  const realDeps: SpreadDeps = {
    join: MATERIAL_TO_BASKET,
    materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
    roots: ROOT_BENCHMARKS,
    fx: SIMULATED_SPOT_FX,
  };

  it('glycerin (KG, modelable) renders a MODELED × SIMULATED spread', () => {
    const r = asSpread(spreadForQuote('RM-EMUL-3310', 'KG', 22000, realDeps));
    expect(r.liveness).toBe('SIMULATED');
    expect(r.epistemic).toBe('MODELED');
    expect(r.shouldCost.midIdrPerKg).toBeGreaterThan(0);
  });

  it('niacinamide (tail) → silent "tail"; PET bottle (PCS) → silent "unit-mismatch"', () => {
    expect(spreadForQuote('AI-NIAC-6601', 'KG', 200000, realDeps)).toEqual({ kind: 'silent', reason: 'tail' });
    expect(spreadForQuote('PK-PETB-8810', 'PCS', 1300, realDeps)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
  });
});

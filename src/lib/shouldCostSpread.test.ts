import { describe, it, expect } from 'vitest';
import {
  spreadForQuote,
  isPriceableCurrency,
  KG_PER_MT,
  SPREAD_BASIS,
  type SpreadDeps,
  type SpreadResult,
} from './shouldCostSpread';
import { BID_CURRENCIES } from './currencyPolicy';
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
import { MATERIAL_BASKET_CLASSIFICATION } from '../services/data/mock/fixtures/commodityMaterialMap';

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
  it('IDR quote → FX_CONVERTED branch: IDR band, liveness basket ⊕ FX', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS));
    expect(r.currency).toBe('IDR');
    expect(r.basis).toBe('FX_CONVERTED');
    expect(r.shouldCost.midPerKg).toBe(20000);
    expect(r.epistemic).toBe('MODELED');
    expect(r.coeffVersion).toBe(COEFF_VERSION);
    expect(r.vintage).toBe('2026-04-01');
  });

  it('USD quote → ENGINE_NATIVE branch: USD basis band, FX-free', () => {
    const r = asSpread(spreadForQuote('MAT-OLEO', 'KG', 2.2, 'USD', DEPS));
    expect(r.currency).toBe('USD');
    expect(r.basis).toBe('ENGINE_NATIVE');
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
    expect(idr.basis).toBe('FX_CONVERTED');
    expect(usd.basis).toBe('ENGINE_NATIVE');
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
    join: MATERIAL_BASKET_CLASSIFICATION,
    materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
    roots: ROOT_BENCHMARKS,
    fx: SIMULATED_SPOT_FX,
  };

  it('glycerin (IDR, KG, modelable) → MODELED × SIMULATED spread, FX-applied', () => {
    const r = asSpread(spreadForQuote('RM-EMUL-3310', 'KG', 22000, 'IDR', realDeps));
    expect(r.currency).toBe('IDR');
    expect(r.basis).toBe('FX_CONVERTED');
    expect(r.liveness).toBe('SIMULATED');
    expect(r.epistemic).toBe('MODELED');
    expect(r.shouldCost.midPerKg).toBeGreaterThan(0);
  });

  it('propylene glycol (USD, KG, imported) → FX-FREE USD spread, no FX applied', () => {
    const r = asSpread(spreadForQuote('RM-HUMEC-3405', 'KG', 2.85, 'USD', realDeps));
    expect(r.currency).toBe('USD');
    expect(r.basis).toBe('ENGINE_NATIVE');
    expect(r.liveness).toBe('SIMULATED');
    expect(r.shouldCost.midPerKg).toBeGreaterThan(0);
    expect(r.shouldCost.midPerKg).toBeLessThan(20); // a USD/kg figure, not an IDR one
  });

  it('niacinamide (tail) → silent "tail"; PET bottle (PCS) → silent "unit-mismatch"', () => {
    expect(spreadForQuote('AI-NIAC-6601', 'KG', 200000, 'IDR', realDeps)).toEqual({ kind: 'silent', reason: 'tail' });
    expect(spreadForQuote('PK-PETB-8810', 'PCS', 1300, 'IDR', realDeps)).toEqual({ kind: 'silent', reason: 'unit-mismatch' });
  });
});

// ── CP-0 · 2e-c-5 — the union widens, and the branches it was protecting ─────
//
// `SpreadCurrency = 'IDR' | 'USD'` was the only thing turning a wrong branch
// into a COMPILE error. Widening it without fixing the branches would have
// converted compile-time refusal into runtime lies, which is why this was held
// back for its own batch rather than riding along with the earlier ones.
//
// Three branches tested the same fact (`currency === 'USD'`) and each treated
// "not USD" as "IDR". These specs pin what each would have done to a EUR quote,
// and what it does instead.
describe('spreadForQuote — a currency with no engine branch (D-4: honest silence)', () => {
  it('THE LOCK — a EUR quote returns silent:currency-unsupported', () => {
    expect(spreadForQuote('MAT-OLEO', 'KG', 2.85, 'EUR', DEPS)).toEqual({
      kind: 'silent',
      reason: 'currency-unsupported',
    });
  });

  it('THE REGRESSION — it is NOT measured against the rupiah band', () => {
    // What the retired branch did: a EUR 2.85 quote against an IDR band of
    // 17,400–22,600 reads (2.85 − 22600)/22600 = −99.99%. A confident, precise,
    // entirely fictional "this bid is 99.99% below should-cost", on the row a
    // buyer awards from. There is now no spread object to read it off at all.
    const r = spreadForQuote('MAT-OLEO', 'KG', 2.85, 'EUR', DEPS);
    expect(r.kind).toBe('silent');
    expect(r).not.toHaveProperty('spread');
    expect(r).not.toHaveProperty('shouldCost');
  });

  it('does NOT claim an FX conversion that never happened', () => {
    // `fxApplied: currency !== 'USD'` would have reported TRUE for EUR —
    // asserting the band was pushed through a pair that does not exist. The
    // result carries no basis at all now, because no branch ran.
    const r = spreadForQuote('MAT-OLEO', 'KG', 2.85, 'EUR', DEPS);
    expect(r).not.toHaveProperty('basis');
    expect(r).not.toHaveProperty('liveness');
  });

  it('the currency gate runs FIRST — ahead of unmapped, tail and unit', () => {
    // Ordered by how fundamental the obstacle is (the doctrine that already put
    // 'tail' ahead of the unit gate). An unmapped material could be mapped and a
    // tail could gain a basket; a currency with no branch cannot be priced for
    // ANY material, so fixing the other three would still yield no spread.
    // Saying 'unmapped' here would send a buyer to fix the wrong thing.
    expect(spreadForQuote('NOT-IN-MAP', 'KG', 2.85, 'EUR', DEPS)).toEqual({
      kind: 'silent',
      reason: 'currency-unsupported',
    });
    expect(spreadForQuote('MAT-TAIL', 'KG', 2.85, 'EUR', DEPS)).toEqual({
      kind: 'silent',
      reason: 'currency-unsupported',
    });
    expect(spreadForQuote('MAT-OLEO', 'PCS', 2.85, 'EUR', DEPS)).toEqual({
      kind: 'silent',
      reason: 'currency-unsupported',
    });
  });

  it('POSITIVE TWIN — the two priceable currencies are untouched by the widening', () => {
    // The whole risk of this batch, negated: widening the parameter must change
    // nothing for the currencies that already had branches.
    expect(asSpread(spreadForQuote('MAT-OLEO', 'KG', 22000, 'IDR', DEPS)).basis).toBe(
      'FX_CONVERTED',
    );
    expect(asSpread(spreadForQuote('MAT-OLEO', 'KG', 2.2, 'USD', DEPS)).basis).toBe(
      'ENGINE_NATIVE',
    );
  });
});

describe('SPREAD_BASIS — the branch table is the single source of truth', () => {
  it('names a branch for exactly the currencies the engine can price', () => {
    // The engine is USD-native (roots are USD/kg) and carries ONE FX pair
    // (FxRate.idrPerUsd). So USD needs no conversion, IDR has a pair, and
    // nothing else has either.
    expect(Object.keys(SPREAD_BASIS).sort()).toEqual(['IDR', 'USD']);
    expect(SPREAD_BASIS.USD).toBe('ENGINE_NATIVE');
    expect(SPREAD_BASIS.IDR).toBe('FX_CONVERTED');
  });

  it('isPriceableCurrency agrees with the table, for every permitted bid currency', () => {
    // The guard and the table cannot drift: one is derived from the other. If a
    // currency is ever added to the table without a feed, THIS is the test that
    // should be updated deliberately rather than discovered in production.
    for (const c of BID_CURRENCIES) {
      expect(isPriceableCurrency(c)).toBe(c in SPREAD_BASIS);
    }
  });

  it('POLICY IS WIDER THAN CAPABILITY — and the gap is exactly EUR today', () => {
    // The D-4 ruling made executable. If this ever fails, either a currency
    // gained a branch (fine — update it deliberately, with its feed) or policy
    // narrowed (which would make the honest-silence branch dead code).
    const unpriceable = BID_CURRENCIES.filter((c) => !isPriceableCurrency(c));
    expect(unpriceable).toEqual(['EUR']);
  });

  it('every priceable currency is a PERMITTED bid currency', () => {
    // The inverse guard: a branch for a currency nobody may bid in is dead code
    // at best, and at worst a path reachable by some route policy no longer
    // sanctions.
    for (const c of Object.keys(SPREAD_BASIS)) {
      expect(BID_CURRENCIES).toContain(c);
    }
  });
});

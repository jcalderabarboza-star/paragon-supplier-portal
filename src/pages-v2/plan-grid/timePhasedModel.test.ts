// ────────────────────────────────────────────────────────────────────────────
// B2 · the time-phased MODEL — sort, filter and exception order, by NAMED
// members (never a count: a count is satisfied by the wrong rows).
//
// The facts are built by hand here so each exception reason can be isolated;
// one spec at the end runs the REAL seam over the generated fixture so the model
// is also proven against the corpus it will actually render.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  applyPlanView,
  blocksOfViewType,
  buildPlanBlocks,
  flattenPlanRows,
  isPlanException,
  planCellText,
  staleKey,
  DEFAULT_PLAN_FILTER,
  type PlanFilter,
} from './planGridModel';
import type { PlanningFact } from '../../services/planning/facts';
import { visibleMeasures } from './visibleMeasures';
import type { MeasureId } from '../../services/planning/measures';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS, viewGrainAndHorizon } from '../../services/planning/views';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

const H = ['2026-08', '2026-09', '2026-10'];
const MEASURES: readonly MeasureId[] = ['demand', 'allocation', 'confirmed', 'confirmedDeficit'];

const f = (
  materialCode: string,
  measureId: MeasureId,
  periodBucket: string,
  value: number | null,
  supplierId: string | null = null,
): PlanningFact => ({
  materialCode,
  supplierId,
  periodBucket,
  measureId,
  value,
  uom: 'KG',
  provenance: { source: 'SOMO', liveness: 'SIMULATED', planState: 'committed' },
  sourceRef: 'hand',
});

/**
 * Four materials, one reason each:
 *  · SIM-RM-0001 — SHORT in 2026-09 by 500 (allocated 1000, confirmed 500)
 *  · SIM-RM-0003 — SHORT in 2026-08 by 200
 *  · SIM-PM-0002 — AWAITING: allocated in 2026-10, no confirmation
 *  · SIM-PM-0004 — clean: allocated and confirmed in full
 */
const FACTS: readonly PlanningFact[] = [
  f('SIM-RM-0001', 'demand', '2026-09', 1000),
  f('SIM-RM-0001', 'allocation', '2026-09', 1000, 'sup-sim-013'),
  f('SIM-RM-0001', 'confirmed', '2026-09', 500, 'sup-sim-013'),
  f('SIM-RM-0001', 'confirmedDeficit', '2026-09', 500, 'sup-sim-013'),
  f('SIM-RM-0003', 'demand', '2026-08', 800),
  f('SIM-RM-0003', 'allocation', '2026-08', 800, 'sup-sim-014'),
  f('SIM-RM-0003', 'confirmed', '2026-08', 600, 'sup-sim-014'),
  f('SIM-RM-0003', 'confirmedDeficit', '2026-08', 200, 'sup-sim-014'),
  f('SIM-PM-0002', 'demand', '2026-10', 5000),
  f('SIM-PM-0002', 'allocation', '2026-10', 5000, 'sup-sim-015'),
  f('SIM-PM-0002', 'confirmed', '2026-10', null, 'sup-sim-015'),
  f('SIM-PM-0002', 'confirmedDeficit', '2026-10', null, 'sup-sim-015'),
  f('SIM-PM-0004', 'demand', '2026-08', 3000),
  f('SIM-PM-0004', 'allocation', '2026-08', 3000, 'sup-sim-016'),
  f('SIM-PM-0004', 'confirmed', '2026-08', 3000, 'sup-sim-016'),
  f('SIM-PM-0004', 'confirmedDeficit', '2026-08', 0, 'sup-sim-016'),
];

const blocks = buildPlanBlocks(FACTS, H, MEASURES);
const codes = (filter: Partial<PlanFilter> = {}, sort = { colId: 'materialCode' as const, dir: 'asc' as const }) =>
  applyPlanView(blocks, { ...DEFAULT_PLAN_FILTER, ...filter }, sort).map((b) => b.materialCode);

describe('B2 · the pivot — one row per material × measure, supplier sub-rows', () => {
  it('a material-grain measure is one row; a supplier-grain one is a row per supplier', () => {
    const rows = flattenPlanRows(blocks.filter((b) => b.materialCode === 'SIM-RM-0001'));
    expect(rows.map((r) => [r.measureId, r.supplierId])).toEqual([
      ['demand', null],
      ['allocation', 'sup-sim-013'],
      ['confirmed', 'sup-sim-013'],
      ['confirmedDeficit', 'sup-sim-013'],
    ]);
    expect(rows.map((r) => r.blockHead)).toEqual([true, false, false, false]);
  });

  it('the derived measure is marked derived, an authored one is not', () => {
    const rows = flattenPlanRows(blocks.filter((b) => b.materialCode === 'SIM-RM-0001'));
    expect(rows.find((r) => r.measureId === 'confirmedDeficit')!.derived).toBe(true);
    expect(rows.find((r) => r.measureId === 'demand')!.derived).toBe(false);
  });

  it('the horizon aggregates are computed per material, and absent figures stay null', () => {
    const b = blocks.find((x) => x.materialCode === 'SIM-RM-0001')!;
    expect(b.agg).toEqual({ demand: 1000, confirmed: 500, deficit: 500, firstShortBucket: '2026-09' });
    const pm = blocks.find((x) => x.materialCode === 'SIM-PM-0002')!;
    expect(pm.agg.confirmed).toBeNull();
    expect(pm.agg.deficit).toBeNull();
    expect(pm.agg.firstShortBucket).toBeNull();
  });

  it('a SPEC measure is dropped before the pivot — even a fact for it renders no row', () => {
    const shown = visibleMeasures([...MEASURES, 'rop', 'safetyStock', 'projectedStock']);
    expect(shown).toEqual(MEASURES);
    const withSpec = buildPlanBlocks([...FACTS, f('SIM-RM-0001', 'rop', '2026-09', 5)], H, shown);
    expect(flattenPlanRows(withSpec).some((r) => r.measureId === 'rop')).toBe(false);
  });
});

describe('B2 · sort by any attribute or aggregate — named members, nulls last', () => {
  it('by material code, both directions', () => {
    expect(codes()).toEqual(['SIM-PM-0002', 'SIM-PM-0004', 'SIM-RM-0001', 'SIM-RM-0003']);
    expect(codes({}, { colId: 'materialCode', dir: 'desc' } as never)).toEqual([
      'SIM-RM-0003',
      'SIM-RM-0001',
      'SIM-PM-0004',
      'SIM-PM-0002',
    ]);
  });

  it('by horizon shortfall, largest first — the unanswered material sorts LAST, not as zero', () => {
    expect(codes({}, { colId: 'agg:deficit', dir: 'desc' } as never)).toEqual([
      'SIM-RM-0001',
      'SIM-RM-0003',
      'SIM-PM-0004',
      'SIM-PM-0002',
    ]);
    // …and still last ascending: an absent figure is never the smallest.
    const asc = codes({}, { colId: 'agg:deficit', dir: 'asc' } as never);
    expect(asc[asc.length - 1]).toBe('SIM-PM-0002');
  });

  it('by horizon demand ascending', () => {
    expect(codes({}, { colId: 'agg:demand', dir: 'asc' } as never)).toEqual([
      'SIM-RM-0003',
      'SIM-RM-0001',
      'SIM-PM-0004',
      'SIM-PM-0002',
    ]);
  });
});

describe('B2 · filter by material type and by text', () => {
  it('RM keeps the raw materials only; PM the packaging only', () => {
    expect(codes({ materialType: 'ROH' })).toEqual(['SIM-RM-0001', 'SIM-RM-0003']);
    expect(codes({ materialType: 'VERP' })).toEqual(['SIM-PM-0002', 'SIM-PM-0004']);
  });

  it('search matches the code or the description, case-insensitively', () => {
    expect(codes({ search: 'rm-0003' })).toEqual(['SIM-RM-0003']);
    expect(codes({ search: 'SAMPLE PACKAGING 0004' })).toEqual(['SIM-PM-0004']);
    expect(codes({ search: 'no such material' })).toEqual([]);
  });
});

describe('B2 · exceptions only — the rule, and the urgency order', () => {
  it('shortfall and awaiting are exceptions; a fully confirmed material is not', () => {
    expect(codes({ exceptionsOnly: true })).not.toContain('SIM-PM-0004');
    expect(blocks.find((b) => b.materialCode === 'SIM-PM-0002')!.exceptions).toEqual({
      shortfall: false,
      awaiting: true,
      stale: false,
    });
  });

  it('ordered by first short bucket, then shortfall — whatever sort is chosen', () => {
    const order = codes({ exceptionsOnly: true }, { colId: 'materialCode', dir: 'desc' } as never);
    expect(order).toEqual(['SIM-RM-0003', 'SIM-RM-0001', 'SIM-PM-0002']);
  });

  it('within the same first short bucket, the larger shortfall comes first', () => {
    const tie = buildPlanBlocks(
      [
        f('SIM-RM-0005', 'confirmedDeficit', '2026-08', 100, 'sup-sim-020'),
        f('SIM-RM-0007', 'confirmedDeficit', '2026-08', 900, 'sup-sim-021'),
      ],
      H,
      MEASURES,
    );
    expect(applyPlanView(tie, { ...DEFAULT_PLAN_FILTER, exceptionsOnly: true }, { colId: 'materialCode', dir: 'asc' }).map((b) => b.materialCode)).toEqual([
      'SIM-RM-0007',
      'SIM-RM-0005',
    ]);
  });

  it('a STALE answer alone makes an exception', () => {
    const stale = buildPlanBlocks(FACTS, H, MEASURES, new Set([staleKey('sup-sim-016', 'SIM-PM-0004', '2026-08')]));
    const b = stale.find((x) => x.materialCode === 'SIM-PM-0004')!;
    expect(b.exceptions).toEqual({ shortfall: false, awaiting: false, stale: true });
    expect(isPlanException(b.exceptions)).toBe(true);
  });

  it('KNOWN-GOOD: nothing wrong is not an exception', () => {
    expect(isPlanException({ shortfall: false, awaiting: false, stale: false })).toBe(false);
  });
});

describe('B2 · the null rule — "no figure" is a dash, never 0', () => {
  it('null and a missing cell read "—"; a real zero reads 0', () => {
    const fmt = (n: number) => String(n);
    expect(planCellText(null, fmt)).toBe('—');
    expect(planCellText(undefined, fmt)).toBe('—');
    expect(planCellText(0, fmt)).toBe('0');
  });

  it('a bucket with no fact is null in the row — the pivot never fills a zero', () => {
    const row = flattenPlanRows(blocks).find((r) => r.materialCode === 'SIM-RM-0001' && r.measureId === 'demand')!;
    expect(row.cells).toEqual({ '2026-08': null, '2026-09': 1000, '2026-10': null });
  });
});

describe('B2 · the model over the REAL seam and the generated corpus', () => {
  it('rm-plan over 12 months: named materials present, every cell a number or null', async () => {
    const view = VIEWS.find((v) => v.viewId === 'rm-plan')!;
    const horizon = somoHorizon('month').slice(0, view.horizonLength);
    const page = await new MockPlanningService().getPlanningFacts(
      { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer },
      { horizon, measures: view.measuresShown },
    );
    // ⚠️ PLN-2 · the raw-materials view lists RAW MATERIALS. This spec pinned
    // `SIM-PM-1158` (packaging) as PRESENT in the monthly view — the two-grain
    // defect, asserted. It now pins the packaging material ABSENT and every
    // listed block ROH, through the same view-type step the grid runs.
    const real = blocksOfViewType(buildPlanBlocks(page.items, horizon, view.measuresShown), viewGrainAndHorizon(view, 'month').materialType);
    const byCode = new Map(real.map((b) => [b.materialCode, b]));
    expect(byCode.get('SIM-RM-0001')?.materialType).toBe('ROH');
    expect(byCode.has('SIM-PM-1158')).toBe(false);
    expect(real.every((b) => b.materialType === 'ROH')).toBe(true);
    expect(byCode.get('RM-EMUL-3310')?.agg.demand).toBe(9500);
    for (const r of flattenPlanRows(real)) {
      for (const v of Object.values(r.cells)) expect(v === null || typeof v === 'number').toBe(true);
    }
  });

  // ⚠️ B3 · STEP 0 (operator ruling). At B2 1,162 of 1,163 materials were
  // exceptions and "Exceptions only" narrowed nothing. The share is now pinned
  // as a BAND over the real seam, and — because a band is satisfied by the
  // wrong members — by NAMED members on both sides of the rule.
  // ⚠️ PLN-2 · the named members are now each view's OWN type. This pinned
  // SIM-PM-0004 (packaging) and SIM-RM-0019 (raw) in BOTH views — true only
  // while every material was planned at both grains.
  it.each([
    ['rm-plan', 'month', { short: 'SIM-RM-0019', awaiting: 'SIM-RM-0067', covered: 'SIM-RM-0001' }],
    ['pm-plan', 'week', { short: 'SIM-PM-0034', awaiting: 'SIM-PM-0004', covered: 'SIM-PM-0002' }],
  ] as const)('%s: exceptions are a realistic minority (10–15%%), named on both sides', async (viewId, grain, named) => {
    const view = VIEWS.find((v) => v.viewId === viewId)!;
    const horizon = somoHorizon(grain).slice(0, view.horizonLength);
    const measures = visibleMeasures(view.measuresShown);
    const page = await new MockPlanningService().getPlanningFacts(
      { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer },
      { horizon, measures },
    );
    const real = blocksOfViewType(buildPlanBlocks(page.items, horizon, measures), viewGrainAndHorizon(view, grain).materialType);
    const byCode = new Map(real.map((b) => [b.materialCode, b]));
    const share = real.filter((b) => isPlanException(b.exceptions)).length / real.length;
    expect(share).toBeGreaterThanOrEqual(0.1);
    expect(share).toBeLessThanOrEqual(0.15);
    // named: one short, one awaiting, one covered
    expect(byCode.get(named.short)?.exceptions).toMatchObject({ shortfall: true, awaiting: false });
    expect(byCode.get(named.awaiting)?.exceptions).toMatchObject({ shortfall: false, awaiting: true });
    expect(isPlanException(byCode.get(named.covered)!.exceptions)).toBe(false);
  });
});

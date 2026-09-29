// ────────────────────────────────────────────────────────────────────────────
// B1 · THE REGISTRY GATES (Design 1 §3 rules, §4 properties, §11 "Registry
// gates"). Every assertion is over the WHOLE registry, and each is paired with
// a known-good member it must still accept — a gate that refused everything
// would pass every refusal below.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { MEASURES, measureOf, type MeasureId } from './measures';
import { COLUMNS, bucketColumns, bucketColumnId, type ColumnSpec } from './columns';
import { VIEWS } from './views';
import { liveness } from '../liveness/registry';
import { getTransition } from '../transitions';
import { planGridEn, planGridId } from '../../lib/i18n/planGrid';

const MONTHS = ['2026-08', '2026-09', '2026-10'];
const allBucketColumns = (): ColumnSpec[] =>
  MEASURES.flatMap((m) => {
    const out = bucketColumns(MONTHS, m.id);
    if (!out.ok) throw new Error(`generator refused ${m.id}`);
    return [...out.columns];
  });
/** Every governed entry the grid can render: measures, columns, generated buckets. */
const everything = () => [
  ...MEASURES.map((m) => ({ id: `measure:${m.id}`, derivation: m.derivation, editable: m.editable, honesty: m.honesty })),
  ...COLUMNS.map((c) => ({ id: `column:${c.id}`, derivation: c.derivation, editable: c.editable, honesty: c.honesty })),
  ...allBucketColumns().map((c) => ({ id: `bucket:${c.id}`, derivation: c.derivation, editable: c.editable, honesty: c.honesty })),
];

describe('B1 · derived ⇒ not editable, and derived ⇒ carries its honesty marker', () => {
  it('POPULATION: the derived measures and columns the rule is about are present by name', () => {
    const ids = everything().filter((e) => e.derivation === 'derived').map((e) => e.id);
    expect(ids).toContain('measure:confirmedDeficit');
    expect(ids).toContain('measure:coverageRatio');
    expect(ids).toContain('column:agg:deficit');
    expect(ids).toContain('bucket:b:confirmedDeficit:2026-09');
  });

  it('no derived entry is editable — a client-minted value is never a thing a person types over', () => {
    const offenders = everything().filter((e) => e.derivation === 'derived' && e.editable !== false);
    expect(offenders.map((e) => e.id)).toEqual([]);
  });

  it('every derived entry renders behind a marker — never a bare figure', () => {
    const bare = everything().filter((e) => e.derivation === 'derived' && e.honesty === 'none');
    expect(bare.map((e) => e.id)).toEqual([]);
  });

  it('KNOWN-GOOD: an authored measure MAY be editable (the rule is not "nothing is editable")', () => {
    expect(measureOf('acceptedQty').derivation).toBe('authored');
    expect(measureOf('acceptedQty').editable).not.toBe(false);
  });
});

describe('B1 · the editable measure set is exactly {acceptedQty} (B4 widens it)', () => {
  it('pinned by name, derived from the registry', () => {
    // ⚠️ Design 1 §3 names TWO (acceptedQty and allocation). `allocation`'s verb,
    // `t_publication_allocate`, does not exist until B4 — pinned here so the day
    // B4 adds it, this line is the one it has to change, on purpose.
    expect(MEASURES.filter((m) => m.editable !== false).map((m) => m.id)).toEqual(['acceptedQty']);
    expect(measureOf('allocation').editable).toBe(false);
  });

  it('the edit names a verb the machine really has, gated on the atom the machine really requires', () => {
    const edit = measureOf('acceptedQty').editable;
    if (edit === false) throw new Error('acceptedQty must be editable');
    const verb = getTransition(edit.verb);
    expect(verb?.id).toBe('t_intake_commit');
    expect(edit.atom).toBe(verb?.requiredRole);
    expect(verb?.requiredFields).toContain(edit.payloadField);
    expect(edit.reasonRequiredWhen).toBe('differsFromBaseline');
  });

  it('no editable entry anywhere names a verb the registry does not hold', () => {
    const edits = [...MEASURES.map((m) => m.editable), ...COLUMNS.map((c) => c.editable)].filter(
      (e): e is Exclude<typeof e, false> => e !== false,
    );
    expect(edits.length).toBeGreaterThan(0);
    for (const e of edits) expect(getTransition(e.verb), e.verb).toBeDefined();
  });
});

describe('B1 · every labelKey exists in EN and in ID', () => {
  const keys = [
    ...MEASURES.map((m) => m.labelKey),
    ...COLUMNS.map((c) => c.labelKey),
    ...VIEWS.map((v) => v.labelKey),
  ];

  it('POPULATION: the key set holds known members', () => {
    expect(keys).toContain('planGrid.measure.acceptedQty');
    expect(keys).toContain('planGrid.column.agg.firstShortBucket');
    expect(keys).toContain('planGrid.view.rm-plan');
  });

  it.each(keys)('%s is present, non-blank, in both locales', (key) => {
    expect(planGridEn[key]?.trim(), `EN ${key}`).toBeTruthy();
    expect(planGridId[key]?.trim(), `ID ${key}`).toBeTruthy();
  });

  it('ID is not English with a key around it — a divergent member reads differently', () => {
    expect(planGridEn['planGrid.measure.demand']).toBe('Demand');
    expect(planGridId['planGrid.measure.demand']).toBe('Permintaan');
  });

  it('no registry entry carries text — labels are keys, and only keys', () => {
    for (const k of keys) expect(k).toMatch(/^planGrid\.(measure|column|view)\./);
  });
});

describe('B1 · SPEC measures are hidden by default and render no number', () => {
  const SPEC: readonly MeasureId[] = ['rop', 'safetyStock', 'projectedStock'];

  it('the three SPEC measures read SPEC from the liveness registry — availability is asked, not stored', () => {
    for (const id of SPEC) expect(liveness(measureOf(id).capability), id).toBe('SPEC');
    // KNOWN-GOOD: a produced measure is not SPEC.
    expect(liveness(measureOf('demand').capability)).not.toBe('SPEC');
  });

  it('they are hidden by default, and their bucket columns are too', () => {
    for (const id of SPEC) {
      expect(measureOf(id).defaultVisible, id).toBe(false);
      const cols = bucketColumns(MONTHS, id);
      expect(cols.ok && cols.columns.every((c) => !c.defaultVisible)).toBe(true);
    }
  });
});

describe('B1 · bucket columns exist ONLY through the generator', () => {
  it('the static registry holds no bucket column', () => {
    expect(COLUMNS.filter((c) => c.kind === 'bucket').map((c) => c.id)).toEqual([]);
    expect(COLUMNS.filter((c) => c.id.startsWith('b:')).map((c) => c.id)).toEqual([]);
  });

  it('the generator names its members `b:<measure>:<bucket>`, one per bucket, in order', () => {
    const out = bucketColumns(MONTHS, 'demand');
    expect(out.ok && out.columns.map((c) => c.id)).toEqual([
      'b:demand:2026-08',
      'b:demand:2026-09',
      'b:demand:2026-10',
    ]);
    expect(bucketColumnId('confirmed', '2026-W36')).toBe('b:confirmed:2026-W36');
  });

  it('a bucket column inherits its measure\'s governance — no more editable, no less marked', () => {
    const acc = bucketColumns(['2026-W36'], 'acceptedQty');
    expect(acc.ok && acc.columns[0].editable).toEqual(measureOf('acceptedQty').editable);
    const def = bucketColumns(['2026-W36'], 'confirmedDeficit');
    expect(def.ok && def.columns[0]).toMatchObject({ editable: false, honesty: 'model', derivation: 'derived' });
  });

  it('a MIXED-GRAIN horizon is refused by name', () => {
    expect(bucketColumns(['2026-08', '2026-W36'], 'demand')).toEqual({
      ok: false,
      reason: 'MIXED_GRAIN_IN_HORIZON',
      raw: '2026-08,2026-W36',
    });
  });

  it('a quarter is refused, and names the member that failed', () => {
    expect(bucketColumns(['2026-08', '2026-Q3'], 'demand')).toEqual({
      ok: false,
      reason: 'UNPARSEABLE_BUCKET',
      raw: '2026-Q3',
    });
  });

  it('KNOWN-GOOD: a pure-week horizon is admitted', () => {
    expect(bucketColumns(['2026-W36', '2026-W37'], 'demand').ok).toBe(true);
  });
});

describe('B1 · the view registry', () => {
  it('ships the five named views, each at its grain and horizon', () => {
    expect(VIEWS.map((v) => [v.viewId, v.grain, v.horizonLength])).toEqual([
      ['rm-plan', 'month', 12],
      ['pm-plan', 'week', 16],
      ['exceptions', 'current', 12],
      ['intake-review', 'none', 0],
      ['consolidation', 'month', 6],
    ]);
  });

  it('every measure and column a view shows is registered — a view cannot name a phantom', () => {
    const measures = new Set(MEASURES.map((m) => m.id));
    const columns = new Set(COLUMNS.map((c) => c.id));
    for (const v of VIEWS) {
      for (const m of v.measuresShown) expect(measures.has(m), `${v.viewId}:${m}`).toBe(true);
      for (const c of v.columnsShown) expect(columns.has(c), `${v.viewId}:${c}`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE SYNC APPLIER — SAP wins, whole record, nothing coerced, nothing
// deleted. Each rule of C13 §4 and §5, on the seeded replica.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { materialRecords, recordOf, recordsOf, syncRuns } from './replica';
import { SEED_RUN_ID } from './seed';
import { applySyncRun, ensureSeeded, resetReplica } from './syncApplier';
import { SYNC_REFUSAL_REASONS, type InboundRecord, type InboundRun, type MaterialData, type SyncRefusalReason } from './types';

const LATER = '2026-11-01T02:00:00.000Z';
const CODE = 'RM-COCO-8200';
const SEEDED: MaterialData = {
  description: 'Coconut Fatty Acid Distillate (CFAD)',
  materialType: 'ROH',
  materialGroup: 'MG-10',
  baseUnit: 'KG',
};

const run = (id: string, records: readonly InboundRecord[], over: Partial<InboundRun> = {}): InboundRun => ({
  id,
  source: 'SAP_S4',
  at: LATER,
  mode: 'DELTA',
  objects: [],
  records,
  ...over,
});
const material = (key: string, data: unknown, extra: Partial<InboundRecord> = {}): InboundRecord => ({ object: 'material', key, data, ...extra });

beforeEach(() => {
  resetReplica();
  ensureSeeded();
});

describe('MD-1 · an inbound record replaces the whole record and the sync log keeps the previous version', () => {
  it('⚠ CONTROL — the subject is seeded as the spec assumes', () => {
    expect(recordOf('material', CODE)?.data).toEqual(SEEDED);
    expect(recordOf('material', CODE)?.stamp.syncRun).toBe(SEED_RUN_ID);
  });

  it('SAP’s version replaces the replica’s whole, fields the run did not send included', () => {
    const before = recordOf('material', CODE);
    const row = applySyncRun(
      run('RUN-2', [material(CODE, { ...SEEDED, description: 'CFAD, distilled', baseUnit: 'L' }, { sourceChangedAt: '2026-10-30T09:00:00.000Z' })]),
    );
    const after = recordOf('material', CODE);
    expect(after?.data).toEqual({ ...SEEDED, description: 'CFAD, distilled', baseUnit: 'L' });
    expect(after?.stamp).toEqual({
      source: 'SAP_S4',
      readAt: LATER,
      sourceChangedAt: '2026-10-30T09:00:00.000Z',
      syncRun: 'RUN-2',
      sapStatus: 'ACTIVE',
      missingFromRun: null,
    });
    expect(row).toMatchObject({ created: 0, changed: 1, unchanged: 0, missing: 0, refused: [] });
    expect(row.replaced).toEqual([before]);
    expect(syncRuns()[0]).toBe(row);
  });

  it('a field the replica does not hold is dropped, never merged in', () => {
    applySyncRun(run('RUN-2', [material(CODE, { ...SEEDED, description: 'Renamed', extra: 'not a replicated field' })]));
    expect(Object.keys(recordOf('material', CODE)?.data ?? {}).sort()).toEqual(['baseUnit', 'description', 'materialGroup', 'materialType']);
  });

  it('SAP’s status arrives with the record: a block and a deletion flag are shown, not acted on', () => {
    applySyncRun(run('RUN-2', [material(CODE, SEEDED, { sapStatus: 'FLAGGED_FOR_DELETION' })]));
    expect(recordOf('material', CODE)?.stamp.sapStatus).toBe('FLAGGED_FOR_DELETION');
    expect(recordOf('material', CODE)?.data).toEqual(SEEDED);
  });

  it('an equal record is unchanged: it keeps the run that delivered it and takes the new read time', () => {
    const row = applySyncRun(run('RUN-2', [material(CODE, SEEDED)], { source: 'SAMPLE' }));
    expect(row).toMatchObject({ created: 0, changed: 0, unchanged: 1, replaced: [] });
    expect(recordOf('material', CODE)?.stamp).toMatchObject({ syncRun: SEED_RUN_ID, readAt: LATER });
  });

  it('a record the replica never held is created', () => {
    const row = applySyncRun(run('RUN-2', [material('RM-NEW-0001', { ...SEEDED, description: 'A new material' })]));
    expect(row).toMatchObject({ created: 1, changed: 0 });
    expect(recordOf('material', 'RM-NEW-0001')?.stamp.source).toBe('SAP_S4');
  });

  it('the same run delivered twice changes nothing the second time', () => {
    const inbound = run('RUN-2', [material(CODE, { ...SEEDED, description: 'CFAD, distilled' })]);
    const first = applySyncRun(inbound);
    const snapshot = JSON.stringify(materialRecords());
    const second = applySyncRun({ ...inbound, records: [material(CODE, { ...SEEDED, description: 'Something else' })] });
    expect(second).toBe(first);
    expect(JSON.stringify(materialRecords())).toBe(snapshot);
    expect(syncRuns().map((r) => r.id)).toEqual(['RUN-2', SEED_RUN_ID]);
  });
});

describe('MD-1 · an inbound value the replica cannot hold is refused by name and appears in the sync log', () => {
  const refusalOf = (records: readonly InboundRecord[]): { reason: SyncRefusalReason; value: string }[] =>
    applySyncRun(run('RUN-2', records)).refused.map(({ reason, value }) => ({ reason, value }));

  it('⚠ CONTROL — a well-formed record with a known unit is taken, by the same path', () => {
    expect(refusalOf([material(CODE, { ...SEEDED, baseUnit: 'PCS' })])).toEqual([]);
    expect(recordOf('material', CODE)?.data.baseUnit).toBe('PCS');
  });

  it('an inbound unit outside the union is refused by name, logged, and the replica keeps its version', () => {
    const row = applySyncRun(run('RUN-2', [material(CODE, { ...SEEDED, baseUnit: 'MT' })]));
    expect(row.refused).toEqual([{ object: 'material', key: CODE, reason: 'UNKNOWN_UNIT', value: 'MT' }]);
    expect(row).toMatchObject({ created: 0, changed: 0, unchanged: 0 });
    expect(recordOf('material', CODE)?.data).toEqual(SEEDED);
    expect(recordOf('material', CODE)?.stamp.syncRun).toBe(SEED_RUN_ID);
    expect(syncRuns()[0].refused).toEqual(row.refused);
  });

  it('a unit the unit table would gain is refused too: the table stays inside the union', () => {
    const row = applySyncRun(run('RUN-2', [{ object: 'unit', key: 'MT', data: { text: 'Metric ton' } }]));
    expect(row.refused).toEqual([{ object: 'unit', key: 'MT', reason: 'UNKNOWN_UNIT', value: 'MT' }]);
    expect(recordOf('unit', 'MT')).toBeNull();
  });

  it('a material type outside the union is refused by name, on the record and on the table', () => {
    expect(refusalOf([material(CODE, { ...SEEDED, materialType: 'HALB' })])).toEqual([{ reason: 'UNKNOWN_MATERIAL_TYPE', value: 'HALB' }]);
    resetReplica();
    ensureSeeded();
    expect(refusalOf([{ object: 'materialType', key: 'HALB', data: { text: 'Semi-finished' } }])).toEqual([
      { reason: 'UNKNOWN_MATERIAL_TYPE', value: 'HALB' },
    ]);
  });

  it('an object the replica does not hold, a blank key and a record missing a field are each refused by name', () => {
    const row = applySyncRun(
      run('RUN-2', [
        { object: 'bank', key: 'B-1', data: { text: 'A bank' } },
        material('  ', SEEDED),
        material('RM-NEW-0002', { materialType: 'ROH', materialGroup: 'MG-10', baseUnit: 'KG' }),
      ]),
    );
    expect(row.refused.map((r) => r.reason)).toEqual(['UNKNOWN_OBJECT', 'EMPTY_KEY', 'MALFORMED_RECORD']);
    expect(row.created).toBe(0);
    expect(recordOf('material', 'RM-NEW-0002')).toBeNull();
  });

  it('every refusal reason the type declares is one a run can produce', () => {
    const produced = new Set<SyncRefusalReason>(
      applySyncRun(
        run('RUN-2', [
          { object: 'bank', key: 'B-1', data: {} },
          material('', SEEDED),
          material(CODE, { ...SEEDED, baseUnit: 'MT' }),
          material(CODE, { ...SEEDED, materialType: 'HALB' }),
          material(CODE, { description: '' }),
        ]),
      ).refused.map((r) => r.reason),
    );
    expect([...produced].sort()).toEqual([...SYNC_REFUSAL_REASONS].sort());
  });
});

describe('MD-1 · a record missing from a full run is marked not read, never deleted', () => {
  const others = (): string[] => materialRecords().map((m) => m.key).filter((k) => k !== CODE);

  it('a full run that carries one material marks every other one, and deletes none', () => {
    const before = materialRecords().length;
    const row = applySyncRun(run('RUN-FULL', [material(CODE, SEEDED)], { mode: 'FULL', objects: ['material'], source: 'SAMPLE' }));
    expect(materialRecords()).toHaveLength(before);
    expect(row.missing).toBe(before - 1);
    expect(recordOf('material', CODE)?.stamp.missingFromRun).toBeNull();
    for (const key of others()) {
      const record = recordOf('material', key);
      expect(record?.stamp.missingFromRun, key).toBe('RUN-FULL');
      // Still the version it had: the mark changes nothing else.
      expect(record?.stamp.syncRun, key).toBe(SEED_RUN_ID);
    }
  });

  it('a full run marks only the objects it covers', () => {
    applySyncRun(run('RUN-FULL', [material(CODE, SEEDED)], { mode: 'FULL', objects: ['material'] }));
    expect(recordsOf('supplier').every((s) => s.stamp.missingFromRun === null)).toBe(true);
    expect(recordsOf('unit').every((u) => u.stamp.missingFromRun === null)).toBe(true);
  });

  it('a delta run marks nothing missing', () => {
    const row = applySyncRun(run('RUN-DELTA', [material(CODE, SEEDED)], { mode: 'DELTA', objects: ['material'] }));
    expect(row.missing).toBe(0);
    expect(materialRecords().every((m) => m.stamp.missingFromRun === null)).toBe(true);
  });

  it('a record the full run carried and refused is not marked missing', () => {
    const row = applySyncRun(run('RUN-FULL', [material(CODE, { ...SEEDED, baseUnit: 'MT' })], { mode: 'FULL', objects: ['material'] }));
    expect(row.refused).toHaveLength(1);
    expect(recordOf('material', CODE)?.stamp.missingFromRun).toBeNull();
  });

  it('a record that returns in a later run is no longer marked', () => {
    const returning = others()[0];
    applySyncRun(run('RUN-FULL', [material(CODE, SEEDED)], { mode: 'FULL', objects: ['material'] }));
    expect(recordOf('material', returning)?.stamp.missingFromRun).toBe('RUN-FULL');
    const data = recordOf('material', returning)?.data;
    applySyncRun(run('RUN-3', [material(returning, data)]));
    expect(recordOf('material', returning)?.stamp.missingFromRun).toBeNull();
  });
});

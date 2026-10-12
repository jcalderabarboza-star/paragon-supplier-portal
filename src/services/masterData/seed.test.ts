// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE SEED — what the replica opens holding, and how it is stamped.
//
// The claims here are about MEMBERSHIP and about VALUES, so both are pinned by
// name: a count would be satisfied by the wrong members
// (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`).
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { mockSuppliers } from '../../data/mockSuppliers';
import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';
import { REQUISITIONS } from '../data/mock/fixtures/buyerRequisitions';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import { freshnessOf, masterDataNow, maxAgeHours } from './freshness';
import { materialRecords, recordOf, recordsOf, supplierRecordOfPortalId, supplierRecords, syncRuns } from './replica';
import { PLANNING_SAMPLE_RUN_ID, SEED_RUN_ID } from './seed';
import { generatedMaterialEntries, generatedSuppliers } from '../planning/somoFixture';
import { resetReplica } from './syncApplier';
import {
  KNOWN_MATERIAL_TYPES,
  KNOWN_UNITS,
  MASTER_OBJECTS,
  REFERENCE_TABLES,
  livenessOfStamp,
  type MasterRecord,
} from './types';

const keys = (records: readonly MasterRecord[]): string[] => records.map((r) => r.key).sort();
const everyRecord = (): MasterRecord[] => MASTER_OBJECTS.flatMap((o) => [...recordsOf(o)]);
/** Delivered by the first seed run: built from the authored fixtures. */
const authored = (r: MasterRecord): boolean => r.stamp.syncRun === SEED_RUN_ID;
/** Delivered by the second: the planning fixture's generated sample set. */
const planningSample = (r: MasterRecord): boolean => r.stamp.syncRun === PLANNING_SAMPLE_RUN_ID;

beforeEach(() => resetReplica());

describe('MD-1 · every seeded material and supplier is in the replica under its own key, and nothing else is', () => {
  it('⚠ CONTROL — a known material is found and a made-up key is absent, by the same read', () => {
    expect(recordOf('material', 'RM-COCO-8200')?.data.description).toBe('Coconut Fatty Acid Distillate (CFAD)');
    expect(recordOf('material', 'RM-SAMPLE-TST-01')).toBeNull();
    expect(recordOf('supplier', 'BP-10001235')?.data.name).toBe('PT Sample Specialty Fats');
    expect(recordOf('supplier', 'BP-00000000')).toBeNull();
  });

  it('materials: the authored records equal the material master codes, both ways', () => {
    expect(keys(materialRecords().filter(authored))).toEqual(Object.keys(MATERIAL_MASTER).sort());
  });

  it('materials: the planning sample set is in the replica too, delivered by its own run (MD-2b)', () => {
    const generated = generatedMaterialEntries();
    expect(generated.map((m) => m.materialCode)).toContain('SIM-RM-0001');
    expect(keys(materialRecords().filter(planningSample))).toEqual(generated.map((m) => m.materialCode).sort());
    expect(recordOf('material', 'SIM-RM-0001')?.data).toEqual({
      description: 'Sample raw material 0001',
      materialType: 'ROH',
      materialGroup: 'SIM-RAW',
      baseUnit: 'KG',
    });
    expect(recordOf('material', 'SIM-RM-9999')).toBeNull();
    // Every record is one or the other: nothing else is in the replica.
    expect(materialRecords().filter((r) => !authored(r) && !planningSample(r))).toEqual([]);
  });

  it('materials: each record carries the master row’s description, type, group and unit', () => {
    for (const m of Object.values(MATERIAL_MASTER)) {
      expect(recordOf('material', m.materialCode)?.data, m.materialCode).toEqual({
        description: m.label,
        materialType: m.materialType,
        materialGroup: m.materialGroup,
        baseUnit: m.canonicalUom,
      });
    }
  });

  it('suppliers: the authored records equal the fixture’s SAP business-partner numbers, both ways', () => {
    expect(keys(supplierRecords().filter(authored))).toEqual(mockSuppliers.map((s) => s.sapBpNumber).sort());
  });

  it('suppliers: the generated sample suppliers are replica records, each under its portal id (MD-2b)', () => {
    const generated = generatedSuppliers();
    expect(generated.map((s) => s.id)).toContain('sup-sim-013');
    expect(supplierRecords().filter(planningSample).map((s) => s.data.portalSupplierId).sort()).toEqual(generated.map((s) => s.id).sort());
    expect(supplierRecordOfPortalId('sup-sim-013')?.data.name).toBe('Sample supplier 013');
    expect(supplierRecordOfPortalId('sup-sim-041')).toBeNull();
  });

  it('suppliers: every portal supplier id resolves to one record, and a made-up id to none', () => {
    for (const s of mockSuppliers) {
      expect(supplierRecordOfPortalId(s.id)?.key, s.id).toBe(s.sapBpNumber);
    }
    expect(supplierRecordOfPortalId('sup-999')).toBeNull();
  });

  it('a supplier record holds master fields only — no performance figure crosses', () => {
    const fields = Object.keys(recordOf('supplier', 'BP-10001235')?.data ?? {}).sort();
    expect(fields).toEqual(
      ['businessRegNo', 'city', 'country', 'incoterm', 'incotermPlace', 'legalName', 'name', 'paymentTerm', 'portalSupplierId', 'taxId'].sort(),
    );
    for (const absent of ['otif', 'rating', 'scorecardGrade', 'leadTimeAdherence', 'invoiceAccuracy']) {
      expect(fields).not.toContain(absent);
    }
  });

  it('the incoterm string is split into its term and its place, and the payment term is held by key', () => {
    const withTerms = mockSuppliers.filter((s) => s.incoterms);
    expect(withTerms.map((s) => s.incoterms)).toContain('CIF Jakarta');
    const cif = withTerms.find((s) => s.incoterms === 'CIF Jakarta');
    const record = supplierRecordOfPortalId(cif?.id ?? '');
    expect(record?.data.incoterm).toBe('CIF');
    expect(record?.data.incotermPlace).toBe('Jakarta');
    expect(cif?.paymentTerms).toBe('Net 45');
    expect(record?.data.paymentTerm).toBe('NT45');
    expect(recordOf('paymentTerm', 'NT45')?.data.text).toBe('Net 45');
    // A supplier the fixture gives no terms keeps none: nothing is defaulted.
    const without = mockSuppliers.find((s) => !s.incoterms && !s.paymentTerms);
    expect(supplierRecordOfPortalId(without?.id ?? '')?.data).toMatchObject({ incoterm: null, incotermPlace: null, paymentTerm: null });
  });
});

describe('MD-1 · the reference tables', () => {
  it('the reference table for units equals the unit union, both ways; material types likewise', () => {
    expect(keys(recordsOf('unit'))).toEqual([...KNOWN_UNITS].sort());
    expect(keys(recordsOf('materialType'))).toEqual([...KNOWN_MATERIAL_TYPES].sort());
  });

  it('every reference table is seeded, and holds a named value', () => {
    for (const table of REFERENCE_TABLES) {
      expect(recordsOf(table).length, table).toBeGreaterThan(0);
    }
    expect(recordOf('incoterm', 'CIF')?.data.text).toBe('Cost, Insurance and Freight');
    expect(recordOf('currency', 'IDR')?.data.text).toBe('Indonesian Rupiah');
    expect(recordOf('country', 'ID')?.data.text).toBe('Indonesia');
    expect(recordOf('plant', 'PL01')?.data).toEqual({ text: 'NDC J6 Jakarta', attributes: { city: 'Jakarta' } });
    expect(recordOf('storageLocation', 'PL01/RM01')?.data.attributes.plant).toBe('PL01');
    expect(recordOf('incoterm', 'ZZZ')).toBeNull();
  });

  it('every value a seeded record names is in its reference table', () => {
    for (const m of materialRecords()) {
      expect(recordOf('unit', m.data.baseUnit), `${m.key} unit`).not.toBeNull();
      expect(recordOf('materialType', m.data.materialType), `${m.key} type`).not.toBeNull();
      expect(recordOf('materialGroup', m.data.materialGroup), `${m.key} group`).not.toBeNull();
    }
    for (const s of supplierRecords()) {
      expect(recordOf('country', s.data.country), `${s.key} country`).not.toBeNull();
      if (s.data.paymentTerm) expect(recordOf('paymentTerm', s.data.paymentTerm), s.key).not.toBeNull();
      if (s.data.incoterm) expect(recordOf('incoterm', s.data.incoterm), s.key).not.toBeNull();
    }
  });

  it('every cost centre the requisition fixture names is in the cost-centre table', () => {
    const named = [...new Set(REQUISITIONS.map((r) => r.costCenter))];
    expect(named).toContain('CC-RD-001');
    for (const costCentre of named) {
      expect(recordOf('costCentre', costCentre), costCentre).not.toBeNull();
    }
  });
});

describe('MD-1 · every replica record carries a stamp, and a sample record never reads as SAP', () => {
  it('every record of every object is stamped SAMPLE, read at the declared present, by one of the two seed runs', () => {
    const all = everyRecord();
    expect(all.length).toBeGreaterThan(Object.keys(MATERIAL_MASTER).length);
    for (const r of all) {
      expect(r.stamp, `${r.object}:${r.key}`).toEqual({
        source: 'SAMPLE',
        readAt: DECLARED_PRESENT_INSTANT,
        sourceChangedAt: null,
        syncRun: planningSample(r) ? PLANNING_SAMPLE_RUN_ID : SEED_RUN_ID,
        sapStatus: 'ACTIVE',
        missingFromRun: null,
      });
      expect(livenessOfStamp(r.stamp)).toBe('SIMULATED');
    }
  });

  it('liveness follows the source: only a record read from SAP is LIVE', () => {
    const stamp = everyRecord()[0].stamp;
    expect(livenessOfStamp({ ...stamp, source: 'SAP_S4' })).toBe('LIVE');
    expect(livenessOfStamp({ ...stamp, source: 'SAMPLE' })).toBe('SIMULATED');
  });

  it('the seed is two runs in the log, and between them they took every record and refused none', () => {
    const [sample, seed, ...rest] = syncRuns();
    expect(rest).toEqual([]);
    expect(seed).toMatchObject({ id: SEED_RUN_ID, source: 'SAMPLE', mode: 'FULL', changed: 0, unchanged: 0, missing: 0, refused: [], replaced: [] });
    expect(sample).toMatchObject({ id: PLANNING_SAMPLE_RUN_ID, source: 'SAMPLE', mode: 'DELTA', changed: 0, unchanged: 0, missing: 0, refused: [], replaced: [] });
    expect(seed.created).toBe(everyRecord().filter(authored).length);
    expect(sample.created).toBe(everyRecord().filter(planningSample).length);
    expect(seed.created + sample.created).toBe(everyRecord().length);
  });
});

describe('MD-1 · freshness is computed at the declared present and no record stores it', () => {
  const HOUR = 3_600_000;
  const after = (hours: number): string => new Date(Date.parse(DECLARED_PRESENT_INSTANT) + hours * HOUR).toISOString();

  it('the pages judge freshness at the declared present', () => {
    expect(masterDataNow()).toBe(DECLARED_PRESENT_INSTANT);
  });

  it('the same record turns stale as the instant moves, with no write', () => {
    const material = recordOf('material', 'RM-COCO-8200');
    if (!material) throw new Error('control: RM-COCO-8200 is seeded');
    const before = JSON.stringify(material);
    expect(freshnessOf(material.stamp, 'material', after(0))).toBe('FRESH');
    expect(freshnessOf(material.stamp, 'material', after(maxAgeHours('material')))).toBe('FRESH');
    expect(freshnessOf(material.stamp, 'material', after(maxAgeHours('material') + 1))).toBe('STALE');
    expect(JSON.stringify(recordOf('material', 'RM-COCO-8200'))).toBe(before);
  });

  it('a reference value is allowed seven days where a material is allowed one', () => {
    const unit = recordOf('unit', 'KG');
    if (!unit) throw new Error('control: KG is seeded');
    expect(maxAgeHours('material')).toBe(24);
    expect(maxAgeHours('supplier')).toBe(24);
    expect(maxAgeHours('unit')).toBe(24 * 7);
    expect(freshnessOf(unit.stamp, 'unit', after(25))).toBe('FRESH');
    expect(freshnessOf(unit.stamp, 'unit', after(24 * 7 + 1))).toBe('STALE');
  });

  it('a record a full run did not carry reads NOT_IN_LAST_RUN whatever its age', () => {
    const stamp = { ...everyRecord()[0].stamp, missingFromRun: 'RUN-X' };
    expect(freshnessOf(stamp, 'material', after(0))).toBe('NOT_IN_LAST_RUN');
  });

  it('no stamp has a field that could hold a freshness or a liveness', () => {
    for (const r of everyRecord()) {
      expect(Object.keys(r.stamp).sort()).toEqual(
        ['missingFromRun', 'readAt', 'sapStatus', 'source', 'sourceChangedAt', 'syncRun'].sort(),
      );
    }
  });
});

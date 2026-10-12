// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · ONE TRUTH — the lookups and the pickers read the replica, so what a
// sync run delivers is what every caller sees.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { PARAGON_BRANDS } from '../../data/paragonBrands';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import { bpomOf } from '../sdc/bpom';
import { halalOf } from '../sdc/halal';
import { isKnownMaterial, knownMaterialCodes, labelOf, materialEntry, requireUom, uomOf } from '../sdc/materialMaster';
import {
  costCentreOptions,
  incotermOptions,
  paymentTermOptions,
  receivingLocationOptions,
} from '../../pages-v2/master-data/referencePickers';
import { isKnownReference, referenceOptions, referenceText, supplierOf } from './lookup';
import { materialMasterView } from './materialMasterView';
import { recordsOf } from './replica';
import { applySyncRun, ensureSeeded, resetReplica } from './syncApplier';
import type { InboundRecord, InboundRun } from './types';

const run = (id: string, records: readonly InboundRecord[]): InboundRun => ({
  id,
  source: 'SAP_S4',
  at: '2026-11-01T02:00:00.000Z',
  mode: 'DELTA',
  objects: [],
  records,
});
const CODE = 'RM-COCO-8200';
const SEEDED = { description: 'Coconut Fatty Acid Distillate (CFAD)', materialType: 'ROH', materialGroup: 'MG-10', baseUnit: 'KG' };

beforeEach(() => {
  resetReplica();
  ensureSeeded();
});

describe('MD-2 · a material resolves through one lookup, and the lookup reads the replica', () => {
  it('⚠ CONTROL — seeded, the view equals the fixture row for row, annotations included', () => {
    expect(Object.keys(materialMasterView())).toEqual(Object.keys(MATERIAL_MASTER));
    for (const code of Object.keys(MATERIAL_MASTER)) {
      expect(materialMasterView()[code], code).toEqual(MATERIAL_MASTER[code]);
    }
  });

  it('a description SAP changes is the description every lookup returns', () => {
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');
    applySyncRun(run('RUN-2', [{ object: 'material', key: CODE, data: { ...SEEDED, description: 'CFAD, distilled' } }]));
    expect(labelOf(CODE)).toBe('CFAD, distilled');
    expect(materialEntry(CODE)?.label).toBe('CFAD, distilled');
    // The fixture did not move: the lookup is no longer reading it.
    expect(MATERIAL_MASTER[CODE].label).toBe('Coconut Fatty Acid Distillate (CFAD)');
  });

  it('a unit SAP changes is the unit the write path gets', () => {
    expect(requireUom(CODE)).toBe('KG');
    applySyncRun(run('RUN-2', [{ object: 'material', key: CODE, data: { ...SEEDED, baseUnit: 'L' } }]));
    expect(requireUom(CODE)).toBe('L');
    expect(uomOf(CODE)).toEqual({ ok: true, uom: 'L' });
  });

  it('a material a run delivers is known at once, and its applicability reads UNDETERMINED until Compliance rules', () => {
    expect(isKnownMaterial('RM-NEW-0001')).toBe(false);
    applySyncRun(run('RUN-2', [{ object: 'material', key: 'RM-NEW-0001', data: { ...SEEDED, description: 'A new material' } }]));
    expect(isKnownMaterial('RM-NEW-0001')).toBe(true);
    expect(knownMaterialCodes()).toContain('RM-NEW-0001');
    expect(labelOf('RM-NEW-0001')).toBe('A new material');
    // Known, and not determined: a different answer from a code the master does not name.
    const bpom = bpomOf('RM-NEW-0001');
    const halal = halalOf('RM-NEW-0001');
    expect(bpom.ok).toBe(false);
    expect(halal.ok).toBe(false);
    expect(!bpom.ok && bpom.reason).not.toBe('UNKNOWN_MATERIAL');
    expect(!halal.ok && halal.reason).not.toBe('UNKNOWN_MATERIAL');
    expect(materialMasterView()['RM-NEW-0001']).toMatchObject({ bpomApplicable: 'UNDETERMINED', halalApplicable: 'UNDETERMINED' });
    expect(Object.prototype.hasOwnProperty.call(MATERIAL_MASTER, 'RM-NEW-0001')).toBe(false);
  });

  it('the annotations of a seeded material survive a change to SAP’s fields', () => {
    const before = { bpom: bpomOf(CODE), halal: halalOf(CODE) };
    applySyncRun(run('RUN-2', [{ object: 'material', key: CODE, data: { ...SEEDED, description: 'CFAD, distilled' } }]));
    expect({ bpom: bpomOf(CODE), halal: halalOf(CODE) }).toEqual(before);
  });

  it('an unknown material is still refused on the write path and still a dash-path miss on display', () => {
    expect(uomOf('RM-SAMPLE-TST-01')).toEqual({ ok: false, reason: 'UNKNOWN_MATERIAL', materialCode: 'RM-SAMPLE-TST-01' });
    expect(() => requireUom('RM-SAMPLE-TST-01')).toThrow(/UNKNOWN_MATERIAL: 'RM-SAMPLE-TST-01'/);
    expect(labelOf('RM-SAMPLE-TST-01')).toBe('RM-SAMPLE-TST-01');
    expect(bpomOf('RM-SAMPLE-TST-01')).toMatchObject({ ok: false, reason: 'UNKNOWN_MATERIAL' });
  });

  it('a refused inbound record changes nothing a lookup returns', () => {
    applySyncRun(run('RUN-2', [{ object: 'material', key: CODE, data: { ...SEEDED, baseUnit: 'MT', description: 'Never taken' } }]));
    expect(requireUom(CODE)).toBe('KG');
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');
  });

  it('an injected master still wins: the lookup reads what it is handed', () => {
    const own = { 'X-1': { ...MATERIAL_MASTER[CODE], materialCode: 'X-1', label: 'Injected' } };
    expect(labelOf('X-1', own)).toBe('Injected');
    expect(isKnownMaterial(CODE, own)).toBe(false);
  });
});

describe('MD-2 · the reference lookups', () => {
  it('a text for a key the table holds, null for one it does not — never an invented text', () => {
    expect(referenceText('incoterm', 'CIF')).toBe('Cost, Insurance and Freight');
    expect(referenceText('incoterm', 'CIF Jakarta')).toBeNull();
    expect(isKnownReference('currency', 'IDR')).toBe(true);
    expect(isKnownReference('currency', 'XXX')).toBe(false);
  });

  it('a supplier by the id the portal’s documents name', () => {
    expect(supplierOf('sup-002')?.key).toBe('BP-10001235');
    expect(supplierOf('sup-002')?.data.name).toBe('PT Sample Specialty Fats');
    expect(supplierOf('sup-999')).toBeNull();
  });

  it('the brand table is the ruled brand list, code and name, in order', () => {
    expect(recordsOf('brand').map((b) => [b.key, b.data.text])).toEqual(PARAGON_BRANDS.map((b) => [b.code, b.name]));
    expect(referenceText('brand', 'WARDAH')).toBe('Wardah');
    expect(isKnownReference('brand', 'BLP')).toBe(false);
  });
});

describe('MD-2 · the pickers offer what the reference tables hold', () => {
  it('each picker offers exactly the values its page-local list used to hold', () => {
    expect(incotermOptions().map((o) => o.key)).toEqual(['FOB', 'CIF', 'EXW', 'DDP', 'FCA']);
    expect(paymentTermOptions().map((o) => o.text)).toEqual(['Net 30', 'Net 45', 'Net 60', 'Letter of Credit', 'Advance Payment']);
    expect(receivingLocationOptions().map((o) => o.text)).toEqual(['NDC J6 Jakarta', 'RM Warehouse', 'PM Warehouse']);
    for (const code of ['CC-RD-001', 'CC-PKG-002', 'CC-MFG-001', 'CC-SC-001', 'CC-RD-003']) {
      expect(costCentreOptions().map((o) => o.key), code).toContain(code);
    }
  });

  it('every option shows its code beside its text', () => {
    expect(incotermOptions().find((o) => o.key === 'CIF')?.label).toBe('CIF · Cost, Insurance and Freight');
    expect(paymentTermOptions().find((o) => o.text === 'Net 45')?.label).toBe('NT45 · Net 45');
    expect(costCentreOptions().find((o) => o.key === 'CC-RD-001')?.label).toBe('CC-RD-001 · R&D formulation');
  });

  it('a value a sync run adds appears in every form that reads the table', () => {
    expect(incotermOptions().map((o) => o.key)).not.toContain('DAP');
    applySyncRun(run('RUN-2', [{ object: 'incoterm', key: 'DAP', data: { text: 'Delivered at Place' } }]));
    expect(incotermOptions().map((o) => o.key)).toContain('DAP');
    expect(referenceOptions('incoterm').find((o) => o.key === 'DAP')?.label).toBe('DAP · Delivered at Place');
  });

  it('a text SAP changes is the text the picker shows', () => {
    applySyncRun(run('RUN-2', [{ object: 'costCentre', key: 'CC-RD-001', data: { text: 'Research' } }]));
    expect(costCentreOptions().find((o) => o.key === 'CC-RD-001')?.label).toBe('CC-RD-001 · Research');
  });

  it('a value SAP has flagged for deletion is not offered, and stays in the replica', () => {
    applySyncRun(run('RUN-2', [{ object: 'incoterm', key: 'EXW', data: { text: 'Ex Works' }, sapStatus: 'FLAGGED_FOR_DELETION' }]));
    expect(incotermOptions().map((o) => o.key)).toEqual(['FOB', 'CIF', 'DDP', 'FCA']);
    expect(isKnownReference('incoterm', 'EXW')).toBe(true);
    expect(referenceText('incoterm', 'EXW')).toBe('Ex Works');
  });
});

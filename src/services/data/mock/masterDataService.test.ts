// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE MASTER-DATA READ SEAM — who may read what (C13 §6).
//
// A buyer reads everything. A supplier reads its own supplier record and the
// reference tables; asking for another supplier's record answers exactly as a
// key that does not exist does, so the answer cannot be used to learn whether a
// record exists.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import { mockDataService } from './mockDataService';
import { mockSuppliers } from '../../../data/mockSuppliers';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { resetReplica } from '../../masterData/syncApplier';
import { SEED_RUN_ID } from '../../masterData/seed';
import { REFERENCE_TABLES } from '../../masterData/types';

const svc = mockDataService.masterData;
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null };
const supplier = (supplierId: string): QueryScope => ({ personaType: 'supplier', supplierId });

const OWN = mockSuppliers.find((s) => s.id === 'sup-007');
const OTHER = mockSuppliers.find((s) => s.id === 'sup-002');
if (!OWN || !OTHER) throw new Error('control: sup-007 and sup-002 are in the supplier fixture');

const denied = async (read: () => Promise<unknown>): Promise<string> => {
  try {
    await read();
  } catch (e) {
    if (e instanceof DataError) return e.code;
    throw e;
  }
  return 'NOT_REFUSED';
};

beforeEach(() => resetReplica());

describe('MD-1 · a buyer reads the whole replica', () => {
  it('every material and every supplier, each under its own key', async () => {
    const materials = await svc.list(BUYER, 'material');
    const suppliers = await svc.list(BUYER, 'supplier');
    expect(materials.items.map((r) => r.key).sort()).toEqual(Object.keys(MATERIAL_MASTER).sort());
    expect(suppliers.items.map((r) => r.key).sort()).toEqual(mockSuppliers.map((s) => s.sapBpNumber).sort());
  });

  it('a record by key, null for a key the replica does not hold, where-used and the sync log', async () => {
    expect((await svc.get(BUYER, 'material', 'RM-COCO-8200'))?.key).toBe('RM-COCO-8200');
    expect(await svc.get(BUYER, 'material', 'RM-SAMPLE-TST-01')).toBeNull();
    expect((await svc.whereUsed(BUYER, 'material', 'RM-COCO-8200'))?.rows.map((r) => r.kind)).toEqual([
      'purchaseOrder',
      'preferredListing',
      'certificate',
    ]);
    expect(await svc.whereUsed(BUYER, 'material', 'RM-SAMPLE-TST-01')).toBeNull();
    expect((await svc.syncLog(BUYER)).items.map((r) => r.id)).toEqual([SEED_RUN_ID]);
  });

  it('a caller cannot change the replica by mutating what a list returned', async () => {
    const page = await svc.list(BUYER, 'material');
    page.items.length = 0;
    expect((await svc.list(BUYER, 'material')).items).toHaveLength(Object.keys(MATERIAL_MASTER).length);
  });
});

describe('MD-1 · a supplier seat reads its own supplier record and no other; a refusal does not say whether the record exists', () => {
  it('⚠ CONTROL — the buyer reads both records the spec is about', async () => {
    expect((await svc.get(BUYER, 'supplier', OWN.sapBpNumber))?.key).toBe(OWN.sapBpNumber);
    expect((await svc.get(BUYER, 'supplier', OTHER.sapBpNumber))?.key).toBe(OTHER.sapBpNumber);
  });

  it('the supplier list holds its own record alone', async () => {
    const page = await svc.list(supplier(OWN.id), 'supplier');
    expect(page.items.map((r) => r.key)).toEqual([OWN.sapBpNumber]);
  });

  it('its own record by key', async () => {
    const record = await svc.get(supplier(OWN.id), 'supplier', OWN.sapBpNumber);
    expect(record?.data).toMatchObject({ portalSupplierId: OWN.id, name: OWN.name });
  });

  it('another supplier’s key answers exactly as a key that does not exist', async () => {
    const others = await svc.get(supplier(OWN.id), 'supplier', OTHER.sapBpNumber);
    const absent = await svc.get(supplier(OWN.id), 'supplier', 'BP-00000000');
    expect(others).toBeNull();
    expect(absent).toBeNull();
    expect(others).toEqual(absent);
  });

  it('a supplier seat that names no supplier reads no supplier record', async () => {
    const nobody: QueryScope = { personaType: 'supplier', supplierId: null };
    expect((await svc.list(nobody, 'supplier')).items).toEqual([]);
    expect(await svc.get(nobody, 'supplier', OWN.sapBpNumber)).toBeNull();
  });

  it('the reference tables are read by every seat', async () => {
    for (const table of REFERENCE_TABLES) {
      const asSupplier = await svc.list(supplier(OWN.id), table);
      const asBuyer = await svc.list(BUYER, table);
      expect(asSupplier.items.map((r) => r.key), table).toEqual(asBuyer.items.map((r) => r.key));
    }
  });

  it('materials, where-used and the sync log are refused for the whole object, whatever the key', async () => {
    const scope = supplier(OWN.id);
    expect(await denied(() => svc.list(scope, 'material'))).toBe('SCOPE_DENIED');
    // A key that exists and one that does not are refused alike: the refusal is not an oracle.
    expect(await denied(() => svc.get(scope, 'material', 'RM-COCO-8200'))).toBe('SCOPE_DENIED');
    expect(await denied(() => svc.get(scope, 'material', 'RM-SAMPLE-TST-01'))).toBe('SCOPE_DENIED');
    expect(await denied(() => svc.whereUsed(scope, 'supplier', OWN.sapBpNumber))).toBe('SCOPE_DENIED');
    expect(await denied(() => svc.whereUsed(scope, 'supplier', 'BP-00000000'))).toBe('SCOPE_DENIED');
    expect(await denied(() => svc.syncLog(scope))).toBe('SCOPE_DENIED');
    // And the same reads are not refused to a buyer.
    expect(await denied(() => svc.list(BUYER, 'material'))).toBe('NOT_REFUSED');
    expect(await denied(() => svc.syncLog(BUYER))).toBe('NOT_REFUSED');
  });
});

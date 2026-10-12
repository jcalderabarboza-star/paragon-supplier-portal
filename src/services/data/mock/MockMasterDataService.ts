import { DataError } from '../types';
import type { IMasterDataService, Page, QueryScope } from '../types';
import { materialRecords, recordOf, recordsOf, supplierRecords, syncRuns } from '../../masterData/replica';
import { isSupplierRecord, type MasterObject, type MasterRecord, type SyncRun } from '../../masterData/types';
import { liveSources, whereUsedOf, type WhereUsed } from '../../masterData/whereUsed';

// MD-1 — the master-data read seam over the replica. See `IMasterDataService`
// for the tenancy rule. Read only: the replica's one writer is the sync applier.
const isSupplier = (scope: QueryScope): boolean => scope.personaType === 'supplier';

const buyerOnly = (scope: QueryScope, what: string): void => {
  if (isSupplier(scope)) throw new DataError('SCOPE_DENIED', `${what} is a buyer read`);
};

/** A supplier seat's own supplier record, and no other. */
const ownedBy = (scope: QueryScope, record: MasterRecord): boolean =>
  isSupplierRecord(record) && scope.supplierId !== null && record.data.portalSupplierId === scope.supplierId;

export class MockMasterDataService implements IMasterDataService {
  async list(scope: QueryScope, object: MasterObject): Promise<Page<MasterRecord>> {
    if (object === 'material') buyerOnly(scope, 'the material list');
    const all = recordsOf(object);
    const items = isSupplier(scope) && object === 'supplier' ? all.filter((r) => ownedBy(scope, r)) : all;
    return { items: [...items], cursor: null };
  }

  async get(scope: QueryScope, object: MasterObject, key: string): Promise<MasterRecord | null> {
    if (object === 'material') buyerOnly(scope, 'a material record');
    const record = recordOf(object, key);
    if (!record) return null;
    // Another supplier's record answers as an absent key does.
    if (isSupplier(scope) && object === 'supplier' && !ownedBy(scope, record)) return null;
    return record;
  }

  async whereUsed(scope: QueryScope, object: MasterObject, key: string): Promise<WhereUsed | null> {
    buyerOnly(scope, 'where-used');
    const record = recordOf(object, key);
    if (!record) return null;
    return whereUsedOf(record, liveSources({ materials: materialRecords(), suppliers: supplierRecords() }));
  }

  async syncLog(scope: QueryScope): Promise<Page<SyncRun>> {
    buyerOnly(scope, 'the sync log');
    return { items: [...syncRuns()], cursor: null };
  }
}

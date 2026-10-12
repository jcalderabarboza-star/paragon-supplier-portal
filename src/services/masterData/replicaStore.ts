// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE REPLICA STORES — one table per master object, and the sync log.
//
// Two exports, on purpose. `replicaRead` is for everybody. `replicaWrite` has
// ONE caller: the sync applier (`syncApplier.ts`). No verb, no page and no other
// service writes a replicated field, because the portal does not own one.
// `replicaOneWriter.test.ts` derives the callers from source and holds that set.
//
// In memory, like every store here: the durable store is SE-4.
// ─────────────────────────────────────────────────────────────────────────────

import type { MasterObject, MasterRecord, SyncRun } from './types';

const tables = new Map<MasterObject, Map<string, MasterRecord>>();
const log: SyncRun[] = [];

const tableOf = (object: MasterObject): Map<string, MasterRecord> => {
  let table = tables.get(object);
  if (!table) {
    table = new Map();
    tables.set(object, table);
  }
  return table;
};

export const replicaRead = {
  /** Every record of one object, in the order the source delivered them. */
  all(object: MasterObject): readonly MasterRecord[] {
    return [...tableOf(object).values()];
  },
  get(object: MasterObject, key: string): MasterRecord | undefined {
    return tableOf(object).get(key);
  },
  /** The sync log, oldest first. A copy, so a reader cannot append by mutating it. */
  log(): readonly SyncRun[] {
    return [...log];
  },
};

export const replicaWrite = {
  /** Replace the record whole. There is no field-level merge. */
  put(record: MasterRecord): void {
    tableOf(record.object).set(record.key, record);
  },
  appendRun(run: SyncRun): void {
    log.push(run);
  },
  reset(): void {
    tables.clear();
    log.length = 0;
  },
};

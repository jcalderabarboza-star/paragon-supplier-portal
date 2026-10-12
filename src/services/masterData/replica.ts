// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · READING THE REPLICA — the synchronous read every caller uses.
//
// Each read seeds the replica first, so no caller can see it empty. Nothing
// here writes: the one writer is the sync applier.
// ─────────────────────────────────────────────────────────────────────────────

import { replicaRead } from './replicaStore';
import { ensureSeeded, replicaVersion } from './syncApplier';
import type { MasterObject, MasterRecord, MaterialRecord, SupplierRecord, SyncRun } from './types';

export function recordsOf<O extends MasterObject>(object: O): readonly MasterRecord<O>[] {
  ensureSeeded();
  return replicaRead.all(object) as readonly MasterRecord<O>[];
}

export function recordOf<O extends MasterObject>(object: O, key: string): MasterRecord<O> | null {
  ensureSeeded();
  return (replicaRead.get(object, key) as MasterRecord<O> | undefined) ?? null;
}

export const materialRecords = (): readonly MaterialRecord[] => recordsOf('material');
export const supplierRecords = (): readonly SupplierRecord[] => recordsOf('supplier');

let byPortalId: { readonly version: number; readonly index: ReadonlyMap<string, SupplierRecord> } | null = null;

/** The supplier record a portal supplier id points at, or null. Indexed once per state of the replica. */
export function supplierRecordOfPortalId(portalSupplierId: string): SupplierRecord | null {
  ensureSeeded();
  const version = replicaVersion();
  if (!byPortalId || byPortalId.version !== version) {
    byPortalId = { version, index: new Map(supplierRecords().map((s) => [s.data.portalSupplierId, s])) };
  }
  return byPortalId.index.get(portalSupplierId) ?? null;
}

/** The sync log, newest run first. */
export function syncRuns(): readonly SyncRun[] {
  ensureSeeded();
  return [...replicaRead.log()].reverse();
}

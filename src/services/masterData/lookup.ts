// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · THE SYNCHRONOUS LOOKUPS — what pure code and a form's picker read.
//
// A policy hook, a selector and an option list cannot await, so beside the
// service there is this: the same replica, read synchronously. A material has
// its own lookups (`sdc/materialMaster.ts`), which read the same replica.
//
// A lookup never invents: a key the table does not hold answers `null`, and the
// caller shows the key it was given.
// ─────────────────────────────────────────────────────────────────────────────

import { recordOf, recordsOf, supplierRecordOfPortalId } from './replica';
import type { ReferenceRecord, ReferenceTable, SupplierRecord } from './types';

/** The text of a reference value, or null when the table does not hold the key. */
export function referenceText(table: ReferenceTable, key: string): string | null {
  return recordOf(table, key)?.data.text ?? null;
}

export function isKnownReference(table: ReferenceTable, key: string): boolean {
  return recordOf(table, key) !== null;
}

export interface ReferenceOption {
  readonly key: string;
  readonly text: string;
  /** The code beside what it means: what a picker shows. */
  readonly label: string;
}

const optionOf = (record: ReferenceRecord): ReferenceOption => ({
  key: record.key,
  text: record.data.text,
  label: `${record.key} · ${record.data.text}`,
});

/**
 * The values a picker offers for a table, in the order the source delivered
 * them. A value SAP has flagged for deletion is not offered for new work; it
 * stays in the replica and on the documents that already carry it.
 */
export function referenceOptions(table: ReferenceTable): readonly ReferenceOption[] {
  return (recordsOf(table) as readonly ReferenceRecord[])
    .filter((r) => r.stamp.sapStatus !== 'FLAGGED_FOR_DELETION')
    .map(optionOf);
}

/** The supplier record a portal supplier id points at, or null. */
export function supplierOf(portalSupplierId: string): SupplierRecord | null {
  return supplierRecordOfPortalId(portalSupplierId);
}

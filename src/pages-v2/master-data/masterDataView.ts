// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · WHAT THE MASTER-DATA PAGE LISTS — pure, so a spec can hold it without
// a render.
// ─────────────────────────────────────────────────────────────────────────────

import {
  REFERENCE_TABLES,
  isMaterialRecord,
  isReferenceRecord,
  isSupplierRecord,
  type MasterObject,
  type MasterRecord,
  type ReferenceTable,
} from '../../services/masterData/types';

export const MASTER_DATA_VIEWS = ['materials', 'suppliers', 'reference'] as const;
export type MasterDataView = (typeof MASTER_DATA_VIEWS)[number];

export const isMasterDataView = (value: string | null): value is MasterDataView =>
  value !== null && (MASTER_DATA_VIEWS as readonly string[]).includes(value);

export const DEFAULT_REFERENCE_TABLE: ReferenceTable = REFERENCE_TABLES[0];

/** The master object a view lists. The reference view lists the chosen table. */
export function objectOfView(view: MasterDataView, table: ReferenceTable): MasterObject {
  if (view === 'materials') return 'material';
  if (view === 'suppliers') return 'supplier';
  return table;
}

/** The view that lists a master object — where a where-used row for it leads. */
export function viewOfObject(object: MasterObject): MasterDataView {
  if (object === 'material') return 'materials';
  if (object === 'supplier') return 'suppliers';
  return 'reference';
}

export interface MasterDataFilters {
  readonly q: string;
  readonly materialType: string;
  readonly materialGroup: string;
  readonly country: string;
}

export const NO_FILTERS: MasterDataFilters = { q: '', materialType: '', materialGroup: '', country: '' };

/** Every text a search reads on a record: its key and what names it. */
function searchText(record: MasterRecord): string {
  if (isMaterialRecord(record)) return `${record.key} ${record.data.description}`;
  if (isSupplierRecord(record)) {
    return `${record.key} ${record.data.name} ${record.data.legalName ?? ''} ${record.data.city} ${record.data.portalSupplierId}`;
  }
  if (isReferenceRecord(record)) return `${record.key} ${record.data.text}`;
  return record.key;
}

export function filterRecords(records: readonly MasterRecord[], f: MasterDataFilters): MasterRecord[] {
  const q = f.q.trim().toLowerCase();
  return records.filter((r) => {
    if (q !== '' && !searchText(r).toLowerCase().includes(q)) return false;
    if (isMaterialRecord(r)) {
      if (f.materialType !== '' && r.data.materialType !== f.materialType) return false;
      if (f.materialGroup !== '' && r.data.materialGroup !== f.materialGroup) return false;
    }
    if (isSupplierRecord(r) && f.country !== '' && r.data.country !== f.country) return false;
    return true;
  });
}

/** `${table}:${key}` → the value's text, for showing a code beside what it means. */
export type ReferenceTexts = ReadonlyMap<string, string>;

export function referenceTexts(records: readonly MasterRecord[]): ReferenceTexts {
  const texts = new Map<string, string>();
  for (const r of records) {
    if (isReferenceRecord(r)) texts.set(`${r.object}:${r.key}`, r.data.text);
  }
  return texts;
}

/** A code with its text, or the code alone when the table does not hold it. Never an invented text. */
export function codeWithText(texts: ReferenceTexts, table: ReferenceTable, key: string): string {
  const text = texts.get(`${table}:${key}`);
  return text ? `${key} · ${text}` : key;
}

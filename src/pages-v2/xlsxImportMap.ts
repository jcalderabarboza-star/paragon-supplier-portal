// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-c-b — the column-MAPPING helpers (pure). The honesty pivot of the XLSX
// import lives here: a supplier's raw sheet headers → our three batch fields.
//
// parseWorkbook (3c-c-a) hands back rows keyed by RAW supplier headers and does
// NOT guess the mapping — a silent map would dispatch wrong data under
// governance. These helpers produce a SUGGESTION the supplier SEES and confirms
// (or overrides) in XlsxImportPanel, then coerce the confirmed mapping into the
// grid's row shape. materialCode + totalQty are NEVER here — they are
// operator-picked header fields (un-falsifiability), so the file supplies only
// the three batch columns.
//
// Pure + framework-free so the coercion is unit-tested against fixture rows.
// ────────────────────────────────────────────────────────────────────────────

/**
 * One editable grid row — the shape BulkStockEntryGrid holds in state and the
 * SDC-3c-a adapter reads (via toGridRows). Defined here so the grid, the import
 * panel, and these helpers share ONE type. The engine clears a cell to null.
 */
export interface BatchGridRow {
  batchNumber: string | null;
  qty: number | null;
  expiryDate: string | null;
}

/** Our three batch fields ← a raw supplier header name ('' = unmapped). */
export interface ColumnMapping {
  batchNumber: string;
  qty: string;
  /** Optional — a sheet may carry no expiry column; '' is legal. */
  expiryDate: string;
}

/** Our three fields, in the fixed display order. */
export const MAP_FIELDS = ['batchNumber', 'qty', 'expiryDate'] as const;
export type MapField = (typeof MAP_FIELDS)[number];

// Fuzzy synonyms per field, normalised (lowercased, alphanumerics only), in
// priority order. EN + ID, since supplier sheets arrive in both. These only
// SEED the visible suggestion — the supplier always confirms.
const SYNONYMS: Record<MapField, readonly string[]> = {
  batchNumber: ['batchnumber', 'batchno', 'batchid', 'batch', 'lotnumber', 'lotno', 'lot', 'nomorbatch', 'nobatch'],
  qty: ['quantity', 'qty', 'qnty', 'jumlah', 'kuantitas', 'amount', 'volume'],
  expiryDate: ['expirydate', 'expiration', 'expiry', 'bestbefore', 'expdate', 'exp', 'kedaluwarsa', 'kadaluarsa', 'kadaluwarsa', 'expired'],
};

const norm = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Suggest a mapping by fuzzy header match. Fields are resolved in order and a
 * header, once claimed, is not offered to a later field — so one column never
 * auto-maps to two fields. A field with no match stays '' (the supplier picks).
 * Never authoritative: XlsxImportPanel renders this pre-selected but editable.
 */
export function suggestMapping(headers: readonly string[]): ColumnMapping {
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  const taken = new Set<string>();
  const pick = (field: MapField): string => {
    for (const token of SYNONYMS[field]) {
      const hit = normed.find(({ raw, n }) => !taken.has(raw) && n.includes(token));
      if (hit) {
        taken.add(hit.raw);
        return hit.raw;
      }
    }
    return '';
  };
  return { batchNumber: pick('batchNumber'), qty: pick('qty'), expiryDate: pick('expiryDate') };
}

/**
 * A mapping is submittable when the two REQUIRED fields (batchNumber, qty) are
 * mapped and every mapped header is distinct — one column cannot be two fields.
 * expiryDate is optional; when set it must also be distinct.
 */
export function mappingComplete(m: ColumnMapping): boolean {
  if (m.batchNumber === '' || m.qty === '') return false;
  const used = [m.batchNumber, m.qty, ...(m.expiryDate ? [m.expiryDate] : [])];
  return new Set(used).size === used.length;
}

/**
 * Coerce raw parsed rows (keyed by supplier headers) into grid rows under the
 * confirmed mapping. qty is comma-stripped to a finite number or null (an
 * unreadable/negative qty becomes a blank cell the supplier fixes — the adapter
 * then flags it honestly, never a silent 0). expiry passes through the ISO
 * string parseWorkbook already produced. Nothing is dispatched here — these rows
 * land in the grid for review.
 */
export function coerceRows(
  rows: readonly Record<string, string>[],
  m: ColumnMapping,
): BatchGridRow[] {
  return rows.map((r) => {
    const bn = (r[m.batchNumber] ?? '').trim();
    const qtyRaw = (r[m.qty] ?? '').trim().replace(/,/g, '');
    const qtyNum = qtyRaw === '' ? null : Number(qtyRaw);
    const exp = m.expiryDate ? (r[m.expiryDate] ?? '').trim() || null : null;
    return {
      batchNumber: bn === '' ? null : bn,
      qty: qtyNum !== null && Number.isFinite(qtyNum) ? qtyNum : null,
      expiryDate: exp,
    };
  });
}

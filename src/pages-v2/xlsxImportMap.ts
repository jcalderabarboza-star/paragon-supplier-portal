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

import { normalizeQty, type QtyRefusalReason } from '../lib/localeNumber';

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

// ── CP-0 · W1 · PR-2d — the import path parses through the ONE parser ────────
//
// `coerceRows` used to do its own `Number(raw.replace(/,/g,''))`, and its spec
// blessed it: a row carrying "1,800" was asserted to import as 1800, under a
// test titled "comma qty → number". But "1,800" is 1800 under en and 1.8 under
// id, and THIS is the path with the least claim to know which — the file is a
// spreadsheet of unknown authorship, so there is not even an ambient UI
// language to lean on, let alone the typist's convention (CP-0 §5a: an import
// refuses per row). The old code picked the en reading every time and said
// nothing, and the test recorded that guess as the contract.
//
// Every qty now goes through `normalizeQty` with NO hint. A cell it cannot read
// becomes `null` — the grid cell type is `number | null`, so it CANNOT carry
// "1,800 (ambiguous)" — but the refusal is no longer thrown away: the reason
// and the raw text ride back in `refused`, so the panel can say WHICH cells it
// could not read and WHY. A silently blanked cell would tell the supplier they
// left a field empty when they did not, which is the same blame-moving move the
// fabricated Σ-mismatch made in 2c.
//
// EMPTY is deliberately NOT reported: a blank cell in the sheet is blank in the
// grid, which is self-evident and not a misreading. Only NOT_NUMERIC and
// AMBIGUOUS_QTY — the two "we could not read what you wrote" cases — surface.

/** A qty cell the one parser refused: which row, what it said, and why. */
export interface RefusedImportRow {
  /** 0-based index into the sheet's data rows (the panel renders index + 1). */
  readonly index: number;
  /** The batch number on that row, when it has one — the operator's landmark. */
  readonly batchNumber: string;
  /** VERBATIM, untrimmed of meaning: what the cell actually said. */
  readonly raw: string;
  readonly reason: QtyRefusalReason;
}

/** Coerced rows PLUS the cells the parser refused — never rows alone, so a
 *  caller cannot accidentally drop the refusals on the floor. */
export interface CoercedImport {
  readonly rows: BatchGridRow[];
  readonly refused: readonly RefusedImportRow[];
}

/**
 * Coerce raw parsed rows (keyed by supplier headers) into grid rows under the
 * confirmed mapping, reporting every qty the one parser refused. An unreadable
 * or ambiguous qty becomes a blank cell the supplier retypes — never a silent
 * 0, and never one plausible reading of two. expiry passes through the ISO
 * string parseWorkbook already produced. Nothing is dispatched here — these
 * rows land in the grid for review.
 */
export function coerceRows(
  rows: readonly Record<string, string>[],
  m: ColumnMapping,
): CoercedImport {
  const refused: RefusedImportRow[] = [];
  const out = rows.map((r, index) => {
    const bn = (r[m.batchNumber] ?? '').trim();
    const raw = (r[m.qty] ?? '').trim();
    const parsed = normalizeQty(raw);
    if (!parsed.ok && parsed.reason !== 'EMPTY_QTY') {
      refused.push({ index, batchNumber: bn, raw, reason: parsed.reason });
    }
    const exp = m.expiryDate ? (r[m.expiryDate] ?? '').trim() || null : null;
    return {
      batchNumber: bn === '' ? null : bn,
      qty: parsed.ok ? parsed.value : null,
      expiryDate: exp,
    };
  });
  return { rows: out, refused };
}

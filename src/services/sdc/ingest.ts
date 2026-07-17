// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-a — the shared INGESTION ADAPTER (headless, pure).
//
// The first concrete build of DEC-MAGIC-LINK-GRID: tabular supplier input (a
// magic-link grid OR — named-next — an Excel import) is parsed into governed SDC
// payloads and handed to the SAME command spine SDC-2/3 dispatch. This module is
// the PURE CORE (mirrors CI-1a / SDC-3a engine-first): rows → validated dispatch
// units. It NEVER dispatches — the page/hook owns the SubmissionSession envelope
// loop, so side effects stay OUT of the pure function.
//
// It does NOT replace the three payload builders (submitModel /
// objectSubmitModels) — it REUSES them: the adapter coerces tabular cells into
// the existing Draft interfaces, validates per row, and calls the builder. So
// the spine's un-falsifiability is INHERITED, not re-implemented — `uom` is
// absent (master-assigned, invariant #2), `supplierId` comes from the identity in
// `context` (NEVER a cell), and any snapshot-binding key (for the snapshot-bound
// kinds, named-next) would likewise ride `context`, never a cell.
//
// SOURCE-AGNOSTIC (adjudication §3): rows are `Record<string, string>` — a grid
// emits them, an XLSX parse emits them. SDC-3c builds the GRID surface (3c-b);
// the XLSX file-parse is named-next on THIS adapter (3c-c / CH-5·P1b). The
// adapter is Excel-ready without any Excel file-handling here.
//
// TWO GRAINS, one primitive (adjudication §1):
//  · BATCH-FOLD (N→1) — the R-4 headline: N batch rows fold into ONE
//    InventoryDeclaration (Σ batch = the stated total, TOTAL-FIRST). ONE unit;
//    `rowRefs` aggregates every folded row. Atomic — a bad batch fails the whole
//    declaration (batches must reconcile), so there is no partial success here.
//  · IMPORT (1:1) — each row is one whole object → one unit. Per-row partial
//    success maps straight onto the envelope (each ok unit = one attempt()).
//
// HONEST SILENCE: a row/unit that cannot be built resolves to `{ ok:false,
// rowRefs, reason }` — NEVER a fabricated payload. The caller dispatches only the
// `ok:true` units and reports the rest.
// ────────────────────────────────────────────────────────────────────────────

import type { SdcObjectKind } from './types';
import {
  buildInventoryDeclarationPayload,
  type InventoryBatchDraft,
} from './objectSubmitModels';

// ─── Result vocabulary ────────────────────────────────────────────────────────

/** Why a row / unit could not be built into a payload (honest-silence reasons). */
export type ParseReason =
  | 'EMPTY_TOTAL' // TOTAL-FIRST: no stated total floor (batch-fold header / import row)
  | 'MISSING_MATERIAL' // an import row carries a total but no material code
  | 'MISSING_BATCH_NUMBER' // a batch row carries qty/expiry but no batch number
  | 'INVALID_QTY' // a qty cell isn't a non-negative finite number
  | 'BATCH_TOTAL_MISMATCH' // Σ batch qty ≠ the stated total (the reconciliation gate)
  | 'NO_ROWS'; // nothing to declare (an empty import grid)

/**
 * One parsed dispatch unit — the adapter's output element. An `ok:true` unit
 * carries a ready-to-dispatch payload (built by the reused builder) and the
 * source rows it folded; an `ok:false` unit carries the offending rows + an
 * honest reason and NO payload. The caller dispatches the ok units through the
 * existing verb hooks, records each on the SubmissionSession, and surfaces the
 * failures.
 */
export type DispatchUnit =
  | {
      readonly ok: true;
      readonly kind: SdcObjectKind;
      readonly payload: Record<string, unknown>;
      /** The source-row indices this unit folded (aggregated in batch-fold). */
      readonly rowRefs: readonly number[];
    }
  | {
      readonly ok: false;
      readonly rowRefs: readonly number[];
      readonly reason: ParseReason;
    };

// ─── Input vocabulary ─────────────────────────────────────────────────────────

/** One tabular row — source-agnostic string cells (a grid or an XLSX parse). */
export type GridRow = Record<string, string>;

/**
 * The parse spec — WHAT the rows mean, discriminated so the adapter knows how to
 * fold them. Only InventoryDeclaration is wired in 3c-a (the batch-grain headline
 * + its total-only import); the snapshot-bound kinds (RequirementResponse via the
 * confirm-all-N grid, IncomingShipment) are named-next and slot in behind this
 * same `DispatchUnit[]` shape without a type change.
 */
export type GridParseSpec =
  | {
      /** BATCH-FOLD (N→1): the rows are the batches of ONE declaration. */
      readonly kind: 'InventoryDeclaration';
      readonly mode: 'batch-fold';
      /** The material being declared — from context, NOT a cell. */
      readonly materialCode: string;
      /** The independently-stated total floor (TOTAL-FIRST) — a header field. */
      readonly totalQty: string;
    }
  | {
      /** IMPORT (1:1): each row is one total-only declaration. */
      readonly kind: 'InventoryDeclaration';
      readonly mode: 'import';
    };

export interface GridContext {
  /** The current supplier identity — the ONLY source of supplierId (never a cell). */
  readonly supplierId: string;
  readonly spec: GridParseSpec;
}

/** Canonical batch-row column keys (batch-fold mode). */
export const BATCH_COLUMN = {
  batchNumber: 'batchNumber',
  qty: 'qty',
  expiryDate: 'expiryDate',
} as const;

/** Canonical import-row column keys (import mode). */
export const IMPORT_DECLARE_COLUMN = {
  materialCode: 'materialCode',
  totalQty: 'totalQty',
} as const;

// ─── Coercion helpers (comma-tolerant, mirroring the builders) ────────────────

const cell = (row: GridRow, key: string): string => (row[key] ?? '').trim();

/**
 * Coerce a qty cell to a non-negative finite number, or null when blank/invalid.
 * Comma-tolerant (mirrors the builders' `replace(/,/g, '')`). A negative or
 * non-numeric value is INVALID (null) — the builders' `|| 0` silently swallows
 * those; the adapter must SEE them to fail honestly rather than declare 0.
 */
function parseQty(raw: string): number | null {
  const s = raw.replace(/,/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** A batch row is "empty" (an unfilled grid add-row) when every cell is blank. */
function batchRowEmpty(row: GridRow): boolean {
  return (
    cell(row, BATCH_COLUMN.batchNumber) === '' &&
    cell(row, BATCH_COLUMN.qty) === '' &&
    cell(row, BATCH_COLUMN.expiryDate) === ''
  );
}

// ─── The adapter ──────────────────────────────────────────────────────────────

/**
 * Parse tabular supplier input into dispatch units for the SDC spine. Pure — NO
 * dispatch, no store touch, no clock. `context.supplierId` is the sole identity
 * source (a cell can never inject it); `context.spec` selects the grain.
 */
export function parseGrid(rows: readonly GridRow[], context: GridContext): DispatchUnit[] {
  switch (context.spec.mode) {
    case 'batch-fold':
      return [parseBatchFold(rows, context.supplierId, context.spec)];
    case 'import':
      return parseImport(rows, context.supplierId);
  }
}

/**
 * BATCH-FOLD: N batch rows → ONE InventoryDeclaration. The declaration is atomic
 * (its batches must reconcile to the stated total), so this returns exactly ONE
 * unit — ok, or a single honest failure. Total-only (no itemised batch rows) is
 * legal and honest (TOTAL-FIRST — batches are optional detail).
 */
function parseBatchFold(
  rows: readonly GridRow[],
  supplierId: string,
  spec: Extract<GridParseSpec, { mode: 'batch-fold' }>,
): DispatchUnit {
  // TOTAL-FIRST: the total is the required, independently-stated floor.
  const total = parseQty(spec.totalQty);
  if (total === null) return { ok: false, rowRefs: [], reason: 'EMPTY_TOTAL' };

  // Non-empty rows only — trailing add-rows are ignored, never errors.
  const filled = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => !batchRowEmpty(row));

  // Per-row coercion: a row with data must have a batch number AND a valid qty.
  const batches: InventoryBatchDraft[] = [];
  const bad: number[] = [];
  let reason: ParseReason | null = null;
  for (const { row, i } of filled) {
    const batchNumber = cell(row, BATCH_COLUMN.batchNumber);
    const qty = parseQty(cell(row, BATCH_COLUMN.qty));
    if (batchNumber === '') {
      bad.push(i);
      if (reason === null) reason = 'MISSING_BATCH_NUMBER';
      continue;
    }
    if (qty === null) {
      bad.push(i);
      if (reason === null) reason = 'INVALID_QTY';
      continue;
    }
    const expiryDate = cell(row, BATCH_COLUMN.expiryDate);
    // Pass the normalised numeric string; the builder owns final coercion.
    batches.push({ batchNumber, qty: String(qty), ...(expiryDate ? { expiryDate } : {}) });
  }
  if (bad.length > 0) return { ok: false, rowRefs: bad, reason: reason! };

  // Σ = total reconciliation (only when batches were itemised — total-only skips
  // it). This is the surface's warn-and-block gate; INV_DECLARE_BATCH_TOTAL is
  // the real server gate. We must NOT derive total = Σ: the total is the stated
  // floor, and the mismatch is the check that catches un-itemised stock.
  if (batches.length > 0) {
    const sum = batches.reduce((s, b) => s + Number(b.qty), 0);
    if (sum !== total) {
      return { ok: false, rowRefs: filled.map(({ i }) => i), reason: 'BATCH_TOTAL_MISMATCH' };
    }
  }

  // Reuse the proven builder — uom absent, supplierId from identity, batches
  // dropped when empty (total-only).
  const payload = buildInventoryDeclarationPayload(supplierId, spec.materialCode, {
    totalQty: spec.totalQty,
    ...(batches.length > 0 ? { batches } : {}),
  });
  return { ok: true, kind: 'InventoryDeclaration', payload, rowRefs: filled.map(({ i }) => i) };
}

/**
 * IMPORT: each non-blank row is one total-only InventoryDeclaration → one unit.
 * Per-row partial success is the point — a malformed row fails ALONE while its
 * siblings succeed. `materialCode` may come from a cell here: it is not a
 * falsifiable identity/snapshot key (the declare command re-authorises it via
 * collaboratedMaterial); `supplierId` still comes only from context.
 */
function parseImport(rows: readonly GridRow[], supplierId: string): DispatchUnit[] {
  const units: DispatchUnit[] = [];
  rows.forEach((row, i) => {
    const materialCode = cell(row, IMPORT_DECLARE_COLUMN.materialCode);
    const totalRaw = cell(row, IMPORT_DECLARE_COLUMN.totalQty);
    // An entirely blank row is an unfilled add-row — skipped, not an error.
    if (materialCode === '' && totalRaw === '') return;
    if (materialCode === '') {
      units.push({ ok: false, rowRefs: [i], reason: 'MISSING_MATERIAL' });
      return;
    }
    const total = parseQty(totalRaw);
    if (total === null) {
      units.push({ ok: false, rowRefs: [i], reason: totalRaw === '' ? 'EMPTY_TOTAL' : 'INVALID_QTY' });
      return;
    }
    const payload = buildInventoryDeclarationPayload(supplierId, materialCode, { totalQty: totalRaw });
    units.push({ ok: true, kind: 'InventoryDeclaration', payload, rowRefs: [i] });
  });
  // Honest silence over a silent empty success: an all-blank import says so.
  if (units.length === 0) return [{ ok: false, rowRefs: [], reason: 'NO_ROWS' }];
  return units;
}

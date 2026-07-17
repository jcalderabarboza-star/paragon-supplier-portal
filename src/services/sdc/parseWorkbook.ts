// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-c-a — the headless XLSX PARSE LAYER (file → rows). Pure edge + one
// lazy IO seam; NO rendering, NO grid, NO adapter change.
//
// This is the file→rows front edge of DEC-MAGIC-LINK-GRID's Excel path. It sits
// ABOVE the SDC-3c-a adapter (`parseGrid`), never inside it: it turns a workbook
// into the adapter's source-agnostic `Record<string,string>[]`, and stops there.
// The adapter still owns ROW-level honest-silence (ParseReason); this layer owns
// FILE-level honest-silence (FileParseReason) — the failures that happen BEFORE
// any row exists to hand on.
//
// DECOUPLED FROM THE GRID UI (hard requirement): the same file→rows path is the
// Communication Hub email-attachment path (CH-5 / P1b). Keeping it a pure module
// with a single lazy IO call lets the Hub reuse it headless, no React in sight.
//
// WHAT IT DELIBERATELY DOES NOT DO:
//  · It does NOT map supplier headers to our canonical fields (batchNumber /
//    qty / expiryDate). That is a MAPPING concern the supplier must SEE and
//    CONFIRM (3c-c-b) — a silent guess here would dispatch wrong data under
//    governance. So `rows` is keyed by the supplier's RAW headers, verbatim.
//  · It does NOT dispatch, touch a store, or read the clock.
//  · It feeds BATCH-FOLD only (the confirmable grid). The adapter's import (1:1)
//    mode has no confirmation surface and is intentionally not wired here.
//
// VALUE NORMALIZE (the coercion boundary): read-excel-file emits typed cells
// (string | number | boolean | Date | null). The adapter is string-in, and
// isoDateColumn stores ISO 'YYYY-MM-DD' — so a Date/serial cell becomes an ISO
// date string and a number becomes its string form. The lib hands back dates as
// UTC-midnight Date objects, so `toISOString().slice(0,10)` is timezone-neutral
// by construction (no local-offset day-shift). Every emitted cell is a string.
// ────────────────────────────────────────────────────────────────────────────

// ─── Result vocabulary ────────────────────────────────────────────────────────

/**
 * Why a FILE could not become rows — the file tier's honest-silence reasons,
 * parallel to `ParseReason` (ingest.ts) but one level up: these fire BEFORE any
 * row reaches the adapter. Each resolves to `{ ok:false, reason }`, never a
 * fabricated workbook.
 */
export type FileParseReason =
  | 'NOT_A_WORKBOOK' // corrupt / not xlsx / password-protected — the parser threw
  | 'NO_SHEETS' // the workbook opened but carries no usable sheet
  | 'EMPTY_SHEET' // the chosen sheet has no data rows (header-only or blank)
  | 'NO_HEADER_ROW'; // there is data, but no recognisable header row to map against

/**
 * A successfully parsed workbook. `rows` are keyed by the supplier's RAW headers
 * (NOT our canonical fields — mapping is 3c-c-b's confirmable step). `sheets`
 * lists every sheet name so the picker can offer them; `activeSheet` is the one
 * parsed (the first by default). `ok:true` is the union discriminant, mirroring
 * DispatchUnit in ingest.ts.
 */
export interface ParsedWorkbook {
  readonly ok: true;
  readonly sheets: readonly string[];
  readonly activeSheet: string;
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
}

/** A file-tier failure — an honest reason and NO rows. */
export interface FileParseFailure {
  readonly ok: false;
  readonly reason: FileParseReason;
}

export type ParseWorkbookResult = ParsedWorkbook | FileParseFailure;

export interface ParseWorkbookOptions {
  /**
   * Which sheet to parse as active, by name. Default: the first sheet. The
   * picker (3c-c-b) re-invokes with a chosen name once the supplier selects one;
   * an unknown name falls back to the first sheet (never a silent empty parse).
   */
  readonly sheet?: string;
}

// ─── Neutral input shape (lib-agnostic, so the classifier is pure + testable) ──

/** One raw cell as a spreadsheet reader emits it, before normalisation. */
export type RawCell = string | number | boolean | Date | null;

/** One raw sheet: its name and its rows of raw cells. */
export interface RawSheet {
  readonly name: string;
  readonly rows: readonly RawCell[][];
}

// ─── Normalisation + blankness (pure) ─────────────────────────────────────────

/**
 * Coerce ONE raw cell to the adapter's string form. Dates → ISO 'YYYY-MM-DD'
 * (UTC — the lib emits UTC-midnight dates, so this is timezone-neutral);
 * numbers/booleans → their string form; null/undefined → ''. Strings pass
 * through verbatim (the adapter is comma-tolerant downstream — '1,050' stays).
 */
export function normalizeCell(value: RawCell | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

const isBlankCell = (c: RawCell | undefined): boolean =>
  c == null || (typeof c === 'string' && c.trim() === '');

const isBlankRow = (row: readonly RawCell[]): boolean => row.every(isBlankCell);

// ─── The pure classifier (file structure → result) ────────────────────────────

/**
 * Turn raw sheets into a ParsedWorkbook or an honest file-tier failure. Pure —
 * no IO — so every edge (including NO_SHEETS, which a real file can't easily
 * express) is unit-testable directly. The first row of the active sheet is the
 * header row; rows beneath are keyed by those raw headers.
 *
 * Duplicate or blank header cells are a supplier-sheet reality, not an error
 * here: a duplicate header key is last-wins, a blank header collects under ''.
 * The mapping step (3c-c-b) is where the supplier resolves those against our
 * fields — this raw layer must not pre-judge them.
 */
export function classifyWorkbook(
  sheets: readonly RawSheet[],
  sheetName?: string,
): ParseWorkbookResult {
  if (sheets.length === 0) return { ok: false, reason: 'NO_SHEETS' };

  const names = sheets.map((s) => s.name);
  // Default active = first; a requested name that exists wins; an unknown name
  // falls back to first (never a silent empty parse). All names are surfaced —
  // the non-active sheets are offered to the picker, never discarded.
  const active = (sheetName ? sheets.find((s) => s.name === sheetName) : undefined) ?? sheets[0];
  const data = active.rows;

  if (data.length === 0) return { ok: false, reason: 'EMPTY_SHEET' }; // blank sheet

  const headerRow = data[0];
  if (isBlankRow(headerRow)) return { ok: false, reason: 'NO_HEADER_ROW' }; // data, no header
  const headers = headerRow.map((c) => normalizeCell(c));

  const dataRows = data.slice(1).filter((r) => !isBlankRow(r));
  if (dataRows.length === 0) return { ok: false, reason: 'EMPTY_SHEET' }; // header-only

  const rows = dataRows.map((row) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = normalizeCell(row[i]);
    });
    return rec;
  });

  return { ok: true, sheets: names, activeSheet: active.name, headers, rows };
}

// ─── The IO seam (lazy) ───────────────────────────────────────────────────────

/**
 * Parse an .xlsx File/ArrayBuffer into rows, or an honest file-tier failure.
 * Pure in-browser parse — NO network, so Indonesian data-residency holds by
 * construction (the file never leaves the browser).
 *
 * read-excel-file is loaded LAZILY (dynamic import) so its weight code-splits
 * into an action-gated chunk and never lands in the entry bundle. The `/browser`
 * entry accepts File | Blob | ArrayBuffer.
 */
export async function parseWorkbook(
  input: File | ArrayBuffer,
  options?: ParseWorkbookOptions,
): Promise<ParseWorkbookResult> {
  let sheets: RawSheet[];
  try {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const raw = await readXlsxFile(input);
    sheets = raw.map((s) => ({ name: s.sheet, rows: s.data as unknown as RawCell[][] }));
  } catch {
    // Corrupt / non-xlsx / password-protected → the parser throws in the
    // unzip/XML step. That is the file tier's honest silence: no fabricated
    // workbook, nothing reaches the adapter.
    return { ok: false, reason: 'NOT_A_WORKBOOK' };
  }
  return classifyWorkbook(sheets, options?.sheet);
}

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseWorkbook,
  classifyWorkbook,
  normalizeCell,
  type ParsedWorkbook,
  type ParseWorkbookResult,
  type RawSheet,
} from '../parseWorkbook';

// SDC-3c-c-a — the headless XLSX parse layer. These tests drive REAL .xlsx BYTES
// (checked-in fixtures under ./fixtures, made by scripts/gen-sdc-xlsx-fixtures.mjs)
// through the SAME dynamic-import path the app uses, PLUS pure unit coverage of
// the classifier + the value-normalize boundary. What they lock:
//   · file → Record<string,string>[] with RAW supplier headers (no field guess);
//   · the load-bearing normalize: Excel serial-DATE cell → ISO 'YYYY-MM-DD',
//     number → string, every emitted cell a string;
//   · file-tier honest silence (FileParseReason), BEFORE any row reaches the
//     adapter — each returns ok:false with zero rows, never a fabricated book;
//   · multi-sheet surfaces ALL names + defaults active to first, never discards.

const ab = (name: string): ArrayBuffer => {
  const b = readFileSync(join(__dirname, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

/** Narrow to the ok workbook (fails loudly if it was a failure). */
function okBook(r: ParseWorkbookResult): ParsedWorkbook {
  if (!r.ok) throw new Error(`expected ok workbook, got failure: ${r.reason}`);
  return r;
}

describe('parseWorkbook — real .xlsx bytes → rows', () => {
  it('single sheet: RAW headers + string-normalized cells (ISO dates, string qty)', async () => {
    const book = okBook(await parseWorkbook(ab('single-sheet.xlsx')));
    expect(book.sheets).toEqual(['Stock']);
    expect(book.activeSheet).toBe('Stock');
    // RAW supplier headers — verbatim, NOT our canonical batchNumber/qty/expiry.
    expect(book.headers).toEqual(['Batch No.', 'Quantity', 'Best Before']);
    expect(book.rows).toEqual([
      { 'Batch No.': 'GLY-24A', Quantity: '1800', 'Best Before': '2027-06-30' },
      { 'Batch No.': 'GLY-24B', Quantity: '2200', 'Best Before': '' },
      { 'Batch No.': 'GLY-24C', Quantity: '1,050', 'Best Before': '2028-01-15' },
    ]);
    // Every emitted cell is a string (GridRow = Record<string,string>).
    for (const row of book.rows) {
      for (const v of Object.values(row)) expect(typeof v).toBe('string');
    }
  });

  it('multi-sheet: surfaces ALL names, defaults active to the FIRST (no discard)', async () => {
    const book = okBook(await parseWorkbook(ab('multi-sheet.xlsx')));
    expect(book.sheets).toEqual(['Jan Stock', 'Feb Stock']);
    expect(book.activeSheet).toBe('Jan Stock'); // first by default
    expect(book.rows).toEqual([{ 'Batch No.': 'JAN-1', Quantity: '500' }]);
  });

  it('multi-sheet: the picker seam parses a chosen sheet by name', async () => {
    const book = okBook(await parseWorkbook(ab('multi-sheet.xlsx'), { sheet: 'Feb Stock' }));
    expect(book.activeSheet).toBe('Feb Stock');
    expect(book.sheets).toEqual(['Jan Stock', 'Feb Stock']); // others still surfaced
    expect(book.rows).toEqual([{ 'Batch No.': 'FEB-1', Quantity: '750' }]);
  });

  it('an unknown requested sheet falls back to the first (never a silent empty parse)', async () => {
    const book = okBook(await parseWorkbook(ab('multi-sheet.xlsx'), { sheet: 'Nope' }));
    expect(book.activeSheet).toBe('Jan Stock');
  });
});

describe('parseWorkbook — file-tier honest silence (nothing minted)', () => {
  it('a blank sheet fails EMPTY_SHEET with no rows', async () => {
    const r = await parseWorkbook(ab('empty-sheet.xlsx'));
    expect(r).toEqual({ ok: false, reason: 'EMPTY_SHEET' });
    expect('rows' in r).toBe(false);
  });

  it('a header-only sheet fails EMPTY_SHEET (no data rows beneath the header)', async () => {
    expect(await parseWorkbook(ab('header-only.xlsx'))).toEqual({
      ok: false,
      reason: 'EMPTY_SHEET',
    });
  });

  it('data under a blank header row fails NO_HEADER_ROW (nothing to map against)', async () => {
    expect(await parseWorkbook(ab('no-header-row.xlsx'))).toEqual({
      ok: false,
      reason: 'NO_HEADER_ROW',
    });
  });

  it('a corrupt / non-xlsx buffer fails NOT_A_WORKBOOK (the parser throws)', async () => {
    const garbage = new TextEncoder().encode('this is not a spreadsheet').buffer;
    expect(await parseWorkbook(garbage)).toEqual({ ok: false, reason: 'NOT_A_WORKBOOK' });
  });
});

describe('classifyWorkbook — pure edges (no IO)', () => {
  it('zero sheets fails NO_SHEETS', () => {
    expect(classifyWorkbook([])).toEqual({ ok: false, reason: 'NO_SHEETS' });
  });

  it('keys rows by raw headers; missing trailing cells become ""', () => {
    const sheets: RawSheet[] = [
      { name: 'S', rows: [['A', 'B'], ['x']] }, // row shorter than header
    ];
    const book = okBook(classifyWorkbook(sheets));
    expect(book.rows).toEqual([{ A: 'x', B: '' }]);
  });

  it('ignores fully-blank interleaved rows, keeps real data', () => {
    const sheets: RawSheet[] = [
      { name: 'S', rows: [['A', 'B'], [null, null], ['x', 'y']] },
    ];
    expect(okBook(classifyWorkbook(sheets)).rows).toEqual([{ A: 'x', B: 'y' }]);
  });
});

describe('normalizeCell — the value-normalize boundary (load-bearing)', () => {
  it('a real Date → ISO YYYY-MM-DD, UTC (timezone-neutral)', () => {
    expect(normalizeCell(new Date(Date.UTC(2027, 5, 30)))).toBe('2027-06-30');
    expect(normalizeCell(new Date(Date.UTC(2028, 0, 15)))).toBe('2028-01-15');
    // Year/epoch boundary stays on the intended UTC calendar day.
    expect(normalizeCell(new Date(Date.UTC(2027, 0, 1)))).toBe('2027-01-01');
    expect(normalizeCell(new Date(Date.UTC(1970, 0, 1)))).toBe('1970-01-01');
  });

  it('numbers → string; zero and decimals survive', () => {
    expect(normalizeCell(1800)).toBe('1800');
    expect(normalizeCell(0)).toBe('0');
    expect(normalizeCell(1050.5)).toBe('1050.5');
  });

  it('null / undefined → "" ; booleans → their string form', () => {
    expect(normalizeCell(null)).toBe('');
    expect(normalizeCell(undefined)).toBe('');
    expect(normalizeCell(true)).toBe('true');
  });

  it('strings pass through verbatim (comma-tolerance is the adapter’s job)', () => {
    expect(normalizeCell('GLY-24A')).toBe('GLY-24A');
    expect(normalizeCell('1,050')).toBe('1,050');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-c-a — fixture generator for the headless XLSX parse layer.
//
// The parseWorkbook tests drive REAL .xlsx bytes (checked-in binary fixtures),
// not hand-rolled mocks — the value-normalize boundary (Excel serial-date cell →
// ISO string, number cell → string) only earns its keep against bytes an actual
// spreadsheet writer produced. This script regenerates those fixtures.
//
// It is DEV-ONLY provenance: `write-excel-file` is NOT a committed dependency
// (the app only ever READS). To regenerate the fixtures:
//     npm i -D write-excel-file && node scripts/gen-sdc-xlsx-fixtures.mjs
// then uninstall it again. The generated files live beside the tests and are the
// checked-in source of truth; this script just documents how they were made.
// ────────────────────────────────────────────────────────────────────────────
import writeXlsxFile from 'write-excel-file/node';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'services', 'sdc', '__tests__', 'fixtures');

const S = (v) => ({ value: v ?? null, type: v == null ? undefined : String });
const N = (v) => ({ value: v, type: Number });
const D = (v) => ({ value: v, type: Date, format: 'yyyy-mm-dd' });

async function emit(name, data, options) {
  const buf = await writeXlsxFile(data, options).toBuffer();
  writeFileSync(join(OUT, name), buf);
  console.log(`wrote ${name} (${buf.length} bytes)`);
}

// 1. single-sheet — the happy path + the two load-bearing cell types: an Excel
//    serial DATE cell (→ ISO 'YYYY-MM-DD') and a NUMBER cell (→ string). Row 3
//    carries a text "1,050" (comma passthrough) and row 2 a null expiry.
await emit(
  'single-sheet.xlsx',
  [
    [S('Batch No.'), S('Quantity'), S('Best Before')],
    [S('GLY-24A'), N(1800), D(new Date(Date.UTC(2027, 5, 30)))],
    [S('GLY-24B'), N(2200), { value: null }],
    [S('GLY-24C'), S('1,050'), D(new Date(Date.UTC(2028, 0, 15)))],
  ],
  { sheet: 'Stock' },
);

// 2. multi-sheet — two named sheets; the parser must surface BOTH names for the
//    picker (3c-c-b) and default the active sheet to the first, never discarding.
await emit('multi-sheet.xlsx', [
  { sheet: 'Jan Stock', data: [[S('Batch No.'), S('Quantity')], [S('JAN-1'), N(500)]] },
  { sheet: 'Feb Stock', data: [[S('Batch No.'), S('Quantity')], [S('FEB-1'), N(750)]] },
]);

// 3. header-only — a header row with no data rows beneath → EMPTY_SHEET.
await emit('header-only.xlsx', [[S('Batch No.'), S('Quantity'), S('Best Before')]], {
  sheet: 'Headers',
});

// 4. empty-sheet — a single blank cell; read-excel-file trims it to data=[] → the
//    blank-sheet EMPTY_SHEET path.
await emit('empty-sheet.xlsx', [[{ value: null }]], { sheet: 'Blank' });

// 5. no-header-row — a leading blank row above real data: the header candidate
//    (row 0) is all-blank while data exists below → NO_HEADER_ROW (distinct from
//    EMPTY_SHEET: there IS data, but nothing to map it against).
await emit('no-header-row.xlsx', [
  { sheet: 'LeadBlank', data: [[{ value: null }, { value: null }], [S('GLY-1'), N(10)]] },
]);

console.log('done.');

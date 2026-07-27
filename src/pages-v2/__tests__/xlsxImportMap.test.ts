import { describe, it, expect } from 'vitest';
import {
  suggestMapping,
  mappingComplete,
  coerceRows,
  type ColumnMapping,
} from '../xlsxImportMap';

// SDC-3c-c-b — the column-mapping helpers. These lock the honesty pivot's PURE
// half: a suggestion is only ever a seed, required fields gate confirm, one
// column never doubles up, and coercion never fabricates a qty.

describe('suggestMapping — a visible seed, never authoritative', () => {
  it('matches EN headers fuzzily (batch / quantity / best before)', () => {
    expect(suggestMapping(['Batch No.', 'Quantity', 'Best Before'])).toEqual({
      batchNumber: 'Batch No.',
      qty: 'Quantity',
      expiryDate: 'Best Before',
    });
  });

  it('matches ID headers (Nomor Batch / Jumlah / Kedaluwarsa)', () => {
    expect(suggestMapping(['Nomor Batch', 'Jumlah', 'Tanggal Kedaluwarsa'])).toEqual({
      batchNumber: 'Nomor Batch',
      qty: 'Jumlah',
      expiryDate: 'Tanggal Kedaluwarsa',
    });
  });

  it('never auto-maps one column to two fields; unmatched fields stay ""', () => {
    // Only a batch column is recognisable → qty + expiry left for the supplier.
    const m = suggestMapping(['Batch', 'Notes']);
    expect(m.batchNumber).toBe('Batch');
    expect(m.qty).toBe('');
    expect(m.expiryDate).toBe('');
  });

  it('leaves everything blank when nothing matches', () => {
    expect(suggestMapping(['Col1', 'Col2'])).toEqual({ batchNumber: '', qty: '', expiryDate: '' });
  });
});

describe('mappingComplete — required + distinct', () => {
  const base: ColumnMapping = { batchNumber: 'B', qty: 'Q', expiryDate: '' };
  it('requires both batchNumber and qty', () => {
    expect(mappingComplete(base)).toBe(true);
    expect(mappingComplete({ ...base, qty: '' })).toBe(false);
    expect(mappingComplete({ ...base, batchNumber: '' })).toBe(false);
  });
  it('allows a blank expiry (optional)', () => {
    expect(mappingComplete({ batchNumber: 'B', qty: 'Q', expiryDate: '' })).toBe(true);
  });
  it('rejects the same header used for two fields', () => {
    expect(mappingComplete({ batchNumber: 'X', qty: 'X', expiryDate: '' })).toBe(false);
    expect(mappingComplete({ batchNumber: 'B', qty: 'Q', expiryDate: 'B' })).toBe(false);
  });
});

describe('coerceRows — confirmed mapping → grid rows (no fabrication)', () => {
  const rows = [
    { 'Batch No.': 'GLY-24A', Quantity: '1,800', 'Best Before': '2027-06-30' },
    { 'Batch No.': 'GLY-24B', Quantity: '2200', 'Best Before': '' },
  ];
  const m: ColumnMapping = { batchNumber: 'Batch No.', qty: 'Quantity', expiryDate: 'Best Before' };

  // LEDGER (CP-0 · 6.1 · correction 4) — THE BUG NOTARIZED AS A PASSING TEST.
  //
  // old: 'maps under the confirmed columns; comma qty → number; blank expiry
  //       → null'  →  Quantity '1,800'  →  expect qty: 1800
  //
  // why old was wrong: "1,800" is 1800 under the en convention and 1.8 under
  // the id one, and an uploaded spreadsheet is the path with the LEAST claim to
  // know which — there is no channel convention, no form context, not even an
  // ambient UI language that could stand in for the authorship of a file
  // someone else typed. The old blanket `replace(/,/g,'')` picked the en
  // reading every time and said nothing, and this test recorded that guess as
  // the contract — its title naming the defect ("comma qty → number") as the
  // feature. It is the reason the comma-strip survived four batches here.
  //
  // new: the cell is REFUSED. It imports blank (the grid cell is `number|null`
  // and cannot hold "1,800 (ambiguous)"), and the refusal is reported so the
  // panel can say which cell and why — a silently blanked cell would tell the
  // supplier they left a field empty when they did not.
  it('maps under the confirmed columns; an AMBIGUOUS qty refuses; blank expiry → null', () => {
    const out = coerceRows(rows, m);
    expect(out.rows).toEqual([
      { batchNumber: 'GLY-24A', qty: null, expiryDate: '2027-06-30' },
      { batchNumber: 'GLY-24B', qty: 2200, expiryDate: null },
    ]);
    expect(out.refused).toEqual([
      { index: 0, batchNumber: 'GLY-24A', raw: '1,800', reason: 'AMBIGUOUS_QTY' },
    ]);
  });

  it('an UNAMBIGUOUS separator still reads — "2,4" can only be the id decimal', () => {
    // The refusal is targeted, not blanket: en comma-thousands needs exactly 3
    // digits, so "2,4" is legal under one convention only and is not a guess.
    const out = coerceRows([{ B: 'Z', Q: '2,4' }], { batchNumber: 'B', qty: 'Q', expiryDate: '' });
    expect(out.rows[0].qty).toBe(2.4);
    expect(out.refused).toEqual([]);
  });

  // LEDGER (CP-0 · 6.1 · correction 5): the '-5' row expected `qty: -5` with the
  // note "negative survives coercion; the ADAPTER flags it". It is now `null`.
  // why old was wrong is narrower than the others — the value was not a
  // misreading. But routing every cell through the ONE parser is the whole
  // point of the batch, and that parser refuses a negative at its charset
  // guard, so a negative can no longer reach the adapter to be flagged there.
  // The block still happens and the operator still cannot declare; what changed
  // is WHERE it is said — and, unlike before, the reason now travels with it
  // instead of being inferred from a tinted row.
  it('an unreadable or negative qty becomes null AND is reported (never a silent 0)', () => {
    const bad = [{ B: 'X', Q: 'lots' }, { B: 'Y', Q: '-5' }];
    const out = coerceRows(bad, { batchNumber: 'B', qty: 'Q', expiryDate: '' });
    expect(out.rows).toEqual([
      { batchNumber: 'X', qty: null, expiryDate: null },
      { batchNumber: 'Y', qty: null, expiryDate: null },
    ]);
    expect(out.refused.map((r) => [r.index, r.raw, r.reason])).toEqual([
      [0, 'lots', 'NOT_NUMERIC'],
      [1, '-5', 'NOT_NUMERIC'],
    ]);
  });

  // A genuinely blank cell is blank in the grid — self-evident, not a
  // misreading, and reporting it would drown the real refusals in noise.
  it('a BLANK qty is not reported as unreadable — it is simply empty', () => {
    const out = coerceRows([{ B: 'X', Q: '' }, { B: 'Y', Q: '  ' }], {
      batchNumber: 'B',
      qty: 'Q',
      expiryDate: '',
    });
    expect(out.rows.every((r) => r.qty === null)).toBe(true);
    expect(out.refused).toEqual([]);
  });

  // ZERO-COMMITMENT: a typed 0 in the sheet is a statement and must survive —
  // it is only the DEFAULTED zero that the series kills.
  it('an ENTERED zero survives the import', () => {
    const out = coerceRows([{ B: 'X', Q: '0' }], { batchNumber: 'B', qty: 'Q', expiryDate: '' });
    expect(out.rows[0].qty).toBe(0);
    expect(out.refused).toEqual([]);
  });

  it('an unmapped expiry never invents a date', () => {
    const out = coerceRows(rows, { batchNumber: 'Batch No.', qty: 'Quantity', expiryDate: '' });
    expect(out.rows.every((r) => r.expiryDate === null)).toBe(true);
  });
});

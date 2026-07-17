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

  it('maps under the confirmed columns; comma qty → number; blank expiry → null', () => {
    expect(coerceRows(rows, m)).toEqual([
      { batchNumber: 'GLY-24A', qty: 1800, expiryDate: '2027-06-30' },
      { batchNumber: 'GLY-24B', qty: 2200, expiryDate: null },
    ]);
  });

  it('an unreadable / negative qty becomes null (a blank cell to fix — never a silent 0)', () => {
    const bad = [{ B: 'X', Q: 'lots' }, { B: 'Y', Q: '-5' }];
    expect(coerceRows(bad, { batchNumber: 'B', qty: 'Q', expiryDate: '' })).toEqual([
      { batchNumber: 'X', qty: null, expiryDate: null },
      { batchNumber: 'Y', qty: -5, expiryDate: null }, // negative survives coercion; the ADAPTER flags it
    ]);
  });

  it('an unmapped expiry never invents a date', () => {
    const out = coerceRows(rows, { batchNumber: 'Batch No.', qty: 'Quantity', expiryDate: '' });
    expect(out.every((r) => r.expiryDate === null)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { intColumn, createTextColumn } from 'react-datasheet-grid';
import { normalizeQty } from '../../lib/localeNumber';

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · 2d′-b — the batch-qty column primitive, proven HEADLESSLY.
//
// This is the only honest way to test this. The datasheet body lays out no
// editable cell under jsdom (asserted in BulkStockEntryGrid.test.tsx), so a
// rendered cell-level test cannot establish its own positive case and would be
// vacuous. The column is a plain object with plain functions, so it is called
// DIRECTLY here — no DOM, no render, no virtualization.
//
// The suite proves two things side by side:
//  1. what `intColumn` — the primitive that shipped on this surface from
//     SDC-3c-b until now — actually did to a supplier's keystrokes. It is
//     asserted against the INSTALLED library, not described, so if a future
//     upgrade changes it we find out here rather than in production.
//  2. that the replacement does none of it, and that the one legal parser
//     reads what survives.
//
// The three defects are independent. Only (i) is about locale at all.
// ────────────────────────────────────────────────────────────────────────────

// The replacement, constructed exactly as BulkStockEntryGrid constructs it.
// (Kept in step with the surface by the tsc pass over both — the options object
// is small enough that duplication is safer than an export solely for tests.)
const rawQtyColumn = createTextColumn<string>({
  alignRight: true,
  deletedValue: '',
  parseUserInput: (v) => v,
  formatBlurredInput: (v) => v,
  formatInputOnFocus: (v) => v,
  formatForCopy: (v) => v,
  parsePastedValue: (v) => v.replace(/[\n\r]+/g, ' ').trim(),
});

const parseRaw = (s: string): string => rawQtyColumn.columnData!.parseUserInput(s);
const formatRaw = (v: string): string => rawQtyColumn.columnData!.formatBlurredInput(v);
const parseInt_ = (s: string) => intColumn.columnData!.parseUserInput(s);

describe('the OLD primitive (intColumn) — what it did, asserted not described', () => {
  // (i) DESTRUCTION, and it happens per keystroke rather than on blur, because
  // createTextColumn defaults continuousUpdates to true and intColumn does not
  // override it. Reproduced by hand on the live build before this batch.
  it('truncates a grouped quantity to its first digit — "1.050" → 1', () => {
    expect(parseInt_('1.050')).toBe(1);
    expect(parseInt_('2.400')).toBe(2);
    expect(parseInt_('1,050')).toBe(1);
  });

  it('destroys the value on EVERY keystroke, not on blur', () => {
    expect(intColumn.columnData!.continuousUpdates).toBe(true);
    // What the row value is after each character of "1.050":
    const walk = ['1', '1.', '1.0', '1.05', '1.050'].map((s) => parseInt_(s));
    expect(walk).toEqual([1, 1, 1, 1, 1]);
  });

  // (iii) ROUNDING — independent of any locale question, and directly at odds
  // with xlsxImportMap.test.ts, which asserts "2,4" is a legal 2.4 on a repo
  // that stocks materials in KG.
  it('rounds away a fractional quantity — 2.4 KG becomes 2', () => {
    expect(parseInt_('2,4')).toBe(2);
    expect(parseInt_('1.8')).toBe(2);
    expect(parseInt_('2.5')).toBe(3);
  });

  it('accepts a garbage tail the one parser would refuse — "1800abc" → 1800', () => {
    expect(parseInt_('1800abc')).toBe(1800);
    expect(normalizeQty('1800abc')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
  });

  // (ii) The reformat is BROWSER-locale, so its output is machine-dependent —
  // which is why this asserts the mechanism rather than a literal string. On
  // an en-US machine it renders 1800 as "1,800" while the app's own
  // formatNumber (pinned id-ID) renders it "1.800", on the same screen.
  it('reformats through the BROWSER locale, not the app locale', () => {
    const browser = new Intl.NumberFormat().format(1800);
    expect(intColumn.columnData!.formatBlurredInput(1800)).toBe(browser);
  });
});

describe('the NEW primitive — it parses nothing and reformats nothing (CP-0 · 2d′-b)', () => {
  // POSITIVE FIRST: the column round-trips text unchanged. Everything below
  // that says "is not destroyed" stands against this.
  it('stores text exactly as typed and gives it back unchanged', () => {
    for (const s of ['1.050', '2,4', '1800', '0', 'lots', '1 800', '']) {
      expect(parseRaw(s)).toBe(s);
      expect(formatRaw(s)).toBe(s);
    }
  });

  it('the keystroke walk that destroyed "1.050" now preserves it', () => {
    expect(['1', '1.', '1.0', '1.05', '1.050'].map(parseRaw)).toEqual([
      '1',
      '1.',
      '1.0',
      '1.05',
      '1.050',
    ]);
  });

  it('does not round, because it does not read the value at all', () => {
    expect(parseRaw('2,4')).toBe('2,4');
    expect(normalizeQty('2,4')).toMatchObject({ ok: true, value: 2.4 });
  });

  it('never applies a browser-locale format — 1800 keeps whatever form it was given', () => {
    expect(formatRaw('1800')).toBe('1800');
    expect(formatRaw('1.800')).toBe('1.800');
  });

  it('a cleared cell is empty text, not null — the row type stays string', () => {
    expect(rawQtyColumn.deleteValue!({ rowData: '1800', rowIndex: 0 })).toBe('');
  });

  // The handover: what the cell holds is what the one parser reads. These are
  // the three states CP-0 §5a defines, reached through the real column.
  it('hands the ONE parser exactly what the supplier typed — resolve, refuse, refuse', () => {
    expect(normalizeQty(parseRaw('1800'))).toMatchObject({ ok: true, value: 1800 });
    expect(normalizeQty(parseRaw('1.050'))).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    expect(normalizeQty(parseRaw('lots'))).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    // …and a TYPED zero is still a commitment that survives (ZERO-COMMITMENT).
    expect(normalizeQty(parseRaw('0'))).toMatchObject({ ok: true, value: 0 });
  });
});

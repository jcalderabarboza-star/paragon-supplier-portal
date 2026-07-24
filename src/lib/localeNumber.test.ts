import { describe, it, expect } from 'vitest';
import { normalizeQty, type QtyOutcome } from './localeNumber';

// The ONE legal numeric-entry parser (CP-0 · W1). These lock the contract every
// entry path relies on: locale-correct under a hint, honest refusal on ambiguity,
// and — critically — a wrong number is NEVER produced. The catastrophic misreadings
// that the old `raw.replace(/,/g,'')` coercions produced ("2.400"→2.4, "2,4"→24,
// "10.000"→10, "1.500"→1.5) are asserted to be impossible here.

const val = (r: QtyOutcome): number | null => (r.ok ? r.value : null);

describe('normalizeQty — the shared locale-numeric contract', () => {
  describe('the four catastrophic misreadings can never be produced', () => {
    it('"2.400" is NEVER 2.4', () => {
      expect(val(normalizeQty('2.400', 'id'))).toBe(2400);
      expect(val(normalizeQty('2.400'))).toBeNull(); // ambiguous → refuse, not 2.4
      expect(val(normalizeQty('2.400'))).not.toBe(2.4);
    });
    it('"2,4" is NEVER 24', () => {
      expect(val(normalizeQty('2,4'))).toBe(2.4); // unambiguous ID decimal
      expect(val(normalizeQty('2,4', 'id'))).toBe(2.4);
      expect(val(normalizeQty('2,4'))).not.toBe(24);
    });
    it('"10.000" is NEVER 10', () => {
      expect(val(normalizeQty('10.000', 'id'))).toBe(10000);
      expect(val(normalizeQty('10.000'))).toBeNull(); // ambiguous → refuse, not 10
      expect(val(normalizeQty('10.000'))).not.toBe(10);
    });
    it('"1.500" (price) is NEVER 1.5', () => {
      expect(val(normalizeQty('1.500', 'id'))).toBe(1500);
      expect(val(normalizeQty('1.500'))).toBeNull(); // ambiguous → refuse, not 1.5
      expect(val(normalizeQty('1.500'))).not.toBe(1.5);
    });
  });

  describe('id convention (Bahasa default: "." thousands, "," decimal)', () => {
    it('thousands group → integer', () => {
      expect(normalizeQty('2.400', 'id')).toEqual({ ok: true, canonical: '2400', value: 2400 });
      expect(normalizeQty('10.000', 'id')).toEqual({ ok: true, canonical: '10000', value: 10000 });
      expect(normalizeQty('1.234.567', 'id')).toEqual({
        ok: true,
        canonical: '1234567',
        value: 1234567,
      });
    });
    it('comma decimal', () => {
      expect(normalizeQty('2,4', 'id')).toEqual({ ok: true, canonical: '2.4', value: 2.4 });
      expect(normalizeQty('1.234,56', 'id')).toEqual({
        ok: true,
        canonical: '1234.56',
        value: 1234.56,
      });
    });
  });

  describe('en convention (",": thousands, ".": decimal)', () => {
    it('thousands group → integer', () => {
      expect(normalizeQty('2,400', 'en')).toEqual({ ok: true, canonical: '2400', value: 2400 });
      expect(normalizeQty('10,000', 'en')).toEqual({ ok: true, canonical: '10000', value: 10000 });
    });
    it('period decimal', () => {
      expect(normalizeQty('1.500', 'en')).toEqual({ ok: true, canonical: '1.500', value: 1.5 });
      expect(normalizeQty('1,234.56', 'en')).toEqual({
        ok: true,
        canonical: '1234.56',
        value: 1234.56,
      });
    });
  });

  describe('unambiguous without any hint', () => {
    it('bare integer is identical under both conventions', () => {
      expect(normalizeQty('2400')).toEqual({ ok: true, canonical: '2400', value: 2400 });
      expect(normalizeQty('0')).toEqual({ ok: true, canonical: '0', value: 0 });
    });
    it('"2,4" is legal ONLY as ID decimal (EN thousands needs 3 digits)', () => {
      expect(normalizeQty('2,4')).toEqual({ ok: true, canonical: '2.4', value: 2.4 });
    });
    it('"1.234,56" is legal ONLY under ID', () => {
      expect(normalizeQty('1.234,56')).toEqual({ ok: true, canonical: '1234.56', value: 1234.56 });
    });
    it('"1,234.56" is legal ONLY under EN', () => {
      expect(normalizeQty('1,234.56')).toEqual({ ok: true, canonical: '1234.56', value: 1234.56 });
    });
  });

  describe('honest refusal on genuine cross-convention ambiguity', () => {
    it('"2.400" / "10.000" / "1.500" / "2,400" refuse with no hint', () => {
      for (const t of ['2.400', '10.000', '1.500', '2,400', '1,500']) {
        expect(normalizeQty(t)).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
      }
    });
    it('a hint resolves the ambiguity deterministically', () => {
      expect(normalizeQty('2.400', 'id')).toMatchObject({ value: 2400 });
      expect(normalizeQty('2.400', 'en')).toMatchObject({ value: 2.4 });
    });
  });

  describe('EMPTY_QTY / NOT_NUMERIC — never a legal zero', () => {
    it('empty is EMPTY_QTY, not 0', () => {
      expect(normalizeQty('')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
      expect(normalizeQty('   ')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
      expect(val(normalizeQty(''))).not.toBe(0);
    });
    it('non-numeric refuses, never coerces to 0', () => {
      for (const t of ['abc', 'lots', '2..4', '1,2,3', '.', ',', '-5', '1.2.3,4']) {
        expect(normalizeQty(t).ok).toBe(false);
        expect(val(normalizeQty(t))).not.toBe(0);
      }
    });
    it('negative is refused (a quantity/price is never negative)', () => {
      expect(normalizeQty('-5').ok).toBe(false);
    });
  });

  it('trims surrounding whitespace before evaluating', () => {
    expect(normalizeQty('  2400  ')).toEqual({ ok: true, canonical: '2400', value: 2400 });
  });
});

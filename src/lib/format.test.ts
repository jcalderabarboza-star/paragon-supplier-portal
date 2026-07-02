import { describe, it, expect } from 'vitest';
import { formatIDR, formatDate, formatNumber } from './format';

describe('formatNumber', () => {
  it('groups with id-ID dot thousands', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
  it('handles zero, negative, and large values', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1500)).toBe('-1.500');
    expect(formatNumber(1_250_000_000)).toBe('1.250.000.000');
  });
  it('returns em dash for null/undefined/NaN', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('formatIDR (full)', () => {
  it('prefixes Rp with id-ID grouping', () => {
    expect(formatIDR(1_250_000_000)).toBe('Rp 1.250.000.000');
    expect(formatIDR(0)).toBe('Rp 0');
  });
  it('handles negatives', () => {
    expect(formatIDR(-1_000_000)).toBe('Rp -1.000.000');
  });
  it('returns em dash for null/undefined/NaN', () => {
    expect(formatIDR(null)).toBe('—');
    expect(formatIDR(undefined)).toBe('—');
    expect(formatIDR(NaN)).toBe('—');
  });
});

describe('formatIDR (compact — jt/B/T scale)', () => {
  it('scales millions / billions / trillions', () => {
    expect(formatIDR(14_000_000_000, { compact: true })).toBe('Rp 14.0B');
    expect(formatIDR(1_500_000, { compact: true })).toBe('Rp 1.5jt');
    expect(formatIDR(2_000_000_000_000, { compact: true })).toBe('Rp 2.0T');
    expect(formatIDR(5_000, { compact: true })).toBe('Rp 5.0rb');
  });
  it('falls back to full formatting below thousands', () => {
    expect(formatIDR(750, { compact: true })).toBe('Rp 750');
  });
  it('returns em dash for null', () => {
    expect(formatIDR(null, { compact: true })).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats ISO dates as dd MMM yyyy (Asia/Jakarta)', () => {
    expect(formatDate('2026-07-02')).toBe('02 Jul 2026');
  });
  it('accepts Date objects', () => {
    expect(formatDate(new Date('2026-01-15T00:00:00+07:00'))).toBe('15 Jan 2026');
  });
  it('returns em dash for null/empty/invalid', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

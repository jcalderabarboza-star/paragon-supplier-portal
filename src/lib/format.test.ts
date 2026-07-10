import { describe, it, expect, afterEach } from 'vitest';
import i18n from './i18n';
import { formatIDR, formatDate, formatNumber } from './format';

// format.ts reads the i18n singleton; always restore EN so other suites in this
// file (which assume EN) are unaffected by the ID cases below.
afterEach(async () => {
  await i18n.changeLanguage('en');
});

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

describe('locale-aware output (lang = id)', () => {
  it('IDR compact billions use ID "M" (miliar); T/jt/rb unchanged', async () => {
    await i18n.changeLanguage('id');
    expect(formatIDR(14_000_000_000, { compact: true })).toBe('Rp 14.0M');
    expect(formatIDR(2_000_000_000_000, { compact: true })).toBe('Rp 2.0T');
    expect(formatIDR(1_500_000, { compact: true })).toBe('Rp 1.5jt');
    expect(formatIDR(5_000, { compact: true })).toBe('Rp 5.0rb');
  });

  it('date month abbreviations localize to id-ID (Agu/Okt/Des)', async () => {
    await i18n.changeLanguage('id');
    expect(formatDate('2026-08-02')).toBe('02 Agu 2026');
    expect(formatDate('2026-10-09')).toBe('09 Okt 2026');
    expect(formatDate('2026-12-15')).toBe('15 Des 2026');
  });

  it('full IDR + number grouping stay id-ID in both locales', async () => {
    await i18n.changeLanguage('id');
    expect(formatIDR(1_250_000_000)).toBe('Rp 1.250.000.000');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('EN output is unchanged (billion "B", English months)', async () => {
    await i18n.changeLanguage('en');
    expect(formatIDR(14_000_000_000, { compact: true })).toBe('Rp 14.0B');
    expect(formatDate('2026-08-02')).toBe('02 Aug 2026');
    expect(formatDate('2026-12-15')).toBe('15 Dec 2026');
  });
});

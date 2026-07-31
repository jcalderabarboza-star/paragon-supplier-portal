import { describe, it, expect, afterEach } from 'vitest';
import i18n from './i18n';
import { formatIDR, formatDate, formatMoney, formatNumber } from './format';

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

// ── CP-0 · 2e-c-2 — formatMoney: each currency states its own conventions ────
//
// It replaced a USD-vs-domestic BINARY under which every non-USD currency
// inherited rupiah conventions — including zero fraction digits, which rounded a
// €2.85 bid to "€3" (2e-c-1-FIND-01). These tests exist so that a future
// "simplification" back to a binary fails loudly rather than silently
// re-rounding somebody's price.
describe('formatMoney — the operator currency ruling, made executable', () => {
  it('renders EUR as en-IE: symbol leading, dot decimal, two fraction digits', () => {
    expect(formatMoney(2.85, 'EUR')).toBe('€2.85');
    expect(formatMoney(22_800, 'EUR')).toBe('€22,800.00');
  });

  it('THE REGRESSION — a EUR price is NOT rounded to the unit', () => {
    // The precise defect: "€3" is a ~5% misstatement of a €2.85 bid, on the
    // cell a buyer awards from.
    expect(formatMoney(2.85, 'EUR')).not.toBe('€3');
    expect(formatMoney(2.85, 'EUR')).toContain('.85');
  });

  it('keeps EUR and USD STRUCTURALLY PARALLEL — the reason en-IE was chosen', () => {
    // A comparison table's whole job is comparison. Same shape, different
    // symbol, so a buyer reading down a column is not re-parsing conventions
    // per row. This is the assertion that would fail under a de-DE ruling
    // ("2,85 €"), and it is deliberately explicit about why.
    const eur = formatMoney(1_234.5, 'EUR');
    const usd = formatMoney(1_234.5, 'USD');
    expect(eur).toBe('€1,234.50');
    expect(usd).toBe('$1,234.50');
    expect(eur.slice(1)).toBe(usd.slice(1)); // identical but for the symbol
  });

  it('renders IDR through formatIDR — ONE rupiah rendering in the app', () => {
    // The retired binary built its own rupiah via Intl currency style, which
    // emits a NO-BREAK SPACE after "Rp" where formatIDR emits an ordinary
    // space: two renderings of one currency differing by an invisible
    // character. Byte equality is the point of this assertion.
    expect(formatMoney(22_800, 'IDR')).toBe(formatIDR(22_800));
    expect(formatMoney(22_800, 'IDR')).toBe('Rp 22.800');
    expect(formatMoney(22_800, 'IDR')).not.toContain('\u00a0');
  });

  it('does not round rupiah either — it defers, rather than imposing a precision', () => {
    // The old binary forced maximumFractionDigits: 0 on the domestic branch.
    // Delegating means IDR behaves exactly as every other rupiah on the page.
    expect(formatMoney(2.85, 'IDR')).toBe(formatIDR(2.85));
  });

  it('returns the em dash for absent or unreadable amounts, like its siblings', () => {
    for (const currency of ['IDR', 'USD', 'EUR'] as const) {
      expect(formatMoney(null, currency)).toBe('—');
      expect(formatMoney(undefined, currency)).toBe('—');
      expect(formatMoney(NaN, currency)).toBe('—');
    }
  });

  it('renders zero as a real amount — 0 is a price, not an absence', () => {
    expect(formatMoney(0, 'EUR')).toBe('€0.00');
    expect(formatMoney(0, 'IDR')).toBe('Rp 0');
  });
});

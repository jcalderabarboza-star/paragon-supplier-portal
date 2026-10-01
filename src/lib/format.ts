// ────────────────────────────────────────────────────────────────────────────
// Locale formatting — single source of truth for currency / date / number
// display. Dates render in the Asia/Jakarta timezone so output is deterministic
// regardless of runner locale.
//
// ⚠️ B4b-2 · OPERATOR RULING: A PLAIN NUMBER RENDERS IN THE SEAT'S CONVENTION —
// EN "6,000" / "1,234.5", ID "6.000" / "1.234,5". It rendered id-ID in BOTH
// until now, so an EN seat read "6.000" for six thousand while the same seat
// TYPING "6.000" into a grid cell entered six (`normalizeQty` under the EN
// convention) — the display and the input disagreed about the same keystrokes.
// Money is NOT this rule: `formatIDR` keeps the rupiah's own grouping in both
// languages, and the gate (`numberConvention.gate.test.ts`) lists every other
// formatting site with its reason.
//
// Consolidation target: the ~127 inline formatting sites across pages-v2
// migrate onto these three functions opportunistically as Phase 1' touches
// each page. All three return an em dash for null/undefined/NaN/invalid input.
// ────────────────────────────────────────────────────────────────────────────

import i18n from './i18n';
import type { BidCurrency } from './currencyPolicy';

const JAKARTA = 'Asia/Jakarta';
const EMPTY = '—';

const idID = new Intl.NumberFormat('id-ID');
const enUS = new Intl.NumberFormat('en-US');

// Active UI language, read from the i18n singleton (the SSoT). EN output stays
// byte-identical to the pre-i18n behaviour; only ID mode diverges.
function isID(): boolean {
  return i18n.language?.toLowerCase().startsWith('id') ?? false;
}

/**
 * A plain number in the SEAT's convention: EN "1,234,567.5", ID "1.234.567,5".
 * null/undefined/NaN → "—".
 */
export function formatNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return (isID() ? idID : enUS).format(value);
}

/**
 * The rupiah's digits, grouped BY HAND: "1.250.000.000", "1.234,5".
 *
 * ⚠️ E1 · NO `Intl`, AND THAT IS THE POINT. `Intl.NumberFormat('id-ID')` names
 * its locale, so the MACHINE's locale cannot move it — but the ICU data behind
 * it still can: a runtime built without full ICU falls back to its own
 * convention and prints "1,250,000,000" for the same call. Money is the one
 * number this portal promises to render identically on every machine, so its
 * grouping is plain string arithmetic. Up to three fraction digits, trailing
 * zeros dropped — what `id-ID` printed before, so no rendered amount moved.
 */
function rupiahDigits(value: number): string {
  const sign = value < 0 ? '-' : '';
  const [whole, frac] = Math.abs(value).toFixed(3).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = frac.replace(/0+$/, '');
  return sign + grouped + (fraction ? `,${fraction}` : '');
}

/**
 * Rupiah — THE ONE rupiah rendering in the portal (`numberConvention.gate.test.ts`
 * holds every other site to it). Full: "Rp 1.250.000.000". Compact ({ compact: true }) auto-scales:
 *   >=1e12 → "Rp 1.0T"  >=1e9 → "Rp 14.0B" (EN) / "Rp 14.0M" (ID, miliar)
 *   >=1e6 → "Rp 1.5jt"  >=1e3 → "Rp 5.0rb"
 * The billion suffix is the only locale-sensitive tier (EN "B" vs ID "M"); the
 * juta/ribu suffixes are Indonesian in both. null/undefined/NaN → "—".
 */
export function formatIDR(value?: number | null, opts?: { compact?: boolean }): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  if (opts?.compact) {
    const abs = Math.abs(value);
    const scaled = (div: number, suffix: string) => `Rp ${(value / div).toFixed(1)}${suffix}`;
    if (abs >= 1e12) return scaled(1e12, 'T');
    if (abs >= 1e9) return scaled(1e9, isID() ? 'M' : 'B');
    if (abs >= 1e6) return scaled(1e6, 'jt');
    if (abs >= 1e3) return scaled(1e3, 'rb');
  }
  return `Rp ${rupiahDigits(value)}`;
}

// — Currency-aware money (CP-0 · 2e-c-2) ─────────────────────────────────────
//
// Was a local const in `BuyerSourcing.tsx`, where a comment recorded that
// consolidating it "belongs to the currency ruling (FIND-01 / 2e-c), not here".
// This is that ruling, so it lands here beside `formatIDR` — the rest of the
// app's money already comes from this file.
//
// It replaces a USD-vs-domestic BINARY (`currency === 'USD' ? … : …`, twice)
// under which every non-USD currency inherited rupiah conventions, so a €2.85
// bid rendered "€3" — a ~5% misstatement of a supplier's price (2e-c-1-FIND-01).
// Each currency now states its own locale and its own precision.
//
// EUR = en-IE by operator ruling: "€2.85" — symbol leading, dot decimal, two
// fraction digits. The users are Indonesian procurement staff; the symbol's job
// is to say "this is not rupiah", not to reproduce a German invoice. It also
// keeps EUR rows structurally parallel to USD rows ("$2.85") in a comparison
// table whose entire purpose is comparison.
//
// IDR DELEGATES to `formatIDR`, so there is exactly ONE rupiah rendering in the
// app. The retired binary built its own via `Intl` currency style, which emits a
// NO-BREAK SPACE after "Rp" where `formatIDR` emits an ordinary space — two
// renderings of the same currency, differing by an invisible character.
const MONEY_LOCALE: Record<Exclude<BidCurrency, 'IDR'>, string> = {
  USD: 'en-US',
  EUR: 'en-IE',
};

/**
 * An amount in the currency it is actually denominated in. The currency is
 * REQUIRED — a defaulted currency is an assertion about money that the caller,
 * not this function, is in a position to make. null/undefined/NaN → "—".
 */
export function formatMoney(value: number | null | undefined, currency: BidCurrency): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  if (currency === 'IDR') return formatIDR(value);
  return new Intl.NumberFormat(MONEY_LOCALE[currency], {
    style: 'currency',
    currency,
    // Both min and max: a price is quoted to the cent, and "€2.8" would be a
    // different-looking number from "$2.80" in a table read across rows.
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * "02 Jul 2026" (Asia/Jakarta), dd MMM yyyy. Month abbreviations localize:
 * EN (en-GB) "Aug/Oct/Dec" vs ID (id-ID) "Agu/Okt/Des". Accepts ISO string /
 * epoch / Date. Invalid/empty → "—".
 */
export function formatDate(value?: string | number | Date | null): string {
  if (value == null || value === '') return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return new Intl.DateTimeFormat(isID() ? 'id-ID' : 'en-GB', {
    timeZone: JAKARTA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * A MONTH BUCKET's label — "Aug 2026" (EN) / "Agu 2026" (ID), Asia/Jakarta.
 *
 * Takes a `YYYY-MM` bucket key rather than a date, because that is what a
 * monthly aggregation actually holds: passing a day would invite the caller to
 * pick one, and "the first of the month" is a fact about the formatter's input
 * rather than about the data. Anything that is not `YYYY-MM` → "—".
 */
export function formatMonth(bucket?: string | null): string {
  if (bucket == null || !/^\d{4}-\d{2}$/.test(bucket)) return EMPTY;
  // Midday UTC so the Jakarta (UTC+7) rendering cannot slip to the prior month.
  const d = new Date(`${bucket}-01T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return new Intl.DateTimeFormat(isID() ? 'id-ID' : 'en-GB', {
    timeZone: JAKARTA,
    month: 'short',
    year: 'numeric',
  }).format(d);
}

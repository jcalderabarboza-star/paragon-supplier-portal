// ────────────────────────────────────────────────────────────────────────────
// Locale formatting — single source of truth for currency / date / number
// display. id-ID conventions (Rp prefix, dot thousands); dates render in the
// Asia/Jakarta timezone so output is deterministic regardless of runner locale.
//
// Consolidation target: the ~127 inline formatting sites across pages-v2
// migrate onto these three functions opportunistically as Phase 1' touches
// each page. All three return an em dash for null/undefined/NaN/invalid input.
// ────────────────────────────────────────────────────────────────────────────

import i18n from './i18n';

const JAKARTA = 'Asia/Jakarta';
const EMPTY = '—';

const idID = new Intl.NumberFormat('id-ID');

// Active UI language, read from the i18n singleton (the SSoT). EN output stays
// byte-identical to the pre-i18n behaviour; only ID mode diverges.
function isID(): boolean {
  return i18n.language?.toLowerCase().startsWith('id') ?? false;
}

/** "1.234.567" (id-ID grouping). null/undefined/NaN → "—". */
export function formatNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return idID.format(value);
}

/**
 * Rupiah. Full: "Rp 1.250.000.000". Compact ({ compact: true }) auto-scales:
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
  return `Rp ${idID.format(value)}`;
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

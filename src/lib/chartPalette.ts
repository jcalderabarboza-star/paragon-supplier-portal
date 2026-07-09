// ────────────────────────────────────────────────────────────────────────────
// Chart palette (DP-2) — the single ordered series ramp for every chart/bar
// surface. One teal accent + navy, with tints and a neutral, so data viz reads
// as one system and never rainbows. Hex is synced to the Tailwind design tokens
// (tailwind.config.js): teal #0097A7, navy #0D1B2A, mid #354A5F.
//
// Recharts needs raw hex on stroke/fill props (Tailwind classes can't reach
// them), so these live here as constants — the single source of truth, mirroring
// lib/format.ts. Import CHART_SERIES (or seriesColor) and index by series order;
// use CHART_SEMANTIC ONLY where the colour encodes true state (DP-2: colour =
// meaning). Migrate per-page ad-hoc chart hex onto this opportunistically.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Ordered categorical ramp: teal → navy → teal-tint → navy-tint → neutral grey.
 * Series 0/1/3 clear ~3:1 contrast on white; the two lighter tints (2/4) should
 * carry a hairline border or a darker data label when used as large fills.
 */
export const CHART_SERIES = [
  '#0097A7', // teal — brand accent
  '#0D1B2A', // navy
  '#66C2CD', // teal-tint
  '#5C7186', // navy-tint / slate
  '#9BA8B5', // neutral grey
] as const;

/**
 * Brand mid / secondary-text hue (#354A5F, per the DP-2 token noted above).
 * Used on some chart axes and secondary series strokes; deliberately distinct
 * from the navy-tint series slot (CHART_SERIES[3]) and from CHART_AXIS.
 */
export const CHART_MID = '#354A5F';

/** Semantic state colours — use ONLY where the colour informs a decision. */
export const CHART_SEMANTIC = {
  success: '#107E3E',
  warning: '#B45309',
  danger: '#BB0000',
  neutral: '#6B7785',
} as const;

/**
 * Ordered good→bad state ramp for GRADE / health encodings (A→D, RAG-style).
 * Green (healthy) → muted green → amber (caution) → red (at-risk). Distinct
 * from CHART_SERIES (categorical accent) and CHART_SEMANTIC (discrete state):
 * this is the CONTINUOUS health ordering. Deliberately NO blue — blue reads as
 * a category, not a health level, which is what made grade bars look like a
 * rainbow. Use where a grade/score bar encodes true health state.
 */
export const SEMANTIC_STATE = {
  good: '#107E3E', // success — grade A (healthy)
  fair: '#5B9D6B', // muted green — grade B (positive, lower emphasis)
  caution: '#B45309', // warning — grade C
  poor: '#BB0000', // danger — grade D (at-risk)
} as const;

/** Grid / axis hairline on light surfaces. */
export const CHART_GRID = '#E5E9EE';

/** Axis tick / label text on light surfaces (mirrors the text-tertiary token). */
export const CHART_AXIS = '#6B7785';

/** Hover-cursor band fill behind bars/points (mirrors the bg-hover token). */
export const CHART_CURSOR = '#F4F6F8';

/** Pick a series colour by index, wrapping when there are more series than slots. */
export const seriesColor = (i: number): string =>
  CHART_SERIES[i % CHART_SERIES.length];

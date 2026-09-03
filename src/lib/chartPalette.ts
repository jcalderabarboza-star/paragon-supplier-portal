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

/**
 * BASE-MAP SUBSTRATE ramp (MAP-BASE-AXIS-01) — the geography a map is DRAWN ON,
 * deliberately distinct from CHART_SEMANTIC and SEMANTIC_STATE above.
 *
 * ⚠️ **THIS IS A SECOND AXIS, AND NAMING IT IS THE WHOLE POINT.** A risk map runs
 * two encodings at once: the STATE axis (dots + legend — critical / high / low /
 * hub, from CHART_SEMANTIC) and this SUBSTRATE axis (the landmasses under them).
 * They are not the same kind of thing: state informs a decision, substrate is
 * what the decision is plotted on.
 *
 * ⚠️ **PAINTING SUBSTRATE IN STATE COLOURS IS THE COLLISION THIS RAMP EXISTS TO
 * END.** Before this ramp, `BuyerRisk`'s highlighted landmass carried the stroke
 * `#B45309` — byte-identical to `CHART_SEMANTIC.warning`, which that same map's
 * legend labels "high risk", on the landmass drawn UNDER the high-risk dot. The
 * substrate was wearing the legend's own vocabulary, so a reader could not tell
 * emphasis from encoding. Same bytes, different axis, and only a name can say so.
 *
 * BYTE-PRESERVING: every value here is what the page already rendered. This ramp
 * renames, it does not restyle — no rendered colour moved when it landed.
 *
 * Distinct from CHART_CURSOR, which carries the same bytes as `land` but means
 * the hover band behind bars/points — an INTERACTION colour, not geography.
 */
export const MAP_BASE = {
  land: '#F4F6F8', // landmass fill — the neutral surface a map sits on
  landStroke: '#D1D8E0', // landmass hairline (mirrors the border-input token)
  highlight: '#FEF3D6', // emphasised landmass fill — attention, NOT a state
  highlightStroke: '#B45309', // emphasised landmass hairline
} as const;

/**
 * EDGE-PROVENANCE ink (EDGE-INK-AXIS-01) — what CAUSES a transition edge,
 * deliberately distinct from CHART_SEMANTIC (state), SEMANTIC_STATE (grade) and
 * MAP_BASE (substrate).
 *
 * ⚠️ **A FOURTH AXIS, AND IT ANSWERS A DIFFERENT QUESTION FROM THE OTHER THREE.**
 * State says how a thing IS; grade says how WELL; substrate says what it is drawn
 * ON. This says WHO OR WHAT MOVED IT — a person, the platform, a cascade across
 * documents, or the act that brought the entity into existence. A process diagram
 * needs that distinction and none of the other three can carry it.
 *
 * ⚠️ **COLOUR ONLY REINFORCES IT — THE DASH PATTERN CARRIES IT.** That is
 * `FlowDiagram`'s own rule, stated at `inkFor()`, and it is the same
 * colourblind-safe discipline as DP2-TARGET-01's bars (position vs tick, never
 * colour alone). Naming these does not promote colour to load-bearing; it stops
 * four values that already travel together from living as page-local hex.
 *
 * BYTE-PRESERVING: every value is what `FlowDiagram` already rendered.
 *
 * Each mirrors an existing token rather than inventing a hue — `operator` is the
 * brand mid, `system` the neutral/axis grey, `cross` the teal brand accent,
 * `birth` the DP2-DATA-NAVY-01 data hue. They are named here because the AXIS
 * has no home, not because the VALUES lacked one.
 */
export const EDGE_INK = {
  operator: '#354A5F', // a person acts (mirrors CHART_MID / the `mid` token)
  system: '#6B7785', // the platform acts (mirrors CHART_AXIS / text-tertiary)
  cross: '#0097A7', // cascade or settlement, crossing documents (teal accent)
  birth: '#1E3A5F', // a creation edge (mirrors the data-navy token)
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TARGET-STATUS system (DP2-TARGET-01) — the ONE standard for "meeting / near /
// missing target" on KPI/target bars, pass-warn-fail cells and progress meters.
// Before this, seven scattered systems drew the same idea (fixture hex, three
// duplicated GRADE_TONE maps, tailwind classes, StatusPill variants…). Now every
// target bar derives its colour from `targetStatus()` and renders a target-tick,
// so the encoding is colourblind-safe (position vs the tick, not colour alone).
//
// The "near" state consumes the DP2-WARN-01 amber split: bright #D97706 for the
// bar FILL / tick-adjacent graphic, dark #8A5606 for the value TEXT on light.
// meeting = success green, missing = danger red (both fine as fill AND text).
// ────────────────────────────────────────────────────────────────────────────

export type TargetStatus = 'meeting' | 'near' | 'missing';

/** Fill (graphical) + text (AA on light) colour per target state. */
export const TARGET_STATUS: Record<TargetStatus, { fill: string; text: string }> = {
  meeting: { fill: '#107E3E', text: '#107E3E' }, // success
  near: { fill: '#D97706', text: '#8A5606' }, // DP2-WARN-01 amber split
  missing: { fill: '#BB0000', text: '#BB0000' }, // danger
} as const;

/**
 * Attainment vs target on a shared 0–100 axis (pct = bar fill, target = tick).
 * `nearBand` is how far below target still counts as "near" (default 10, matching
 * the ≥90 meeting / ≥80 near thresholds the pass-warn-fail cells already used).
 */
export const targetStatus = (
  pct: number,
  target: number,
  nearBand = 10,
): TargetStatus => {
  if (pct >= target) return 'meeting';
  if (pct >= target - nearBand) return 'near';
  return 'missing';
};

/**
 * Identity / infrastructure marker on data surfaces (e.g. the buyer's own
 * DC / hub dots on the supplier risk map) — the design system's sanctioned
 * non-clickable identity blue (`action.muted` #2A6FBF, AA on white). Distinct
 * from a risk/health state: it marks "ours", not a severity. Replaces the stray
 * categorical blue (#1E5BAE) dropped from the grade dial in the palette census.
 */
export const CHART_IDENTITY = '#2A6FBF';

/** Grid / axis hairline on light surfaces. */
export const CHART_GRID = '#E5E9EE';

/** Axis tick / label text on light surfaces (mirrors the text-tertiary token). */
export const CHART_AXIS = '#6B7785';

/** Hover-cursor band fill behind bars/points (mirrors the bg-hover token). */
export const CHART_CURSOR = '#F4F6F8';

/** Pick a series colour by index, wrapping when there are more series than slots. */
export const seriesColor = (i: number): string =>
  CHART_SERIES[i % CHART_SERIES.length];

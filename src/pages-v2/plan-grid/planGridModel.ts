// ────────────────────────────────────────────────────────────────────────────
// planGridModel (Stage G · G1.2a) — the PURE model behind the plan grid.
//
// react-datasheet-grid RENDERS these values; it computes NONE of them. The
// award what-if is re-scored here in plain TS (formulas-OUT is the engine's
// natural state), and the C6 §2 overlay-never-merged invariant is expressed as
// a pure function: `buildWhatIfOverlay` returns an id-keyed map of PLANNED
// values that is never written back into the seam rows. Proven in
// planGridModel.test.ts.
//
// The C7 §2 `PrIntakeLine` sample is authored here too — the intake SHAPE both
// producers (internal Grid + SOMO) map onto. It is SAMPLE data behind the
// SIMULATED registry marker (`purchaseRequisitions`); nothing here dispatches
// (that is G1.2b).
// ────────────────────────────────────────────────────────────────────────────

import type { Quotation } from '../../data/mockQuotations';

// ── Award what-if ───────────────────────────────────────────────────────────

/** The four evaluation criteria the award composite re-weights. */
export type AwardCriterionKey = 'compliance' | 'price' | 'leadTime' | 'reliability';

/** The sub-score fields on a Quotation each criterion reads. */
type SubScoreField =
  | 'complianceScore'
  | 'priceScore'
  | 'leadTimeScore'
  | 'reliabilityScore';

export interface AwardCriterion {
  readonly key: AwardCriterionKey;
  readonly scoreField: SubScoreField;
  /** i18n key for the column header / weight label. */
  readonly labelKey: string;
}

export const AWARD_CRITERIA: readonly AwardCriterion[] = [
  { key: 'compliance', scoreField: 'complianceScore', labelKey: 'planGrid.criterion.compliance' },
  { key: 'price', scoreField: 'priceScore', labelKey: 'planGrid.criterion.price' },
  { key: 'leadTime', scoreField: 'leadTimeScore', labelKey: 'planGrid.criterion.leadTime' },
  { key: 'reliability', scoreField: 'reliabilityScore', labelKey: 'planGrid.criterion.reliability' },
];

export type WhatIfWeights = Record<AwardCriterionKey, number>;

/** The baseline weighting a user starts from and edits (the what-if input). */
export const DEFAULT_WEIGHTS: WhatIfWeights = {
  compliance: 30,
  price: 30,
  leadTime: 20,
  reliability: 20,
};

/** The four sub-scores a re-score reads (a subset of Quotation). */
export type SubScores = Pick<Quotation, SubScoreField>;

/**
 * The what-if composite: the weight-normalized mean of the four sub-scores,
 * rounded. PURE — this is the formulas-OUT recompute the grid renders in a
 * PLANNED column; the engine never runs it. A zero total weight is guarded to 0.
 */
export function whatIfScore(sub: SubScores, weights: WhatIfWeights): number {
  let weighted = 0;
  let total = 0;
  for (const { key, scoreField } of AWARD_CRITERIA) {
    const w = weights[key];
    weighted += sub[scoreField] * w;
    total += w;
  }
  return total === 0 ? 0 : Math.round(weighted / total);
}

/** One award-scenario row — the seam quotation projected read-only for the grid. */
export interface AwardScenarioRow extends SubScores {
  readonly id: string;
  readonly supplierId: string;
  /** The COMMITTED seam composite — never overwritten by the what-if overlay. */
  readonly aiCompositeScore: number;
  readonly aiRecommended: boolean;
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly leadTimeDays: number;
}

/** Project the seam quotations for one RFQ into read-only award rows. */
export function awardScenarioRows(
  quotations: readonly Quotation[],
  rfqId: string,
): AwardScenarioRow[] {
  return quotations
    .filter((q) => q.rfqId === rfqId)
    .map((q) => ({
      id: q.id,
      supplierId: q.supplierId,
      complianceScore: q.complianceScore,
      priceScore: q.priceScore,
      leadTimeScore: q.leadTimeScore,
      reliabilityScore: q.reliabilityScore,
      aiCompositeScore: q.aiCompositeScore,
      aiRecommended: q.aiRecommended,
      unitPrice: q.unitPrice,
      totalPrice: q.totalPrice,
      leadTimeDays: q.leadTimeDays,
    }));
}

/**
 * C6 §2 — build the PLANNED what-if overlay as an id-keyed map, SEPARATE from
 * the seam rows. It is never merged back: the caller renders `overlay[id]`
 * alongside `row.aiCompositeScore`, so a planned value is only ever reachable
 * by lookup — the inverse of the extraRfqs merge. This function does not mutate
 * its input.
 */
export function buildWhatIfOverlay(
  rows: readonly AwardScenarioRow[],
  weights: WhatIfWeights,
): Record<string, number> {
  const overlay: Record<string, number> = {};
  for (const r of rows) overlay[r.id] = whatIfScore(r, weights);
  return overlay;
}

// ── C7 §2 intake line (sample; two producers) ───────────────────────────────

/** The producer of an intake line (C7 §4 provenance). */
export type IntakeSource = 'INTERNAL_GRID' | 'SOMO';

/** The C6 plan-state axis (per row) — orthogonal to the registry source tier. */
export type IntakePlanState = 'PLANNED' | 'committed';

/**
 * The C7 §2 `PrIntakeLine` — one shape, two producers. SOMO-authored fields
 * (`suggestedSource` = lane, `segment`) are read-only + nullable for the
 * internal Grid producer. Quantity carries three values (§2.1):
 * suggested / accepted / wasAdjusted — the fact of human adjustment is the
 * audit signal, stored not derived-and-discarded.
 *
 * Liveness is NOT a field here — it is registry-derived (`purchaseRequisitions`
 * → SIMULATED). Plan-state IS a per-row field (the C6 overlay axis).
 */
export interface PrIntakeLine {
  readonly id: string;
  readonly material: string;
  /** SOMO-authored source/destination lane; null for an internal-Grid line. */
  readonly suggestedSource: string | null;
  /** SOMO-authored ABC-XYZ policy class; null for an internal-Grid line. */
  readonly segment: string | null;
  readonly suggestedQty: number;
  readonly acceptedQty: number;
  readonly wasAdjusted: boolean;
  readonly uom: string;
  readonly period: string;
  readonly estimatedValue: number;
  readonly source: IntakeSource;
  readonly planState: IntakePlanState;
}

// All lines are pre-commit PLANNED — 1.2a is READ-ONLY (no push exists yet, so
// nothing can be committed). SOMO lines carry lane + segment; internal-Grid
// lines omit them (null). `wasAdjusted` === (acceptedQty !== suggestedQty).
export const SAMPLE_INTAKE_LINES: readonly PrIntakeLine[] = [
  {
    id: 'pil-somo-001',
    material: 'Glycerin USP (Halal)',
    suggestedSource: 'Cikarang DC → Karawang Plant',
    segment: 'AX',
    suggestedQty: 12_000,
    acceptedQty: 12_000,
    wasAdjusted: false,
    uom: 'KG',
    period: '2026-Q3',
    estimatedValue: 534_000_000,
    source: 'SOMO',
    planState: 'PLANNED',
  },
  {
    id: 'pil-somo-002',
    material: 'Niacinamide USP',
    suggestedSource: 'Surabaya DC → Karawang Plant',
    segment: 'BY',
    suggestedQty: 5_000,
    acceptedQty: 4_500,
    wasAdjusted: true,
    uom: 'KG',
    period: '2026-08',
    estimatedValue: 990_000_000,
    source: 'SOMO',
    planState: 'PLANNED',
  },
  {
    id: 'pil-grid-001',
    material: 'PET Bottle 200ml',
    suggestedSource: null,
    segment: null,
    suggestedQty: 200_000,
    acceptedQty: 200_000,
    wasAdjusted: false,
    uom: 'PCS',
    period: '2026-08',
    estimatedValue: 256_000_000,
    source: 'INTERNAL_GRID',
    planState: 'PLANNED',
  },
  {
    id: 'pil-grid-002',
    material: 'Folding Carton',
    suggestedSource: null,
    segment: null,
    suggestedQty: 80_000,
    acceptedQty: 90_000,
    wasAdjusted: true,
    uom: 'PCS',
    period: '2026-Q3',
    estimatedValue: 81_000_000,
    source: 'INTERNAL_GRID',
    planState: 'PLANNED',
  },
];

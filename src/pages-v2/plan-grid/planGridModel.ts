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
import type { CommandDecision } from '../../services/data/types';

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

// ── C6-LOCK — the locked-override rule (G1.2b) ───────────────────────────────
// Accepted quantity is the SINGLE editable field on an intake line; every other
// value (material, lane, segment, estimated value, the what-if composite) is
// platform-authored and read-only. An override (accepted ≠ suggested) is a
// GOVERNED DECISION: it requires a reason before it can commit, and it commits
// ONLY by pushing (t_pr_create) — there is no "adjust" verb (§8). These pure
// helpers express the gate + the push payload + the decision provenance so the
// governance is headless-provable, independent of the (virtualized) grid.

/** True when the human accepted a quantity different from the suggested one. */
export function isQtyAdjusted(line: PrIntakeLine, acceptedQty: number): boolean {
  return acceptedQty !== line.suggestedQty;
}

/**
 * The reason-gate (C6-LOCK §8.3): an override MUST carry a non-empty reason
 * before it can commit. Returns true when the push is BLOCKED — i.e. the qty was
 * adjusted but no reason was given. Accept-as-suggested is never blocked (it is
 * not an override, so it needs no reason). This is the load-bearing guarantee:
 * `overrideBlocked` true ⇒ no dispatch.
 */
export function overrideBlocked(
  line: PrIntakeLine,
  acceptedQty: number,
  reason: string,
): boolean {
  return isQtyAdjusted(line, acceptedQty) && reason.trim() === '';
}

/**
 * The DR-10 decision provenance for a quantity override (C6-LOCK). Opaque audit
 * carrier — `from`/`to` are the suggested/accepted quantities; the dispatcher
 * forwards this verbatim onto the TransitionEvent, never interpreting it.
 */
export function buildQtyDecision(
  line: PrIntakeLine,
  acceptedQty: number,
  reason: string,
): CommandDecision {
  return {
    field: 'acceptedQty',
    from: line.suggestedQty,
    to: acceptedQty,
    reason: reason.trim(),
    wasAdjusted: isQtyAdjusted(line, acceptedQty),
  };
}

/**
 * The `t_pr_create` payload a pushed intake line dispatches. C7 §2.1: the
 * accepted qty maps to the required `quantity` field. C7 §2 GG-3: the planning
 * `period` maps to `requiredDate`. Producer `source` (C7 §4) rides through; a
 * genuine override also carries its `reason` in the payload (persisted-intent).
 */
export function buildPrCreatePayload(
  line: PrIntakeLine,
  acceptedQty: number,
  reason: string,
): Record<string, unknown> {
  return {
    material: line.material,
    quantity: acceptedQty,
    uom: line.uom,
    estimatedValue: line.estimatedValue,
    requiredDate: line.period,
    source: line.source,
    ...(isQtyAdjusted(line, acceptedQty) ? { reason: reason.trim() } : {}),
  };
}

/**
 * The per-row push state on the plain-DOM adjust-and-push panel. PLANNED until a
 * successful push flips it to committed (C6 §3 — the ONLY exit); a failure via
 * EITHER channel leaves it PLANNED with `failureReason` (C6 §6 invariant 3).
 */
export interface PushRowState {
  readonly planState: IntakePlanState;
  /** The store-assigned PR number, set only on a committed row. */
  readonly prNumber?: string;
  /** Set when a push left the row PLANNED (either failure channel). */
  readonly failureReason?: string;
}

export const PLANNED_ROW: PushRowState = { planState: 'PLANNED' };

/** A normalized dispatch outcome the panel folds into a row's push state. */
export type PushOutcome =
  | { readonly ok: true; readonly entityId: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Fold a push outcome into the row's plan-state (C6 §3 + §6 invariants 2-3):
 * push-only-exit (committed ONLY on ok) and both-failure-channels-stay-PLANNED
 * (a thrown DataError and a status:'failed' both arrive here as `ok:false` and
 * leave the row PLANNED with the reason attached).
 */
export function applyPushResult(outcome: PushOutcome): PushRowState {
  return outcome.ok
    ? { planState: 'committed', prNumber: outcome.entityId }
    : { planState: 'PLANNED', failureReason: outcome.reason };
}

// ── G1.3.2 — working-set selection ───────────────────────────────────────────
// At scale (2,500+ rows) the edit surface is a working-set drawer: the user
// selects ONE line in the virtualized intake DSG and the plain-DOM drawer edits
// exactly that line (the reason-gate never leaves plain DOM — headless-provable).
// This pure resolver is the selection contract: id → the line, or null when
// nothing (or a stale id) is selected. The drawer renders `selectedLine(...)`.

/** Resolve the selected working-set line, or null if none / the id is stale. */
export function selectedLine(
  lines: readonly PrIntakeLine[],
  selectedId: string | null,
): PrIntakeLine | null {
  if (selectedId === null) return null;
  return lines.find((l) => l.id === selectedId) ?? null;
}

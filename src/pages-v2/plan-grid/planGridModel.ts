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
import type {
  CommandDecisionInput,
  PrIntakeLine,
  IntakePlanState,
} from '../../services/data/types';
import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import type { BucketId } from '../../services/planning/bucket';
import type { PlanningFact } from '../../services/planning/facts';
import { measureOf, type MeasureId } from '../../services/planning/measures';
import { planningMaster } from '../../services/planning/somoFixture';
import { materialEntry, type MaterialType } from '../../services/sdc';

// C7 §2 — the intake line + plan-state axis are PROMOTED to the service seam
// (types.ts) at Phase A/1 and re-exported here so plan-grid consumers keep their
// existing imports unchanged. The intake SAMPLE data lives in the seam fixture
// (fixtures/prIntake.ts); SAMPLE_INTAKE_LINES aliases it — one source of truth.
export type { PrIntakeLine, IntakePlanState } from '../../services/data/types';

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
// The `PrIntakeLine` + `IntakePlanState` types are re-exported above from the
// service seam (types.ts). The sample rows are the seam fixture; SAMPLE_INTAKE_LINES
// aliases it so PlanGrid renders exactly the same rows without a seam repoint.

/** Alias of the promoted seam fixture — one source of truth for the intake rows. */
export const SAMPLE_INTAKE_LINES: readonly PrIntakeLine[] = PR_INTAKE_LINES;

// ── C6-LOCK — the locked-override rule (G1.2b) ───────────────────────────────
// Accepted quantity is the SINGLE editable field on an intake line; every other
// value (material, lane, segment, estimated value, the what-if composite) is
// platform-authored and read-only. An override (accepted ≠ suggested) is a
// GOVERNED DECISION: it requires a reason before it can commit, and it commits
// ONLY by pushing (t_pr_create) — there is no "adjust" verb (§8). These pure
// helpers express the gate + the push payload + the decision provenance so the
// governance is headless-provable, independent of the (virtualized) grid.

/**
 * True when the PLANNER moved the quantity — measured against the PRODUCER's
 * delivered `acceptedQty`, never against `suggestedQty`.
 *
 * ⚠️ **ONE OPERAND MOVED AND THAT IS THE WHOLE OF RULING A1-R2** (C6 §8.3
 * Amendment 1). It read `acceptedQty !== line.suggestedQty`, and the defect was
 * measured on the surface rather than reasoned about: `pil-somo-002` arrives
 * with 5,000 suggested against 4,500 accepted, so against `suggestedQty` that
 * line reads as an override — the drawer **demanded a planner's justification
 * for SOMO's own delta** before it would push, while Intake Review's *Accept*
 * on the same row pushed 5,000. One requirement, two quantities, and the path
 * that looked more governed was the one making a human account for an act they
 * did not commit.
 *
 * ⚠️ **THE GATE ITSELF IS UNCHANGED, WHICH IS THE PART NOT TO OVER-READ.**
 * `overrideBlocked` true ⇒ no dispatch stands exactly as written. A gate
 * comparing against the wrong baseline is not a weak gate; it is a correct gate
 * pointed at the wrong fact, and loosening it was never the remedy.
 *
 * The PRODUCER's own delta has its own name — `producerAdjusted`, in
 * `services/data/intakeLineProjection.ts` — because it is a different fact
 * about a different actor, and one function answering both is how they came to
 * be confused.
 */
export function isQtyAdjusted(line: PrIntakeLine, acceptedQty: number): boolean {
  return acceptedQty !== line.acceptedQty;
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
): CommandDecisionInput {
  return {
    field: 'acceptedQty',
    // The PRODUCER's delivered quantity (A1-R2). Derived at dispatch from a
    // `from` that still held the producer's *suggestion*, `wasAdjusted` would
    // faithfully compute the wrong fact — in the one place nobody can correct
    // afterwards. Deriving a value from the wrong operand is not safer than
    // authoring it; it is the same error with better provenance.
    from: line.acceptedQty,
    to: acceptedQty,
    reason: reason.trim(),
    // ⚠️ **NO `wasAdjusted`, AND IT IS THE TYPE THAT ENFORCES THAT** — the
    // return type is `CommandDecisionInput`, which has no such key (A1-R2a).
    // The dispatcher derives it, once, for every caller.
  };
}

// ⚠️ `buildPrCreatePayload` LIVED HERE AND NOW LIVES IN
// `pages-v2/requisitions/prCreatePayload.ts`, WITH THE TYPE IT RETURNS.
//
// It moved because it stopped being the plan grid's payload and became THE
// `t_pr_create` payload: the New PR form builds through the same module and the
// same interface, so an entrance that omits a required field is a `tsc` failure
// rather than a silent default at the target. Keeping the builder here while
// the type lived elsewhere would have been a split brain — one file deciding
// the shape, another deciding what the shape means.
//
// The C6-LOCK helpers above stay: they are about the GOVERNED DECISION (is this
// an override, does it carry a reason, what does the audit record), which is the
// plan grid's question and nobody else's. The payload is everybody's.

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

/**
 * Resolve the selected working-set line, or null if none / the id is stale.
 *
 * GENERIC over the row type rather than pinned to `PrIntakeLine` (A2): the grid
 * hands it `IntakeLine` now — the producer's record WITH its triage — and the
 * resolver's only claim is about the id. Narrowing it to the producer's shape
 * would force a cast at the one call site, and a cast is how a drawer comes to
 * read a different object from the one the grid rendered.
 */
export function selectedLine<T extends { readonly id: string }>(
  lines: readonly T[],
  selectedId: string | null,
): T | null {
  if (selectedId === null) return null;
  return lines.find((l) => l.id === selectedId) ?? null;
}

// ── B2 · the TIME-PHASED model (Design 1 §4.3, §7 — core only) ──────────────
//
// The planning facts arrive long-form (one number per material × supplier ×
// bucket × measure). This pivots them into what the grid shows — one BLOCK per
// material, one ROW per measure (a supplier sub-row per supplier for a
// supplier-grain measure), one CELL per bucket — and does the grid's sort,
// filter and exception ordering here, in pure TS, where a test can reach it.
// The engine renders; it decides nothing. That is the fallback §8 names for
// react-datasheet-grid: "model-layer sort/filter/totals".
//
// ⚠️ A MISSING FACT AND A NULL FACT BOTH RENDER "—", AND NEITHER IS A ZERO. The
// producer saying "no figure" and the producer saying nothing are both
// absences; a 0 is a claim (nothing can be supplied, nothing is short). The one
// place a cell becomes text is `planCellText`, and it is mutation-probed.

/** A row in the time-phased grid: one measure of one material (per supplier
 *  for a supplier-grain measure). */
export interface PlanRow {
  readonly id: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly materialType: MaterialType;
  readonly uom: string;
  readonly measureId: MeasureId;
  readonly supplierId: string | null;
  /** Bucket → value. A bucket absent here had no fact, which reads "—". */
  readonly cells: Readonly<Record<BucketId, number | null>>;
  /** Derived by this portal (a client-computed value) — carries its marker. */
  readonly derived: boolean;
  /** True on the first row of a material's block (where the aggregates sit). */
  readonly blockHead: boolean;
  /**
   * B3 · per bucket, the SEAM ROW a cell is anchored to — the fact's own
   * `sourceRef` — for an EDITABLE measure only. An overlay entry keys on this
   * (C6 §1: a planned value cannot exist without a seam row to anchor to).
   */
  readonly seamRefs?: Readonly<Record<BucketId, string>>;
  /** B3 · per bucket, whether the seam holds the figure as COMMITTED. */
  readonly committedCells?: Readonly<Record<BucketId, boolean>>;
}

/** The horizon aggregates (Design 1 §4.2 `agg:*`), all DERIVED. */
export interface PlanAggregates {
  readonly demand: number | null;
  readonly confirmed: number | null;
  readonly deficit: number | null;
  readonly firstShortBucket: BucketId | null;
}

/** Why a block is an exception. Any one is enough. */
export interface PlanExceptions {
  /** Σ shortfall over the horizon is > 0. */
  readonly shortfall: boolean;
  /** A supplier was allocated a quantity in a bucket and has not confirmed it. */
  readonly awaiting: boolean;
  /** A supplier's answer was given against a plan version that has since moved. */
  readonly stale: boolean;
}

export interface PlanBlock {
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly materialType: MaterialType;
  readonly uom: string;
  readonly rows: readonly PlanRow[];
  readonly agg: PlanAggregates;
  readonly exceptions: PlanExceptions;
}

/** The exception rule — ONE predicate, mutation-probed. */
export const isPlanException = (e: PlanExceptions): boolean => e.shortfall || e.awaiting || e.stale;

/** The null rule — the ONE place a planning value becomes text. */
export function planCellText(value: number | null | undefined, format: (n: number) => string): string {
  return value === null || value === undefined ? '—' : format(value);
}

/**
 * B3 · is this CELL editable? THE REGISTRY DECIDES, NOT THE PAGE: the measure
 * must declare an edit spec, the row must be a material row (the spec is a
 * material-grain act), and the seam must have delivered a row to anchor to.
 */
export function isEditableCell(row: PlanRow, bucket: BucketId): boolean {
  return measureOf(row.measureId).editable !== false && row.supplierId === null && !!row.seamRefs?.[bucket];
}

/** `supplier|material|bucket` — the key a stale answer is reported by. */
export const staleKey = (supplierId: string, materialCode: string, bucket: BucketId): string =>
  `${supplierId}|${materialCode}|${bucket}`;

const sumOrNull = (values: readonly (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
};

/**
 * Pivot facts into blocks.
 *
 * `measuresShown` arrives ALREADY free of SPEC measures (`visibleMeasures.ts`).
 * ⚠️ The filter is not done here, deliberately: this module is imported by the
 * intake fixture on the SERVICE side, and the liveness registry reads the wired
 * target census from `MockCommandService` — so importing the registry here
 * closed an import cycle in which the registry built its wired set from an
 * uninitialised export and every LIVE capability read SIMULATED (measured: 18
 * specs across the widgets and the registry went red). The model stays pure.
 */
export function buildPlanBlocks(
  facts: readonly PlanningFact[],
  horizon: readonly BucketId[],
  measuresShown: readonly MeasureId[],
  staleKeys: ReadonlySet<string> = new Set(),
): readonly PlanBlock[] {
  const shown = measuresShown;
  const shownSet = new Set<MeasureId>(shown);
  const inHorizon = new Set(horizon);
  const master = planningMaster();

  // material → measure → supplier('' = material grain) → bucket → value
  const byMaterial = new Map<string, Map<MeasureId, Map<string, Map<BucketId, number | null>>>>();
  // B3 · editable measures only: `material|measure|bucket` → the seam row.
  const refs = new Map<string, { ref: string; committed: boolean }>();
  for (const f of facts) {
    if (!shownSet.has(f.measureId) || !inHorizon.has(f.periodBucket)) continue;
    const mats = byMaterial.get(f.materialCode) ?? new Map();
    byMaterial.set(f.materialCode, mats);
    const sups = mats.get(f.measureId) ?? new Map();
    mats.set(f.measureId, sups);
    const cells = sups.get(f.supplierId ?? '') ?? new Map();
    sups.set(f.supplierId ?? '', cells);
    cells.set(f.periodBucket, f.value);
    if (f.supplierId === null && measureOf(f.measureId).editable !== false) {
      refs.set(`${f.materialCode}|${f.measureId}|${f.periodBucket}`, {
        ref: f.sourceRef,
        committed: f.provenance.planState === 'committed',
      });
    }
  }

  const blocks: PlanBlock[] = [];
  for (const [materialCode, mats] of byMaterial) {
    const entry = materialEntry(materialCode, master);
    if (!entry) continue; // D-OPS-MASTERMISS: a code the master cannot name is not rendered
    const rows: PlanRow[] = [];
    for (const measureId of shown) {
      const sups = mats.get(measureId);
      if (!sups) continue;
      const spec = measureOf(measureId);
      for (const supplierKey of [...sups.keys()].sort()) {
        const cells = sups.get(supplierKey)!;
        const anchored =
          spec.editable !== false && supplierKey === ''
            ? horizon.flatMap((b) => {
                const r = refs.get(`${materialCode}|${measureId}|${b}`);
                return r ? [[b, r] as const] : [];
              })
            : [];
        rows.push({
          id: `${materialCode}|${measureId}|${supplierKey || '-'}`,
          materialCode,
          materialLabel: entry.label,
          materialType: entry.materialType,
          uom: entry.canonicalUom,
          measureId,
          supplierId: supplierKey || null,
          cells: Object.fromEntries(horizon.map((b) => [b, cells.has(b) ? cells.get(b)! : null])),
          derived: spec.derivation === 'derived',
          blockHead: rows.length === 0,
          ...(anchored.length > 0
            ? {
                seamRefs: Object.fromEntries(anchored.map(([b, r]) => [b, r.ref])),
                committedCells: Object.fromEntries(anchored.map(([b, r]) => [b, r.committed])),
              }
            : {}),
        });
      }
    }
    if (rows.length === 0) continue;

    const rowsOf = (m: MeasureId) => rows.filter((r) => r.measureId === m);
    const all = (m: MeasureId) => rowsOf(m).flatMap((r) => horizon.map((b) => r.cells[b]));
    const firstShort =
      horizon.find((b) => rowsOf('confirmedDeficit').some((r) => (r.cells[b] ?? 0) > 0)) ?? null;
    const deficit = sumOrNull(all('confirmedDeficit'));

    const awaiting = rowsOf('allocation').some((a) =>
      horizon.some((b) => {
        const allocated = a.cells[b];
        if (allocated === null || allocated <= 0) return false;
        const conf = rowsOf('confirmed').find((c) => c.supplierId === a.supplierId);
        return !conf || conf.cells[b] === null;
      }),
    );
    const stale = rows.some(
      (r) => r.supplierId !== null && horizon.some((b) => staleKeys.has(staleKey(r.supplierId!, materialCode, b))),
    );

    blocks.push({
      materialCode,
      materialLabel: entry.label,
      materialType: entry.materialType,
      uom: entry.canonicalUom,
      rows,
      agg: {
        demand: sumOrNull(all('demand')),
        confirmed: sumOrNull(all('confirmed')),
        deficit,
        firstShortBucket: firstShort,
      },
      exceptions: { shortfall: (deficit ?? 0) > 0, awaiting, stale },
    });
  }
  return blocks;
}

export type PlanSortColumn =
  | 'materialCode'
  | 'materialLabel'
  | 'materialType'
  | 'uom'
  | 'agg:demand'
  | 'agg:confirmed'
  | 'agg:deficit'
  | 'agg:firstShortBucket';

/** Every column the model can sort by — the ids, which are the B1 registry's.
 *  Not a render site: labels come from the registry at render. */
export const PLAN_SORT_COLUMNS: readonly PlanSortColumn[] = [
  'materialCode',
  'materialLabel',
  'materialType',
  'uom',
  'agg:demand',
  'agg:confirmed',
  'agg:deficit',
  'agg:firstShortBucket',
];

export interface PlanSort {
  readonly colId: PlanSortColumn;
  readonly dir: 'asc' | 'desc';
}

export interface PlanFilter {
  /** RM = ROH, PM = VERP. */
  readonly materialType: 'all' | MaterialType;
  /** Case-insensitive, on material code or description. */
  readonly search: string;
  readonly exceptionsOnly: boolean;
}

export const DEFAULT_PLAN_FILTER: PlanFilter = { materialType: 'all', search: '', exceptionsOnly: false };
export const DEFAULT_PLAN_SORT: PlanSort = { colId: 'materialCode', dir: 'asc' };

const sortValue = (b: PlanBlock, col: PlanSortColumn): string | number | null => {
  switch (col) {
    case 'materialCode': return b.materialCode;
    case 'materialLabel': return b.materialLabel;
    case 'materialType': return b.materialType;
    case 'uom': return b.uom;
    case 'agg:demand': return b.agg.demand;
    case 'agg:confirmed': return b.agg.confirmed;
    case 'agg:deficit': return b.agg.deficit;
    case 'agg:firstShortBucket': return b.agg.firstShortBucket;
  }
};

/** Compare with NULLS LAST in both directions — an absent figure never sorts
 *  as the smallest or the largest; it sorts as "not known". */
const cmp = (x: string | number | null, y: string | number | null, dir: 1 | -1): number => {
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
  return String(x).localeCompare(String(y)) * dir;
};

/**
 * Filter then order. With "exceptions only" ON, the order is the exception
 * order — first short bucket (earliest first), then shortfall (largest first),
 * then code — whatever sort was chosen: an exception list is read by urgency.
 */
export function applyPlanView(
  blocks: readonly PlanBlock[],
  filter: PlanFilter,
  sort: PlanSort,
): readonly PlanBlock[] {
  const q = filter.search.trim().toLowerCase();
  const kept = blocks.filter(
    (b) =>
      (filter.materialType === 'all' || b.materialType === filter.materialType) &&
      (q === '' || b.materialCode.toLowerCase().includes(q) || b.materialLabel.toLowerCase().includes(q)) &&
      (!filter.exceptionsOnly || isPlanException(b.exceptions)),
  );
  const byCode = (a: PlanBlock, b: PlanBlock) => a.materialCode.localeCompare(b.materialCode);
  if (filter.exceptionsOnly) {
    return [...kept].sort(
      (a, b) =>
        cmp(a.agg.firstShortBucket, b.agg.firstShortBucket, 1) ||
        cmp(a.agg.deficit, b.agg.deficit, -1) ||
        byCode(a, b),
    );
  }
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...kept].sort((a, b) => cmp(sortValue(a, sort.colId), sortValue(b, sort.colId), dir) || byCode(a, b));
}

/** The rows the grid renders, in block order. */
export const flattenPlanRows = (blocks: readonly PlanBlock[]): readonly PlanRow[] =>
  blocks.flatMap((b) => b.rows);

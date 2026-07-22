// ─────────────────────────────────────────────────────────────────────────────
// SDC-5b — the UNIFIED chase MODEL (types + severity helpers; headless).
//
// The target shape for how the TWO chase families compose into ONE per-supplier
// view. This batch defines the TYPE and the severity roll-up rule ONLY — it does
// NOT build the reduction that groups the raw families into these views (that is
// 5c, where the two-grain bind gets proven in isolation). 5b gives 5c something
// to reduce INTO.
//
// ── THE TWO FAMILIES, AT DIFFERENT GRAINS ────────────────────────────────────
//   · DATA chase (sdc `chaseList` → `ChaseEntry`): keyed on supplierId ONLY —
//     'overdue' | 'partial-response', about forecast-response staleness.
//   · COMMITMENT chase (5a `deriveDeliveryChase` → `DeliveryChaseEntry`): per
//     supplier+agreement+item+release — nudge/alert/drift × firm/semi-firm.
//
//   The tension: data is supplier-keyed, commitment is per-release. The unified
//   view presents a supplier ONCE, carrying BOTH families WITHOUT flattening
//   either — the data reasons stay a plain list (no releaseSeq to invent), the
//   commitment entries stay at their own grain (many per supplier). They coexist
//   as two sibling arrays under one supplier key, never merged into one row type.
//
// ── ACYCLIC ───────────────────────────────────────────────────────────────────
//   `chase` may import the `ChaseReason` TYPE from sdc and `DeliveryChaseEntry`
//   from 5a. `sdc` still imports neither `delivery` nor `chase`; `delivery`
//   imports neither. The composition lives here, one level up. Type-only sdc
//   import — no runtime dependency on the sdc barrel.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChaseReason } from '../sdc/consolidation';
import type { DeliveryChaseEntry } from './deliveryChase';

// ─── Severity ordering (the shared vocabulary 5c reducer + 5d surface reuse) ──

/**
 * The rolled-up chase severity for a supplier. Extends the delivery entry's
 * `'hard' | 'soft'` with `'none'` — a supplier can appear in a reduction pass with
 * zero live reasons (e.g. filtered to empty) and must roll up to a real 'none',
 * never an absent value.
 */
export type ChaseSeverityLevel = 'hard' | 'soft' | 'none';

const SEVERITY_ORDER: Record<ChaseSeverityLevel, number> = { hard: 2, soft: 1, none: 0 };

/**
 * The worse of two severities (hard > soft > none). Commutative and stable — the
 * fold primitive `severityOf` and the 5c/5d roll-ups build on. Ties return the
 * (equal) left value, so it is a well-defined max over the order.
 */
export function worstSeverity(a: ChaseSeverityLevel, b: ChaseSeverityLevel): ChaseSeverityLevel {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

/**
 * The severity of a DATA-staleness reason. A forecast non-response is ADVISORY —
 * a nudge to reply, not a firm-commitment breach — so it rolls up SOFT, never
 * hard. (The call: a hard escalation is reserved for a failed *signed* delivery
 * commitment; a late forecast reply, however overdue, is not one.) A firm (JIT)
 * commitment miss therefore always dominates a data reason in the roll-up.
 */
export const DATA_CHASE_SEVERITY: ChaseSeverityLevel = 'soft';

// ─── The unified per-supplier view ────────────────────────────────────────────

/**
 * ONE entry per supplier — the target the 5c reducer produces and the 5d surface
 * renders. Both families are carried as sibling arrays (either may be empty);
 * neither is flattened into the other. `overallSeverity` + `chaseCount` are
 * DERIVED (see `makeSupplierChaseView` / `severityOf`), never hand-set — a view
 * built through the constructor is always internally consistent.
 */
export interface SupplierChaseView {
  readonly supplierId: string;
  /** From the sdc data chase (supplier-keyed). May be empty. */
  readonly dataReasons: readonly ChaseReason[];
  /** From the 5a delivery commitment chase (per-release grain). May be empty. */
  readonly commitmentEntries: readonly DeliveryChaseEntry[];
  /** Worst severity across BOTH families (see `severityOf`). */
  readonly overallSeverity: ChaseSeverityLevel;
  /** Total live reasons: data reasons + commitment entries. */
  readonly chaseCount: number;
}

/**
 * The severity roll-up RULE (pure; the 5c reducer reduces INTO it):
 *   hard   — ANY commitment entry is hard (a firm miss dominates everything);
 *   soft   — else any soft commitment entry OR any data reason;
 *   none   — else (no live reason in either family).
 * Takes the structural parts, so it works on a full view or a partial during
 * construction (no chicken-and-egg with `overallSeverity`).
 */
export function severityOf(
  view: Pick<SupplierChaseView, 'dataReasons' | 'commitmentEntries'>,
): ChaseSeverityLevel {
  let acc: ChaseSeverityLevel = 'none';
  for (const entry of view.commitmentEntries) acc = worstSeverity(acc, entry.severity);
  if (view.dataReasons.length > 0) acc = worstSeverity(acc, DATA_CHASE_SEVERITY);
  return acc;
}

/**
 * Construct ONE supplier's unified view from its already-split families, deriving
 * `overallSeverity` + `chaseCount` so they can never drift from the arrays.
 *
 * This is a per-supplier CONSTRUCTOR, NOT the reducer: it does not take the two
 * mixed families and GROUP them by supplier — that grouping (the two-grain bind)
 * is 5c. Provided here so 5c has a consistent way to mint each view.
 */
export function makeSupplierChaseView(
  supplierId: string,
  dataReasons: readonly ChaseReason[],
  commitmentEntries: readonly DeliveryChaseEntry[],
): SupplierChaseView {
  return {
    supplierId,
    dataReasons,
    commitmentEntries,
    overallSeverity: severityOf({ dataReasons, commitmentEntries }),
    chaseCount: dataReasons.length + commitmentEntries.length,
  };
}

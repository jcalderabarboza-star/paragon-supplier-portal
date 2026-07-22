// ─────────────────────────────────────────────────────────────────────────────
// SDC-5c — the two-grain REDUCER (headless, pure).
//
// The step that binds the two chase families into `SupplierChaseView[]`. This is
// the risk-concentration point both consultants flagged — the join of a
// supplier-keyed family (sdc data chase) with a per-release family (delivery
// commitment chase) — so it is kept ISOLATED and PURE and proven alone.
//
// ── RESULTS-IN, JUST REDUCE (ratified) ───────────────────────────────────────
//   Takes the two ALREADY-DERIVED result arrays and only groups + composes. It
//   does NOT take publications/rows/agreements, does NOT re-derive, and imports
//   NEITHER sdc consolidation logic NOR delivery fulfillment logic — only the two
//   entry TYPES (`ChaseEntry`, `DeliveryChaseEntry`) + the 5b composition helpers.
//   Zero subsystem coupling. The wiring (call both source fns, pass results here)
//   is 5d's job, not this module's.
//
// ── ACYCLIC ───────────────────────────────────────────────────────────────────
//   `chase` reads the `ChaseEntry` TYPE from sdc (type-only) + `DeliveryChaseEntry`
//   from 5a. `sdc` imports neither `delivery` nor `chase`; `delivery` imports
//   neither. Held.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChaseEntry, ChaseReason } from '../sdc/consolidation';
import type { DeliveryChaseEntry } from './deliveryChase';
import {
  makeSupplierChaseView,
  worstSeverity,
  type ChaseSeverityLevel,
  type SupplierChaseView,
} from './unifiedChase';

/** Group a family's rows by supplierId, preserving input order within a supplier. */
function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = out.get(key);
    if (list) list.push(row);
    else out.set(key, [row]);
  }
  return out;
}

/** Worst-first comparator over the 5b severity ordering (hard > soft > none),
 *  derived from `worstSeverity` so the two never diverge. */
function bySeverityWorstFirst(a: ChaseSeverityLevel, b: ChaseSeverityLevel): number {
  if (a === b) return 0;
  return worstSeverity(a, b) === a ? -1 : 1;
}

/**
 * Reduce the two chase families into ONE `SupplierChaseView` per supplier. PURE —
 * result arrays in, views out, zero mutation, no clock read (the source arrays are
 * already time-derived; `now` is not needed here, so none is taken).
 *
 *   · dataReasons — every `ChaseEntry.reason` for the supplier (chaseList emits one
 *     entry per supplier today, but ALL reasons are collected, so a future
 *     multi-reason emit composes without change).
 *   · commitmentEntries — every `DeliveryChaseEntry` for the supplier.
 *
 * UNION KEY SET: suppliers reachable from EITHER family (data-only, commitment-only,
 * or both). A supplier absent from both never appears — no phantom zero-zero view.
 *
 * DETERMINISTIC: the union has no guaranteed iteration order, so the output is
 * SORTED explicitly — worst `overallSeverity` first, then `chaseCount` desc, then
 * `supplierId` asc for stability. Never relies on Map/Set insertion order.
 */
export function deriveUnifiedChase(
  dataEntries: readonly ChaseEntry[],
  commitmentEntries: readonly DeliveryChaseEntry[],
): readonly SupplierChaseView[] {
  const dataBySupplier = groupBy(dataEntries, (e) => e.supplierId);
  const commitBySupplier = groupBy(commitmentEntries, (e) => e.supplierId);

  // Union of suppliers with ≥1 entry in either family (no phantom views).
  const supplierIds = new Set<string>([...dataBySupplier.keys(), ...commitBySupplier.keys()]);

  const views: SupplierChaseView[] = [];
  for (const supplierId of supplierIds) {
    const reasons: readonly ChaseReason[] = (dataBySupplier.get(supplierId) ?? []).map((e) => e.reason);
    const commitments: readonly DeliveryChaseEntry[] = commitBySupplier.get(supplierId) ?? [];
    // severity + chaseCount come from 5b's helpers — never recomputed here.
    views.push(makeSupplierChaseView(supplierId, reasons, commitments));
  }

  return views.sort(
    (a, b) =>
      bySeverityWorstFirst(a.overallSeverity, b.overallSeverity) ||
      b.chaseCount - a.chaseCount ||
      a.supplierId.localeCompare(b.supplierId),
  );
}

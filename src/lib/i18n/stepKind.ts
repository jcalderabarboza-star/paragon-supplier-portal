// ─────────────────────────────────────────────────────────────────────────────
// STEP-KIND → i18n KEY. The ONE map, and the reason it is a map (§52).
//
// Before this batch the StepKind→key mapping was INLINED AT THREE RENDER SITES
// (the table badge, the diagram legend, the lifecycle walk) as nested ternaries
// with `system` as the fall-through `else`. That shape has one property that
// matters here: **adding a fourth kind is not a compile error — it is a silent
// mislabel.** Every new member falls into whatever the last `else` returns, on
// every surface, in both locales, and nothing goes red.
//
// A `Record<StepKind, string>` inverts that. The union gains a member and
// `tsc` fails at THIS FILE until the key exists — which is the only reason the
// walk's two-valued fold (`operator || creation`, everything else "system") was
// found at all: it never type-checked against the union it was reading.
// ─────────────────────────────────────────────────────────────────────────────

import type { StepKind } from '../../services/transitions/catalogView';
import type { TransitionDef } from '../../services/transitions/schema';

/**
 * ⚠️ **EXHAUSTIVE BY TYPE, NOT BY DILIGENCE.** Do not widen this to
 * `Partial<Record<…>>` and do not add a default — both restore the silent
 * fall-through this map exists to remove.
 */
export const STEP_KIND_KEY: Record<StepKind, string> = {
  'operator-action': 'processFlows.step.operator',
  'system-driven': 'processFlows.step.system',
  'unsurfaced-act': 'processFlows.step.unsurfaced',
  creation: 'processFlows.step.creation',
};

/**
 * Whether a reader can PERFORM this step at a Paragon surface — the SURFACE
 * axis, read from the field that answers it.
 *
 * ⚠️ **IT TAKES A `TransitionDef`, NOT A `StepKind`, AND THAT IS THE FIX.** The
 * lifecycle walk asked `kind === 'operator-action' || kind === 'creation'` and
 * used the answer to choose between "Advance" and "Observe". `creation` is the
 * STRUCTURAL axis — it says an entity is born here, not that anybody here is
 * the one who bore it — so `t_po_issue` (a PO raised in S/4HANA and received as
 * a fact) and `t_shipment_create` (a TMS record) were both offered as steps the
 * reader ADVANCES. A `StepKind` cannot answer this question for a creation verb
 * without collapsing the two axes back together, so it is not asked to.
 */
export function isPerformable(def: TransitionDef): boolean {
  return def.surfaceable.surfaced;
}

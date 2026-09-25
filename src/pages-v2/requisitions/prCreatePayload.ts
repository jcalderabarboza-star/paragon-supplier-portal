// ────────────────────────────────────────────────────────────────────────────
// THE ONE `t_pr_create` PAYLOAD — one type, every entrance, no silent default.
//
// ── ⚠️ WHAT THIS CLOSES, MEASURED BEFORE IT WAS BUILT ──────────────────────
//   `t_pr_create` has FOUR entrances (derived, never listed: callers of
//   `usePurchaseRequisitionCreate` plus the seed's direct dispatch). Until this
//   module, `PrCreateVars.payload` was `Record<string, unknown>`, the verb's
//   `requiredFields` was only `['material','quantity']`, and the target read the
//   union of twelve keys — so **each entrance's absences became silent
//   defaults**: `str()` → `''`, `num()` → `0`, `priority` → `'Medium'`.
//
//   Measured field sets at the time:
//
//     plan grid          { material quantity uom estimatedValue requiredDate source reason? }
//     BuyerRequisitions  { material quantity uom requiredDate costCenter priority justification }
//
//   So a `BuyerRequisitions`-raised PR stored **`estimatedValue: 0`** and every
//   plan-grid-raised PR stored **`priority: 'Medium'`** — two values nobody
//   supplied, indistinguishable on screen from values somebody did. Reproduced
//   in the browser before the fix: the PR list and the detail drawer both read
//   **"Rp 0"**, in EN and in ID, two rows above a PR showing a real "Rp 96.0jt".
//
//   ⚠️ **AND THE FORM MAKES IT UNAVOIDABLE, WHICH IS THE PART A FIELD-SET TABLE
//   DOES NOT SHOW.** The New PR form has no estimated-value input at all — its
//   three steps are material/quantity, timing/cost-centre, justification. So
//   raising a PR without a value is not a path a careless person takes; it is
//   the only path that surface has.
//
// ── ⚠️ THE RULE, AND IT IS ALREADY THIS TREE'S RULE ONE ENTITY OVER ────────
//   `sourcing/rfqCreateModel.ts` ruled the identical question for `RFQ`:
//
//     · estimatedValue — OPTIONAL. A blank is the field's own documented
//       answer ("not specified") and resolves to an ABSENCE the payload omits,
//       never a fabricated Rp 0. The `readMoq` precedent, on the buyer's side.
//
//   `RFQ.estimatedValue` has been `?: number` ever since, and `BuyerSourcing`
//   renders a dash for `undefined`. This is that ruling applied to the entity it
//   was always about — **a budget of nothing is a different claim from no budget
//   at all** — and it costs no formatter work, because `formatIDR` already
//   answers `undefined` with `'—'`.
//
//   ⚠️ **A TYPED ZERO IS PRESERVED AND IS NOT THE DEFECT.** Someone who states
//   a value of zero has said something; the point is that EMPTINESS may never be
//   mistaken for it.
//
// ── ⚠️ PRIORITY IS THE SAME CLASS, AND ITS CONSUMERS WERE MEASURED FIRST ───
//   A default is only safe to remove once you know nothing depends on it.
//   Derived before this change: `PurchaseRequisition.priority` has **exactly one
//   consumer in the tree — a render**, the detail drawer's Priority row. No
//   sort, no approval route, no comparison reads it. (`SupplierPerformance`'s
//   `item.priority` is a different type on an improvement-plan item.) So the
//   absence costs nothing but an honest label, and the drawer now says
//   "Not set" the way it already says "Not assigned" for an unset approval band.
//
// ── ⚠️ THE TYPE IS WHAT ENFORCES THIS, NOT THIS COMMENT ────────────────────
//   `PrCreatePayload` is an INTERFACE, so an entrance omitting a REQUIRED field
//   fails `tsc` — which a `Record<string, unknown>` never could. And the
//   interface cannot drift from the verb: `prCreatePayload.test.ts` pins its
//   required keys EQUAL to `t_pr_create`'s `requiredFields`, derived through the
//   TypeScript compiler API, in BOTH directions. That is the
//   `MaterialRequestSubmitPayload` precedent, copied rather than re-invented.
//
//   ⚠️ **`requiredFields` IS UNCHANGED AND MUST STAY `['material','quantity']`.**
//   Adding `estimatedValue` there would refuse the New PR form outright, which
//   is the opposite of the fix: the field is not required, it is HONEST ABOUT
//   BEING ABSENT.
//
// ── AND IT IS A BUILDER, NOT A VALIDATOR ───────────────────────────────────
//   Quantity parsing, the C6-LOCK reason gate and the role gate all live where
//   they already lived. This assembles a payload from values that have already
//   been decided, and its only opinion is that an absence stays absent.
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine, PRPriority } from '../../services/data/types';
import { isQtyAdjusted } from '../plan-grid/planGridModel';

/**
 * The `t_pr_create` payload. **Required keys are EXACTLY the verb's
 * `requiredFields`** — pinned bilaterally through the compiler API, so the two
 * cannot drift.
 *
 * Every other key is OPTIONAL, and optional here means *"omit it and the
 * document records that nobody said"*, never *"omit it and the target invents
 * one"*.
 */
export interface PrCreatePayload {
  /** C7 §2.1 · required. A display string, NOT an S/4 code — GG-4 is open. */
  readonly material: string;
  /** C7 §2.1 · required. The intake's accepted qty maps here. */
  readonly quantity: number;

  readonly uom?: string;
  readonly category?: string;
  /** C7 §2 GG-3 — the planning `period` maps here today. */
  readonly requiredDate?: string;
  /**
   * ⚠️ OMITTED WHEN NOBODY SAID. Never `0`. See the header: a budget of
   * nothing is a different claim from no budget at all.
   */
  readonly estimatedValue?: number;
  readonly requestor?: string;
  readonly costCenter?: string;
  /** ⚠️ OMITTED WHEN NOBODY CHOSE. Never `'Medium'`. */
  readonly priority?: PRPriority;
  readonly justification?: string;
  /** C7 §4 producer mark. Already honest about absence before this batch. */
  readonly source?: PrIntakeLine['source'];
  /** C6-LOCK persisted intent, present only on a genuine quantity override. */
  readonly reason?: string;
}

/**
 * The payload a pushed intake line dispatches (plan grid · Intake Review).
 *
 * Unchanged in behaviour — it always supplied `estimatedValue` and `source` and
 * still does. What changed is the TYPE it returns and the fact that the fields
 * it does not supply (`costCenter`, `priority`, `justification`, `requestor`,
 * `category`) are now absences the target records as absences.
 */
export function buildPrCreatePayload(
  line: PrIntakeLine,
  acceptedQty: number,
  reason: string,
): PrCreatePayload {
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

/** What the New PR form has collected by the time it is allowed to submit. */
export interface NewPrForm {
  readonly material: string;
  readonly uom: string;
  readonly date: string;
  readonly costCenter: string;
  readonly priority: string;
  readonly justification: string;
}

/**
 * The payload the New PR form dispatches.
 *
 * ⚠️ **THE QUANTITY ARRIVES ALREADY PARSED.** The surface refuses an unreadable
 * quantity before anything reaches here (`parsedQty.ok`), so this takes a
 * number rather than re-parsing a string — a builder that validated would be a
 * second opinion about a rule that already has one.
 *
 * ⚠️ **AND `estimatedValue` IS NOT A PARAMETER, BECAUSE THE FORM HAS NO SUCH
 * FIELD.** Omitting it is the honest statement, and the type is what makes the
 * omission legal instead of accidental.
 *
 * `priority` is narrowed to `PRPriority` or dropped: the form's `<select>` is
 * typed `string`, and a value outside the union is not a priority nobody chose
 * — it is a value this document will not carry.
 */
export function buildNewPrPayload(form: NewPrForm, quantity: number): PrCreatePayload {
  return {
    material: form.material,
    quantity,
    uom: form.uom,
    requiredDate: form.date,
    costCenter: form.costCenter,
    ...(isPriority(form.priority) ? { priority: form.priority } : {}),
    justification: form.justification,
  };
}

/** The `PRPriority` membership test, so a widening of the union reaches here. */
export function isPriority(value: string): value is PRPriority {
  return value === 'High' || value === 'Medium' || value === 'Low';
}

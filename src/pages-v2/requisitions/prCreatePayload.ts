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
import type { BucketId } from '../../services/planning/bucket';
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
  /**
   * A required DATE, and only ever a date.
   *
   * ⚠️ **THE PLANNING BUCKET USED TO MAP HERE AND NO LONGER DOES** (A1-R1,
   * written at A2). It is `periodBucket`, below. A required date is a
   * commitment to a day; a bucket is a grain; one field could not be both, and
   * the one that lost was the reader's — `'2026-09'` rendered as
   * `01 Sept 2026`, a day nobody entered.
   */
  readonly requiredDate?: string;
  /** The intake line this requisition is being committed FROM (A1-R3). */
  readonly intakeLineId?: string;
  /** The planning bucket the requirement sits in — month or ISO week (A1-R1). */
  readonly periodBucket?: BucketId;
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
 * PLN-1 · the requisition's value at the quantity COMMITTED, never the
 * suggestion's (R-PLN P0 #4, operator ruling 2026-10-02).
 *
 * ⚠️ THE DEFECT: the line's `estimatedValue` was copied to the requisition
 * unchanged, so a planner who committed 9,000 KG of a 10,950 KG suggestion
 * raised a PR priced for 10,950 — and a 1,090 KG PR carried Rp 1.5B. The
 * approver read a budget for a quantity nobody was asking for.
 *
 * ⚠️ AND THE REMEDY IS A PRICE, NOT A RESCALE. A line total's quantity basis is
 * undeclared (C7 §2.3) and differs row to row in this very fixture; and
 * arithmetic on `estimatedValue` is exactly what the §69 approval-band net
 * refuses. So the line carries `unitPrice`, and the value is `unitPrice ×
 * committed`. With no price, the line's own total stands only for its own
 * suggested quantity; any other quantity carries NO value — absence is the
 * field's documented "nobody said", and a wrong budget is the defect.
 */
export function committedValue(line: PrIntakeLine, committedQty: number): number | undefined {
  if (!Number.isFinite(committedQty)) return undefined;
  if (typeof line.unitPrice === 'number' && Number.isFinite(line.unitPrice)) return Math.round(line.unitPrice * committedQty);
  return committedQty === line.suggestedQty ? line.estimatedValue : undefined;
}

/**
 * The payload a pushed intake line dispatches (plan grid · Intake Review).
 *
 * It supplies `source`, and `estimatedValue` AT THE COMMITTED QUANTITY
 * (`committedValue`, PLN-1). What changed earlier is the TYPE it returns and the fact that the fields
 * it does not supply (`costCenter`, `priority`, `justification`, `requestor`,
 * `category`) are now absences the target records as absences.
 */
export function buildPrCreatePayload(
  line: PrIntakeLine,
  acceptedQty: number,
  reason: string,
): PrCreatePayload {
  const estimatedValue = committedValue(line, acceptedQty);
  return {
    material: line.material,
    quantity: acceptedQty,
    uom: line.uom,
    ...(estimatedValue === undefined ? {} : { estimatedValue }),
    // ⚠️ **NO `requiredDate`. THE BUCKET GOES TO `periodBucket`** (A1-R1) —
    // this line used to read `requiredDate: line.period`, which is how a
    // date-named field came to hold a grain. Nobody named a day, so no day is
    // claimed; the cascade adds `intakeLineId` and `periodBucket` beside this.
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

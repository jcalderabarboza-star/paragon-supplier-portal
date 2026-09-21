// ─────────────────────────────────────────────────────────────────────────────
// THE ONE MATERIAL-REQUEST PAYLOAD BUILDER — both entrances, one function.
//
// ── ⚠️ WHY THIS FILE EXISTS, AND IT IS A MEASURED DEFECT CLASS RATHER THAN A
//    TIDINESS PREFERENCE ────────────────────────────────────────────────────
//
//   `t_pr_create` is this tree's only other multi-entrance creation verb — FOUR
//   call sites, derived — and it is currently drifting. `PrCreateVars.payload`
//   is `Record<string, unknown>`; `t_pr_create`'s `requiredFields` is only
//   `['material','quantity']`; two of the four entrances share
//   `buildPrCreatePayload` and the third builds its own inline. Measured field
//   sets:
//
//     plan grid          { material quantity uom estimatedValue requiredDate source reason? }
//     BuyerRequisitions  { material quantity uom requiredDate costCenter priority justification }
//
//   The target reads the UNION of eleven keys, so **each entrance's absences
//   become silent defaults** — `str()` → `''`, `num()` → `0`,
//   `priority` → `'Medium'`. A `BuyerRequisitions`-raised PR carries
//   `estimatedValue: 0`, which is `RFQ.estimatedValue`'s retired defect (*"a
//   budget of nothing is a different claim from no budget at all"*) alive one
//   entity over. Nothing anywhere says so.
//
//   ⚠️ **THAT DIVERGENCE IS RECORDED, NOT FIXED HERE** (out of scope by ruling).
//   It is quoted because it is the reason this builder is a rule rather than a
//   convention, and because `materialRequestProbes.test.ts` fires the
//   entrance-census matcher AT IT: an instrument that reports zero drift against
//   the live `t_pr_create` population is broken, not reassuring
//   (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` — a synthetic subject agrees with
//   the matcher by construction; only a defect the tree really carried was
//   aimed by something other than the seat that wrote the matcher).
//
// ── ⚠️ THE TYPE IS WHAT ENFORCES IT, NOT THIS COMMENT ───────────────────────
//   `MaterialRequestSubmitPayload` is an INTERFACE, so an entrance that omits a
//   required field fails `tsc`. And the interface cannot drift from the verb:
//   `materialRequestPayload.test.ts` pins its required keys EQUAL to
//   `MATERIAL_REQUEST_BIRTH_FIELDS`, derived from the flow through the
//   TypeScript compiler API, in both directions.
//
// ── ⚠️ AND IT IS A BUILDER, NOT A VALIDATOR ─────────────────────────────────
//   Nothing here proves membership, substance or resolution. Those are the
//   verb's — `MATERIALREQUEST_CATEGORY_KNOWN`, `_NEED_AUTHORED`,
//   `_RFQ_RESOLVED` — and re-checking them here would be a second account of
//   the same rules, free to disagree. What this does is guarantee that the two
//   entrances hand the dispatcher the SAME SHAPE.
// ─────────────────────────────────────────────────────────────────────────────

import type { RFQCategory } from '../../data/mockRfqs';
import type { CodeLessReason } from '../../data/materialCatalogReason';
import type { MaterialRequestSubmitPayload } from '../../services/query/commandHooks';

/**
 * What an entrance supplies. Deliberately the same shape from either door: the
 * WIZARD fills `catalogReason` and `raisedFromRfqId` from the pick and the
 * minted RFQ, the PAGE leaves both absent, and neither one decides what the
 * payload looks like.
 */
export interface MaterialRequestInput {
  readonly requestedLabel: string;
  readonly category: RFQCategory;
  readonly need: string;
  /** The catalog entry's own reason — the wizard has one, the page does not. */
  readonly catalogReason?: CodeLessReason | null;
  /** The event it was discovered on. The wizard passes the id the dispatcher
   *  just minted; the page passes nothing. */
  readonly raisedFromRfqId?: string | null;
  readonly specification?: string | null;
  readonly expectedUom?: string | null;
}

/** Trim to a value, or drop the key entirely. */
const kept = (v: string | null | undefined): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
};

/**
 * Build the ONE payload both entrances send.
 *
 * ⚠️ **AN ABSENT OPTIONAL FIELD IS OMITTED, NEVER SENT AS `''` OR `null`** —
 * and that is the `t_pr_create` lesson applied rather than described.
 * `MATERIALREQUEST_RFQ_RESOLVED` returns ok on absent and refuses on
 * present-and-unresolvable, so sending `''` for "no event" would be asking the
 * hook to treat a supplied value as an absence. `create` then stores `null`,
 * which is the field's declared "nobody was asked" state.
 */
export const buildMaterialRequestPayload = (
  input: MaterialRequestInput,
): MaterialRequestSubmitPayload => {
  const catalogReason = input.catalogReason ?? undefined;
  const raisedFromRfqId = kept(input.raisedFromRfqId);
  const specification = kept(input.specification);
  const expectedUom = kept(input.expectedUom);
  return {
    requestedLabel: input.requestedLabel.trim(),
    category: input.category,
    need: input.need.trim(),
    ...(catalogReason ? { catalogReason } : {}),
    ...(raisedFromRfqId ? { raisedFromRfqId } : {}),
    ...(specification ? { specification } : {}),
    ...(expectedUom ? { expectedUom } : {}),
  };
};

/**
 * Is this input complete enough to dispatch?
 *
 * ⚠️ **A COURTESY MIRROR OF THE VERB, NEVER THE VERB.** The three fields it
 * checks are exactly `MATERIAL_REQUEST_BIRTH_FIELDS` plus the substance
 * `MATERIALREQUEST_NEED_AUTHORED` requires — so a disabled button and a refusal
 * agree — but `buildMaterialRequestPayload` does not call this and the
 * dispatcher does not know it exists. A caller that never renders a button
 * still meets the policy.
 */
export const materialRequestReady = (input: MaterialRequestInput): boolean =>
  input.requestedLabel.trim() !== '' &&
  input.need.trim() !== '' &&
  (input.category as string) !== '';

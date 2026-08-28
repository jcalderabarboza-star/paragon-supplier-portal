// ────────────────────────────────────────────────────────────────────────────
// C.2 — AN APPROVED REQUISITION AS THE WIZARD'S STARTING VALUES.
//
// The PURE half of the RFQ-from-requisition entrance: which requisitions may be
// offered, and which of their fields may be carried into the draft. No React,
// no store — so the rules can be probed directly.
//
// ⚠️ **EXACT UNION MEMBERSHIP ONLY, AND THE ASYMMETRY IS THE WHOLE POINT.** A
// requisition's `category` and `uom` are OPEN STRINGS (C7 — the PR intake takes
// what the requester typed); an RFQ's are CLOSED UNIONS. The two vocabularies
// intersect on exactly TWO of the RFQ's six categories — derived, not asserted:
// `Fragrance` and `Active Ingredients` match; `Halal Emulsifier` ≠ `Emulsifiers`,
// `Natural Botanical` ≠ `Botanical`, and BOTH `Packaging Primary` and
// `Packaging Secondary` ≠ `Packaging`.
//
// **A NON-MEMBER LEAVES THE FIELD UNSET.** No map, no fuzzy match, no
// nearest-neighbour — that is the C9 §3 parse, retired twice. `Halal Emulsifier`
// is not a synonym for `Emulsifiers`: it names a certification the RFQ category
// does not carry, and a mapping would launder a compliance claim into a
// procurement bucket. The buyer chooses, and `isStepValid(0)` will not let the
// wizard advance until they do.
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseRequisition, PRStatus } from '../../services/data/types';
import type { RFQCategory } from '../../data/mockRfqs';
import { getKnownFlows } from '../../services/transitions';

/** The requisition state a raised sourcing event lands the document in. */
export const SOURCING_EVENT_STATE = 'Sourcing Event';

/**
 * The RFQ category vocabulary, in wizard order. Lives here rather than in the
 * page so the membership test and the `<select>` cannot drift apart: one
 * constant, two consumers.
 */
export const RFQ_CATEGORY_OPTIONS: readonly RFQCategory[] = [
  'Fragrance',
  'Active Ingredients',
  'Packaging',
  'Emulsifiers',
  'Botanical',
  'Other',
];

/** The RFQ unit vocabulary. Same one-constant-two-consumers reason. */
export const RFQ_UOM_OPTIONS = ['KG', 'PCS', 'L', 'MT'] as const;
export type RfqUom = (typeof RFQ_UOM_OPTIONS)[number];

/** Exact membership — never a coercion, never a nearest match. */
export const isRfqCategory = (v: string): v is RFQCategory =>
  (RFQ_CATEGORY_OPTIONS as readonly string[]).includes(v);

export const isRfqUom = (v: string): v is RfqUom =>
  (RFQ_UOM_OPTIONS as readonly string[]).includes(v);

/** A field the prefill deliberately did not carry, and why a reader cares. */
export type UncarriedField = 'category' | 'uom';

export interface RequisitionPrefill {
  /** RFQ title ← the requisition's material DISPLAY name. */
  readonly title: string;
  /** Wizard string, not a number — the wizard owns the one parse (CP-0 §4). */
  readonly totalQty: string;
  /** `''` when the PR's category is not an RFQ category — the wizard's own
   *  "choose one" state, which `isStepValid(0)` already blocks on. */
  readonly category: RFQCategory | '';
  /** `null` when the PR's unit is not an RFQ unit. NOT a default: the caller
   *  must leave the field at whatever the wizard already had, and the review
   *  step names the omission rather than letting it pass as carried. */
  readonly uom: RfqUom | null;
  /** The payload key C.1's cascade resolver reads. */
  readonly sourceRequisitionId: string;
  /** What was NOT carried, in field order — drives the honest review note. */
  readonly uncarried: readonly UncarriedField[];
}

/**
 * ⚠️ **`materialIds` IS ABSENT FROM THIS TYPE ON PURPOSE, AND IT IS THE ONE
 * OMISSION WORTH STATING.** A requisition's `material` is a DISPLAY STRING
 * ("Halal Glycerin 99.5%"), not an S/4 material code (C7 GG-4). The RFQ's
 * `materialIds` are codes, chosen from `MATERIAL_CATALOG` once a category is
 * picked. Carrying the display string into `materialIds` would mint an RFQ
 * naming a material master that does not exist — `CTR-FABRICATION-01` in the
 * field that decides who can quote. The buyer supplies the codes.
 */
export function prefillFromRequisition(pr: PurchaseRequisition): RequisitionPrefill {
  const category = isRfqCategory(pr.category) ? pr.category : '';
  const uom = isRfqUom(pr.uom) ? pr.uom : null;
  const uncarried: UncarriedField[] = [];
  if (category === '') uncarried.push('category');
  if (uom === null) uncarried.push('uom');
  return {
    title: pr.material,
    // The wizard parses its own numbers; handing it a string keeps that the ONE
    // parse. `quantity` is already a number on the PR, so this is a render, not
    // a reading — and it deliberately does not carry thousands separators,
    // which `readRfqTotalQty` would then have to disambiguate.
    totalQty: String(pr.quantity),
    category,
    uom,
    sourceRequisitionId: pr.id,
    uncarried,
  };
}

/**
 * The requisitions a sourcing event may be raised FROM.
 *
 * ⚠️ **THE ELIGIBLE STATES ARE THE VERB'S OWN `from`, PASSED IN — NOT THE
 * LITERAL `'Approved'`.** `t_pr_source` is what the cascade fires, so its
 * from-states ARE the answer; writing `'Approved'` here would be a second copy
 * of the machine that goes stale the day the flow gains an edge, and the picker
 * would offer a requisition the dispatcher then refuses (or withhold one it
 * would accept). The caller reads them from the registry.
 */
/**
 * The requisition states a sourcing event may be raised FROM — derived from the
 * machine, not typed here.
 *
 * ⚠️ **IT ASKS "WHICH STATES REACH `Sourcing Event`?" RATHER THAN NAMING
 * `t_pr_source`, AND THE DIFFERENCE IS NOT COSMETIC.** Naming the transition id
 * from anything a surface can reach makes `surfaceable.test.ts` conclude that an
 * operator can FIRE it — its walk treats an id mentioned in (or reachable from)
 * a surface as a dispatch site, and `t_pr_source` is `surfaced: false`. That
 * conclusion would be wrong here: the buyer fires `t_rfq_create`, and the
 * machine cascades. But the gate cannot see the difference between naming an id
 * and dispatching it, and the remedy is to stop naming it — not to teach the
 * gate an exception, which would blind it to the case it exists for.
 *
 * Asking the question this way is also the better derivation: it stays correct
 * if the flow ever gains a SECOND edge into `Sourcing Event`, where a hardcoded
 * `t_pr_source` would silently answer for only one of them.
 */
export function requisitionSourcingStates(): readonly string[] {
  const flow = getKnownFlows().find((f) => f.entity === 'purchaseRequisition');
  return [
    ...new Set(
      (flow?.transitions ?? [])
        .filter((t) => t.to === SOURCING_EVENT_STATE)
        .flatMap((t) => t.from),
    ),
  ];
}

export function sourceableRequisitions(
  rows: readonly PurchaseRequisition[],
  eligibleStates: readonly string[],
): readonly PurchaseRequisition[] {
  return rows.filter((pr) => (eligibleStates as readonly PRStatus[]).includes(pr.status));
}

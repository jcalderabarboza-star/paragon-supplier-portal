// ────────────────────────────────────────────────────────────────────────────
// Policy-hook NAME registry (v2.2 Step 3.1).
//
// Flow definitions reference policy hooks BY NAME (never as embedded closures),
// so the metadata stays serialisable and inspectable. The dispatcher (Step 3.4)
// binds each name to its implementation. This module owns the allowlist of known
// names; `validate.ts` rejects any flow referencing an unregistered hook.
// ────────────────────────────────────────────────────────────────────────────

const REGISTERED = new Set<string>();

/** Register a policy-hook name so flows may reference it. Idempotent. */
export function registerPolicyHook(name: string): void {
  REGISTERED.add(name);
}

/** True if `name` has been registered. */
export function isRegisteredPolicyHook(name: string): boolean {
  return REGISTERED.has(name);
}

/** All registered hook names, sorted (for inspection / tests). */
export function getRegisteredPolicyHooks(): readonly string[] {
  return [...REGISTERED].sort();
}

// — Seed hooks referenced by the shipped flows ───────────────────────────────
// Named business rules; the dispatcher binds each name to its implementation at
// Step 3.4. Registered eagerly on import so a flow that references one validates.
export const POLICY_HOOKS = {
  /** PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty. */
  PO_CONFIRM_QTY_WITHIN_ORDERED: 'po_confirm_qty_within_ordered',
  /** ASN create: the parent PO (payload.poReference) must be Confirmed. */
  ASN_CREATE_PO_CONFIRMED: 'asn_create_po_confirmed',
  /** GR create: the parent shipment/ASN (payload.asnReference) must have arrived. */
  GR_CREATE_SHIPMENT_RECEIVED: 'gr_create_shipment_received',
  // GR header disposition = ROLLUP of the per-line sub-flow states (census G2).
  // The header verb is only legal when the line rollup matches its terminal —
  // "Approved" is provably derived, never asserted.
  /** GR approve: every line rolls up Accepted. */
  GR_ROLLUP_APPROVED: 'gr_rollup_all_accepted',
  /** GR partial approve: lines are a mix of accepted + rejected. */
  GR_ROLLUP_PARTIAL: 'gr_rollup_mixed',
  /** GR reject: every line rolls up Rejected. */
  GR_ROLLUP_REJECTED: 'gr_rollup_all_rejected',
  /** Quotation submit (2e-c-2): payload.currency must be a PERMITTED bid
   *  currency (`BID_CURRENCIES`). `requiredFields` proves presence only — this
   *  proves membership, so an off-list token is refused BY NAME rather than
   *  coerced to the base currency or stored as an unrecognised denomination. */
  QUOTATION_SUBMIT_CURRENCY_PERMITTED: 'quotation_submit_currency_permitted',
  /** RFQ FX pin (2e-c-3): the recorded basis must be WELL-FORMED — a permitted
   *  non-base quote currency, a finite positive rate, a readable vintage and a
   *  known source. A malformed pin is worse than no pin: an absent one refuses
   *  loudly, a malformed one is a basis a comparison could be ranked on. */
  RFQ_FX_PIN_WELL_FORMED: 'rfq_fx_pin_well_formed',
  /** Invoice create: the parent PO (payload.poReference) must be Confirmed. */
  INVOICE_CREATE_PO_CONFIRMED: 'invoice_create_po_confirmed',
  /** Invoice match: the match sub-flow must have rolled up to a clean Matched
   *  before the header can advance Submitted → Matched (census G2). */
  INVOICE_ROLLUP_MATCHED: 'invoice_rollup_matched',
  /** RR submit (SDC-2a): payload.planVersion must be the referenced
   *  publication's own planVersion — the snapshot binding is un-falsifiable. */
  RR_SUBMIT_PLANVERSION_BOUND: 'rr_submit_planversion_bound',
  // SDC-2b-EXT — the symmetric class guards (the honesty lock). Together they
  // make commitmentClass ⟺ verb exactly 1:1, so the shared create can branch on
  // the PUBLISHED class (authoritative our-side data) and never silently
  // transmute a commitment into an acknowledgment or vice versa.
  /** RR submit: the fanned line must NOT be visibility-only (a "confirmed
   *  commitment" against a no-commitment class would be a fabricated claim). */
  RR_SUBMIT_COMMITMENT_CLASS: 'rr_submit_commitment_class',
  /**
   * RR submit: `confirmedQty` must be a FINITE number and NOT NEGATIVE.
   *
   * ⚠️ **THE FLOOR IS `>= 0`, NOT `> 0`, AND THE DIFFERENCE IS RATIFIED.**
   * `PO_CONFIRM_QTY_WITHIN_ORDERED` — the neighbouring verb that already
   * enforces this shape on a field of the same name — requires `q > 0`, because
   * a purchase-order line confirmed at zero is a line that should not have been
   * confirmed. A forecast response is the opposite case: **a TYPED 0 is the
   * legal "cannot supply at all" short confirmation (F-2)** and is recorded as
   * the commitment it is (`submitModel.ts`). Copying the neighbour's bound
   * verbatim would have refused the one answer this verb exists to carry.
   *
   * `Number.isFinite` rather than `typeof === 'number'` — the 2f-c SE-Team spec
   * edit, for the same reason it was made there: `typeof NaN === 'number'`, and
   * NaN fails every comparison silently, so a hand-crafted dispatch could stamp
   * `confirmedQty: NaN` into the store and poison every Σ that reads it.
   *
   * ⚠️ **WHAT THIS HOOK DOES NOT DO, AND CANNOT.** It validates the VALUE, never
   * the READING — 2400 and 2.4 are both finite and non-negative. That gap is now
   * closed by its neighbour below rather than held open; `SUB-01` was the witness
   * that failed the day it closed, and it is INVERTED, not deleted.
   */
  RR_SUBMIT_QTY_FLOOR: 'rr_submit_qty_floor',
  /**
   * RR submit — THE QUANTITY AGREES WITH THE TOKEN IT WAS READ FROM.
   *
   * The floor above proves the VALUE; this proves the READING, by re-running the
   * one legal parser (`normalizeQty`) over the raw token the caller shipped and
   * requiring the result to equal the number the caller declared.
   *
   * ⚠️ **THIS IS NOT THE GUARD THAT WAS FIRST RULED, AND THE DIFFERENCE IS THE
   * POINT.** The ruling asked for `LOCALE_MISMATCH`: the transition would compare
   * the convention on the draft against a `locale` the datasheet carries per row.
   * Measured, there is no such field and there cannot be one without a new type —
   * `GridRow` is `Record<string, string>`, the concrete datasheet row is
   * `{ batchNumber, qty, expiryDate }`, and the convention exists exactly ONCE PER
   * PARSE CALL on `GridContext.numberFormatHint`, which never enters a draft or a
   * payload. **A MISMATCH CHECK NEEDS TWO INDEPENDENTLY-SUPPLIED LOCALES AND THERE
   * IS ONE**, so a `LOCALE_MISMATCH` authored against this tree would have compared
   * the single convention with itself, refused nothing, and shipped green —
   * `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b) wearing a guard's clothes.
   *
   * The second witness is not a second locale. It is the RAW TOKEN, which the
   * surface has always had and always discarded. That makes the guard:
   *   · a caller that parses under one convention and DECLARES another — caught,
   *     because re-parsing under the declared convention yields a different number
   *     than the one shipped;
   *   · a caller that parses correctly and ships a different number — caught;
   *   · an ambiguous token declared as one of its two readings — caught, because
   *     the hint-free re-parse refuses AMBIGUOUS_QTY at the TRANSITION and not
   *     only at the surface;
   *   · a hand-crafted dispatch carrying a bare number and NO token — caught, and
   *     this is the case `requiredFields` cannot see alone: rule 5 is `isEmpty`,
   *     and `isEmpty('   ')` is false.
   *
   * ⚠️ **THE HONEST COST, STATED AS THE BATCH'S COST AND NOT AS A CAVEAT.** This
   * moves the parse INTO the contract and leaves the thing that makes it correct
   * OUTSIDE it. The convention is still supplied by the caller, and nothing here
   * can tell a truthful `'id'` from a mistaken one: a caller that reads an
   * Indonesian typist's "1.234" under a declared `'en'` produces 1.234, declares
   * 1.234, and agrees with itself perfectly. What changed is that a caller must now
   * be INTERNALLY CONSISTENT, which is strictly more than it had to be. It is not
   * the same thing as being right, and no guard at this layer can be.
   *
   * ⚠️ **ABSENCE OF `numberConvention` MEANS HINT-FREE, WHICH IS THE STRICTER
   * READING.** A caller that omits it gets a parse that REFUSES cross-convention
   * ambiguity rather than resolving it, so forgetting the field can only tighten
   * this guard, never loosen it. That direction is deliberate: an optional field
   * whose absence RELAXED a check would be the `isEmpty` defect one layer up.
   */
  RR_SUBMIT_QTY_AGREES: 'rr_submit_qty_agrees',
  /**
   * RR dispute / resolve: the authored text must be SUBSTANCE, not presence.
   *
   * ⚠️ **THE DISPATCHER'S `requiredFields` RULE IS `isEmpty`, AND `isEmpty('   ')`
   * IS FALSE.** So is `isEmpty(0)`, `isEmpty(false)` and `isEmpty({})`. A
   * required text field therefore admits a space bar, a number and an object —
   * which is the RR_SUBMIT_QTY_FLOOR lesson on a string: presence is not a
   * value, and **an omitted field passes a check written for a bad one**
   * (operator, the quantity batch). This hook is what makes "required" mean
   * "somebody wrote something".
   *
   * It proves the text is a NON-BLANK STRING. It cannot prove the text is TRUE,
   * relevant, or responsive — no value-level guard can, exactly as the qty floor
   * cannot tell 2400 from 2.4. That limit is stated, not papered over.
   */
  RR_DISPUTE_TEXT_AUTHORED: 'rr_dispute_text_authored',
  /** RR acknowledge: the fanned line MUST be visibility-only (an acknowledge
   *  can never dodge the commitment floor on a firm/semi-firm line). */
  RR_ACKNOWLEDGE_VISIBILITY_CLASS: 'rr_acknowledge_visibility_class',
  /** Inventory declare (SDC-3a, total-first): when batch detail is present,
   *  Σ batch qty must equal totalQty — a total that disagrees with its own
   *  detail is a fabricated number. */
  INV_DECLARE_BATCH_TOTAL: 'inv_declare_batch_total',
  // SDC-3a — the symmetric direction guards (the SDC-2b-EXT class-guard
  // discipline applied to shipment direction ⟺ ASN linkage, exactly 1:1).
  /** Shipment report: to-paragon MUST link a resolvable ASN (converges on the
   *  ASN machine — link, never duplicate; design §2.3). */
  ISH_TOPARAGON_ASN_LINKED: 'ish_toparagon_asn_linked',
  /** Shipment report: principal-to-distributor must NOT carry an asnRef
   *  (Paragon is not the consignee — no ASN exists for that leg). */
  ISH_P2D_NO_ASN: 'ish_p2d_no_asn',
  /** Shipment report: principal-to-distributor is legal ONLY for a supplier
   *  whose relationship for the material is distributor — a manufacturer has
   *  no principal leg (design §7). */
  ISH_P2D_DISTRIBUTOR_ONLY: 'ish_p2d_distributor_only',
  // ── CP-2 · B1 — the MASTER-MISS refusals (operator ruling D-OPS-MASTERMISS) ──
  /** Any SDC write verb: `payload.materialCode` must be a code the MATERIAL
   *  MASTER names. Creation scope already proves the supplier COLLABORATES on
   *  the material, but membership there is relationships ∪ publications — NOT
   *  the master — so a relationship row naming a code the master lacks would
   *  reach `create` and take a fabricated unit. This proves the unit EXISTS
   *  before anything is stamped with one. Refused by name: UNKNOWN_MATERIAL. */
  SDC_MATERIAL_KNOWN: 'sdc_material_known',
  /** GR create: every `inspectionResults[].materialCode` must appear on the
   *  PARENT shipment's / ASN's own line items.
   *
   *  NOT a material-master check — deliberately. The GR lane's documents live
   *  in the mock*.ts identity space (~30 codes), of which the five-entry SDC
   *  master names two (MASTER-STRADDLE-01), so a master gate here would refuse
   *  nearly every legitimate receipt. This gate is the ratified collision
   *  principle applied instead — identity settled by DECLARED OWNERSHIP, never
   *  by content plausibility: a receipt may only inspect what its parent
   *  document actually declared arrived. Strictly STRONGER than a master check
   *  at this seam (it also refuses a master-valid code the ASN never named). */
  GR_INSPECTION_MATERIALS_DECLARED: 'gr_inspection_materials_declared',
  /** Enforcement set (CP-3 · E2): the recorded relaxation must be GOVERNED —
   *  a mode this build recognises, a well-formed actor attribution, a review
   *  date on anything below BLOCK, and A NAMED ACTOR ON ANY LOOSENING.
   *  Tightening is always legal, so the safest act needs no permission. */
  ENFORCEMENT_SET_GOVERNED: 'enforcement_set_governed',
  /**
   * PR reject (§67): the rejection reason must be SUBSTANCE, not presence.
   *
   * ⚠️ **THE SAME GUARD AS `RR_DISPUTE_TEXT_AUTHORED`, ON THE SAME GROUND, AND
   * IT IS A DELIBERATE SECOND INSTANCE RATHER THAN A SHARED HOOK.** The two
   * verbs read DIFFERENT payload fields (`rejectionReason` / `disputeReason`)
   * and refuse in different words, so a shared implementation would have to
   * branch on `toState` to know which field it was proving — which is exactly
   * the fragility `RR_DISPUTE_TEXT_AUTHORED`'s own header warns about, where
   * `t_requirementresponse_review` ALSO lands on `UnderReview` and `toState`
   * alone cannot separate a resolution from a review.
   *
   * It proves a NON-BLANK STRING. It cannot prove the text is true, relevant or
   * responsive; no value-level guard can. `requiredFields` alone would not even
   * reach that bar — `isEmpty('   ')` is false.
   */
  PR_REJECT_REASON_AUTHORED: 'pr_reject_reason_authored',

  /**
   * §68 — the revision note is SUBSTANCE, not presence. The exact twin of
   * `PR_REJECT_REASON_AUTHORED` one edge over, and a THIRD deliberate instance
   * of the same two-line guard rather than a shared "non-blank text" hook: the
   * three read different payload fields, and a shared hook would have to branch
   * on `toState` to know which — a conditional inside a guard, so that reading
   * the guard no longer tells you what it guards.
   */
  PR_REVISION_NOTE_AUTHORED: 'pr_revision_note_authored',

  /**
   * §68 — an approval NAMES ITS DECIDER, from the session and never from the
   * payload (C10 §6.2). Two obligations in one hook because they are two halves
   * of one rule: the session must carry an actor, and a caller must not be able
   * to supply one. The second half is §6.2's *"REFUSED BY NAME ON WRITE"*,
   * which had no implementation anywhere in the tree before this.
   */
  PR_APPROVAL_ATTRIBUTED: 'pr_approval_attributed',
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);

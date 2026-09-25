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
  /**
   * §82 · supplierdoc reject: `rejectionReason` must be text with substance.
   *
   * ⚠️ **`requiredFields` IS NOT ENOUGH AND THIS IS THE THIRD VERB TO LEARN IT.**
   * The dispatcher's emptiness check admits a string of spaces, so a required
   * field can be satisfied by the space bar. That matters more here than
   * anywhere: §80 built a supplier-facing surface that renders this text
   * verbatim, so a blank reason is a refusal notice with an empty accusation in
   * it. Twin of `PR_REJECT_REASON_AUTHORED` / `PR_REVISION_NOTE_AUTHORED`.
   */
  SUPPLIERDOC_REFUSAL_AUTHORED: 'supplierdoc_refusal_authored',
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
  // The privilege grant. Refuses a cross-tenancy add BY NAME, per atom — a
  // surface can prevent the gesture, only the verb can prevent the act.
  ROLE_GRANT_GOVERNED: 'role_grant_governed',

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

  // ── B1 · SUPPLIER APPLICATION — the three guards on the birth and the
  //    refusal of an application ───────────────────────────────────────────
  /**
   * Application submit: `requestType` must be one of the three the platform
   * recognises. `requiredFields` proves PRESENCE, so without this an off-list
   * token reaches `create` and is stored as a request type nothing can read —
   * the `QUOTATION_SUBMIT_CURRENCY_PERMITTED` shape, and the same remedy:
   * refuse an unknown token BY NAME rather than coerce it to a default.
   */
  APPLICATION_REQUEST_TYPE_KNOWN: 'application_request_type_known',
  /**
   * Application submit: an application naming an EXISTING vendor must name one
   * the governed roster actually holds.
   *
   * ⚠️ **THIS IS THE C4b RESOLUTION, AND IT IS A HOOK BECAUSE THE C4b *FLAG*
   * CANNOT CARRY IT — MEASURED, NOT ASSUMED.** `requireCreationOwner` is
   * per-TARGET and all-or-nothing: the dispatcher refuses any buyer creation
   * whose `creationOwner` returns null (`dispatcher.ts`, the buyer branch). Two
   * of the three request types have NO existing vendor by definition, so their
   * owner is legitimately null — setting the flag would refuse every External
   * SR and every KOL, which is the majority of the population and the whole
   * point of the lane.
   *
   * **What is preserved is the thing the flag exists for: A PAYLOAD ECHO IS NOT
   * A RESOLUTION** (operator ruling, Wave E / #284). The resolution still runs
   * in `creationOwner` — against the roster, in the data layer that owns it —
   * and this hook is what makes it BINDING for the one request type it applies
   * to. The hook reads it through `ctx.target`, so no roster knowledge crosses
   * into the transitions layer and there is exactly one resolver.
   */
  APPLICATION_INTERNAL_VENDOR_RESOLVED: 'application_internal_vendor_resolved',
  /**
   * Application reject: the reason must be SUBSTANCE, not presence — the fourth
   * deliberate instance of this two-line guard rather than a shared "non-blank
   * text" hook, for the reason `PR_REJECT_REASON_AUTHORED` states: the four read
   * different payload fields, and a shared hook would have to branch on
   * `toState` to know which, so that reading the guard no longer tells you what
   * it guards.
   */
  APPLICATION_REFUSAL_AUTHORED: 'application_refusal_authored',
  /**
   * Application submit: if the payload carries declarations, every one of them
   * must name a known subject and carry a reference with something in it.
   *
   * ⚠️ **REFUSED, NOT FILTERED.** The tempting build reads the well-formed
   * entries and drops the rest, which leaves the applicant believing they
   * declared four documents and the record holding three — a silent
   * subtraction from data somebody actually supplied. Declarations are
   * OPTIONAL (an application carrying none is legal and common); a
   * declarations key that is present and malformed is not.
   */
  APPLICATION_DECLARATIONS_WELL_FORMED: 'application_declarations_well_formed',

  // ── R8 · MATERIAL REQUEST — four hooks on the lane that asks for a material
  //    the master does not carry ───────────────────────────────────────────
  /**
   * Material-request submit: `category` must be one of the wizard's own closed
   * `RFQCategory` members. `requiredFields` proves PRESENCE, so without this an
   * off-list token reaches `create` and is stored as a category the picker
   * cannot render and no filter can find — `APPLICATION_REQUEST_TYPE_KNOWN`'s
   * shape, on the union that decides which catalog page a reader is even on.
   *
   * ⚠️ It also proves `catalogReason` WHEN PRESENT, against the same
   * `CodeLessReason` union the catalog discriminates on. Absent is legal — a
   * standalone request picked nothing — which is why this is a membership check
   * on an optional field rather than a second required one.
   */
  MATERIALREQUEST_CATEGORY_KNOWN: 'materialrequest_category_known',
  /**
   * Material-request submit: `need` must be SUBSTANCE, not presence — the fifth
   * deliberate instance of this two-line guard, and the one whose reader has the
   * least else to go on. A master-data person deciding whether a label already
   * exists under another name has the requested label and this text; a blank
   * one leaves them the label alone, which is the case the catalog already
   * failed to resolve.
   */
  MATERIALREQUEST_NEED_AUTHORED: 'materialrequest_need_authored',
  /**
   * Material-request submit: if the payload names an originating RFQ, it must
   * name one the store actually holds.
   *
   * ⚠️ **A PAYLOAD ECHO IS NOT A RESOLUTION**, and this is
   * `APPLICATION_INTERNAL_VENDOR_RESOLVED`'s shape for
   * `APPLICATION_INTERNAL_VENDOR_RESOLVED`'s measured reason: the C4b
   * `requireCreationOwner` flag is per-TARGET and all-or-nothing, so setting it
   * would refuse every STANDALONE request — the page entrance in its entirety —
   * because those legitimately name no RFQ. The flag cannot say *"required
   * when"*; this layer can.
   *
   * The resolver is the target's own `creationOwner`, read through `ctx.target`,
   * so the RFQ store stays in the layer that owns it and there is exactly ONE
   * resolver rather than a second copy to drift.
   *
   * ⚠️ **THE LIMIT, STATED.** It proves the event EXISTS. It cannot prove the
   * request was discovered on that event, or that the buyer meant that one.
   */
  MATERIALREQUEST_RFQ_RESOLVED: 'materialrequest_rfq_resolved',
  /**
   * Material-request reject: the justification must be SUBSTANCE, not presence.
   * Sixth instance, and kept separate from `MATERIALREQUEST_NEED_AUTHORED` for
   * `PR_REJECT_REASON_AUTHORED`'s reason — the two read different payload
   * fields, and a shared hook would have to branch on `toState` to know which,
   * after which reading the guard no longer tells you what it guards.
   */
  MATERIALREQUEST_REFUSAL_AUTHORED: 'materialrequest_refusal_authored',
  /**
   * Material-request review/approve/reject: **the requester must not be the
   * decider.**
   *
   * ⚠️ **THIS HOOK IS BUILT AND CANNOT FIRE TODAY, AND THAT IS STATED HERE SO
   * ITS GREEN IS NEVER READ AS A WORKING CHECK.** Every actor in this tree is
   * `UNATTRIBUTED: NO_PERSON_IN_SESSION` (`CurrentIdentity.actor`, both
   * personas), so `isAttributed` is false on both sides of the comparison, the
   * predicate is false, and **the hook ADMITS**. That is the correct direction —
   * an unattributed act is not evidence of self-approval — and it is the whole
   * reason this is written down rather than left to a reader to notice.
   *
   * It is the `pslListing` ruling executed: *"Four-eyes (proposer ≠ decider) is
   * UNBUILDABLE today … there are no two values to compare. Typing these as
   * `string` now would make the check a migration later instead of a one-line
   * predicate."* `submittedBy` / `decidedBy` are `ActorAttribution`, so the day
   * an IdP answers this hook starts refusing with no edit to its own body.
   *
   * ⚠️ **AND IT READS THE DOCUMENT THROUGH `ctx.target.readEntity`, WHICH IS
   * DOCUMENTED FOR EXACTLY THIS.** The belief that a policy hook cannot see the
   * entity is false and has stopped a batch before: `CommandTarget.readEntity`
   * is *"Full entity for policy hooks to inspect"* and four shipped hooks
   * already use it. What was missing for a threshold was the RIGHT-HAND SIDE of
   * the comparison; what is missing here is a `personId`, which is F1.
   *
   * ⚠️ **IT IS NOT A SUBSTITUTE FOR THE ATOM SPLIT, AND NOT SATISFIED BY IT.**
   * The atoms live in different lanes (`procurement` raises, `planning`
   * decides), which makes narrowing POSSIBLE; the default buyer seat holds all
   * six bundles, so lane segregation does not bind the out-of-box seat. This
   * hook is the per-DOCUMENT half, and it is the half that is unbuildable.
   */
  MATERIALREQUEST_DECIDER_NOT_REQUESTER: 'materialrequest_decider_not_requester',

  // ── PSL P2 · THE SOURCING GATE — three hooks, and the SPLIT IS THE DESIGN ──
  //
  // ⚠️ **ELIGIBILITY AND COMPETITION ARE TWO HOOKS ON ONE VERB, NOT ONE HOOK
  // WITH TWO BRANCHES** (operator ruling). They are different rules with
  // different remedies — *"this supplier may not be invited at all"* versus
  // *"this event does not have enough competition"* — and a buyer who reads one
  // refusal for two causes cannot act on it. Splitting them also settles a
  // question a merged hook would have had to answer in prose: whether an
  // ineligible invitee counts toward the floor. It does not, and the ORDER is
  // what says so — eligibility is listed FIRST in `t_rfq_publish.policyHooks`
  // and the dispatcher runs them in array order, so the count is only ever
  // taken over invitees eligibility already accepted.
  /**
   * RFQ publish: no invited supplier may be in a state that forbids invitation.
   * The refusable set is DERIVED from `SupplierStatus`
   * (`services/data/rfqSourcingGate.ts`), never hand-listed here.
   */
  RFQ_PUBLISH_INVITEES_ELIGIBLE: 'rfq_publish_invitees_eligible',
  /**
   * RFQ publish: a competitive event needs at least `COMPETITION_FLOOR_INVITEES`
   * ELIGIBLE invitees — unless an in-force Mandatory or Sole Source listing
   * removes the need to compete at all.
   *
   * ⚠️ **THE FLOOR ONLY. EXACTLY TWO IS ALLOWED.** Three is the standard and the
   * surface says so; a hook that refused at two would be refusing the ruling,
   * and `PolicyDecision` has no channel for an allowance note, which is why the
   * note is rendered by the wizard off the same pure call.
   */
  RFQ_PUBLISH_COMPETITION: 'rfq_publish_competition',
  /**
   * RFQ award: the awardee must OWN the awarded quotation and have been invited.
   *
   * ⚠️ **THE STRONGER OF THE TWO CHECKS, BECAUSE THE WEAKER ONE IS VACUOUS.**
   * `awardedSupplierId` and `awardedQuotationId` are written independently from
   * the payload with no cross-check, so a dispatch can record supplier A as the
   * awardee of supplier B's quotation. "Was the awardee invited?" alone cannot
   * catch that, and cannot be reached from the corpus at all — no seeded
   * quotation belongs to an uninvited supplier, and the quotation target's own
   * `creationOwner` makes one impossible to raise.
   */
  RFQ_AWARD_AWARDEE_INTEGRITY: 'rfq_award_awardee_integrity',

  // ── PSL P3 · THE GOVERNANCE VERBS ─────────────────────────────────────────
  //
  // Fifteen hooks over nine verbs. They are SPLIT by remedy rather than merged
  // by subject, on `RFQ_PUBLISH_*`'s ruling one block up: a buyer who reads one
  // refusal for two causes cannot act on it. Every one of them names what to do
  // next, because a refusal that only says no is the dead end
  // `HALAL-REFUSAL-DEAD-ENDS-01` is filed about.
  /** psl propose: `supplierId` must name a supplier on the roster. A listing
   *  for a company the world does not name is a grant to nobody. */
  PSL_SUPPLIER_RESOLVED: 'psl_supplier_resolved',
  /** psl propose: `materialCodes` must be a non-empty list of REAL
   *  `MATERIAL_MASTER` keys. Membership, never presence — `requiredFields`
   *  would admit `['anything']` and the listing would cover a code no sourcing
   *  event can ever match, so the grant would be silently unreachable. */
  PSL_SCOPE_WELL_FORMED: 'psl_scope_well_formed',
  /** psl propose / change status: `status` is a member of `PSL_STATUSES`.
   *
   *  ⚠️ **THE `QUOTATION_SUBMIT_CURRENCY_PERMITTED` LESSON, THIRD LANE.**
   *  `requiredFields` proves PRESENCE only, so an off-list token reaches the
   *  store and is written as a designation nothing recognises — after which
   *  `bestPslStatus`'s ladder simply never matches it and the listing grants
   *  nothing while looking granted. */
  PSL_STATUS_KNOWN: 'psl_status_known',
  /** psl propose: `validFrom` must not fall after `validUntil`.
   *
   *  ⚠️ **AND IT IS NOT A CLOCK TEST.** It compares two authored dates against
   *  each other and never against `now`; a verb that refused an already-past
   *  validity would put the clock inside a transition (law 0.5) and would
   *  refuse a day-one BACKFILL, which is the normal way an existing PSL enters
   *  a new portal. */
  PSL_VALIDITY_ORDERED: 'psl_validity_ordered',
  /** psl propose: `justification` must be text with substance. The dispatcher's
   *  emptiness check admits a string of spaces, and this is the one sentence
   *  that says WHY a supplier holds a designation that may suspend bidding. */
  PSL_JUSTIFICATION_AUTHORED: 'psl_justification_authored',
  /** psl grant / reject / change status / renew / withdraw: `reason` must be
   *  text with substance. Same guard, a different field, and the record's own
   *  rule one layer down — *a silent change of designation is forbidden*. */
  PSL_DECISION_AUTHORED: 'psl_decision_authored',
  /**
   * psl grant / reject: **the proposer must not be the decider.**
   *
   * ⚠️ **THIS HOOK IS BUILT AND CANNOT FIRE TODAY, AND THAT IS STATED HERE SO
   * ITS GREEN IS NEVER READ AS A WORKING CHECK.** Every actor in this tree is
   * `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so `isAttributed` is false on both
   * sides, the predicate is false, and the hook ADMITS. That is the correct
   * direction — an unattributed act is not evidence of self-approval.
   *
   * It is `pslListing.ts`'s OWN ruling executed: *"Four-eyes (proposer is not
   * decider) is UNBUILDABLE today … there are no two values to compare. Typing
   * these as `string` now would make the check a migration later instead of a
   * one-line predicate."* `proposedBy` is an `ActorAttribution`, so the day an
   * IdP answers, this hook starts refusing with no edit to its own body.
   *
   * ⚠️ **IT IS NOT A SUBSTITUTE FOR THE LANE SPLIT, AND NOT SATISFIED BY IT.**
   * `psl:propose` is `procurement`'s and `psl:decide` is `compliance`'s, which
   * makes narrowing POSSIBLE; the default buyer seat holds all six bundles, so
   * lane segregation does not bind the out-of-box seat (§76d). This hook is the
   * per-DOCUMENT half, and it is the half that is unbuildable.
   */
  PSL_DECIDER_NOT_PROPOSER: 'psl_decider_not_proposer',
  /**
   * psl grant / change status / renew: a `Mandatory` or `Sole Source`
   * designation needs a LEAD sign-off; `Validated` does not.
   *
   * ⚠️ **A HOOK AND A SURFACE MIRROR, NOT A SEPARATE ATOM** (operator ruling
   * b′). A second `Proposed → Listed` edge differing only by `requiredRole`
   * would be role-per-distinction, which C10 §4.1 refuses, and would leave two
   * edges with identical from/to for `flowGraph`, `nextAct` and `catalogView`
   * to reason about.
   *
   * ⚠️ **AND THE COST OF THE HOOK IS PAID RATHER THAN IGNORED: AN
   * AUTHORISATION DECISION OUTSIDE THE ROLE GATE IS INVISIBLE TO EVERY
   * AVAILABILITY READER**, so a surface would offer the verb and the dispatcher
   * would refuse it — the false-affordance shape R1 swept. The remedy is the
   * one this lane already uses twice: ONE expression of the rule, two readers.
   * `pslLeadCheck.ts` holds it; the hook asks it and so does the panel.
   */
  PSL_RESTRICTIVE_STATUS_APPROVED: 'psl_restrictive_status_approved',
  /** psl change status: the new designation must differ from the current one.
   *  A change that changes nothing is a ledger entry with no subject, and it
   *  would let a seat manufacture an audit trail out of repeated no-ops. */
  PSL_STATUS_ACTUALLY_CHANGES: 'psl_status_actually_changes',
  /** psl renew: the new `validUntil` must be LATER than the effective end in
   *  force. A "renewal" that shortens a validity is a different act with a
   *  different name, and it is not built — shortening happens through the cap
   *  override, which requires its own justification and its own decider. */
  PSL_RENEWAL_EXTENDS: 'psl_renewal_extends',
  /** psl renew: the new `validUntil` must fall within the cap measured from
   *  `validFrom`.
   *
   *  ⚠️ **REFUSED HERE RATHER THAN BOUNDED AT READ** (operator ruling e).
   *  `effectiveValidUntil` would clamp it silently, so a person would record a
   *  two-year renewal, the record would show two years and the surface would
   *  show one. A governance bound that only ever appears in a projection is a
   *  bound the decider never meets. */
  PSL_RENEWAL_WITHIN_CAP: 'psl_renewal_within_cap',
  /** psl publish: a listing already published may not be published again.
   *  `publishedAt` is write-once history (ruling b), so a second publish would
   *  either overwrite the instant the supplier was actually told or be a no-op
   *  reported as a success. Both are worse than a refusal that says it is
   *  already published. */
  PSL_NOT_ALREADY_PUBLISHED: 'psl_not_already_published',
  /** psl cap override: the override must not exceed `PSL_CAP_CEILING_DAYS`.
   *  The ceiling is the operator's ruling (R4) and the refusal may state it. */
  PSL_CAP_WITHIN_CEILING: 'psl_cap_within_ceiling',
  /** psl cap override: `capJustification` must be text with substance. R3 —
   *  an override with no justification is an unexplained exception, which is
   *  exactly what the four-field co-presence rule exists to prevent. */
  PSL_CAP_JUSTIFICATION_AUTHORED: 'psl_cap_justification_authored',
  /** psl cap set (the PORTAL DEFAULT): `days` must be a positive integer within
   *  the ceiling. Bounding the default is what stops a later ruling that lowers
   *  the ceiling from leaving the default silently in force above it. */
  PSL_DEFAULT_CAP_WITHIN_CEILING: 'psl_default_cap_within_ceiling',

  // ── THE DELIVERY LANE (call-off step 1) ───────────────────────────────────
  /**
   * EVERY delivery verb: the commanding scope must name a person.
   *
   * ⚠️ **THIS RUNS THE OPPOSITE WAY TO THE REST OF THE FILE AND THAT IS THE
   * POINT.** Most hooks here refuse a FIELD. This refuses a SEAT — and it is
   * the operator's Q6 ruling, which exists because of a measured incident: one
   * click by a seat with no person released three back-dated lines, and the
   * supplier mirror immediately showed five overdue deliveries it had never
   * been asked about. **An act that creates supplier-facing obligations is
   * never recorded against nobody.**
   *
   * It is ONE hook on all four verbs rather than four copies, so "every verb in
   * this lane requires an attributed actor" is a property a spec can DERIVE
   * from the flows instead of a list somebody keeps in step.
   *
   * The refusal names the remedy — pick a sample user on the identity panel —
   * because a seat that cannot act and is not told how is indistinguishable
   * from a broken control.
   */
  DELIVERY_ACTOR_ATTRIBUTED: 'delivery_actor_attributed',
  /**
   * `t_delivery_release`: a line dated before the declared present may not be
   * transmitted.
   *
   * ⚠️ **THE DEFECT THIS EXISTS FOR WAS MEASURED IN A BROWSER, NOT IMAGINED.**
   * Releasing a past-dated draft instantly derives `Missed` — the line was due
   * before it was ever sent — and the chase engine pushes on released lines, so
   * one click manufactured supplier-facing delinquency for deliveries nobody
   * had asked for. A commitment cannot be made in the past.
   *
   * ⚠️ **AND IT DOES NOT FALSIFY A SEEDED LINE.** Every seeded release went
   * through the same pure verb at fixture-build time with an injected stamp of
   * `2026-03-15`, and every date it released is LATER than that: those lines
   * were transmitted while their dates were still in the future, which is
   * exactly what this rule requires. `deliveryBackdating.test.ts` asserts that
   * over the live corpus rather than asserting it here in prose.
   */
  DELIVERY_RELEASE_NOT_BACKDATED: 'delivery_release_not_backdated',
  /**
   * `t_delivery_adjust`: the patch must carry at least one knob, each knob must
   * be well-formed, and a new `releaseDate` may not be in the past.
   *
   * The "at least one" rule is here rather than in `requiredFields` because
   * that list rules on absence UNCONDITIONALLY and an adjustment legitimately
   * carries either knob alone (`t_enforcement_set`'s `reviewBy` reasoning).
   * The date bound is the same rule as the release guard seen from the other
   * side: moving a line INTO the past would rebuild the defect the release
   * guard refuses, one verb earlier.
   */
  DELIVERY_ADJUST_PATCH_VALID: 'delivery_adjust_patch_valid',
  /**
   * `t_delivery_confirm`: there must BE a proposed match to accept.
   *
   * Derived from the SAME shipment pool the surface renders and the target
   * writes (`delivery/pool.ts`), so a confirm can never accept a quantity the
   * operator was not shown. An unmatched line is refused rather than confirmed
   * with nothing — a silent success here would move `deliveredQty`, a governed
   * total, on no evidence at all.
   */
  DELIVERY_CONFIRM_HAS_MATCH: 'delivery_confirm_has_match',
  /**
   * `t_delivery_policy_set`: the tolerance must be well-formed, must actually
   * change something, and **a LOOSENING may not be recorded against a SAMPLE
   * identity** (C10 §6.3a, the `SAMPLE_ACTOR_CANNOT_LOOSEN` lock).
   *
   * ⚠️ **THE LOCK APPLIES, AND IT WAS DERIVED RATHER THAN ASSUMED.**
   * `enforcementSetGoverned`'s ground is that a sample identity cannot accept
   * governance risk — *"that needs a real signed-in person, and Paragon has no
   * sign-in yet"* — and a drawdown tolerance is exactly a governed check: it is
   * what decides whether an over-delivery is flagged at all. Loosening it
   * accepts commercial risk in a named person's name, and after this batch that
   * name lands in the DR-10 trail. The rival reading (this store does not
   * survive a reload, so the `role:grant` durability exemption applies) was
   * measured and rejected: the enforcement lane's own argument never rested on
   * durability, it rested on WHO MAY ACCEPT RISK.
   *
   * TIGHTENING stays available to any attributed seat, exactly as it does on
   * the enforcement gate — the safest act is always reachable.
   */
  DELIVERY_POLICY_GOVERNED: 'delivery_policy_governed',
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);

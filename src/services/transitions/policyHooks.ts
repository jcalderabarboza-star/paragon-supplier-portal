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
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);

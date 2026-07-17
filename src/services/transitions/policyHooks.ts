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
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);

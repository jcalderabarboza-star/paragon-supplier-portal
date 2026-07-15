// ────────────────────────────────────────────────────────────────────────────
// rfqCreateModel (Phase A/2 · sourcing spine) — the PURE draft→payload mapping
// for the RFQ-create dispatch (t_rfq_create) that RETIRES `extraRfqs`.
//
// The sourcing wizard collects everything as strings; this builds the payload the
// dispatcher validates and `rfqTarget.create` mints from. It carries ONLY intake
// fields — never an id, number, or status: those are STORE-assigned on create,
// which is precisely what the retired `extraRfqs` client-fabrication could not
// guarantee (it minted `rfq-new-${Date.now()}` peers and spread them into the
// seam list). Mirrors `buildPrCreatePayload` (plan-grid) in spirit.
// ────────────────────────────────────────────────────────────────────────────

/** The wizard draft fields the create payload is derived from (a structural
 * subset of BuyerSourcing's `DraftRfq`; extra draft fields are ignored). */
export interface RfqCreateDraft {
  title: string;
  category: string;
  materials: string[];
  totalQty: string;
  uom: string;
  budget: string;
  responseDeadline: string;
  awardDeadline: string;
  incoterms: string;
  paymentTerms: string;
  invitedSupplierIds: string[];
}

/** Build the `t_rfq_create` payload from the wizard draft. Trims the title
 * (a required, validated field) and coerces the string number inputs; an empty
 * budget resolves to 0, never NaN. */
export function buildRfqCreatePayload(draft: RfqCreateDraft): Record<string, unknown> {
  return {
    title: draft.title.trim(),
    materialCategory: draft.category,
    materialIds: draft.materials,
    invitedSupplierIds: draft.invitedSupplierIds,
    responseDeadline: draft.responseDeadline,
    awardDeadline: draft.awardDeadline,
    totalQty: Number(draft.totalQty),
    uom: draft.uom,
    estimatedValue: Number(draft.budget) || 0,
    incoterms: draft.incoterms,
    paymentTerms: draft.paymentTerms,
  };
}

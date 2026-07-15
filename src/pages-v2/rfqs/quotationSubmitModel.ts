// ────────────────────────────────────────────────────────────────────────────
// quotationSubmitModel (Task 3b · sourcing spine) — the PURE draft→payload
// mapping for the supplier's `t_quotation_submit` dispatch that RETIRES the
// SupplierRFQs `submitQuote` local-state fake.
//
// The quote form collects everything as strings; this builds the payload the
// dispatcher validates and `quotationTarget.create` mints from. It carries ONLY
// the honest RAW FACTS — unitPrice / leadTimeDays / validity / terms (+ notes) —
// plus the rfqId + supplierId the dispatcher scopes on. NEVER a score: the
// derived axes are engine-owned AT READ (F0.3-FIND-01), and compliance /
// reliability seed from a SIMULATED baseline in the target. Mirrors
// `buildRfqCreatePayload` (sourcing) in spirit.
// ────────────────────────────────────────────────────────────────────────────

/** The quote-form fields the submit payload is derived from. `rfqId` +
 * `supplierId` come from the RFQ context + the current identity, not the form. */
export interface QuotationSubmitDraft {
  rfqId: string;
  supplierId: string;
  unitPrice: string;
  leadTimeDays: string;
  validUntil: string;
  paymentTermsOffered?: string;
  notes?: string;
}

/** Build the `t_quotation_submit` payload from the quote draft. Coerces the
 * string number inputs (comma-tolerant); an empty numeric field resolves to 0,
 * never NaN. No id, number, or status — those are STORE-assigned on create. */
export function buildQuotationSubmitPayload(
  draft: QuotationSubmitDraft,
): Record<string, unknown> {
  return {
    rfqId: draft.rfqId,
    supplierId: draft.supplierId,
    unitPrice: Number(draft.unitPrice.replace(/,/g, '')) || 0,
    leadTimeDays: Number(draft.leadTimeDays) || 0,
    validUntil: draft.validUntil,
    paymentTermsOffered: draft.paymentTermsOffered ?? '',
    ...(draft.notes ? { notes: draft.notes } : {}),
  };
}

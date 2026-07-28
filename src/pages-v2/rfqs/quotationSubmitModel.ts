// ────────────────────────────────────────────────────────────────────────────
// quotationSubmitModel (Task 3b · sourcing spine) — the PURE draft→payload
// mapping for the supplier's `t_quotation_submit` dispatch that RETIRES the
// SupplierRFQs `submitQuote` local-state fake.
//
// The quote form collects free text; the PRICE arrives here already parsed (the
// one `readBidPrice`/`normalizeQty` read — CP-0 2e-a), and this builds the
// payload the dispatcher validates and `quotationTarget.create` mints from. A
// mapping, never a second parse: the value the gate judged is the value the
// award engine ranks. It carries ONLY
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
  /**
   * ALREADY PARSED (CP-0 · W1 · 2e-a). The caller reads the typed price ONCE
   * through `readBidPrice` (→ the one legal `normalizeQty`) and passes the
   * number it judged. This builder deliberately cannot see the raw string, so
   * it cannot re-derive a second, disagreeing reading of the supplier's bid —
   * the defect that let "1.500" reach the award engine as 1.5, and let an
   * unreadable token reach it as `|| 0` → Rp 0.
   */
  unitPrice: number;
  /**
   * ALREADY PARSED, IN DAYS (CP-0 · W1 · 2e-b). The caller reads the typed lead
   * time ONCE through `readLeadTimeDays` — which also applies the days/weeks
   * conversion — and passes the whole number of days it judged. It used to
   * arrive as raw text and be coerced here with `Number(...) || 0`, on the
   * portal's OTHER live-scored axis: an unreadable token became a zero lead
   * time, which `scoreQuotations` cannot score and silently forfeits.
   */
  leadTimeDays: number;
  validUntil: string;
  paymentTermsOffered?: string;
  /**
   * The supplier's minimum order quantity, in the RFQ's unit of measure. It was
   * collected by the form and then dropped here (2e-FIND-02) — a real bid
   * CONSTRAINT the buyer never saw. `null`/absent = the supplier stated no
   * minimum of their own (the field's documented blank default); interpreting
   * or enforcing it against the RFQ quantity is a later batch's question.
   */
  moq?: number | null;
  notes?: string;
}

/** Build the `t_quotation_submit` payload from the quote draft. Every number
 * is passed through UNTOUCHED — each was parsed and gated upstream, and a
 * refusal never gets this far, so as of 2e-b this builder has NO coercion left
 * at all: not one `Number(...)`, not one `|| 0` to fabricate a fact nobody
 * stated. No id, number, or status — those are STORE-assigned on create. */
export function buildQuotationSubmitPayload(
  draft: QuotationSubmitDraft,
): Record<string, unknown> {
  return {
    rfqId: draft.rfqId,
    supplierId: draft.supplierId,
    unitPrice: draft.unitPrice,
    leadTimeDays: draft.leadTimeDays,
    validUntil: draft.validUntil,
    paymentTermsOffered: draft.paymentTermsOffered ?? '',
    // Omitted when the supplier stated no minimum — an ABSENT constraint, which
    // is a different fact from a stated minimum of 0 and must not be flattened
    // into one. Same discipline as `notes`.
    ...(draft.moq == null ? {} : { moq: draft.moq }),
    ...(draft.notes ? { notes: draft.notes } : {}),
  };
}

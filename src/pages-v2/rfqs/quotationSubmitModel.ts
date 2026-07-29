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
   * ALREADY PARSED, IN DAYS, and OPTIONAL (CP-0 · W1 · 2e-b-1). The caller reads
   * the typed lead time ONCE through `readLeadTimeDays` — which also applies the
   * days/weeks conversion — and passes the whole number of days it judged, or
   * `null` when the supplier stated none.
   *
   * It used to arrive as raw text and be coerced here with `Number(...) || 0`.
   * On an axis where 0 is the BEST score, that turned every unreadable token
   * into a maximum lead-time score — a parse artifact outranking real delivery
   * promises. There is no coercion left to do it with.
   */
  leadTimeDays: number | null;
  validUntil: string;
  paymentTermsOffered?: string;
  notes?: string;
}

/** Build the `t_quotation_submit` payload from the quote draft. The price is
 * passed through UNTOUCHED — it was parsed and gated upstream, and a refusal
 * never gets this far, so there is no `|| 0` left to fabricate a bid nobody
 * made. No id, number, or status — those are STORE-assigned on create. */
export function buildQuotationSubmitPayload(
  draft: QuotationSubmitDraft,
): Record<string, unknown> {
  return {
    rfqId: draft.rfqId,
    supplierId: draft.supplierId,
    unitPrice: draft.unitPrice,
    // Omitted when the supplier stated no lead time — an ABSENT promise, which
    // the engine drops the axis for. Flattening it into a 0 would make silence
    // the best possible lead-time score. Same discipline as `notes`.
    ...(draft.leadTimeDays == null ? {} : { leadTimeDays: draft.leadTimeDays }),
    validUntil: draft.validUntil,
    paymentTermsOffered: draft.paymentTermsOffered ?? '',
    ...(draft.notes ? { notes: draft.notes } : {}),
  };
}

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

import type { BidCurrency } from '../../lib/currencyPolicy';
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';

/**
 * The dispatcher's rejection string for the currency policy (2e-c-2). Built FROM
 * the hook-name constant, never retyped: a renamed hook must not be able to
 * silently detach the supplier's message from the refusal it explains.
 */
const CURRENCY_REFUSAL = `POLICY_REJECTED:${POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED}:`;

/**
 * Did this dispatch fail because the bid currency is not permitted?
 *
 * `CommandResult.reason` is documented as MACHINE-readable, and the submit toast
 * has always shown it verbatim — so an off-list currency would greet the
 * supplier with `POLICY_REJECTED:quotation_submit_currency_permitted:…` in both
 * languages. The policy's own English reason stays authoritative for the audit
 * trail; this lets the surface say the same thing in the supplier's language.
 * The caller names the currency from its OWN form state rather than scraping it
 * back out of this string — the token is not re-parsed out of its own error
 * message.
 */
export function isCurrencyRefusal(reason?: string): boolean {
  return reason?.startsWith(CURRENCY_REFUSAL) ?? false;
}

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
   * The currency `unitPrice` is denominated in (CP-0 · 2e-c-2). REQUIRED, and
   * deliberately not optional-with-a-default: a price is a number AND a
   * currency, and a builder that can mint the number without the currency is a
   * builder that can mint a bid nobody made. Until this batch the form
   * collected a currency and this draft had no field for it, so an EUR 3.00 bid
   * was stored as a rupiah 3 — dropped at the boundary, then contradicted by
   * every surface that read it back.
   *
   * Narrow by construction (`BidCurrency`, derived from `BID_CURRENCIES` in
   * 2e-c-1), so the type refuses an off-list currency here and the policy hook
   * refuses one that arrives by any path that skips this builder.
   */
  currency: BidCurrency;
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
  /**
   * ALREADY PARSED and OPTIONAL (CP-0 · W1 · 2e-b-2). The caller reads the typed
   * minimum order quantity ONCE through `readMoq` and passes the number it
   * judged, or `null` when the supplier stated no minimum ("same as the RFQ
   * quantity", the field's documented default).
   *
   * It used to arrive nowhere at all: the form collected it and this builder was
   * never given it, so a stated minimum — the constraint that decides whether an
   * awarded quote can be ordered at the quantity being sourced — was discarded
   * between the supplier typing it and the quotation being minted (FIND-02).
   */
  moq: number | null;
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
    // ALWAYS emitted — never conditional, unlike `leadTimeDays` / `moq` / `notes`
    // above. Those are facts a supplier may honestly not state, and absence is a
    // real answer. A price has no such reading: every bid is denominated in
    // something, so an absent currency is a dropped fact rather than a stated
    // silence, and the flow's `requiredFields` refuses it.
    currency: draft.currency,
    // Omitted when the supplier stated no lead time — an ABSENT promise, which
    // the engine drops the axis for. Flattening it into a 0 would make silence
    // the best possible lead-time score. Same discipline as `notes`.
    ...(draft.leadTimeDays == null ? {} : { leadTimeDays: draft.leadTimeDays }),
    // Omitted when the supplier stated no minimum — an ABSENT constraint, which
    // reads as "same as the RFQ quantity". A 0 here would be a different claim
    // (a minimum of nothing), and it is not the one silence makes. Same
    // discipline as `notes`; the difference from before is that a STATED
    // minimum now survives this boundary at all (2e-b-2).
    ...(draft.moq == null ? {} : { moq: draft.moq }),
    validUntil: draft.validUntil,
    paymentTermsOffered: draft.paymentTermsOffered ?? '',
    ...(draft.notes ? { notes: draft.notes } : {}),
  };
}

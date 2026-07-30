// ────────────────────────────────────────────────────────────────────────────
// invoiceAmountModel (CP-0 · W1 · 2f-d) — the ONE read of the new-invoice
// amount.
//
// 2f-FIND-04, and this row SURVIVED its body-read: the guard at
// `SupplierInvoices.submitNewInvoice` really is real —
// `!Number.isFinite(amount) || amount <= 0` refuses NaN, a blank-as-zero, a
// typed zero and a negative, BEFORE any dispatch. Nothing was fabricated. So
// unlike 2f-a/b/c this batch is not closing a zero-fabrication; it is closing
// the one thing a finiteness guard structurally cannot see.
//
// THE SAME SEAM AS 2f-c, FROM THE OTHER SIDE. `deriveMatchVerdict` compares
// TWO operands: `expectedValue` (Σ confirmedQty × unitPrice, from the PO) and
// `inv.amount` (from here). 2f-c stopped a misread confirmed quantity from
// poisoning the first; this stops a misread amount poisoning the second. Either
// one produces the SAME false accusation against a supplier — an honest invoice
// booked as 'Price Variance' — so the two batches close both inputs to one
// verdict. A future seat should read them as one seam defended twice.
//
// What got through: "1.500" → `Number` reads 1.5 → finite ✓, positive ✓ → the
// guard waves it past → an Rp 1,500 invoice is stored as Rp 1.5. The guard was
// never wrong; it was answering a different question ("is this a number?")
// than the one that mattered ("is this THE number the supplier typed?").
//
// BLANK: this field is UNSEEDED and starts empty, so an untouched blank is the
// 2e-a case, not the 2f-a/2f-c case — it refuses at the gate (submit stays
// disabled) and says so on the field only once the supplier has typed
// something. It does not nag on sight.
//
// A TYPED ZERO parses intact and is refused by the pre-existing `> 0` rule,
// PRESERVED VERBATIM — whether a zero-value invoice is legal is a commercial
// question, not a parsing one. What changes is that the rule now says so
// instead of failing mute (the 2f-b `mustExceedZero` treatment).
//
// PURE and DOM-free.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

export type InvoiceAmountOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

/**
 * Read the new-invoice amount.
 *
 * No convention `hint`: a supplier's own invoice form carries no origin signal,
 * so a token legal under both readings ("1.500" = 1500 or 1.5) REFUSES rather
 * than being guessed. Negatives need no branch — `normalizeQty` rejects a
 * leading `-` as NOT_NUMERIC before any convention is considered.
 *
 * Holds NO domain rule: the `> 0` requirement stays where it already lived, in
 * the surface's submit gate. This answers only what was typed.
 */
export function readInvoiceAmount(raw: string): InvoiceAmountOutcome {
  const parsed = normalizeQty(raw);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, reason: parsed.reason };
}

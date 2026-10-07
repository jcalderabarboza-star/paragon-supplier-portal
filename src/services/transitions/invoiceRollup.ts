// ────────────────────────────────────────────────────────────────────────────
// Invoice match rollup (v2.2 Step 4 batch iii — census G2, DR-7 ruling 1).
//
// The 3-way match is the invoice's parallel sub-axis (`invoiceMatch.flow.ts`).
// Its rolled-up terminal is carried on the canonical invoice as `matchStatus`
// and surfaced on the buyer read as a computed projection (ruling 1: matchStatus
// is a read-layer concern, not a stored second lifecycle). This module is the
// ONE home for the rollup predicate, so the SAME computation gates the header
// advance (the `invoice_rollup_matched` policy hook on `t_invoice_match`) — the
// header can never assert `Matched` against a mismatched line.
// ────────────────────────────────────────────────────────────────────────────

import type {
  Invoice,
  InvoiceStatus,
  GRStatus,
  InvoiceMatchBasis,
  InvoiceMatchCause,
} from '../data/types';

/** True when the match sub-flow has rolled up to a clean 3-way `Matched`. */
export function isMatched(inv: Invoice): boolean {
  return inv.matchStatus === 'Matched';
}

// ── 3-way match verdict ───────────────────────────────────────────────────────
// The three verdicts a match can write on an invoice. A subset of
// `InvoiceMatchStatus` (the pre-receipt states 'Pending' / 'Pending GR' are not
// verdicts a match yields).
export type MatchVerdict = 'Matched' | 'Qty Mismatch' | 'Price Variance';

/**
 * Provisional relative tolerance, as a fraction of the ORDER's value: an invoice
 * may run over what is payable by up to this much and still match. A placeholder
 * business rule — the real AP tolerance policy (per-category / absolute floors)
 * is the SE Team's match engine.
 */
export const MATCH_TOLERANCE = 0.01; // 1%

// ── OPS-1 · WHAT THE MATCH READS ─────────────────────────────────────────────
//
// ⚠️ **THE VERDICT USED TO COMPARE ONE INVOICE'S TOTAL TO THE ORDER'S VALUE AND
// NOTHING ELSE, AND IT RELEASED MONEY ON THAT.** Measured in the browser at
// `26c7fd6` (R-OPS): PO-2025-00105, 2,500 of 5,000 kg received, two invoices of
// Rp 2.0B each — both read "Matched — PO, GR and invoice quantities + prices all
// reconcile", both were approved, both were released. The receipt contributed
// one boolean ("any line rejected") and a second invoice was compared to the
// whole order as if the first did not exist.
//
// The rule now, ruled by the operator: **an invoice is matched only while it
// fits inside what was RECEIVED AND ACCEPTED on the PO, less what earlier
// invoices on that PO already claimed.** Three numbers, all at the PO's own
// unit prices:
//
//   ordered   Σ confirmed quantity × unit price
//   received  Σ accepted quantity × unit price, over posted receipts, each PO
//             line capped at its confirmed quantity (an over-delivery is not an
//             order for more)
//   already   Σ of the OTHER invoices on the PO that are matched or further
//
// An invoice carries a total and no lines, so the match can say that the total
// runs over and which ceiling it ran over; it cannot say which line or which
// unit price. The causes below say exactly that much and no more.

/** A PO line, as much of it as the match reads. Real `POLineItem` satisfies it. */
export interface MatchOrderLine {
  readonly materialCode: string;
  readonly quantity: number;
  readonly confirmedQty: number;
  readonly unitPrice: number;
}

/** A receipt line, as much of it as the match reads. Real `InspectionResult` satisfies it. */
export interface MatchReceiptLine {
  readonly materialCode: string;
  readonly qtyAccepted: number;
}

/** Σ confirmed quantity × unit price — what the supplier agreed to deliver, at PO prices. */
export function orderedValueOf(lines: readonly MatchOrderLine[]): number {
  return lines.reduce((sum, li) => sum + li.confirmedQty * li.unitPrice, 0);
}

/** Σ ordered quantity × unit price — what the PO's own lines come to. */
export function poLineTotalOf(lines: readonly MatchOrderLine[]): number {
  return lines.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
}

/**
 * The value received and accepted, at PO prices. Accepted quantity is pooled per
 * material across every receipt line given, then handed to the PO's lines in
 * order, each line taking no more than its confirmed quantity. A material the PO
 * does not carry earns nothing.
 */
export function receivedValueOf(
  lines: readonly MatchOrderLine[],
  receiptLines: readonly MatchReceiptLine[],
): number {
  const pool = new Map<string, number>();
  for (const r of receiptLines) {
    if (!(r.qtyAccepted > 0)) continue;
    pool.set(r.materialCode, (pool.get(r.materialCode) ?? 0) + r.qtyAccepted);
  }
  let value = 0;
  for (const li of lines) {
    const left = pool.get(li.materialCode) ?? 0;
    const taken = Math.min(left, Math.max(0, li.confirmedQty));
    pool.set(li.materialCode, left - taken);
    value += taken * li.unitPrice;
  }
  return value;
}

/** Which verdict each cause is shown as. */
export const VERDICT_OF_CAUSE: Readonly<Record<InvoiceMatchCause, MatchVerdict>> = Object.freeze({
  WITHIN: 'Matched',
  EXCEEDS_RECEIVED: 'Qty Mismatch',
  ALREADY_INVOICED: 'Qty Mismatch',
  EXCEEDS_ORDER: 'Price Variance',
});

/**
 * The cause, from the three numbers. PURE — no store reads, no clock.
 *
 *   • fits inside (received − already)                 → WITHIN
 *   • above the whole order's value                    → EXCEEDS_ORDER
 *     (the only case shown as a PRICE variance: the total is above every
 *     confirmed quantity at its PO price, whatever was received or invoiced)
 *   • would fit what was received, but earlier invoices
 *     on the PO have already claimed it                → ALREADY_INVOICED
 *   • otherwise it is more than was received           → EXCEEDS_RECEIVED
 */
export function deriveMatchCause(n: {
  orderedValue: number;
  receivedValue: number;
  alreadyInvoiced: number;
  invoiced: number;
}): InvoiceMatchCause {
  const tol = MATCH_TOLERANCE * Math.max(0, n.orderedValue);
  if (n.orderedValue > 0 && n.invoiced <= n.receivedValue - n.alreadyInvoiced + tol) return 'WITHIN';
  if (n.invoiced > n.orderedValue + tol) return 'EXCEEDS_ORDER';
  if (n.alreadyInvoiced > 0 && n.invoiced <= n.receivedValue + tol) return 'ALREADY_INVOICED';
  return 'EXCEEDS_RECEIVED';
}

/** True when the PO's stated total and the sum of its own lines disagree beyond tolerance. */
export function poTotalDisagrees(basis: Pick<InvoiceMatchBasis, 'poStatedTotal' | 'poLineTotal'>): boolean {
  if (!(basis.poLineTotal > 0)) return false;
  return Math.abs(basis.poStatedTotal - basis.poLineTotal) > MATCH_TOLERANCE * basis.poLineTotal;
}

/**
 * Invoice states that have CLAIMED part of the PO: matched, or anything after
 * it. `Submitted` has claimed nothing yet, and `Disputed` / `Draft` claim
 * nothing while they stand.
 */
export const INVOICE_CLAIMING_STATES: readonly InvoiceStatus[] = Object.freeze([
  'Matched',
  'Approved',
  'Releasing Payment',
  'Payment Released',
  'Remittance Received',
]);

/** The minimum an invoice must expose to be matched. Real `Invoice` satisfies it. */
export interface MatchableInvoice {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly status: InvoiceStatus;
  readonly amount: number;
  readonly submittedDate: string;
}

export interface MatchResult {
  readonly invoiceId: string;
  readonly verdict: MatchVerdict;
  readonly basis: InvoiceMatchBasis;
}

/**
 * Match every invoice on ONE purchase order that is awaiting a verdict.
 *
 * `invoices` is every invoice on the PO, in any state. Those in a claiming
 * state count as already invoiced; those awaiting a match are taken OLDEST
 * FIRST (submitted date, then invoice number), and one that matches claims its
 * amount before the next is looked at — so of two invoices for the same goods
 * the first is matched and the second is held, whichever order they were stored
 * in. Nothing else is returned: an invoice in any other state has no verdict to
 * receive.
 */
export function matchInvoicesOnPo(
  order: { readonly lines: readonly MatchOrderLine[]; readonly statedTotal: number },
  receiptLines: readonly MatchReceiptLine[],
  invoices: readonly MatchableInvoice[],
): readonly MatchResult[] {
  const orderedValue = orderedValueOf(order.lines);
  const receivedValue = receivedValueOf(order.lines, receiptLines);
  const poLineTotal = poLineTotalOf(order.lines);
  // ⚠️ **AN AMOUNT THAT IS NOT A POSITIVE NUMBER IS NEVER MATCHED AND NEVER
  // COUNTED.** The submit verb requires `amount` and checks nothing about it, so
  // a caller that bypasses the form can submit zero, a negative or `NaN`. A
  // negative amount would fit inside any ceiling, come out `Matched`, and then
  // REDUCE what is already invoiced — making room for a second invoice the PO
  // has no goods for. Such an invoice is given no verdict (it keeps what it
  // had), and a claiming invoice adds nothing below zero.
  const payable = (amount: number): boolean => Number.isFinite(amount) && amount > 0;
  let alreadyInvoiced = invoices
    .filter((i) => INVOICE_CLAIMING_STATES.includes(i.status) && payable(i.amount))
    .reduce((sum, i) => sum + i.amount, 0);
  const awaiting = invoices
    .filter((i) => i.status === INVOICE_AWAITING_MATCH && payable(i.amount))
    .slice()
    .sort(
      (a, b) =>
        a.submittedDate.localeCompare(b.submittedDate) ||
        a.invoiceNumber.localeCompare(b.invoiceNumber),
    );
  const out: MatchResult[] = [];
  for (const inv of awaiting) {
    const cause = deriveMatchCause({ orderedValue, receivedValue, alreadyInvoiced, invoiced: inv.amount });
    out.push({
      invoiceId: inv.id,
      verdict: VERDICT_OF_CAUSE[cause],
      basis: {
        orderedValue,
        receivedValue,
        alreadyInvoiced,
        invoiced: inv.amount,
        cause,
        poStatedTotal: order.statedTotal,
        poLineTotal,
      },
    });
    if (cause === 'WITHIN') alreadyInvoiced += inv.amount;
  }
  return out;
}

// ── THE PAIRING, BOTH DIRECTIONS ─────────────────────────────────────────────
//
// ⚠️ **WHY THIS EXISTS: THE PAIRING WAS REAL AND UNNAMED, AND AN UNNAMED
// RELATION CAN ONLY BE ASKED IN THE DIRECTION SOMEBODY HAPPENED TO WRITE.** The
// GR-post cascade resolver carried the whole relation inline, as one clause of a
// `for` loop in `MockCommandService.resolveCascades`:
//
//     if (inv.poNumber !== gr.poNumber || inv.status !== 'Submitted') continue;
//
// That clause IS the pairing. Living inside the receipt-side resolver, it could
// only ever answer *"which invoices does this receipt match?"* — so the mirror
// question, *"which receipt does this invoice match?"*, had no home and no test,
// and **an invoice that arrives after its receipt is matched by nothing.**
// Extracting the relation is what makes the second question askable at all.
//
// ⚠️ **THE TWO DIRECTIONS ARE NOT SYMMETRICAL, AND THE ASYMMETRY IS THE PART
// WORTH READING — IT IS NOT AN OVERSIGHT TO BE TIDIED AWAY LATER.**
// `invoicesForReceipt` deliberately does **NOT** filter on the receipt's own
// status, and it must not: it is called from the `t_gr_post` cascade, which runs
// POST-APPLY, so the receipt's state at that moment is the SAP interim
// `'Posting to SAP'` and not `'Posted to SAP'`. **The landing is the caller's
// premise there** — the receipt is landing, that is why the resolver is running.
// The invoice direction has no such premise and therefore has to ASK, which is
// why only `receiptsForInvoice` consults `RECEIPT_LANDED_STATES`. Adding a
// receipt-status filter to the receipt direction would silently empty the live
// cascade; `invoiceMatchPairing.test.ts` pins that both ways.
//
// ⚠️ **THE INVOICE DIRECTION IS DISPATCHED SINCE OPS-1, AND THE THREE RULINGS IT
// WAITED ON ARE MADE.** Until then `receiptsForInvoice` had a test and no caller,
// so an invoice arriving after its receipt was matched by nothing. The questions
// that held it back, and what was ruled:
//
//   1. **WHICH receipt**, when a PO carries more than one posted receipt — ALL
//      of them. The match pools accepted quantity across every posted receipt on
//      the PO (`receivedValueOf`), so there is nothing to choose.
//   2. **THE OVERWRITE** — a later receipt used to overwrite an earlier verdict.
//      The verdict is now recomputed from every posted receipt and every invoice
//      on the PO each time (`matchInvoicesOnPo`), so the last writer and the
//      first agree by construction.
//   3. **THE SECOND ENTRANCE** — `t_invoice_resolve` returns an invoice to
//      `Submitted` exactly as `t_invoice_submit` puts it there. Both are cascade
//      sources (`cascades.ts`), so a resolved dispute is matched again.

/** The minimum an invoice must expose to be paired. Real `Invoice` satisfies it. */
export interface PairableInvoice {
  readonly poNumber: string;
  readonly status: InvoiceStatus;
}

/** The minimum a receipt must expose to be paired. Real `GoodsReceipt` satisfies it. */
export interface PairableReceipt {
  readonly poNumber: string;
  readonly status: GRStatus;
}

/**
 * The invoice state a match verdict is written FOR. Not a list: the header
 * advance `t_invoice_match` is `from: ['Submitted']`, so any other state is one
 * the verdict could not be acted on from.
 */
export const INVOICE_AWAITING_MATCH: InvoiceStatus = 'Submitted';

/**
 * Receipt states in which the goods have LANDED — i.e. a receipt an invoice can
 * be matched against after the fact.
 *
 * ⚠️ **THE NARROWEST HONEST READING, AND THE ALTERNATIVES ARE NAMED RATHER THAN
 * SILENTLY EXCLUDED.** `'Posted to SAP'` is the settled state — the material
 * document exists. `'Posting to SAP'` is the Option-B interim: the act is in
 * flight and no document has been minted, so treating it as landed would assert
 * a receipt that has not settled. `'Approved'` / `'Partially Approved'` mean
 * INSPECTED, not received into SAP. Widening this set is a RULING and not a
 * derivation.
 */
export const RECEIPT_LANDED_STATES: readonly GRStatus[] = Object.freeze(['Posted to SAP']);

/**
 * OPS-1 — the receipt states THE MATCH reads, from either direction.
 *
 * ⚠️ **WIDER THAN `RECEIPT_LANDED_STATES` BY ONE STATE, ON PURPOSE.** The receipt
 * direction has always matched at the POSTING act — its cascade runs while the
 * receipt is `'Posting to SAP'`, before SAP settles. If the invoice direction
 * read only settled receipts, an invoice submitted in that interim would be
 * matched by neither: the posting has already run, and the settlement runs no
 * match. So both directions read the same two states and agree. The exposure is
 * the one the receipt direction already carried — a posting that never settles
 * stays `'Posting to SAP'` with its retry — and it is not widened to inspected
 * receipts (`'Approved'` / `'Partially Approved'`), which are not receipts into
 * SAP at all.
 */
export const RECEIPT_MATCHABLE_STATES: readonly GRStatus[] = Object.freeze([
  'Posting to SAP',
  'Posted to SAP',
]);

/**
 * RECEIPT → INVOICES. Which invoices does this receipt match?
 *
 * The shipped GR-post direction, extracted verbatim: same PO, and awaiting a
 * verdict. **Deliberately does not read `receipt.status`** — see the asymmetry
 * note above; the caller's premise is that this receipt is landing.
 */
export function invoicesForReceipt<I extends PairableInvoice>(
  receipt: PairableReceipt,
  invoices: readonly I[],
): readonly I[] {
  return invoices.filter(
    (inv) => inv.poNumber === receipt.poNumber && inv.status === INVOICE_AWAITING_MATCH,
  );
}

/**
 * INVOICE → RECEIPTS. Which receipts can this invoice be matched against?
 *
 * The mirror, and the direction the tree could not ask before. Same PO, and the
 * receipt must have LANDED — because here nothing has established that it did.
 * Returns every candidate rather than choosing one: **choosing is a ruling this
 * function must not make silently** (see (1) above).
 */
export function receiptsForInvoice<R extends PairableReceipt>(
  invoice: PairableInvoice,
  receipts: readonly R[],
  states: readonly GRStatus[] = RECEIPT_LANDED_STATES,
): readonly R[] {
  return receipts.filter((gr) => gr.poNumber === invoice.poNumber && states.includes(gr.status));
}

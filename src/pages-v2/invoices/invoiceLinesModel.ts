// ────────────────────────────────────────────────────────────────────────────
// E2E-2 · THE NEW-INVOICE FORM'S LINES.
//
// The form used to take an order number and a free-typed amount. It now opens
// on the order's own lines — material, the order's unit price, and the
// quantity received and accepted against each — and the supplier may LOWER a
// quantity and never raise it past what was accepted. The amount is the lines'
// total; it is not typed.
//
// What this module owns is the READ of what was typed, once, so the inline
// message, the button and the dispatched payload cannot disagree
// (`invoiceAmountModel`'s rule, applied to a quantity). The ceiling itself is
// `services/data/orderReceipt.ts`'s, which the dispatcher's hook also calls.
//
// PURE and DOM-free.
// ────────────────────────────────────────────────────────────────────────────

import type { QtyRefusalReason } from '../../lib/localeNumber';
import type { InvoiceLineItem } from '../../services/data/types';
import type { InvoicePrefillLine } from '../../services/data/orderReceipt';
import { readInvoiceAmount } from './invoiceAmountModel';

/** Why a typed quantity is not one the invoice may state. */
export type InvoiceQtyRefusal = QtyRefusalReason | 'EXCEEDS_RECEIVED';

export type InvoiceQtyRead =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: InvoiceQtyRefusal };

/** What a line's quantity field opens on: the accepted quantity, as plain digits. */
export function openingQty(line: Pick<InvoicePrefillLine, 'maxQty'>): string {
  return String(line.maxQty);
}

/**
 * Read one typed quantity against its ceiling.
 *
 * The untouched opening value is taken AS the ceiling without re-parsing it: a
 * quantity the form itself wrote must never be refused as ambiguous by the
 * parser that guards what a person types. Everything else goes through the same
 * parser the amount did — a blank is not zero, "1.500" refuses — and is then
 * held to the ceiling. Zero is a legal line: the supplier is not invoicing it.
 */
export function readInvoiceQty(raw: string, maxQty: number): InvoiceQtyRead {
  if (raw === String(maxQty)) return { ok: true, value: maxQty };
  const parsed = readInvoiceAmount(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  if (parsed.value > maxQty) return { ok: false, reason: 'EXCEEDS_RECEIVED' };
  return parsed;
}

export type InvoiceDraftRead =
  | { readonly ok: true; readonly lines: InvoiceLineItem[]; readonly amount: number }
  | { readonly ok: false };

/**
 * The invoice the form would raise: every line read, none refused, and at least
 * one invoicing a quantity above zero. Lines left at zero are stated as zero
 * rather than dropped, so the record shows the supplier chose not to invoice
 * them.
 */
export function readInvoiceDraft(
  lines: readonly InvoicePrefillLine[],
  typed: Readonly<Record<string, string>>,
): InvoiceDraftRead {
  const out: InvoiceLineItem[] = [];
  for (const l of lines) {
    const r = readInvoiceQty(typed[l.materialCode] ?? openingQty(l), l.maxQty);
    if (!r.ok) return { ok: false };
    out.push({ materialCode: l.materialCode, qty: r.value, unitPrice: l.unitPrice });
  }
  if (!out.some((l) => l.qty > 0)) return { ok: false };
  return { ok: true, lines: out, amount: out.reduce((s, l) => s + l.qty * l.unitPrice, 0) };
}

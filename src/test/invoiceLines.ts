// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 — AN INVOICE STATES ITS LINES (operator ruling, 9 October 2026).
//
// `t_invoice_create` refuses an invoice that states none
// (`INVOICE_LINES_REQUIRED`). Specs that raise an invoice to get at something
// ELSE — its dates, its match, its approval — need the payload the invoice form
// would send, and this builds it from the SHIPPED read (`invoiceLinesFor`): the
// order's lines at the order's prices, each at its ceiling — the confirmed
// quantity before a receipt is posted, the accepted quantity after.
//
// Nothing here is a second implementation of the ceiling. A spec about the
// ceiling itself states its lines by hand.
// ─────────────────────────────────────────────────────────────────────────────
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { invoiceLinesFor, invoiceLinesTotal } from '../services/data/orderReceipt';
import type { InvoiceLineItem } from '../services/data/types';

export interface InvoiceCreatePayload extends Record<string, unknown> {
  poReference: string;
  amount: number;
  lines: InvoiceLineItem[];
}

/** The payload the invoice form opens on for `poNumber`, read from the stores as they stand. */
export function fullInvoicePayload(poNumber: string): InvoiceCreatePayload {
  const po = purchaseOrderStore.all().find((p) => p.poNumber === poNumber);
  if (!po) throw new Error(`fullInvoicePayload: no order ${poNumber}`);
  const lines = invoiceLinesFor(po, goodsReceiptStore.all())
    .filter((l) => l.maxQty > 0)
    .map((l) => ({ materialCode: l.materialCode, qty: l.maxQty, unitPrice: l.unitPrice }));
  if (lines.length === 0) throw new Error(`fullInvoicePayload: nothing can be invoiced on ${poNumber}`);
  return { poReference: poNumber, amount: invoiceLinesTotal(lines), lines };
}

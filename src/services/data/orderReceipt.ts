// ────────────────────────────────────────────────────────────────────────────
// E2E-2 · WHAT WAS RECEIVED ON AN ORDER, DERIVED FROM THE POSTED RECEIPTS.
//
// Found on the end-to-end walk: after the goods were received, invoiced and
// paid, the order still read Confirmed with nothing stamped, the ship notice
// still read Submitted on both sides, the supplier was still offered "Create
// ASN", and the invoice form took an order number and a free-typed amount.
//
// The order's status is SAP's to move (orders are raised and closed in S/4),
// so nothing here writes to an order or a ship notice. Everything below is a
// READ over the receipts the portal already holds, and the surfaces that show
// it say that the official order status is kept in SAP.
//
// ── ONE ARITHMETIC ───────────────────────────────────────────────────────────
// "Received" means what the three-way match means by it: the receipts posting
// or posted to SAP (`RECEIPT_MATCHABLE_STATES`), their ACCEPTED quantity pooled
// per material and handed to the order's lines in order, each line taking no
// more than its confirmed quantity (`acceptedPerOrderLine`, the function the
// match's own `receivedValueOf` is built on). A second calculation here would
// let the order page, the invoice form and the match disagree about one fact.
//
// PURE: no store, no clock, no i18n. The caller passes the receipts it read —
// a buyer reads every supplier's, a supplier reads its own (`applySupplierScope`).
// ────────────────────────────────────────────────────────────────────────────

import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import type { InvoiceLineItem, PurchaseOrder } from './types';
import {
  RECEIPT_LANDED_STATES,
  RECEIPT_MATCHABLE_STATES,
  acceptedPerOrderLine,
  receiptsForInvoice,
} from '../transitions/invoiceRollup';

/** One receipt, as much of it as an order or a ship notice shows. */
export interface ReceiptRef {
  readonly grNumber: string;
  readonly asnNumber: string;
  readonly receivedDate: string;
  /** Σ accepted over the receipt's lines — on an order, only the order's materials. */
  readonly accepted: number;
  /** Σ rejected over the same lines. */
  readonly rejected: number;
  /**
   * How many materials those lines carry. The two sums above add quantities of
   * DIFFERENT materials when this is more than one, so a surface shows them
   * only for a single material and the count otherwise. Zero on an order means
   * the receipt names the order and carries none of its materials.
   */
  readonly materials: number;
  /** The SAP material document, once SAP has assigned one. */
  readonly sapMaterialDoc?: string;
  /** `true` once posted; `false` while the posting is still with SAP. */
  readonly settled: boolean;
}

/** One order line with what was received and accepted against it. */
export interface ReceivedOrderLine {
  readonly materialCode: string;
  readonly description: string;
  readonly uom: string;
  readonly unitPrice: number;
  /** The quantity the supplier confirmed — what "fully received" is measured against. */
  readonly confirmedQty: number;
  /** Accepted against this line, never more than `confirmedQty`. */
  readonly accepted: number;
}

export interface OrderReceived {
  /** The receipts read, oldest first. Empty = nothing received yet. */
  readonly receipts: readonly ReceiptRef[];
  readonly lines: readonly ReceivedOrderLine[];
  /**
   * Every line that confirmed a quantity has had all of it accepted. An order
   * with no confirmed quantity at all is NOT fully received: nothing was agreed
   * to deliver, so there is nothing it could have fully received.
   */
  readonly fullyReceived: boolean;
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * `onOrder` narrows the receipt to the materials of the order it is shown on: a
 * receipt can carry a material the order does not, and its quantity is not this
 * order's. Absent (a ship notice has no order's lines to narrow to), every line
 * of the receipt is read.
 */
const toRef = (gr: GoodsReceipt, onOrder?: ReadonlySet<string>): ReceiptRef => {
  const lines = onOrder
    ? gr.inspectionResults.filter((l) => onOrder.has(l.materialCode))
    : gr.inspectionResults;
  return {
  grNumber: gr.grNumber,
  asnNumber: gr.asnNumber,
  receivedDate: gr.receivedDate,
  accepted: sum(lines.map((l) => Math.max(0, l.qtyAccepted))),
  rejected: sum(lines.map((l) => Math.max(0, l.qtyRejected))),
  materials: new Set(lines.map((l) => l.materialCode)).size,
  ...(gr.sapMaterialDoc ? { sapMaterialDoc: gr.sapMaterialDoc } : {}),
  settled: RECEIPT_LANDED_STATES.includes(gr.status),
  };
};

const oldestFirst = (a: GoodsReceipt, b: GoodsReceipt): number =>
  a.receivedDate === b.receivedDate
    ? a.grNumber.localeCompare(b.grNumber)
    : a.receivedDate.localeCompare(b.receivedDate);

/** The receipts on one order that count as received — posting or posted to SAP. */
export function receiptsOnOrder(
  poNumber: string,
  receipts: readonly GoodsReceipt[],
): readonly GoodsReceipt[] {
  return [
    ...receiptsForInvoice({ poNumber, status: 'Submitted' }, receipts, RECEIPT_MATCHABLE_STATES),
  ].sort(oldestFirst);
}

/** What was received on an order: the receipts, and each line's accepted quantity. */
export function receivedOnOrder(
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  receipts: readonly GoodsReceipt[],
): OrderReceived {
  const mine = receiptsOnOrder(po.poNumber, receipts);
  const accepted = acceptedPerOrderLine(
    po.lineItems,
    mine.flatMap((g) => g.inspectionResults),
  );
  const lines = po.lineItems.map((li, i) => ({
    materialCode: li.materialCode,
    description: li.description,
    uom: li.uom,
    unitPrice: li.unitPrice,
    confirmedQty: Math.max(0, li.confirmedQty),
    accepted: accepted[i],
  }));
  const owed = lines.filter((l) => l.confirmedQty > 0);
  return {
    receipts: mine.map((g) => toRef(g, new Set(po.lineItems.map((li) => li.materialCode)))),
    lines,
    fullyReceived: owed.length > 0 && owed.every((l) => l.accepted >= l.confirmedQty),
  };
}

/** The receipts recorded against one ship notice, oldest first. */
export function receiptsOfNotice(
  asnNumber: string,
  receipts: readonly GoodsReceipt[],
): readonly ReceiptRef[] {
  return receipts
    .filter((g) => g.asnNumber === asnNumber && RECEIPT_MATCHABLE_STATES.includes(g.status))
    .sort(oldestFirst)
    .map((g) => toRef(g));
}

// ── THE INVOICE'S LINES ──────────────────────────────────────────────────────

/** One line the invoice form opens on: the order's price, and the most that may be invoiced. */
export interface InvoicePrefillLine {
  readonly materialCode: string;
  readonly description: string;
  readonly uom: string;
  readonly unitPrice: number;
  /** Accepted against this order line — the ceiling, and what the form opens on. */
  readonly maxQty: number;
}

/** The lines an invoice on this order opens on. A line with nothing accepted is kept, at zero. */
export function invoiceLinesFor(
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  receipts: readonly GoodsReceipt[],
): readonly InvoicePrefillLine[] {
  return receivedOnOrder(po, receipts).lines.map((l) => ({
    materialCode: l.materialCode,
    description: l.description,
    uom: l.uom,
    unitPrice: l.unitPrice,
    maxQty: l.accepted,
  }));
}

/** A line as an invoice states it — the stored shape (`types.InvoiceLineItem`). */
export type InvoiceLine = InvoiceLineItem;

export type InvoiceLinesRefusal =
  | { readonly code: 'INVOICE_LINES_MALFORMED' }
  | { readonly code: 'INVOICE_LINE_NOT_ON_ORDER'; readonly materialCode: string }
  | { readonly code: 'INVOICE_LINE_PRICE_NOT_ORDER_PRICE'; readonly materialCode: string; readonly orderPrice: number }
  | { readonly code: 'INVOICE_LINE_EXCEEDS_RECEIVED'; readonly materialCode: string; readonly qty: number; readonly maxQty: number }
  | { readonly code: 'INVOICE_NOTHING_INVOICED' }
  | { readonly code: 'INVOICE_AMOUNT_NOT_LINES_TOTAL'; readonly amount: number; readonly linesTotal: number };

/** Σ quantity × unit price over the stated lines. */
export function invoiceLinesTotal(lines: readonly InvoiceLine[]): number {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

/** Read `payload.lines` as invoice lines, or `null` when it is not a list of them. */
export function asInvoiceLines(value: unknown): InvoiceLine[] | null {
  if (!Array.isArray(value)) return null;
  const out: InvoiceLine[] = [];
  for (const row of value) {
    if (typeof row !== 'object' || row === null) return null;
    const r = row as Record<string, unknown>;
    if (typeof r.materialCode !== 'string' || r.materialCode === '') return null;
    if (typeof r.qty !== 'number' || !Number.isFinite(r.qty) || r.qty < 0) return null;
    if (typeof r.unitPrice !== 'number' || !Number.isFinite(r.unitPrice) || r.unitPrice < 0) return null;
    out.push({ materialCode: r.materialCode, qty: r.qty, unitPrice: r.unitPrice });
  }
  return out;
}

/**
 * MAY AN INVOICE STATE THESE LINES? The supplier may invoice less than was
 * accepted and never more. Each line is on the order, at the order's price,
 * for no more than was accepted against that line; at least one line invoices
 * something; and the amount is the lines' total.
 *
 * ONE predicate: the form asks it per keystroke and the dispatcher's hook asks
 * it again, so the form cannot admit what the dispatcher refuses. Whether the
 * invoice then MATCHES is still the match's question, not this one's.
 */
export function invoiceLinesRefusal(
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  receipts: readonly GoodsReceipt[],
  lines: readonly InvoiceLine[],
  amount: number,
): InvoiceLinesRefusal | null {
  const allowed = invoiceLinesFor(po, receipts);
  const seen = new Set<string>();
  for (const l of lines) {
    // A material stated twice would let two lines each claim the whole ceiling.
    if (seen.has(l.materialCode)) return { code: 'INVOICE_LINES_MALFORMED' };
    seen.add(l.materialCode);
    const cap = allowed.find((a) => a.materialCode === l.materialCode);
    if (!cap) return { code: 'INVOICE_LINE_NOT_ON_ORDER', materialCode: l.materialCode };
    if (l.unitPrice !== cap.unitPrice) {
      return { code: 'INVOICE_LINE_PRICE_NOT_ORDER_PRICE', materialCode: l.materialCode, orderPrice: cap.unitPrice };
    }
    if (l.qty > cap.maxQty) {
      return { code: 'INVOICE_LINE_EXCEEDS_RECEIVED', materialCode: l.materialCode, qty: l.qty, maxQty: cap.maxQty };
    }
  }
  if (!lines.some((l) => l.qty > 0)) return { code: 'INVOICE_NOTHING_INVOICED' };
  const linesTotal = invoiceLinesTotal(lines);
  if (Math.abs(linesTotal - amount) > 0.005) {
    return { code: 'INVOICE_AMOUNT_NOT_LINES_TOTAL', amount, linesTotal };
  }
  return null;
}

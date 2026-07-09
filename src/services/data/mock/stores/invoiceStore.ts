// ────────────────────────────────────────────────────────────────────────────
// Mutable invoice store (v2.2 Step 4 batch iii — DR-7).
//
// The ONE home for canonical invoices. Both persona reads project from here
// (getSupplierInvoices / getBuyerInvoices), so the two surfaces can never drift.
// Same contract as purchaseOrderStore / goodsReceiptStore: reads resolve from
// here, commands mutate IMMUTABLY (new object + new array) so an invalidated
// query yields new references and every derivation re-derives together. Keyed by
// `id`; creation ADDS a new invoice with a store-assigned number.
//
// `nextFiDoc()` / `nextPaymentRef()` mint the SAP references for a payment — but
// ONLY settlement calls them (Option B). Before settle a `Releasing Payment`
// invoice carries NO FI document ("pending SAP assignment"); this is the honest
// replacement for any client-side "paid" fabrication (law 0.6).
// ────────────────────────────────────────────────────────────────────────────

import { INVOICES } from '../fixtures/invoices';
import type { Invoice } from '../../types';

function clone(i: Invoice): Invoice {
  return { ...i };
}

let rows: Invoice[] = INVOICES.map(clone);
let seq = 0;
let fiSeq = 0;
let paySeq = 0;

export const invoiceStore = {
  all(): readonly Invoice[] {
    return rows;
  },
  get(id: string): Invoice | undefined {
    return rows.find((i) => i.id === id);
  },
  /** Immutable update — swap in a new invoice + new array (see purchaseOrderStore). */
  update(id: string, next: (i: Invoice) => Invoice): void {
    rows = rows.map((i) => (i.id === id ? next(i) : i));
  },
  /** Add a newly-created invoice (creation). New array reference. */
  add(invoice: Invoice): void {
    rows = [invoice, ...rows];
  },
  /** Store-assigned invoice number for a creation (no client-side fabrication). */
  nextNumber(): string {
    seq += 1;
    return `INV-2026-${9000 + seq}`;
  },
  /** SAP-assigned FI (financial) document — minted only on payment settlement. */
  nextFiDoc(): string {
    fiSeq += 1;
    return `FI-${5100011000 + fiSeq}`;
  },
  /** Payment reference — minted only on payment settlement. */
  nextPaymentRef(): string {
    paySeq += 1;
    return `PAY-2026-${95000 + paySeq}`;
  },
  reset(): void {
    rows = INVOICES.map(clone);
    seq = 0;
    fiSeq = 0;
    paySeq = 0;
  },
};

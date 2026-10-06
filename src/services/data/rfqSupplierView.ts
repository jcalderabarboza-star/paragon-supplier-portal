// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · WHAT ONE SUPPLIER MAY READ OF A SOURCING EVENT.
//
// The supplier read used to return the buyer's own row: the whole invite list,
// the list of who had answered, the winner's id and quotation id, the rate
// ledger (which says another bidder priced in dollars) and the buyer's budget.
// No surface rendered them, which is not the same as not sending them — the
// rows crossed the tenancy boundary and sat in the supplier's cache.
//
// AN ALLOWLIST, NOT A STRIP. Every field below is named; a field added to `RFQ`
// tomorrow reaches no supplier until someone adds it here. A strip is the other
// way round: it leaks every new field by default.
//
// The three "who" lists are kept as fields and narrowed to the reader itself,
// so the supplier's surfaces keep asking the questions they already ask ("am I
// invited", "have I answered", "did I win") and get their own answer only.
// `src2SupplierScope.test.ts` fails if any other supplier's id reaches a
// supplier scope through a sourcing read.
// ────────────────────────────────────────────────────────────────────────────

import type { RFQ } from '../../data/mockRfqs';

export function toSupplierRfqView(rfq: RFQ, supplierId: string): RFQ {
  const mine = (ids: readonly string[]): string[] => (ids.includes(supplierId) ? [supplierId] : []);
  const won = rfq.awardedSupplierId === supplierId;
  return {
    id: rfq.id,
    rfqNumber: rfq.rfqNumber,
    title: rfq.title,
    materialCategory: rfq.materialCategory,
    materialIds: [...rfq.materialIds],
    buyerId: rfq.buyerId,
    status: rfq.status,
    createdAt: rfq.createdAt,
    responseDeadline: rfq.responseDeadline,
    awardDeadline: rfq.awardDeadline,
    invitedSupplierIds: mine(rfq.invitedSupplierIds),
    respondedSupplierIds: mine(rfq.respondedSupplierIds),
    totalQty: rfq.totalQty,
    uom: rfq.uom,
    currency: rfq.currency,
    incoterms: rfq.incoterms,
    paymentTerms: rfq.paymentTerms,
    // The day an award was made is the event's fact; who won is the winner's.
    ...(rfq.awardedAt ? { awardedAt: rfq.awardedAt } : {}),
    ...(won && rfq.awardedSupplierId ? { awardedSupplierId: rfq.awardedSupplierId } : {}),
    ...(won && rfq.awardedQuotationId ? { awardedQuotationId: rfq.awardedQuotationId } : {}),
  };
}

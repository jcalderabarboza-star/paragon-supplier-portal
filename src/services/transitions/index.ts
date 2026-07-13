// ────────────────────────────────────────────────────────────────────────────
// Transition schema — public barrel (v2.2 Step 3.1).
//
// Importing this module also SEEDS the process-wide registry with every shipped
// flow, so `getKnownFlows()` reflects the loaded machine set. Registration is a
// one-time side effect (ES module single-eval); import this barrel — not the
// bare `registry` module — when you want the seeded view.
// ────────────────────────────────────────────────────────────────────────────

export * from './schema';
export * from './validate';
export * from './registry';
export * from './policyHooks';
export * from './roles';
export * from './events';
export * from './dispatcher';
// Importing ./policies binds the policy-hook implementations (side effect).
export * from './policies';
export * from './grRollup';
export * from './invoiceRollup';
export * from './cascades';
export { purchaseOrderFlow } from './flows/purchaseOrder.flow';
export { advanceShipNoticeFlow } from './flows/advanceShipNotice.flow';
export { goodsReceiptFlow } from './flows/goodsReceipt.flow';
export { goodsReceiptLineFlow } from './flows/goodsReceiptLine.flow';
export { invoiceFlow } from './flows/invoice.flow';
export { invoiceMatchFlow } from './flows/invoiceMatch.flow';
export { rfqFlow } from './flows/rfq.flow';
export { quotationFlow } from './flows/quotation.flow';
export { shipmentFlow } from './flows/shipment.flow';
export { contractFlow } from './flows/contract.flow';
export { obligationFlow } from './flows/obligation.flow';
export { purchaseRequisitionFlow } from './flows/purchaseRequisition.flow';
export { supplierDocumentFlow } from './flows/supplierDocument.flow';
export { complianceFlow } from './flows/compliance.flow';

import { flowRegistry } from './registry';
import { purchaseOrderFlow } from './flows/purchaseOrder.flow';
import { advanceShipNoticeFlow } from './flows/advanceShipNotice.flow';
import { goodsReceiptFlow } from './flows/goodsReceipt.flow';
import { goodsReceiptLineFlow } from './flows/goodsReceiptLine.flow';
import { invoiceFlow } from './flows/invoice.flow';
import { invoiceMatchFlow } from './flows/invoiceMatch.flow';
import { rfqFlow } from './flows/rfq.flow';
import { quotationFlow } from './flows/quotation.flow';
import { shipmentFlow } from './flows/shipment.flow';
import { contractFlow } from './flows/contract.flow';
import { obligationFlow } from './flows/obligation.flow';
import { purchaseRequisitionFlow } from './flows/purchaseRequisition.flow';
import { supplierDocumentFlow } from './flows/supplierDocument.flow';
import { complianceFlow } from './flows/compliance.flow';

// Seed the shipped flows onto the singleton.
flowRegistry.register(purchaseOrderFlow); // Step 3.1 — PO
flowRegistry.register(advanceShipNoticeFlow); // Step 4 (i) — ASN
flowRegistry.register(goodsReceiptFlow); // Step 4 (ii) — GR header
flowRegistry.register(goodsReceiptLineFlow); // Step 4 (ii) — GR line sub-flow (census G2)
flowRegistry.register(invoiceFlow); // Step 4 (iii) — Invoice (DR-7 canonical)
flowRegistry.register(invoiceMatchFlow); // Step 4 (iii) — Invoice match sub-flow (census G2)
flowRegistry.register(rfqFlow); // Step 4 (iv) — RFQ (cascade source: t_rfq_award)
flowRegistry.register(quotationFlow); // Step 4 (iv) — Quotation (cascade targets: award/reject)
// F0.4 — the 5 remaining lifecycle machines (census #2/#7/#8/#9/#10). Author-
// unwired: inert registry data, NO CommandTarget, wired per Stage-2 surface
// (FORK-2 hybrid). Phase 2′ exit: contract-complete, not behavior-complete.
flowRegistry.register(shipmentFlow); // census #2 — Shipment (TMS-owned, INT-TMS-01)
flowRegistry.register(contractFlow); // census #7 — Contract
flowRegistry.register(obligationFlow); // census #8 — Obligation
flowRegistry.register(purchaseRequisitionFlow); // census #9 — Purchase requisition
flowRegistry.register(supplierDocumentFlow); // census #10 — Supplier document
// I3.1 — the ONE canonical compliance machine (census #11–15, the 5 fragmented
// vocabularies collapsed). Author-unwired: inert registry data, NO CommandTarget
// (LivenessRegistry derives SIMULATED); wires against the real cert registry post
// Track-R harvest. NO creation edge — `Missing` is the natural born-state.
flowRegistry.register(complianceFlow); // census #11–15 — Compliance (canonical)

// ────────────────────────────────────────────────────────────────────────────
// Quotation flow — v2.2 Step 4 batch (iv).
//
// The supplier's response to an RFQ. Its two terminal transitions are the
// CASCADE TARGETS of `t_rfq_award` (build plan line 91): on award, the winning
// quotation fires `t_quotation_award` and every other fires `t_quotation_reject`
// — driven by the dispatcher cascade, one event per transition (each correlatable
// to the source award via `causationId`, DR-10).
//
// `t_quotation_submit` (creation, supplier) + `t_quotation_review` (buyer) are
// AUTHORED-UNWIRED this batch — the supplier quote-submit verb lands in its own
// batch; here we wire only the award-path (award + reject). `states` lists
// transition-states only.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const quotationFlow: FlowDefinition = {
  entity: 'quotation',
  version: 1,
  states: ['Submitted', 'Under Review', 'Awarded', 'Rejected'],
  initial: 'Submitted',
  transitions: [
    {
      // Supplier submits a quotation against an invited RFQ. Creation-shape
      // (store-assigned number). WIRED in Task 3b. The required floor is the
      // rfqId + the ONE fact without which there is no offer at all — unitPrice.
      //
      // `leadTimeDays` LEFT this floor in CP-0 2e-b-1 (operator ruling): a lead
      // time is OPTIONAL, and an omitted one is an honest absence the scoring
      // engine drops the axis for — not a hollow quote. Requiring it pushed
      // suppliers toward putting *something* in the box, which is exactly how a
      // parse artifact became a governed delivery promise.
      id: 't_quotation_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'quotation:submit',
      requiredFields: ['rfqId', 'unitPrice'],
      policyHooks: [],
      version: 1,
    },
    {
      // Buyer moves a submitted quote into evaluation. WIRED in Task 3b.
      id: 't_quotation_review',
      from: ['Submitted'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'quotation:review',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // CASCADE TARGET (this batch, WIRED) — the winning quote on RFQ award.
      id: 't_quotation_award',
      from: ['Submitted', 'Under Review'],
      to: 'Awarded',
      trigger: 'cascade',
      requiredRole: 'quotation:award',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // CASCADE TARGET (this batch, WIRED) — every non-winning quote on RFQ award.
      id: 't_quotation_reject',
      from: ['Submitted', 'Under Review'],
      to: 'Rejected',
      trigger: 'cascade',
      requiredRole: 'quotation:reject',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

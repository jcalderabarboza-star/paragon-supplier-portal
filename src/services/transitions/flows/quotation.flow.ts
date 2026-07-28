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
      // rfqId + the two facts that make an offer COMPARABLE — what it costs and
      // when it arrives.
      //
      // `leadTimeDays` briefly left this floor in 2e-b-1 and is RESTORED in
      // 2e-b-1a (operator ruling, commercial): a price with no delivery promise
      // is an INCOMPLETE bid, and ranking it on price alone hides the delivery
      // risk that can make the cheapest quote the worst outcome. The reason it
      // was removed — that requiring it pushed suppliers to put *something* in
      // the box, which a `|| 0` then turned into a governed promise — is now
      // answered at the input instead: the box refuses what it cannot read
      // rather than defaulting it.
      id: 't_quotation_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'quotation:submit',
      requiredFields: ['rfqId', 'unitPrice', 'leadTimeDays'],
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

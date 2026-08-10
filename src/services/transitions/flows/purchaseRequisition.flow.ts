// ────────────────────────────────────────────────────────────────────────────
// Purchase-requisition flow (F0.4 — census #9). Author-unwired.
//
// The buyer-internal intake machine (suppliers never see PRs): a requisition is
// drafted, submitted for approval, approved or rejected, then flows onward to a
// sourcing event or a created PO. `t_pr_source` / `t_pr_convert` carry the
// `cascade` trigger as METADATA ONLY — they DECLARE that a raised RFQ / issued
// PO will advance the PR, but NO cascade link is authored in cascades.ts, so
// nothing fires them yet (declaration, not emission). All roles → buyer.
//
// No clock projection (census: 6 event-states, all real).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const purchaseRequisitionFlow: FlowDefinition = {
  entity: 'purchaseRequisition',
  version: 1,
  states: [
    'Draft',
    'Pending Approval',
    'Approved',
    'Sourcing Event',
    'PO Created',
    'Rejected',
  ],
  initial: 'Draft',
  /** PF-0 · D-2 — 'Rejected' is deliberately absent: a rejected requisition has
   *  no resolution edge, and `t_invoice_resolve` proves the intended pattern
   *  exists elsewhere. It is a hole, not an ending (censused). */
  terminals: ['PO Created'],
  transitions: [
    {
      id: 't_pr_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'pr:create',
      requiredFields: ['material', 'quantity'],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_pr_submit',
      from: ['Draft'],
      to: 'Pending Approval',
      trigger: 'user',
      requiredRole: 'pr:submit',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_pr_approve',
      from: ['Pending Approval'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'pr:approve',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_pr_reject',
      from: ['Pending Approval'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'pr:reject',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Cascade METADATA only — a raised RFQ advances an approved PR. No link
      // authored (declaration, not emission).
      id: 't_pr_source',
      from: ['Approved'],
      to: 'Sourcing Event',
      trigger: 'cascade',
      requiredRole: 'pr:source',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Cascade METADATA only — an issued PO closes the PR. No link authored.
      id: 't_pr_convert',
      from: ['Approved', 'Sourcing Event'],
      to: 'PO Created',
      trigger: 'cascade',
      requiredRole: 'pr:convert',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

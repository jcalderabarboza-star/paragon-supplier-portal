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
      // ⚠️ NO REASON IS REQUIRED, and PF-1a did not change that
      // (`PF1A-PR-REJECT-HAS-NO-REASON-01`, OPEN). It is the OTHER half of "a
      // rejected requisition teaches the requester nothing" — the revise edge
      // below fixes the recourse, not the explanation. Adding a required field
      // to a shipped verb is a contract change with its own blast radius and it
      // was not ruled, so it is reported rather than smuggled in beside this.
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // ⚠️ PF-1a — REVISE-AND-RESUBMIT, and the destination is the whole ruling.
      //
      // A BARE REOPEN (Rejected → Pending Approval) WAS REFUSED BY THE OPERATOR:
      // a requisition that returns to the approval queue unchanged teaches the
      // requester nothing and teaches the approver less — they see the same
      // document they already declined. Landing at `Draft` puts it back in the
      // REQUESTER'S hands, and the existing `t_pr_submit` is what returns it to
      // the queue. The two-step IS the revision: nothing reaches an approver
      // again without somebody deliberately re-submitting it.
      //
      // `revisionNote` is REQUIRED because that is the only part of this the
      // approver could not otherwise see. It carries what changed — not why it
      // was rejected, which nothing records (see the note on `t_pr_reject`).
      //
      // A DISTINCT ROLE (`pr:revise`), not `pr:submit`: revising a rejected
      // requisition and drafting a new one are different acts, and the first is
      // the requester's alone. Reusing submit would make "may raise a PR" and
      // "may reopen a declined one" the same permission.
      id: 't_pr_revise',
      from: ['Rejected'],
      to: 'Draft',
      trigger: 'user',
      requiredRole: 'pr:revise',
      requiredFields: ['revisionNote'],
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

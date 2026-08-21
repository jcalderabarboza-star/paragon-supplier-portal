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
import { POLICY_HOOKS } from '../policyHooks';

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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_pr_reject',
      from: ['Pending Approval'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'pr:reject',
      // ⚠️ **`PF1A-PR-REJECT-HAS-NO-REASON-01` IS CLOSED HERE, AND IT IS A
      // CONTRACT CHANGE TAKEN DELIBERATELY.** PF-1a reported it rather than
      // smuggling it in, on the ground that adding a required field to a shipped
      // verb has its own blast radius and had not been ruled. It has now been
      // ruled (§67): a rejection a requester cannot understand is the dispute
      // lane's defect one lane over, and the revise edge below repairs the
      // RECOURSE while leaving the EXPLANATION missing.
      //
      // ⚠️ **TWO GUARDS, NOT ONE, AND THE SECOND IS WHAT MAKES THE FIRST MEAN
      // ANYTHING.** `requiredFields` runs `isEmpty`, and `isEmpty('   ')` is
      // FALSE — so is `isEmpty(0)` and `isEmpty(false)`. Presence alone admits
      // the space bar, a number and an object. `PR_REJECT_REASON_AUTHORED` is
      // the `RR_DISPUTE_TEXT_AUTHORED` guard applied here verbatim: it proves a
      // NON-BLANK STRING. Neither can prove the text is true or responsive — no
      // value-level guard can, exactly as the qty floor cannot tell 2400 from
      // 2.4 — and that limit is stated rather than papered over.
      requiredFields: ['rejectionReason'],
      policyHooks: [POLICY_HOOKS.PR_REJECT_REASON_AUTHORED],
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
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
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of approval routing (cascade), decided by the ' +
          'source-of-supply data rather than by a person choosing it here.',
      },
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
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of approval routing (cascade): an approved ' +
          'requisition with a PIR becomes a PO.',
      },
      version: 1,
    },
  ],
};

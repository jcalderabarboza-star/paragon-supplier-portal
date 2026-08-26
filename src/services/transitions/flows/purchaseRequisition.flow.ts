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
      // ⚠️ **SURFACED AT §68, AND THE VERB WAS NEVER UNBUILT — it had been
      // authored, registered and dispatchable since F0.4 with ZERO call sites,
      // exactly as approve/reject were before §67.**
      //
      // It is NOT a creation verb and the distinction is the whole ruling. It
      // is the REQUESTER'S ACT ON A DOCUMENT THAT ALREADY EXISTS: `t_pr_create`
      // (C7 :131) mints the Draft, and this carries that same document into the
      // queue. Surfacing it puts no second producer beside the ratified C7 seam
      // — it adds no way to originate a requisition at all.
      //
      // AND IT IS THE VERB THAT MAKES THE SEGREGATION REAL RATHER THAN
      // NOTIONAL: `pr:submit` lives in `requisitioner` and `pr:approve` lives
      // in `procurement`, so until something dispatched this, the two-sided
      // machine only ever ran one side and the bundles' disjointness was a
      // property nothing exercised.
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
      // ⚠️ **THE APPROVAL RECORDS WHO DECIDED IT, AND THE ATTRIBUTION IS NOT A
      // REQUIRED FIELD — THAT IS THE RULING, NOT AN OMISSION.**
      //
      // The obvious build was `requiredFields: ['approvedBy']` behind a hook,
      // mirroring `t_enforcement_set`'s `['mode', 'setBy']`. C10 §6.2 names
      // that shape ATTRIBUTION BY ASSERTION — the caller states who acted and
      // the platform records the statement — and permits it on `setBy` for one
      // reason only: nothing can construct a `RESOLVED` actor yet. Copying it
      // onto a second verb would have doubled the seam that must be closed
      // before the first resolved record exists, in the batch whose whole point
      // was to close it.
      //
      // So the actor comes from the SESSION (`QueryScope.actor`), and
      // `PR_APPROVAL_ATTRIBUTED` REFUSES A PAYLOAD-SUPPLIED ONE BY NAME —
      // §6.2's second half, built here for the first time.
      id: 't_pr_approve',
      from: ['Pending Approval'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'pr:approve',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.PR_APPROVAL_ATTRIBUTED],
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
      // ⚠️ **AND UNTIL §68 THE NOTE WENT NOWHERE.** The requirement above has
      // been enforced since PF-1a — a dispatch without it fails MISSING_FIELDS
      // — and `applyTransition` then dropped the text before the document was
      // written. The same four-part repair the rejection reason got: required
      // field, non-blank hook, persisted, read back. `isEmpty('   ')` is FALSE,
      // so the hook is what stops "what changed" being the space bar.
      requiredFields: ['revisionNote'],
      policyHooks: [POLICY_HOOKS.PR_REVISION_NOTE_AUTHORED],
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

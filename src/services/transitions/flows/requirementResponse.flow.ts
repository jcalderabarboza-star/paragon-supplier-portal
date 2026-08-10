// ────────────────────────────────────────────────────────────────────────────
// RequirementResponse flow — SDC-2a (the P1 supplier-submission spine).
//
// The supplier's governed confirmation against a published forecast line
// (design v2 §4; SDC-0 types.ts `RequirementResponse`). Mirrors the quotation
// machine EXACTLY: `t_requirementresponse_submit` is the ONE supplier-owned
// CREATION verb (WIRED this batch — see MockCommandService's
// `requirementResponseTarget`); the buyer-side lifecycle (review / accept /
// dispute) and the draft-promotion edge are AUTHORED-UNWIRED (FORK-2 hybrid:
// author all, wire per Stage-2 surface). `Draft` is a declared state because
// the SDC-0 seed carries one (rr-0003) and the design names Draft → Submitted;
// the wired creation verb births directly at 'Submitted' — drafts are
// client-side form state, exactly as quotes (Task 3b precedent).
//
// CHANNEL-AGNOSTIC (DEC-COMMS-PRIMARY): t_requirementresponse_submit is the
// SHARED write-path for BOTH the portal surface (SDC-2b) and the future
// Communication Hub channel-ingestion — never bake in a portal-only assumption.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const requirementResponseFlow: FlowDefinition = {
  entity: 'requirementResponse',
  version: 1,
  states: ['Draft', 'Submitted', 'UnderReview', 'Accepted', 'Disputed'],
  initial: 'Submitted',
  /** PF-0 · D-2 — 'Disputed' is deliberately absent: it has no resolution edge
   *  and is a hole, not an ending (censused). */
  terminals: ['Accepted'],
  transitions: [
    {
      // Supplier confirms a published forecast line. Creation-shape (store-
      // assigned id). WIRED (SDC-2a). The required floor is the SNAPSHOT
      // BINDING + the one confirmed fact: publicationId + planVersion +
      // materialCode + periodBucket identify the exact fanned line answered
      // (design §4 "binds planVersion"), and confirmedQty is the response.
      // confirmedQty: 0 is LEGAL (isEmpty(0)=false) — "cannot supply at all,
      // with a root cause" is a legitimate short confirmation (ruling F-2).
      // uom is NEVER a payload field — the target copies it from the material
      // master (invariant #2).
      id: 't_requirementresponse_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'requirementresponse:submit',
      requiredFields: [
        'publicationId',
        'planVersion',
        'materialCode',
        'periodBucket',
        'confirmedQty',
      ],
      // The planVersion the payload claims must be the referenced publication's
      // own planVersion — a response can never bind a snapshot that isn't the
      // one it answered (membership itself is folded into creationOwner). The
      // class guard (SDC-2b-EXT) rejects a visibility-only line: nothing was
      // requested to commit there — the acknowledge verb is its channel.
      policyHooks: [
        // CP-2 · B1 — the master must name the code (D-OPS-MASTERMISS). The
        // confirmation this verb stores carries a UNIT; a unit the master
        // cannot name is refused rather than defaulted.
        POLICY_HOOKS.SDC_MATERIAL_KNOWN,
        POLICY_HOOKS.RR_SUBMIT_PLANVERSION_BOUND,
        POLICY_HOOKS.RR_SUBMIT_COMMITMENT_CLASS,
      ],
      version: 1,
    },
    {
      // SDC-2b-EXT — the VISIBILITY response (WIRED). Paragon constantly
      // requests supplier updates to maintain visibility (DEC-COMMS-PRIMARY);
      // a visibility-only line carries no commitment ask, so its response is
      // an ACKNOWLEDGMENT (+ optional free-text signal) — deliberately NO
      // confirmedQty on the floor (the commitment floor above stays
      // byte-identical). Same snapshot binding; the class guard makes this
      // verb legal ONLY against a visibility-only line (the symmetric lock).
      id: 't_requirementresponse_acknowledge',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'requirementresponse:acknowledge',
      requiredFields: ['publicationId', 'planVersion', 'materialCode', 'periodBucket'],
      policyHooks: [
        // Refused by NAME here too, though this branch stores no unit: the
        // ruling is about the DISPATCH, not the field — a response filed
        // against a material the master cannot resolve is not a fact we hold.
        POLICY_HOOKS.SDC_MATERIAL_KNOWN,
        POLICY_HOOKS.RR_SUBMIT_PLANVERSION_BOUND,
        POLICY_HOOKS.RR_ACKNOWLEDGE_VISIBILITY_CLASS,
      ],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — the seed Draft's legal exit (design: Draft →
      // Submitted). Wires when a server-side draft surface exists (SDC-3+);
      // today drafts live client-side and submit via the creation verb.
      id: 't_requirementresponse_promote',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'requirementresponse:submit',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — buyer moves a submitted confirmation into review
      // (the P2 planner's evaluation lane; mirrors t_quotation_review).
      id: 't_requirementresponse_review',
      from: ['Submitted'],
      to: 'UnderReview',
      trigger: 'user',
      requiredRole: 'requirementresponse:review',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — buyer accepts the reviewed confirmation.
      id: 't_requirementresponse_accept',
      from: ['UnderReview'],
      to: 'Accepted',
      trigger: 'user',
      requiredRole: 'requirementresponse:accept',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — buyer disputes it (deviation unresolved; the
      // root-cause child is where the supplier's explanation already lives).
      id: 't_requirementresponse_dispute',
      from: ['UnderReview'],
      to: 'Disputed',
      trigger: 'user',
      requiredRole: 'requirementresponse:dispute',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // ⚠️ PF-1a — THE RESOLUTION EDGE, and the CLEANEST of the three because
      // the destination is not a judgement call: `dispute` is legal from
      // `UnderReview` ALONE, so resolving returns it to the one state it can
      // have come from. `t_invoice_resolve` exactly — same authority, payload-
      // free, no cascade.
      //
      // The role is the DISPUTE role, not a new one: whoever may open a dispute
      // may close it. Splitting them would be a claim about approval authority
      // that belongs to the identity contract (C10), not to this flow.
      id: 't_requirementresponse_resolve',
      from: ['Disputed'],
      to: 'UnderReview',
      trigger: 'user',
      requiredRole: 'requirementresponse:dispute',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

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
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const requirementResponseFlow: FlowDefinition = {
  entity: 'requirementResponse',
  version: 1,
  states: ['Draft', 'Submitted', 'UnderReview', 'Accepted', 'Disputed'],
  initial: 'Submitted',
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
      // one it answered (membership itself is folded into creationOwner).
      policyHooks: [POLICY_HOOKS.RR_SUBMIT_PLANVERSION_BOUND],
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
  ],
};

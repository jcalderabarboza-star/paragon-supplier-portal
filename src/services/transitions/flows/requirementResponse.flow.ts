// ────────────────────────────────────────────────────────────────────────────
// RequirementResponse flow — SDC-2a (the P1 supplier-submission spine).
//
// The supplier's governed confirmation against a published forecast line
// (design v2 §4; SDC-0 types.ts `RequirementResponse`).
//
// ── ⚠️ PF-1b · D-1 (OPERATOR) — SUPPLIERS DRAFT TOO ────────────────────────
//   DRAFT → REVIEW → SUBMIT, the same practice as the buyer lane. The
//   commitment creation verb now births at `Draft`, and
//   `t_requirementresponse_promote` — authored and unfireable since the day it
//   was written — is the SUBMISSION.
//
//   ⚠️ **THIS REVERSES A RECORDED DECISION, NOT AN OVERSIGHT.** The header that
//   stood here said it in as many words: *"`Draft` is a declared state because
//   the SDC-0 seed carries one (rr-0003) and the design names Draft →
//   Submitted; the wired creation verb births directly at 'Submitted' — drafts
//   are client-side form state, exactly as quotes (Task 3b precedent)."*
//
//   So the contradiction PF-0 derived had an author and a reason: SDC-2a copied
//   the QUOTATION machine, which is internally consistent because IT HAS NO
//   `Draft` STATE AT ALL. This machine took the same creation shape AND kept the
//   design's `Draft` — and a state the design names, the seed populates, and no
//   verb can reach is the residue of that trade.
//
//   The operator's ruling: a supplier response carries a commitment, and a
//   commitment gets reviewed before it is sent.
//
// ── ⚠️ ACKNOWLEDGE STILL BIRTHS AT `Submitted`, AND THAT IS A DECISION ──────
//   A visibility-only line carries NO commitment ask (SDC-2b-EXT), so an
//   acknowledgment has nothing to review: there is no quantity, no date, no
//   capacity claim. A draft step there would be a ceremony around a single
//   click. THE DRAFT LANE EXISTS FOR THE RESPONSE THAT COMMITS SOMETHING.
//   Recorded as a judgement rather than left implicit — it is one word to
//   reverse if the operator wants strict symmetry.
//
// ── ⚠️ CHANNEL-AGNOSTIC, AND THE RULING TOUCHES THAT ───────────────────────
//   `t_requirementresponse_submit` is the SHARED write-path for the portal
//   surface AND the future Communication Hub channel-ingestion
//   (DEC-COMMS-PRIMARY). It now lands a DRAFT — so a channel-ingested response
//   would rest unsubmitted until something promotes it, and no channel can.
//   Booked, not solved: `PF1B-CHANNEL-INGEST-LANDS-DRAFT-01`. The Comm Hub
//   ingestion is not built, so nothing is broken today; what would be broken is
//   an ingestion built against this verb without reading this paragraph.
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
      //
      // ⚠️ PF-1b — BIRTHS AT `Draft`. The id still says `submit` and the verb now
      // creates a draft: `TransitionId` is contractually STABLE ("stable across
      // schema versions and globally unique", `schema.ts`), so renaming it is a
      // catalog change with its own ruling, not a tidy-up to slip in beside a
      // product decision. Filed as `PF1B-VERB-ID-NAMES-THE-OLD-ACT-01` rather
      // than silently corrected — a reader who trusts the id is now wrong, and
      // that is worth a register entry instead of a rename nobody agreed to.
      id: 't_requirementresponse_submit',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'requirementresponse:submit',
      requiredFields: [
        'publicationId',
        'planVersion',
        'materialCode',
        'periodBucket',
        'confirmedQty',
        // THE TOKEN THE NUMBER WAS READ FROM. Required, because the guard below
        // has nothing to check against without it — and because a payload that
        // carries a number and no token is exactly the hand-crafted dispatch
        // `isEmpty` cannot see. Presence is proven here; AGREEMENT is proven by
        // the hook, since `isEmpty('   ')` is false.
        'confirmedQtyRaw',
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
        // `requiredFields` proves PRESENCE only (the dispatcher's rule 5 is
        // `isEmpty`), so before this hook a negative, infinite or NaN
        // `confirmedQty` reached the store as a governed commitment. The floor
        // is `>= 0` — a typed 0 is the ratified F-2 short confirmation, unlike
        // the PO-confirm neighbour's `> 0`. See RR_SUBMIT_QTY_FLOOR.
        POLICY_HOOKS.RR_SUBMIT_QTY_FLOOR,
        // ORDER IS LOAD-BEARING: the floor runs FIRST and establishes that
        // `confirmedQty` is a finite non-negative NUMBER, so the agreement check
        // below can compare against it without re-proving its type. Reversed,
        // the agreement hook would be comparing a parse result against an
        // unvalidated `unknown` and would have to duplicate the floor to say so.
        POLICY_HOOKS.RR_SUBMIT_QTY_AGREES,
      ],
      surfaceable: { surfaced: true },
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
      //
      // ⚠️ PF-1b — STILL BIRTHS AT `Submitted`. See the header: nothing here is
      // reviewable, so a draft step would be ceremony around one click.
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
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ PF-1b — WIRED, AND IT IS THE SUBMISSION. The comment that stood here
      // said it "wires when a server-side draft surface exists (SDC-3+); today
      // drafts live client-side" — the ruling made the server-side draft the
      // ONLY kind, so this is that day.
      //
      // THE BUYER SEES NOTHING UNTIL THIS FIRES: `consolidationRows` skips
      // `Draft` outright, so promotion is the act that puts a commitment in
      // front of a planner rather than a status relabel. The store stamps
      // `submittedAt` HERE and not at creation — a draft has never been
      // submitted, and the SDC-0 seed's own Draft (rr-0003) already encodes that
      // invariant by carrying no `submittedAt` at all.
      id: 't_requirementresponse_promote',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'requirementresponse:submit',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer disputes it (deviation unresolved; the root-cause child is where
      // the supplier's own explanation already lives).
      //
      // ⚠️ R1b — `disputeReason` IS REQUIRED, AND THE ASYMMETRY IT CLOSES WAS WITH
      // THE NEIGHBOUR THIS MACHINE COPIED. `t_invoice_dispute` has required a
      // `disputeReason` since it was written; this verb required nothing, so a
      // supplier's commitment could be rejected with no recorded ground. The
      // gap only became a live cost at R1a, which put "awaiting Paragon" on the
      // supplier's screen — a promise of review whose outcome had no content.
      //
      // ⚠️ AND IT DOES NOT COPY THE NEIGHBOUR'S OTHER HALF, WHICH IS BROKEN.
      // `t_invoice_dispute`'s reason is required by the transition, typed into a
      // real form, carried in the payload — and then DISCARDED: `invoiceTarget`
      // writes `status` and `amount`, and `disputeReason` is on no DTO in the
      // tree. A required field nothing stores is a field that exists only in the
      // refusal message. Here the target APPENDS it to the response's ledger, so
      // the requirement and the record are the same fact. Booked against the
      // invoice lane, not fixed here: `INVOICE-DISPUTE-REASON-UNSTORED-01`.
      id: 't_requirementresponse_dispute',
      from: ['UnderReview'],
      to: 'Disputed',
      trigger: 'user',
      requiredRole: 'requirementresponse:dispute',
      requiredFields: ['disputeReason'],
      policyHooks: [POLICY_HOOKS.RR_DISPUTE_TEXT_AUTHORED],
      surfaceable: { surfaced: true },
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
      //
      // ⚠️ R1b — AND HERE THE TWIN IS DELIBERATELY NOT FOLLOWED. `t_invoice_resolve`
      // is payload-free, and the symmetry argument for copying it is real: resolving
      // returns the response to the one state it can have come from, so there is no
      // DESTINATION to justify. The operator ruled the other way, and the ruling is
      // about the SUPPLIER, not the machine: **a resolution that carries nothing
      // reports the outcome of a promised review as a bare status change.** The
      // supplier watches `Disputed` become `UnderReview` and learns nothing about
      // why. So this verb requires its own text, and it lands as a SECOND ledger
      // entry beside the raise — never over it.
      id: 't_requirementresponse_resolve',
      from: ['Disputed'],
      to: 'UnderReview',
      trigger: 'user',
      requiredRole: 'requirementresponse:dispute',
      requiredFields: ['resolutionReason'],
      policyHooks: [POLICY_HOOKS.RR_DISPUTE_TEXT_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

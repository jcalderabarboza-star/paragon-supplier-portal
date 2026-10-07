// ────────────────────────────────────────────────────────────────────────────
// Request-for-Quotation (RFQ) flow — v2.2 Step 4 batch (iv).
//
// The buyer-side sourcing machine. `t_rfq_award` is the CASCADE-CLASS verb
// (build plan line 91): awarding an RFQ fans out onto its quotations — the
// winner → Awarded, every other → Rejected — through the dispatcher's cascade
// mechanism (NOT N ad-hoc hook calls). The cascade LINKS live in `cascades.ts`;
// the mock adapter resolves WHICH quotation ids (winner from the payload, losers
// from the store). Award mints NO SAP artifact (no PO, no contract) — it records
// award metadata only; a `done` cascade, never a sapBoundary verb.
//
// Neighbors: publish / cancel / reopen are WIRED (publish since PF-1a); close
// stays authored-unwired until the sourcing boundary lands.
// `states` lists transition-states only (no clock-derived display states).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfqFlow: FlowDefinition = {
  entity: 'rfq',
  version: 1,
  // RFx-1 — THE STAGE IS NOT A STATE. An event at RFI, RFP or RFQ is Draft,
  // Open or Closed in each of them; the stage is a field the advance verb moves
  // (`data/rfqStage.ts`). Folding it into this list would triple the states and
  // every legality row with them.
  states: ['Draft', 'Open', 'Closed', 'Awarded', 'Concluded', 'Cancelled'],
  initial: 'Draft',
  /** PF-0 · D-2 — an awarded, concluded or cancelled RFQ is done. */
  terminals: ['Awarded', 'Concluded', 'Cancelled'],
  transitions: [
    {
      // CREATION verb (Phase A/2, WIRED). Buyer raises a sourcing event. Mirrors
      // t_pr_create's creation shape (creation-class member, not a new event
      // category).
      //
      // ⚠️ PF-1a · D-1 (OPERATOR) — BIRTHS AT `Draft`, AND THIS REVERSES FORK-2B.
      // Paragon's practice is DRAFT → REVIEW → PUBLISH. FORK-2B had minted
      // directly into Open (create+publish as ONE buyer action, matching the
      // prior wizard's output), which left `initial: 'Draft'` contradicting this
      // very edge, `Draft` unreachable, and `t_rfq_publish` UNFIREABLE SINCE THE
      // DAY IT WAS AUTHORED (PF-0: `PF0-RFQ-DRAFT-DEAD-01`).
      //
      // This COMPLETES A CAPABILITY THE FLOW AUTHOR SPECIFIED AND THE CREATION
      // PATH BYPASSED. It does not build a new one: publish, the Draft branch of
      // cancel, and the declared initial were all already written and
      // role-gated. What changed is the one value that made them unreachable.
      // This is the dispatcher path that
      // RETIRES the `extraRfqs` client-fabrication anti-pattern (C6 §1): the RFQ
      // is store-minted with a store-assigned number, never a fabricated peer.
      //
      // `totalQty` joined the required floor in CP-0 2e-b-4a, mirroring
      // `t_pr_create`'s `['material', 'quantity']` and
      // `t_inventorydeclaration_declare`'s `['materialCode', 'totalQty']`: the
      // quantity being sourced is what makes the event ANSWERABLE, and it is the
      // multiplicand of every quotation's `totalPrice`. An absent quantity now
      // fails MISSING_FIELDS instead of being minted as a silent 0 — the second
      // lock behind `normalizeRfqCreateDraft`, so even a hand-crafted dispatch
      // that skips the wizard cannot raise a quantity-less RFQ. `isEmpty` treats
      // only undefined/null/'' as missing, so a TYPED zero still dispatches: this
      // gate rules on absence, never on value.
      id: 't_rfq_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfq:create',
      requiredFields: ['title', 'materialCategory', 'totalQty'],
      // RFx-1 — the buyer chooses the stage the event STARTS at. Not required:
      // an event that states none starts at RFQ.
      policyHooks: [POLICY_HOOKS.RFQ_CREATE_STAGE_KNOWN],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-2 — THE BUYER WRITES THE RFI QUESTIONNAIRE ON A DRAFT. The whole
      // list is stated each time (`questions`); an empty list takes the
      // questionnaire off. STATE-PRESERVING: authoring the questions is not a
      // step in the sourcing machine.
      //
      // FROM `Draft` ONLY, and that is the rule that matters: once the event is
      // published suppliers are answering, and a question changed under them
      // would leave answers to a question nobody was asked. Legality refuses it
      // on every other state.
      //
      // It carries `rfq:create`: writing what a draft asks is drafting it. No
      // named person is required, as none is to raise the draft — publishing
      // is the act that is recorded against one.
      id: 't_rfq_questionnaire_set',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfq:create',
      // `questions` is NOT a required field: `isEmpty` reads an empty list as
      // missing, and an empty list is how a questionnaire is removed. The
      // well-formed hook refuses an absent one by name instead.
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.RFQ_QUESTIONNAIRE_AT_RFI,
        POLICY_HOOKS.RFQ_QUESTIONNAIRE_WELL_FORMED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer publishes a drafted RFQ to its invited suppliers.
      //
      // ⚠️ PF-1a — WIRED, and it is the verb that now makes a sourcing event
      // VISIBLE. Supplier RFQ reads exclude `Draft` (`MockProcurementService.
      // getRFQs`), so publication is the act that exposes the event to the
      // invited list rather than a status relabel. Unfireable from the day it
      // was authored until D-1 moved creation to `Draft`.
      //
      // ⚠️ PSL P2 — TWO HOOKS, AND **THE ORDER IS SEMANTIC, NOT COSMETIC.**
      // The dispatcher evaluates `policyHooks` in array order, so eligibility
      // is decided BEFORE any count is taken. That is what makes the operator's
      // ruling — *a refused invitee is not counted toward the competition
      // floor* — a property of the machine rather than a convention the two
      // hooks have to keep. `rfqSourcingGate.test.ts` pins this array position
      // for position; swapping the two reddens.
      id: 't_rfq_publish',
      from: ['Draft'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:publish',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE,
        POLICY_HOOKS.RFQ_PUBLISH_COMPETITION,
        // RFx-1 — last, so the three positions above stay where
        // `rfqSourcingGate.test.ts` pins them.
        POLICY_HOOKS.RFQ_PUBLISH_DEADLINE_CURRENT,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // SRC-1 — A PERSON CLOSES BIDDING. This was `system` / `computed` ("the
      // deadline elapsing") with no caller, and law 0.5 forbids the clock as a
      // trigger — so no event ever closed, and an event with one silent invitee
      // sat `Open` until it was cancelled. The deadline stays a date the board
      // projects; closing is the buyer saying "no more quotations", and a
      // scheduler may fire this same verb later (Design 3 §3.9). Award commits
      // from Open and from Closed, so closing is never a precondition of it.
      id: 't_rfq_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfq:close',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // CASCADE SOURCE (this batch, WIRED). Buyer awards the RFQ to a chosen
      // quotation; the cascade fans out onto the quotations (winner + losers).
      // requiredFields carry the award decision — set as metadata ONLY (no PO /
      // contract minted, honest-by-construction).
      id: 't_rfq_award',
      from: ['Open', 'Closed'],
      to: 'Awarded',
      trigger: 'user',
      requiredRole: 'rfq:award',
      requiredFields: ['awardedQuotationId', 'awardedSupplierId'],
      // ⚠️ PSL P2 — the two award fields are written INDEPENDENTLY from the
      // payload by the target, so nothing stopped a dispatch recording one
      // supplier as the awardee of another supplier's quotation. This hook is
      // the cross-check `requiredFields` cannot make: presence is not agreement.
      // RFx-1 — the stage is read BEFORE the awardee: an event at RFI or RFP
      // holds no quotation, so awardee integrity would refuse first with "no
      // such quotation" and the buyer would never read the real reason.
      policyHooks: [
        POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.RFQ_AWARD_AT_RFQ_STAGE,
        POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY,
        POLICY_HOOKS.RFQ_AWARD_FX_BASIS,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // CP-0 · 2e-c-3 — the buyer RECORDS the FX basis a multi-currency
      // comparison is ranked against. WIRED.
      //
      // STATE-PRESERVING: pinning a rate is not a step in the sourcing machine.
      // It is legal from Open AND Closed — `t_rfq_award` is legal from both, so
      // a comparison (and therefore a pin) must be too, and a Closed RFQ with
      // foreign bids would otherwise be permanently unrankable.
      //
      // A DISPATCHED VERB rather than a store write, because D-1 requires every
      // pin to land in the DR-10 trail: the basis a contract was awarded on is
      // exactly the kind of fact an audit asks about later. It carries a role of
      // its own (`rfq:fx-pin`, not `rfq:award`) — recording the basis and
      // choosing the winner are different authorities, and collapsing them would
      // let anyone who may compare also decide.
      //
      // The D-1 FREEZE is structural in the TARGET, not here: `applyTransition`
      // APPENDS to `fxPins` and has no update path, so a superseding rate is a
      // new entry and the prior basis is preserved by construction.
      id: 't_rfq_fx_pin',
      from: ['Open', 'Closed'],
      to: 'Open',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfq:fx-pin',
      // `rate` and `asOf` are the fact; `quote` says what it converts; `source`
      // says who says so. A rate without provenance is a number a buyer would
      // have to take on faith, and MANUAL vs SAP_EXHGRATE is precisely the
      // distinction an auditor cares about.
      requiredFields: ['quote', 'rate', 'asOf', 'source'],
      policyHooks: [POLICY_HOOKS.RFQ_FX_PIN_WELL_FORMED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-1 — THE BUYER MOVES THE EVENT TO ITS NEXT STAGE, CARRYING A
      // SHORTLIST. One act does four things, which is why it is one verb: the
      // stage moves forward by one, the invite list becomes the shortlist, the
      // next stage gets its own response deadline, and the event is Open again.
      // The advance is appended to the event's `stageHistory`, so who was
      // carried and who was left out — and why — stays readable; a supplier
      // left out reads the reason on its own card.
      //
      // FROM `Closed` ONLY. A shortlist is chosen from the suppliers who
      // answered, so the answers have to have stopped arriving: the buyer
      // closes bidding on the stage (`t_rfq_close`), then advances. That also
      // makes this a real state change (Closed → Open) rather than a verb that
      // leaves Open as Open, which a caller's `expectedState` could not see.
      id: 't_rfq_advance',
      from: ['Closed'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:advance',
      requiredFields: ['shortlistSupplierIds', 'responseDeadline'],
      policyHooks: [
        POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.RFQ_ADVANCE_HAS_NEXT_STAGE,
        POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_STATED,
        POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_RESPONDED,
        POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_COMPETITIVE,
        POLICY_HOOKS.RFQ_ADVANCE_REASON_STATED,
        POLICY_HOOKS.RFQ_ADVANCE_DEADLINE_CURRENT,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-1 — THE BUYER ENDS THE EVENT WITH NO AWARD, AND SAYS WHY. Legal at
      // every stage: an RFI that found nobody capable ends here, and so does an
      // RFQ whose quotations were all too dear. Not a cancel — the event ran.
      // Quotations still being weighed are withdrawn by cascade, as on cancel.
      id: 't_rfq_conclude',
      from: ['Open', 'Closed'],
      to: 'Concluded',
      trigger: 'user',
      requiredRole: 'rfq:conclude',
      requiredFields: ['concludeReason'],
      policyHooks: [POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED, POLICY_HOOKS.RFQ_CONCLUDE_REASON_STATED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer cancels a sourcing event before award. Authored-unwired.
      id: 't_rfq_cancel',
      from: ['Draft', 'Open', 'Closed'],
      to: 'Cancelled',
      trigger: 'user',
      requiredRole: 'rfq:cancel',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer reopens a closed RFQ for further responses. Authored-unwired.
      id: 't_rfq_reopen',
      from: ['Closed'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:reopen',
      requiredFields: [],
      // RFx-1 — reopen shares the Closed → Open edge with `t_rfq_advance`; see
      // the hook for why it refuses a payload that carries a shortlist.
      policyHooks: [POLICY_HOOKS.RFQ_REOPEN_NOT_AN_ADVANCE],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

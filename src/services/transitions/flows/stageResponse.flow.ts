// ────────────────────────────────────────────────────────────────────────────
// Stage response flow — RFx-1, RFx-2, RFx-3.
//
// A supplier's answer at the RFI or RFP stage of a sourcing event: an
// acknowledgement of interest, an optional note, at an RFI that carries a
// questionnaire (RFx-2) the answers to it, and at an RFP that sets criteria
// (RFx-3) the proposal — a response per criterion and the names of its
// documents. The proposal is content on this row, not a second machine; its
// SCORES are the buyer's and live on the event (`t_rfq_proposal_score`).
//
// TWO STATES. A response is born `Submitted` in one act, or born a `Draft` that
// its supplier re-saves and then submits. Nothing leaves `Submitted`: an answer
// is a record. A Draft is the supplier's own — the buyer's read does not carry
// it and it does not count as a response (`rfqStage.stageRespondersOf`).
// Whether the supplier was then shortlisted is a fact about the EVENT
// (`RFQ.stageHistory`), read from there.
//
// It is its own entity, not a verb on `rfq`, because the event is the buyer's:
// `rfqTarget.readScopeOwner` is null, which denies every supplier scope. A
// supplier's business with an event runs through a row the supplier owns, as it
// does for a quotation.
//
// All four verbs carry ONE atom, `stageresponse:submit`: drafting an answer and
// submitting it are the same person's work.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const stageResponseFlow: FlowDefinition = {
  entity: 'stageResponse',
  version: 1,
  states: ['Draft', 'Submitted'],
  initial: 'Draft',
  /** A submitted answer rests. */
  terminals: ['Submitted'],
  transitions: [
    {
      // CREATION, supplier-owned. The stage is NOT a payload field: the store
      // writes the stage the event is at, so an answer cannot be recorded
      // against a stage that is over or one that has not begun.
      //
      // RFx-2 — at an RFI that carries a questionnaire the payload carries
      // `answers`, and the last two hooks read them: every answer is one its
      // question takes, and every required question is answered.
      id: 't_stageresponse_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'stageresponse:submit',
      requiredFields: ['rfqId'],
      policyHooks: [
        POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN,
        POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST,
        POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE,
        POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE,
        POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED,
        // RFx-3 — at an RFP that sets criteria the payload carries `proposal`
        // and `documents`; the same pair of checks, one stage on. Appended, so
        // the six positions above stay where RFx-1 and RFx-2 pin them.
        POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-2 — CREATION AS A DRAFT. The supplier keeps what it has answered so
      // far. Everything the submit checks is checked here EXCEPT the required
      // questions: an unfinished answer is what a draft is. An answer that is
      // not one its question takes is refused even in a draft — a draft holds
      // unfinished work, not wrong work.
      id: 't_stageresponse_save',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'stageresponse:submit',
      requiredFields: ['rfqId'],
      policyHooks: [
        POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN,
        POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST,
        POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE,
        POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE,
        POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-2 — THE SUPPLIER SAVES ITS DRAFT AGAIN. The payload is the whole
      // draft as it now stands (`answers`, `note`), not a patch.
      // STATE-PRESERVING. The event and the stage are the draft's own, read
      // from the row: the payload cannot move a draft to another event.
      id: 't_stageresponse_resave',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'stageresponse:submit',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN,
        POLICY_HOOKS.STAGE_RESPONSE_DRAFT_STAGE_CURRENT,
        POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE,
        POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx-2 — THE SUPPLIER SUBMITS ITS DRAFT. The payload carries the answers
      // BEING SUBMITTED (`answers`, `note`), and those are what the two answer
      // hooks read and what the store writes — never the draft as last saved,
      // so what was checked and what was recorded cannot differ.
      id: 't_stageresponse_send',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'stageresponse:submit',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN,
        POLICY_HOOKS.STAGE_RESPONSE_DRAFT_STAGE_CURRENT,
        POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE,
        POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED,
        POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED,
        POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

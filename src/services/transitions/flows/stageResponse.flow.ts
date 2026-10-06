// ────────────────────────────────────────────────────────────────────────────
// Stage response flow — RFx-1.
//
// A supplier's answer at the RFI or RFP stage of a sourcing event. In this
// batch the answer is an ACKNOWLEDGEMENT OF INTEREST and an optional note; the
// questionnaire (RFI) and the proposal with its scoring (RFP) are RFx-2 and
// RFx-3, and they add content to this row rather than a second machine.
//
// A SINGLE-STATE MACHINE, as `inventoryDeclaration` is: the answer is born
// `Submitted` and nothing leaves it. Whether the supplier was then shortlisted
// is a fact about the EVENT (`RFQ.stageHistory`), read from there — storing it
// here too would be one fact in two places.
//
// It is its own entity, not a verb on `rfq`, because the event is the buyer's:
// `rfqTarget.readScopeOwner` is null, which denies every supplier scope. A
// supplier's business with an event runs through a row the supplier owns, as it
// does for a quotation.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const stageResponseFlow: FlowDefinition = {
  entity: 'stageResponse',
  version: 1,
  states: ['Submitted'],
  initial: 'Submitted',
  /** The answer is born where it rests. */
  terminals: ['Submitted'],
  transitions: [
    {
      // CREATION, supplier-owned. The stage is NOT a payload field: the store
      // writes the stage the event is at, so an answer cannot be recorded
      // against a stage that is over or one that has not begun.
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
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

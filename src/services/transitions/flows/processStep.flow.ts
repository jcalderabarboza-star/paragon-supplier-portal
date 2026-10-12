// ────────────────────────────────────────────────────────────────────────────
// Process step — FB-4 (Design 6 v2 §7.2). THE LEDGER OF STEPS AN ACTIVE VERSION
// ADDED, on the shape `enforcement` and `moduleActivation` already have: one
// state, acts that preserve it, an append-only store.
//
// The entity commanded is ONE STEP ON ONE DOCUMENT: `<process>:<document>:<step>`
// (`stepKey`). There is no payload field naming any of the three, so the step
// commanded and the step recorded cannot disagree.
//
// ⚠️ `step:complete` IS HELD BY EVERY BUYER-SIDE LANE, and that is not who may
// complete a step. WHICH lane completes WHICH step is the step's own `lane`,
// decided by ONE exported function (`stepOpenFor`) that the hook and the
// surface both call — the precedent the preferred-supplier gate set.
//
// ⚠️ NOTHING HERE IS CLOCK-FIRED. A step has no deadline; it is due because of
// where the document is, never because of the day.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const processStepFlow: FlowDefinition = {
  entity: 'processStep',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  /** One state and both acts preserve it: the ledger rests here by design. */
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_step_complete',
      from: ['Recorded'],
      to: 'Recorded',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'step:complete',
      // What a data-capture step asks for is the step's own list, read by the hook.
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.STEP_ACTOR_NAMED, POLICY_HOOKS.STEP_MAY_BE_TAKEN, POLICY_HOOKS.STEP_FIELDS_GIVEN],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // An approval step is declined, with the reason. The act behind it stays
      // refused, and the refusal says so; the step can be decided again.
      id: 't_step_decline',
      from: ['Recorded'],
      to: 'Recorded',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'step:complete',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.STEP_ACTOR_NAMED, POLICY_HOOKS.STEP_MAY_BE_TAKEN, POLICY_HOOKS.STEP_DECLINE_REASONED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Flow version — FB-1 (operator ruling, 12 October 2026: the Flow Builder is
// built here; it was SE-16).
//
// A CHANGE TO A PROCESS IS ITSELF A DOCUMENT WITH A LIFECYCLE, and an ordinary
// registered flow with a command target — so every act on a change goes through
// the dispatcher and leaves an event, like every other governed act.
//
// ⚠️ THIS BATCH DECLARES TWO ACTS: A DRAFT IS CREATED, AND A DRAFT IS SAVED.
// Proposing, deciding, activating and rolling back arrive with their own
// batches, each with its states. Until then `Draft` has no way out, and that is
// recorded in the loose-end census as an edge not yet authored rather than
// hidden by declaring a state nobody can reach.
//
// ⚠️ `flow:draft` IS A `compliance` ATOM (operator ruling, decision 3), beside
// the rights to grant roles and switch modules: the lane a process binds cannot
// be the lane that changes it. Admin and Super Admin hold it as they hold every
// buyer-side permission.
//
// ⚠️ A CHANGE NEVER REACHES THE REGISTRY. No flow-builder module calls
// `flowRegistry.register`; the shipped catalogue stays what the code declares
// (`noRegistryDoor` in `validateVersion.test.ts` holds it).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const FLOW_VERSION_STATES = Object.freeze(['Draft'] as const);

export const flowVersionFlow: FlowDefinition = {
  entity: 'flowVersion',
  version: 1,
  states: [...FLOW_VERSION_STATES],
  initial: 'Draft',
  /** None yet — see the header and the census row. */
  terminals: [],
  transitions: [
    {
      // A new draft against one process. The id, the label and the stamps are
      // minted by the store; `flow` and `title` are all a caller says.
      id: 't_flowversion_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'flow:draft',
      requiredFields: ['flow', 'title'],
      policyHooks: [POLICY_HOOKS.FLOWVERSION_AUTHOR_NAMED, POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Replace a draft's content. State-preserving: saving is not deciding.
      id: 't_flowversion_save',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'flow:draft',
      requiredFields: ['content'],
      policyHooks: [POLICY_HOOKS.FLOWVERSION_AUTHOR_NAMED, POLICY_HOOKS.FLOWVERSION_CONTENT_WELL_FORMED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

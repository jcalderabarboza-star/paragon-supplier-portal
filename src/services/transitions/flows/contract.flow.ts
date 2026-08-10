// ────────────────────────────────────────────────────────────────────────────
// Contract flow (F0.4 — census #7). Author-unwired.
//
// The buyer-side agreement machine: a contract is drafted, activated, optionally
// renewed, and terminated. All `user` verbs (buyer). `Renewed` is a distinct
// post-renewal state that is terminal-except-terminate (no re-activate strand);
// terminate is reachable from every non-terminal state.
//
// `Expiring` / `Expired` (endDate < clock) are read-time PROJECTIONS (law 0.5,
// census G1) of an Active/Renewed contract — NOT transition-states, so they are
// deliberately absent from `states`. The fixtures still store them as literals:
// pre-existing G1 debt, see F0.4-FIND-01 (read/DTO-v2 layer, not this batch).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const contractFlow: FlowDefinition = {
  entity: 'contract',
  version: 1,
  states: ['Draft', 'Active', 'Renewed', 'Terminated'],
  initial: 'Draft',
  /** PF-0 · D-2 — 'Renewed' is NOT an ending (it is left by terminate). */
  terminals: ['Terminated'],
  transitions: [
    {
      id: 't_contract_draft',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'contract:draft',
      requiredFields: ['supplierId', 'title'],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_contract_activate',
      from: ['Draft'],
      to: 'Active',
      trigger: 'user',
      requiredRole: 'contract:activate',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_contract_renew',
      from: ['Active'],
      to: 'Renewed',
      trigger: 'user',
      requiredRole: 'contract:renew',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Terminal-except-terminate: reachable from every non-terminal state.
      id: 't_contract_terminate',
      from: ['Draft', 'Active', 'Renewed'],
      to: 'Terminated',
      trigger: 'user',
      requiredRole: 'contract:terminate',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

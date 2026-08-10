// ────────────────────────────────────────────────────────────────────────────
// Obligation flow (F0.4 — census #8). Author-unwired.
//
// A contract obligation is tracked (creation-shape) at `In Progress` and marked
// `Completed` when met — the ONE true edge the census names. Buyer verbs.
//
// `Upcoming` (dueDate in the future) and `Overdue` (dueDate passed, not yet
// completed) are read-time PROJECTIONS (law 0.5, census G1) of an In-Progress
// obligation — NOT transition-states, so they are deliberately absent from
// `states`. The fixtures still store them as literals: pre-existing G1 debt, see
// F0.4-FIND-01 (read/DTO-v2 layer, not this batch).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const obligationFlow: FlowDefinition = {
  entity: 'obligation',
  version: 1,
  states: ['In Progress', 'Completed'],
  initial: 'In Progress',
  /** PF-0 · D-2 */
  terminals: ['Completed'],
  transitions: [
    {
      id: 't_obligation_track',
      from: [],
      to: 'In Progress',
      trigger: 'creation',
      requiredRole: 'obligation:track',
      requiredFields: ['contractId'],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_obligation_complete',
      from: ['In Progress'],
      to: 'Completed',
      trigger: 'user',
      requiredRole: 'obligation:complete',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

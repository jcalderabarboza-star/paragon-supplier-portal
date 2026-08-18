// ────────────────────────────────────────────────────────────────────────────
// Goods Receipt LINE sub-flow — v2.2 Step 4 batch (ii), census G2.
//
// The nested per-line sub-axis: each GR line runs its own tiny machine
// (Disposition × CheckResult). The GR HEADER state is a ROLLUP of these line
// states (see `grRollup.ts` + the `gr_rollup_*` hooks on `goodsReceipt.flow.ts`)
// — never a hand-maintained parallel field. Modeling the sub-axis as its own
// registered flow is what makes the header a provable derivation rather than an
// assertion, and it seeds the schema for line-level GR editing.
//
// AUTHORED + REGISTERED now (vocabulary, validation, capabilities). Per-line
// COMMAND wiring lands when a line-level GR editing surface does — the batch (ii)
// proof drives the header rollup from the finalized inspection results recorded
// at GR create (same precedent as the authored-unwired ASN logistics verbs).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const goodsReceiptLineFlow: FlowDefinition = {
  entity: 'goodsReceiptLine',
  version: 1,
  states: ['Pending', 'Inspected', 'Accepted', 'Rejected', 'Quarantined', 'Returned'],
  initial: 'Pending',
  /** PF-0 · D-2 — 'Quarantined' is deliberately absent: quarantine is a holding
   *  state awaiting a release/return edge, not an ending (censused). */
  terminals: ['Accepted', 'Rejected', 'Returned'],
  transitions: [
    {
      id: 't_grline_inspect',
      from: ['Pending'],
      to: 'Inspected',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: ['visualCheck', 'packagingCheck'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_accept',
      from: ['Inspected'],
      to: 'Accepted',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_reject',
      from: ['Inspected'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: ['rejectionReason'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_quarantine',
      from: ['Inspected'],
      to: 'Quarantined',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: ['holdReason'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_return',
      from: ['Inspected'],
      to: 'Returned',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

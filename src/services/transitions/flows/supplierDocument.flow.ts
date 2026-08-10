// ────────────────────────────────────────────────────────────────────────────
// Supplier-document flow (F0.4 — census #10). Author-unwired.
//
// The document-lifecycle substrate shared across the compliance surfaces
// (census §4): a document is requested (creation → `Awaiting Upload`, buyer), the
// supplier uploads it (→ `Under Review`), and it is verified (→ `Valid`) or
// rejected back to `Awaiting Upload`. Verify/reject are `system`-triggered (the
// verification pipeline; system transitions map to the buyer role) — a buyer
// manual re-verify rides its Stage-2 surface, not authored here.
//
// `Valid` clock-projects to `Expiring Soon` → `Expired` (expiry < clock, law 0.5,
// census G1) — those are read-time PROJECTIONS, NOT transition-states, so they
// are deliberately absent from `states`. The fixtures still store them as
// literals: pre-existing G1 debt, see F0.4-FIND-01 (read/DTO-v2 layer, not this
// batch). The one canonical compliance machine that consumes this substrate
// lands with the R2.2 DTO-v2 (HALAL-XPERSONA-01 reconciliation).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const supplierDocumentFlow: FlowDefinition = {
  entity: 'supplierDocument',
  version: 1,
  states: ['Awaiting Upload', 'Under Review', 'Valid'],
  initial: 'Awaiting Upload',
  /** PF-0 · D-2 */
  terminals: ['Valid'],
  transitions: [
    {
      id: 't_supplierdoc_request',
      from: [],
      to: 'Awaiting Upload',
      trigger: 'creation',
      requiredRole: 'supplierdoc:request',
      requiredFields: ['supplierId', 'category'],
      policyHooks: [],
      version: 1,
    },
    {
      // The supplier uploads the requested document.
      id: 't_supplierdoc_submit',
      from: ['Awaiting Upload'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'supplierdoc:submit',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // System verification pipeline (buyer role). Buyer manual re-verify rides
      // the Stage-2 surface (single primary trigger keeps the contract clean).
      id: 't_supplierdoc_verify',
      from: ['Under Review'],
      to: 'Valid',
      trigger: 'system',
      requiredRole: 'supplierdoc:verify',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_supplierdoc_reject',
      from: ['Under Review'],
      to: 'Awaiting Upload',
      trigger: 'system',
      requiredRole: 'supplierdoc:reject',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

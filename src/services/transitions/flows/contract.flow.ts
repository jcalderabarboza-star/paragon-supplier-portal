// ────────────────────────────────────────────────────────────────────────────
// Contract flow (F0.4 — census #7). Author-unwired.
//
// The buyer-side agreement machine: a contract is drafted, activated, optionally
// renewed, and terminated. `Renewed` is a distinct post-renewal state that is
// terminal-except-terminate (no re-activate strand); terminate is reachable from
// every non-terminal state.
//
// ⚠️ **EVERY EDGE IS AN EXTERNAL FACT OWNED BY S/4HANA (operator ruling).** An
// outline agreement is an SAP document exactly as a purchase order is, and this
// flow used to declare all four verbs `surfaced: true` — a standing promise that
// Paragon drafts, activates, renews and terminates contracts. It does not, and
// `BuyerContracts` has never dispatched one: the page reads fixtures and there is
// no `CommandTarget` behind it.
//
// The re-declaration is the DECLARATION half only. It says who owns the act; it
// does not yet make the surface refuse honestly, which is `CTR-FABRICATION-01`
// and a later batch. Until then the two halves disagree in the open — the machine
// says S/4HANA owns this and the page still offers it — which is the disagreement
// being VISIBLE rather than a new one being created.
//
// `t_contract_draft` keeps `trigger: 'creation'`: creation is the STRUCTURAL axis
// (an entity is born here), not a claim about who bore it — `t_po_issue` is the
// precedent and carries the identical pair. The other three move to `system`,
// which is what `trigger` means on an external fact: a statement about the SEAM
// rather than about the act (`t_asn_in_transit`'s own `why` says so).
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
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'An outline agreement is created in S/4HANA, which owns the ' +
          'contract document. Paragon receives it and collaborates around ' +
          'it; it is never where the agreement is raised.',
      },
      version: 1,
    },
    {
      id: 't_contract_activate',
      from: ['Draft'],
      to: 'Active',
      trigger: 'system',
      requiredRole: 'contract:activate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'Activation is a status change on the S/4HANA outline ' +
          'agreement. The portal reads the outcome; nobody here puts a ' +
          'contract into force.',
      },
      version: 1,
    },
    {
      id: 't_contract_renew',
      from: ['Active'],
      to: 'Renewed',
      trigger: 'system',
      requiredRole: 'contract:renew',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'A renewal extends the S/4HANA outline agreement — a new ' +
          'validity period on the SAP document. Paragon learns of it; it ' +
          'does not grant it.',
      },
      version: 1,
    },
    {
      // Terminal-except-terminate: reachable from every non-terminal state.
      id: 't_contract_terminate',
      from: ['Draft', 'Active', 'Renewed'],
      to: 'Terminated',
      trigger: 'system',
      requiredRole: 'contract:terminate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'Termination is recorded against the S/4HANA outline agreement. ' +
          'The commercial decision may be taken here, but the act that ' +
          'ends the contract is SAP’s.',
      },
      version: 1,
    },
  ],
};

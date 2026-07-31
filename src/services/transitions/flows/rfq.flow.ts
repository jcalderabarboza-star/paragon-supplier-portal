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
// Neighbors (publish / close / cancel / reopen) are AUTHORED-UNWIRED à la ASN's
// logistics verbs: real transitions in the machine, no command target this batch.
// `states` lists transition-states only (no clock-derived display states).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfqFlow: FlowDefinition = {
  entity: 'rfq',
  version: 1,
  states: ['Draft', 'Open', 'Closed', 'Awarded', 'Cancelled'],
  initial: 'Draft',
  transitions: [
    {
      // CREATION verb (Phase A/2, WIRED). Buyer raises a sourcing event. Mirrors
      // t_pr_create's creation shape (creation-class member, not a new event
      // category). FORK-2B: mints directly into Open — create+publish as ONE
      // buyer action, matching the prior wizard's Open output — so t_rfq_publish
      // (Draft→Open) stays authored-unwired. This is the dispatcher path that
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
      to: 'Open',
      trigger: 'creation',
      requiredRole: 'rfq:create',
      requiredFields: ['title', 'materialCategory', 'totalQty'],
      policyHooks: [],
      version: 1,
    },
    {
      // Buyer publishes a drafted RFQ to its invited suppliers. Authored-unwired.
      id: 't_rfq_publish',
      from: ['Draft'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:publish',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Response window ends (a Paragon-side boundary event, not a clock state).
      // Authored-unwired until the sourcing boundary lands.
      id: 't_rfq_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'system',
      requiredRole: 'rfq:close',
      requiredFields: [],
      policyHooks: [],
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
      policyHooks: [],
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
      policyHooks: [],
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
      policyHooks: [],
      version: 1,
    },
  ],
};

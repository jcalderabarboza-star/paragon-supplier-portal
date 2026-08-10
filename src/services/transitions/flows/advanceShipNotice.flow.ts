// ────────────────────────────────────────────────────────────────────────────
// Advance Ship Notice (ASN) flow — v2.2 Step 4 batch (i).
//
// The CANONICAL CREATION PATTERN reference. `t_asn_create` is a `creation`
// transition: the entity does not exist yet, so —
//   • CommandInput.entityId is OMITTED; the store assigns the ASN number and
//     returns it on CommandResult.entityId (no fabricated document number).
//   • Scope is derived from the PAYLOAD'S PARENT: `poReference` → the PO's
//     supplierId (CommandTarget.creationOwner). A supplier may create only for
//     its own PO — cross-supplier ⇒ SCOPE_DENIED (QueryScope on a creation
//     command, exactly as reads).
//   • Legality (parent PO must be Confirmed) is the `asn_create_po_confirmed`
//     policy hook — a cross-entity rule bound in the mock adapter.
// Every future `creation` verb (invoice draft, PR, GR, …) reuses this shape.
//
// Discrepancy is a CROSS-ENTITY CASCADE (census G4): authored here, but fired by
// the GR mismatch verb in batch (ii), not a supplier action. In-Transit /
// Delivered are system (logistics) events — authored, wired when the logistics
// boundary lands. `states` lists transition-states only; no clock states.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const advanceShipNoticeFlow: FlowDefinition = {
  entity: 'advanceShipNotice',
  version: 1,
  states: ['Draft', 'Submitted', 'In Transit', 'Delivered', 'Discrepancy'],
  initial: 'Draft',
  /** PF-0 · D-2 — ⚠️ THIS MACHINE DECLARES NO ENDING, and that is the truthful
   *  answer rather than an omission: `Delivered` is left by `t_asn_discrepancy`,
   *  so it cannot be an ending, and `Discrepancy` has no resolution edge (it is
   *  censused, not declared). An empty array says so out loud. */
  terminals: [],
  transitions: [
    {
      // CANONICAL creation verb — see the file header. Supplier drafts an ASN
      // against a Confirmed PO; the store assigns the number.
      id: 't_asn_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'asn:create',
      requiredFields: ['poReference'],
      policyHooks: [POLICY_HOOKS.ASN_CREATE_PO_CONFIRMED],
      version: 1,
    },
    {
      id: 't_asn_submit',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'asn:submit',
      requiredFields: ['carrier', 'trackingNumber', 'eta'],
      policyHooks: [],
      version: 1,
    },
    {
      // Logistics event (authored; wired when the logistics boundary lands).
      id: 't_asn_in_transit',
      from: ['Submitted'],
      to: 'In Transit',
      trigger: 'system',
      requiredRole: 'asn:carry',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_asn_deliver',
      from: ['In Transit'],
      to: 'Delivered',
      trigger: 'system',
      requiredRole: 'asn:carry',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Cross-entity cascade ← GR mismatch (batch ii). Authored, not yet wired.
      id: 't_asn_discrepancy',
      from: ['Submitted', 'In Transit', 'Delivered'],
      to: 'Discrepancy',
      trigger: 'cascade',
      requiredRole: 'asn:flag',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

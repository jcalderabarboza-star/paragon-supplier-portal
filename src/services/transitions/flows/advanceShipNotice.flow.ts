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
  /** PF-0 · D-2 — ⚠️ THIS MACHINE DECLARES NO ENDING, and that is still the
   *  truthful answer rather than an omission — but the REASON changed and the
   *  old one is deleted rather than kept beside the new.
   *
   *  It read: *"`Discrepancy` has no resolution edge (it is censused, not
   *  declared)"*. **That went false at PF-1a**, when
   *  `t_asn_resolve_discrepancy` was authored ten lines below this comment, and
   *  it stayed on the page afterwards because nothing in this repository can
   *  fail on a stale sentence. `terminals: []` was RIGHT throughout, which is
   *  precisely what let the wrong justification survive: the value it explains
   *  never moved.
   *
   *  The current derivation, both states named: `Delivered` is left by
   *  `t_asn_discrepancy`, and `Discrepancy` is left by
   *  `t_asn_resolve_discrepancy`. Neither is an ending, so the array is empty
   *  because EVERY non-Draft state has an exit — not because one of them was
   *  stranded. */
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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
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
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        why:
          'A carrier feed reports departure (INT-TMS-01). No person here ' +
          'initiates it — and this verb is exactly why `trigger: system` ' +
          'reads as a statement about the SEAM rather than about the act.',
      },
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
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        why:
          'A carrier feed reports delivery (INT-TMS-01); the supplier who ' +
          'physically delivered it does not press this.',
      },
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
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'Raised by the GR mismatch cascade. It is a consequence the ' +
          'platform derives from a receipt, not something anybody declares.',
      },
      version: 1,
    },
    {
      // ⚠️ PF-1a — THE RESOLUTION EDGE. `t_invoice_resolve`'s shape exactly
      // (`invoice.flow.ts`), which is the pattern the operator pointed at: the
      // same authority that raised the problem state clears it, payload-free,
      // no cascade, no artifact.
      //
      // A GR reject / partial-approve cascaded an ASN into `Discrepancy` and
      // NOTHING BROUGHT IT BACK — a problem state a user could enter and not
      // leave, which is exactly the loose end the criterion is about
      // (PF-0 census, now deleted).
      //
      // ⚠️ WHY IT LANDS AT `Delivered`, STATED BECAUSE THE CHOICE IS NOT FREE.
      // The discrepancy edge is legal from three states, so "return it to where
      // it was" is not derivable — the machine would have to REMEMBER the prior
      // state, which is history stored in a state field, the thing this codebase
      // refuses. `Delivered` is the honest landing point on the merits rather
      // than by elimination: a discrepancy is only ever raised BY A GOODS-RECEIPT
      // DISPOSITION, and a goods receipt exists only for goods that arrived. An
      // ASN sitting at Submitted when the cascade fired was already inconsistent
      // with its own receipt, and resolving is not the moment to preserve that.
      id: 't_asn_resolve_discrepancy',
      from: ['Discrepancy'],
      to: 'Delivered',
      trigger: 'user',
      requiredRole: 'asn:flag',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Goods Receipt (GR) header flow — v2.2 Step 4 batch (ii).
//
// The GR is a BUYER-side document: the warehouse receives an inbound shipment/
// ASN, inspects it, and disposes it. So `t_gr_create` is buyer-scoped — the
// buyer creates a GR for ANY supplier's inbound; there is no cross-supplier
// SCOPE_DENIED branch on create (unlike the supplier-scoped ASN create). The
// created GR still carries the shipping supplier's id (derived from the parent
// ASN) so per-supplier READ scoping holds.
//
// HEADER = ROLLUP (census G2). The three disposition verbs (approve / partial /
// reject) each carry a `gr_rollup_*` policy hook that only passes when the
// per-line sub-flow (`goodsReceiptLine.flow.ts`) rolls up to that terminal. You
// cannot claim "Approved" with a rejected line — the header is provably derived
// from the lines, never asserted (see `grRollup.ts`).
//
// ── CANONICAL SAP-BOUNDARY PATTERN (Option B — submitted-interim → settled-
//    terminal). All future SAP verbs reuse this shape ──────────────────────────
//   `t_gr_post` is `sapBoundary: true`, so the dispatcher returns `submitted`
//   (not `done`) and moves the GR to the INTERIM state `Posting to SAP` with NO
//   material document yet. The async SAP callback SETTLES the same correlationId:
//   `settle(correlationId)` flips the command to `done` AND runs the registered
//   finalize, which advances `Posting to SAP → Posted to SAP` and assigns the
//   real MAT-DOC reference. A state named "Posted to SAP" is therefore TRUE when
//   shown — nothing is fabricated client-side (closes GR-FABRICATION-01).
//
// Cross-entity cascade (census G4): a GR mismatch disposition (`t_gr_reject` /
// `t_gr_partial_approve`) fans out `t_asn_discrepancy` onto the linked ASN — the
// linkage lives in `cascades.ts` (data), the dispatcher owns the fan-out.
//
// `states` lists transition-states only; no clock states (law 0.5). `Quality
// Hold` is authored for the inspection surface; its resume edge lands with the
// line-level GR editing surface (like the ASN logistics verbs).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const goodsReceiptFlow: FlowDefinition = {
  entity: 'goodsReceipt',
  version: 1,
  states: [
    'Pending Inspection',
    'Under Inspection',
    'Quality Hold',
    'Approved',
    'Partially Approved',
    'Rejected',
    'Posting to SAP',
    'Posted to SAP',
  ],
  initial: 'Pending Inspection',
  transitions: [
    {
      // Buyer receives an inbound ASN/shipment. Buyer-scoped creation — the
      // store mints the GR number; lines derive from the parent ASN.
      id: 't_gr_create',
      from: [],
      to: 'Pending Inspection',
      trigger: 'creation',
      requiredRole: 'gr:receive',
      requiredFields: ['asnReference'],
      policyHooks: [POLICY_HOOKS.GR_CREATE_SHIPMENT_RECEIVED],
      version: 1,
    },
    {
      id: 't_gr_start_inspection',
      from: ['Pending Inspection'],
      to: 'Under Inspection',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_gr_hold',
      from: ['Under Inspection'],
      to: 'Quality Hold',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: ['holdReason'],
      policyHooks: [],
      version: 1,
    },
    {
      // Header disposition = rollup. Legal ONLY when every line rolls up Accepted.
      id: 't_gr_approve',
      from: ['Under Inspection'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.GR_ROLLUP_APPROVED],
      version: 1,
    },
    {
      // Legal ONLY when lines are a mix of accepted + rejected. Cascades a
      // discrepancy onto the linked ASN (cascades.ts).
      id: 't_gr_partial_approve',
      from: ['Under Inspection'],
      to: 'Partially Approved',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.GR_ROLLUP_PARTIAL],
      version: 1,
    },
    {
      // Legal ONLY when every line rolls up Rejected. Cascades a discrepancy.
      id: 't_gr_reject',
      from: ['Under Inspection'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: ['dispositionReason'],
      policyHooks: [POLICY_HOOKS.GR_ROLLUP_REJECTED],
      version: 1,
    },
    {
      // FIRST REAL sapBoundary verb — see the canonical pattern in the header.
      // submitted → interim 'Posting to SAP'; settle advances to 'Posted to SAP'
      // + assigns the real MAT-DOC (no client-side fabrication).
      id: 't_gr_post',
      from: ['Approved', 'Partially Approved'],
      to: 'Posting to SAP',
      trigger: 'system',
      requiredRole: 'gr:post',
      requiredFields: [],
      policyHooks: [],
      sapBoundary: true,
      version: 1,
    },
  ],
};

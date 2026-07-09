// ────────────────────────────────────────────────────────────────────────────
// Invoice flow — v2.2 Step 4 batch (iii). DR-7: ONE canonical machine.
//
// The invoice is ONE economic document. This is the single canonical lifecycle;
// the buyer and supplier vocabularies are read-time PROJECTIONS of these states
// (`invoiceProjection.ts`), and `Overdue` is computed (DR-8, law 0.5) — neither
// is a member of this table. Two-machines-plus-mapping was rejected on the
// HALAL-XPERSONA-01 drift precedent.
//
// CREATION (census creation-shape, reused from ASN): `t_invoice_create` is a
// `creation` transition — the supplier drafts an invoice against its OWN PO
// (scope from the payload's parent PO; cross-supplier ⇒ SCOPE_DENIED), the store
// assigns the invoice number. `t_invoice_submit` then advances Draft → Submitted.
//
// MATCH = ROLLUP (census G2): `t_invoice_match` (Submitted → Matched) carries the
// `invoice_rollup_matched` hook, so the header only advances when the match
// sub-flow (`invoiceMatch.flow.ts`) has rolled up to a clean 3-way Matched.
//
// SAP BOUNDARY (Option B, canonical pattern from GR post): `t_invoice_release_
// payment` is `sapBoundary: true` — it resolves `submitted` and moves the
// invoice to the INTERIM `Releasing Payment` with NO FI document yet. The async
// SAP callback SETTLES the same correlationId: settle advances `Releasing
// Payment → Payment Released` and assigns the REAL FI document + payment ref
// (minted only on settle). So no "paid" state is shown before it is true (law 0.6).
//
// `t_invoice_remit` (Payment Released → Remittance Received) is AUTHORED here;
// its button is deferred (registered follow-on). `states` lists transition-
// states only; no clock states.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const invoiceFlow: FlowDefinition = {
  entity: 'invoice',
  version: 1,
  states: [
    'Draft',
    'Submitted',
    'Matched',
    'Approved',
    'Releasing Payment',
    'Payment Released',
    'Remittance Received',
    'Disputed',
  ],
  initial: 'Draft',
  transitions: [
    {
      // CANONICAL creation verb — supplier drafts an invoice against its own PO.
      // The store assigns the invoice number (no client-side fabrication).
      id: 't_invoice_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'invoice:submit',
      requiredFields: ['poReference'],
      policyHooks: [POLICY_HOOKS.INVOICE_CREATE_PO_CONFIRMED],
      version: 1,
    },
    {
      id: 't_invoice_submit',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'invoice:submit',
      requiredFields: ['amount'],
      policyHooks: [],
      version: 1,
    },
    {
      // Header advance = match ROLLUP. Legal ONLY when the match sub-flow rolls
      // up to a clean Matched (invoice_rollup_matched). System-triggered.
      id: 't_invoice_match',
      from: ['Submitted'],
      to: 'Matched',
      trigger: 'system',
      requiredRole: 'invoice:match',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.INVOICE_ROLLUP_MATCHED],
      version: 1,
    },
    {
      id: 't_invoice_approve',
      from: ['Matched'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'invoice:approve',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // FIRST invoice sapBoundary verb (Option B — submitted-interim → settled).
      // Approved → interim 'Releasing Payment'; settle advances to 'Payment
      // Released' + assigns the real FI document (no client-side fabrication).
      id: 't_invoice_release_payment',
      from: ['Approved'],
      to: 'Releasing Payment',
      trigger: 'user',
      requiredRole: 'invoice:pay',
      requiredFields: [],
      policyHooks: [],
      sapBoundary: true,
      version: 1,
    },
    {
      // Authored; button deferred (registered follow-on). Buyer confirms the
      // supplier acknowledged the remittance advice.
      id: 't_invoice_remit',
      from: ['Payment Released'],
      to: 'Remittance Received',
      trigger: 'system',
      requiredRole: 'invoice:pay',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Dispute at any pre-payment stage (qty/price variance, credit-note needed).
      id: 't_invoice_dispute',
      from: ['Submitted', 'Matched', 'Approved'],
      to: 'Disputed',
      trigger: 'user',
      requiredRole: 'invoice:dispute',
      requiredFields: ['disputeReason'],
      policyHooks: [],
      version: 1,
    },
    {
      // Resolve a dispute — back to Submitted for re-match.
      id: 't_invoice_resolve',
      from: ['Disputed'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'invoice:dispute',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

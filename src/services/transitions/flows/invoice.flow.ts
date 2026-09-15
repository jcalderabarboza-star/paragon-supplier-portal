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
  /** PF-0 · D-2 — remittance is the end of the invoice lifecycle. 'Payment
   *  Released' is reachable only through `settlesTo` (Option B). */
  terminals: ['Remittance Received'],
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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
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
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'The 3-way match verdict is derived from the PO, the GR and the ' +
          'invoice. There is nothing to click.',
      },
      version: 1,
    },
    {
      // ── ⚠️ SURFACED. THE GROUND THAT HELD IT BACK IS RETIRED, AND THE
      //    RETIRED WORDS ARE QUOTED HERE SO THE NEXT READER CANNOT RE-DERIVE
      //    THEM FROM THE STRING THAT IS NO LONGER PRESENT. It read:
      //
      //      surfaced: false, because: 'ruled-unsurfaced', why:
      //      'C10 §2.4 — approval is an attributable act and the platform
      //       cannot name a person (ENF-NO-PERSON-IN-IDENTITY-01), so an
      //       anonymous approval is refused rather than offered. Lifting that
      //       ruling, not building a screen, is what changes this value.'
      //
      // ⚠️ **IT WAS ONE VERB'S PROSE APPLIED TO ONE VERB, NOT A RULE**
      // (operator ruling). Measured against the whole approve-shaped
      // population rather than against itself: FOUR of the FIVE verbs whose id
      // contains `approve` are surfaced — `t_pr_approve`,
      // `t_gr_approve`, `t_gr_partial_approve`, `t_application_approve` — and
      // this was the only one held back. `t_pr_approve` does not merely
      // proceed without a person: it SHIPS `approvedBy` and writes
      // `UNATTRIBUTED: NO_PERSON_IN_SESSION` into it, and `types.ts` calls
      // that *"an honest absence and it is the point — it names a failure
      // somebody can go and fix."* The same fact, two opposite dispositions;
      // only one of them can be the rule, and the tree had already chosen the
      // other one four times.
      //
      // ⚠️ **NO ATTRIBUTION MECHANISM IS INVENTED HERE, AND NONE IS NEEDED.**
      // `dispatcher.ts`'s `attributionFor()` stamps `scope.actor` onto the
      // emitted event for EVERY `trigger: 'user'` transition and omits it for
      // machine acts (C10 §6.4). This verb is `trigger: 'user'`, so surfacing
      // it is the whole change: the approval records `UNATTRIBUTED` in the
      // ledger by the same route every other human act already does, and F1
      // fills it when an IdP can answer. A policy hook here would have been a
      // SECOND account of a decision the dispatcher already makes.
      //
      // ⚠️ **SEGREGATION IS NOT EXPRESSED BY WITHHOLDING THIS VERB**, and the
      // batch that surfaced it measured why: `finance` holds `invoice:approve`
      // AND `invoice:pay`, and so do `buyer_all` (39 atoms) and `admin` (57) —
      // both DERIVED unions over the lane bundles, so a lane split would be
      // re-merged in the same commit. One seat by default, SEPARABLE BY
      // CONFIGURATION (operator ruling): a firm wanting four-eyes constructs
      // two custom roles over the `buyer` anchor holding one atom each, which
      // `invoiceSeparability.test.ts` asserts is constructible and effective.
      // True four-eyes is a per-DOCUMENT property and needs an attributed
      // actor; that is F1, not a bundle edit.
      id: 't_invoice_approve',
      from: ['Matched'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'invoice:approve',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
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
      // PF-0 · D-2 — the settlement advance, declared. See the GR twin.
      settlesTo: 'Payment Released',
      surfaceable: { surfaced: true },
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
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 'bank',
        why:
          'Remittance is confirmed by the bank/SAP settlement feed. The buyer ' +
          'released the payment; the money arriving is not their act.',
      },
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
      surfaceable: { surfaced: true },
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
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Invoice MATCH sub-flow — v2.2 Step 4 batch (iii), census G2.
//
// The 3-way-match axis (PO × GR × invoice) as its own registered flow, ORTHOGONAL
// to the invoice lifecycle. Its rolled-up terminal is carried on the canonical
// invoice as `matchStatus` and GATES the header advance `Submitted → Matched`
// (via the `invoice_rollup_matched` hook on `invoice.flow.ts`) — so the invoice
// header is a provable derivation of the match, never an assertion (same G2
// pattern as the GR line sub-flow → GR header rollup).
//
// AUTHORED + REGISTERED now (vocabulary, validation, capabilities). Per DR-7
// ruling 1 the match result is COMPUTED (a read-layer projection), so these
// verbs are the schema substrate — command wiring lands with the GR-post →
// invoice-match cascade (INV-GR-OVERLAY-01, next batch), which retires the
// `paragon_gr_posted` localStorage overlay. `states` lists transition-states
// only; no clock states.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const invoiceMatchFlow: FlowDefinition = {
  entity: 'invoiceMatch',
  version: 1,
  states: ['Pending', 'Pending GR', 'Matched', 'Qty Mismatch', 'Price Variance'],
  initial: 'Pending',
  /** PF-0 · D-2 — only a clean match is an ending. The two variance states have
   *  no re-match edge and are NOT endings (censused). */
  terminals: ['Matched'],
  transitions: [
    {
      // Awaiting the goods receipt before the match can complete.
      id: 't_invmatch_await_gr',
      from: ['Pending'],
      to: 'Pending GR',
      trigger: 'system',
      requiredRole: 'invoice:match',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Clean 3-way match (qty + price reconcile).
      id: 't_invmatch_matched',
      from: ['Pending', 'Pending GR'],
      to: 'Matched',
      trigger: 'system',
      requiredRole: 'invoice:match',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Delivered quantity ≠ invoiced quantity.
      id: 't_invmatch_qty_variance',
      from: ['Pending', 'Pending GR'],
      to: 'Qty Mismatch',
      trigger: 'system',
      requiredRole: 'invoice:match',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // Invoice unit price exceeds the PO price beyond tolerance.
      id: 't_invmatch_price_variance',
      from: ['Pending', 'Pending GR'],
      to: 'Price Variance',
      trigger: 'system',
      requiredRole: 'invoice:match',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

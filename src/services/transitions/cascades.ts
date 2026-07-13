// ────────────────────────────────────────────────────────────────────────────
// Cross-entity cascade registry (v2.2 Step 4 batch ii — census G4).
//
// When a transition completes, another entity's machine may need to fan out
// (RFQ Award → losing quotations Rejected; GR mismatch → ASN Discrepancy). The
// `cascade` trigger already marks the TARGET transition; this registry is the
// DATA that links a SOURCE transition to the cascade(s) it fires. Kept out of
// `TransitionDef` so the schema stays pure (G4: "no schema change") — the
// dispatcher owns the fan-out (post-apply), the mock adapter resolves WHICH
// target ids to hit (cross-entity lookups live in the adapter, like policy hooks
// and creation owners).
// ────────────────────────────────────────────────────────────────────────────

/** A source→target cascade link (which transition to fire on which entity). */
export interface CascadeLink {
  readonly targetEntity: string;
  readonly targetTransitionId: string;
}

/**
 * Source transition id → the cascades it fires. A GR mismatch disposition
 * (reject / partial approve) raises a discrepancy on the linked ASN.
 */
export const CASCADES: Record<string, readonly CascadeLink[]> = {
  t_gr_reject: [
    { targetEntity: 'advanceShipNotice', targetTransitionId: 't_asn_discrepancy' },
  ],
  t_gr_partial_approve: [
    { targetEntity: 'advanceShipNotice', targetTransitionId: 't_asn_discrepancy' },
  ],
  // GR-post fans out the 3-way match onto the invoice(s) sharing its PO (F0.2,
  // INV-GR-OVERLAY-01 — the honest replacement for the deleted `paragon_gr_posted`
  // localStorage overlay). The adapter computes the verdict from real PO×GR×invoice
  // data, writes the invoice's matchStatus, and fires this header verb ONLY when
  // the verdict is a genuine 'Matched' (a variance verdict honestly no-ops).
  t_gr_post: [
    { targetEntity: 'invoice', targetTransitionId: 't_invoice_match' },
  ],
  // RFQ award fans out onto its quotations (batch iv): the winner is awarded,
  // every other is rejected. Both target the `quotation` machine; the adapter
  // resolver splits the sibling set (winner ← payload, losers ← the store) across
  // these two links.
  t_rfq_award: [
    { targetEntity: 'quotation', targetTransitionId: 't_quotation_award' },
    { targetEntity: 'quotation', targetTransitionId: 't_quotation_reject' },
  ],
};

/** The cascade links declared for a source transition (empty if none). */
export function cascadesFor(transitionId: string): readonly CascadeLink[] {
  return CASCADES[transitionId] ?? [];
}

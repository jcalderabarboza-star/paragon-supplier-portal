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
};

/** The cascade links declared for a source transition (empty if none). */
export function cascadesFor(transitionId: string): readonly CascadeLink[] {
  return CASCADES[transitionId] ?? [];
}

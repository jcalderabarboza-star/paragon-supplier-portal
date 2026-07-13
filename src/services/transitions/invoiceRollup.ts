// ────────────────────────────────────────────────────────────────────────────
// Invoice match rollup (v2.2 Step 4 batch iii — census G2, DR-7 ruling 1).
//
// The 3-way match is the invoice's parallel sub-axis (`invoiceMatch.flow.ts`).
// Its rolled-up terminal is carried on the canonical invoice as `matchStatus`
// and surfaced on the buyer read as a computed projection (ruling 1: matchStatus
// is a read-layer concern, not a stored second lifecycle). This module is the
// ONE home for the rollup predicate, so the SAME computation gates the header
// advance (the `invoice_rollup_matched` policy hook on `t_invoice_match`) — the
// header can never assert `Matched` against a mismatched line.
// ────────────────────────────────────────────────────────────────────────────

import type { Invoice } from '../data/types';

/** True when the match sub-flow has rolled up to a clean 3-way `Matched`. */
export function isMatched(inv: Invoice): boolean {
  return inv.matchStatus === 'Matched';
}

// ── 3-way match verdict (F0.2 — GR-post → invoice-match cascade) ──────────────
// The three terminal verdicts a posted GR produces on the invoice sharing its PO.
// A subset of `InvoiceMatchStatus` (the pre-GR states 'Pending' / 'Pending GR'
// are not verdicts a completed GR yields).
export type MatchVerdict = 'Matched' | 'Qty Mismatch' | 'Price Variance';

/**
 * Provisional relative price tolerance: the invoiced amount may deviate from the
 * PO's confirmed value by up to this fraction and still count as Matched. A
 * placeholder business rule — the real AP tolerance policy (per-category /
 * absolute floors) lands with the Stage-2 I4 match engine; this is the honest
 * minimum that lets a clean invoice reconcile without asserting a false match.
 */
export const MATCH_TOLERANCE = 0.01; // 1%

/**
 * Derive the honest 3-way verdict from real data (F0.2, census G2 semantics):
 *   • the GR carries a rejection            → 'Qty Mismatch' (delivered ≠ ordered)
 *   • invoiced amount ≈ Σ(confirmedQty × unitPrice) within tolerance → 'Matched'
 *   • otherwise                              → 'Price Variance'
 * PURE — no store reads, no clock. `expectedValue` is Σ(confirmedQty × unitPrice)
 * from the parent PO; the caller gathers it (adapter side). This is the compute
 * that becomes matchStatus's home when it is made a computed read-projection
 * (DR-7 ruling 1) at A2 — the same function, then called from the read layer.
 */
export function deriveMatchVerdict(
  expectedValue: number,
  invoicedAmount: number,
  grHasRejects: boolean,
): MatchVerdict {
  if (grHasRejects) return 'Qty Mismatch';
  if (expectedValue <= 0) return 'Price Variance';
  const rel = Math.abs(invoicedAmount - expectedValue) / expectedValue;
  return rel <= MATCH_TOLERANCE ? 'Matched' : 'Price Variance';
}

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

// ────────────────────────────────────────────────────────────────────────────
// Goods-receipt line → header rollup (v2.2 Step 4 batch ii — census G2).
//
// The GR HEADER disposition (Approved / Partially Approved / Rejected) is a
// ROLLUP of the per-line sub-flow states, NOT an independently commanded value.
// This module derives both, purely, from the GR's inspection results. It has
// ONE home so the SAME computation guards legality (the `gr_rollup_*` policy
// hooks) AND drives the UI's verb selection — the header is provably derived,
// never asserted (law 0.6, honest-by-construction).
// ────────────────────────────────────────────────────────────────────────────

import type { InspectionResult } from '../../data/mockGoodsReceipts';

/** A single line's rolled-up disposition state (the sub-flow's terminal). */
export type GrLineState = 'Pending' | 'Accepted' | 'Rejected' | 'Partial';

/** Derive one line's state from its recorded quantities + checks. */
export function deriveLineState(r: InspectionResult): GrLineState {
  const checksPending =
    r.visualCheck === 'Pending' || r.packagingCheck === 'Pending';
  // Not yet inspected: checks pending and nothing accepted or rejected.
  if (checksPending && r.qtyAccepted === 0 && r.qtyRejected === 0) return 'Pending';

  const checkFail =
    r.visualCheck === 'Fail' ||
    r.packagingCheck === 'Fail' ||
    r.halalSealCheck === 'Fail' ||
    r.bpomLotCheck === 'Fail';

  if (r.qtyAccepted > 0 && (r.qtyRejected > 0 || checkFail)) return 'Partial';
  if (r.qtyAccepted === 0 && (r.qtyRejected > 0 || checkFail)) return 'Rejected';
  return 'Accepted';
}

/** The GR header disposition rolled up from its lines. */
export type GrHeaderDisposition =
  | 'Pending'
  | 'Approved'
  | 'Partially Approved'
  | 'Rejected';

/**
 * Roll the per-line states up to the header disposition:
 *   • any line still Pending  → Pending (not finalizable — stay Under Inspection)
 *   • every line Accepted      → Approved
 *   • every line Rejected      → Rejected
 *   • otherwise (a mix)        → Partially Approved
 */
export function deriveHeaderDisposition(
  lines: readonly InspectionResult[],
): GrHeaderDisposition {
  if (lines.length === 0) return 'Pending';
  const states = lines.map(deriveLineState);
  if (states.some((s) => s === 'Pending')) return 'Pending';
  if (states.every((s) => s === 'Accepted')) return 'Approved';
  if (states.every((s) => s === 'Rejected')) return 'Rejected';
  return 'Partially Approved';
}

/** The header transition id whose rollup matches `disposition`, or null. */
export function headerVerbFor(disposition: GrHeaderDisposition): string | null {
  switch (disposition) {
    case 'Approved':
      return 't_gr_approve';
    case 'Partially Approved':
      return 't_gr_partial_approve';
    case 'Rejected':
      return 't_gr_reject';
    default:
      return null; // Pending — nothing to finalize yet.
  }
}

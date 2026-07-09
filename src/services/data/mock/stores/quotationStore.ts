// ────────────────────────────────────────────────────────────────────────────
// Mutable Quotation store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getQuotations) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array). The award cascade fans out
// onto these: the winning quotation → Awarded (`t_quotation_award`), every other
// on the same RFQ → Rejected (`t_quotation_reject`). `forRfq` gives the cascade
// resolver the sibling set (winner + losers). Keyed by id; seeded from the
// fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockQuotations } from '../../../../data/mockQuotations';
import type { Quotation } from '../../../../data/mockQuotations';

function clone(q: Quotation): Quotation {
  return { ...q };
}

let rows: Quotation[] = mockQuotations.map(clone);

export const quotationStore = {
  /** All quotations (the mutable source reads resolve from). */
  all(): readonly Quotation[] {
    return rows;
  },
  /** One quotation by id, or undefined. */
  get(id: string): Quotation | undefined {
    return rows.find((q) => q.id === id);
  },
  /** Every quotation on an RFQ (the cascade's winner + loser set). */
  forRfq(rfqId: string): readonly Quotation[] {
    return rows.filter((q) => q.rfqId === rfqId);
  },
  /** IMMUTABLE update — swap in a new quotation + new array. */
  update(id: string, next: (q: Quotation) => Quotation): void {
    rows = rows.map((q) => (q.id === id ? next(q) : q));
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = mockQuotations.map(clone);
  },
};

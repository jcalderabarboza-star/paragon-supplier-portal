// ────────────────────────────────────────────────────────────────────────────
// Mutable RFQ store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getRFQs) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array, never in place) so the
// invalidated query yields new references and every derivation re-derives. The
// award verb (`t_rfq_award`) flips status → Awarded and records the award
// metadata (awardedSupplierId / awardedQuotationId) — no PO/contract minted.
// Keyed by id. Seeded from the fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockRfqs } from '../../../../data/mockRfqs';
import type { RFQ } from '../../../../data/mockRfqs';

function clone(r: RFQ): RFQ {
  return { ...r, materialIds: [...r.materialIds], invitedSupplierIds: [...r.invitedSupplierIds], respondedSupplierIds: [...r.respondedSupplierIds] };
}

let rows: RFQ[] = mockRfqs.map(clone);

export const rfqStore = {
  /** All RFQs (the mutable source reads resolve from). */
  all(): readonly RFQ[] {
    return rows;
  },
  /** One RFQ by id, or undefined. */
  get(id: string): RFQ | undefined {
    return rows.find((r) => r.id === id);
  },
  /** IMMUTABLE update — swap in a new RFQ + new array (see purchaseOrderStore). */
  update(id: string, next: (r: RFQ) => RFQ): void {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = mockRfqs.map(clone);
  },
};

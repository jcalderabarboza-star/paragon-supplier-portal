// ────────────────────────────────────────────────────────────────────────────
// Mutable RFQ store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getRFQs) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array, never in place) so the
// invalidated query yields new references and every derivation re-derives. The
// award verb (`t_rfq_award`) flips status → Awarded and records the award
// metadata (awardedSupplierId / awardedQuotationId) — no PO/contract minted.
// Creation (`t_rfq_create` — Phase A/2, retires extraRfqs) ADDS a new Open RFQ
// with a store-assigned number (distinct 9xx range, as asnStore/PR): a real
// push-to-execute target, so getRFQs reflects it — never a fabricated peer.
// Keyed by id. Seeded from the fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockRfqs } from '../../../../data/mockRfqs';
import type { RFQ } from '../../../../data/mockRfqs';

function clone(r: RFQ): RFQ {
  return { ...r, materialIds: [...r.materialIds], invitedSupplierIds: [...r.invitedSupplierIds], respondedSupplierIds: [...r.respondedSupplierIds] };
}

let rows: RFQ[] = mockRfqs.map(clone);
let seq = 0;

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
  /** Add a newly-created RFQ (creation). New array reference. */
  add(rfq: RFQ): void {
    rows = [rfq, ...rows];
  },
  /** Store-assigned RFQ number for a creation (distinct 9xx range, as asnStore). */
  nextNumber(): string {
    seq += 1;
    return `RFQ-2026-${900 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = mockRfqs.map(clone);
    seq = 0;
  },
};

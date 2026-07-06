// ────────────────────────────────────────────────────────────────────────────
// Mutable purchase-order store (v2.2 Step 3.6).
//
// The canonical mutation pattern: commands mutate THIS in-memory store; reads
// (MockProcurementService.getPurchaseOrders) resolve FROM it; the page re-derives
// after a targeted invalidateQueries. No page holds a seeded local copy.
//
// Seeded from the fixture on load; `reset()` restores the seed for test
// isolation (the store is a process singleton).
// ────────────────────────────────────────────────────────────────────────────

import { mockPurchaseOrders } from '../../../../data/mockPurchaseOrders';
import type { PurchaseOrder } from '../../types';

function clone(po: PurchaseOrder): PurchaseOrder {
  return { ...po, lineItems: po.lineItems.map((li) => ({ ...li })) };
}

let rows: PurchaseOrder[] = mockPurchaseOrders.map(clone);

export const purchaseOrderStore = {
  /** All POs (the mutable source reads resolve from). */
  all(): readonly PurchaseOrder[] {
    return rows;
  },
  /** One PO by id, or undefined. */
  get(id: string): PurchaseOrder | undefined {
    return rows.find((p) => p.id === id);
  },
  /**
   * IMMUTABLE update: swap in a NEW PO object (and a new rows array). Never
   * mutate a PO in place — doing so retroactively corrupts the snapshot a prior
   * read already handed to TanStack Query, so structural sharing sees "no
   * change" on refetch and keeps the stale reference (memoized derivations then
   * never recompute). Returning new references is what lets EVERY consumer of
   * the invalidated query — table, KPI counts, banner — re-derive together.
   */
  update(id: string, next: (po: PurchaseOrder) => PurchaseOrder): void {
    rows = rows.map((p) => (p.id === id ? next(p) : p));
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = mockPurchaseOrders.map(clone);
  },
};

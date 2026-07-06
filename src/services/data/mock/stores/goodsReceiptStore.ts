// ────────────────────────────────────────────────────────────────────────────
// Mutable goods-receipt store (v2.2 Step 4 batch ii).
//
// Same contract as purchaseOrderStore / asnStore: reads resolve from here,
// commands mutate IMMUTABLY (new object + new arrays — never in place) so the
// invalidated query yields new references and every derivation re-derives
// together. Creation ADDS a new GR with a store-assigned number. Keyed by `id`.
//
// `nextMatDoc()` mints the SAP material-document reference — but ONLY the
// settlement calls it (Option B), representing SAP's async assignment. Before
// settle a posted GR carries NO sapMaterialDoc ("pending SAP assignment"); this
// is the honest replacement for the old client-side fabrication (GR-FABRICATION-01).
// ────────────────────────────────────────────────────────────────────────────

import { mockGoodsReceipts } from '../../../../data/mockGoodsReceipts';
import type { GoodsReceipt } from '../../../../data/mockGoodsReceipts';

function clone(g: GoodsReceipt): GoodsReceipt {
  return {
    ...g,
    inspectionResults: g.inspectionResults.map((r) => ({ ...r })),
  };
}

let rows: GoodsReceipt[] = mockGoodsReceipts.map(clone);
let seq = 0;
let matSeq = 0;

export const goodsReceiptStore = {
  all(): readonly GoodsReceipt[] {
    return rows;
  },
  get(id: string): GoodsReceipt | undefined {
    return rows.find((g) => g.id === id);
  },
  /** Immutable update — swap in a new GR + new array (see purchaseOrderStore). */
  update(id: string, next: (g: GoodsReceipt) => GoodsReceipt): void {
    rows = rows.map((g) => (g.id === id ? next(g) : g));
  },
  /** Add a newly-created GR (creation). New array reference. */
  add(gr: GoodsReceipt): void {
    rows = [gr, ...rows];
  },
  /** Store-assigned GR number for a creation. */
  nextNumber(): string {
    seq += 1;
    return `GR-2026-${900 + seq}`;
  },
  /** SAP-assigned material-document reference — minted only on settlement. */
  nextMatDoc(): string {
    matSeq += 1;
    return `MAT-DOC-${600000 + matSeq}`;
  },
  reset(): void {
    rows = mockGoodsReceipts.map(clone);
    seq = 0;
    matSeq = 0;
  },
};

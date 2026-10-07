// ────────────────────────────────────────────────────────────────────────────
// Mutable RFQ store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getRFQs) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array, never in place) so the
// invalidated query yields new references and every derivation re-derives. The
// award verb (`t_rfq_award`) flips status → Awarded and records the award
// metadata (awardedSupplierId / awardedQuotationId) — no PO/contract minted.
// Creation (`t_rfq_create` — Phase A/2, retires extraRfqs) ADDS a new DRAFT RFQ
// (PF-1a · D-1 — it minted Open under FORK-2B; the buyer now publishes)
// with a store-assigned number (distinct 9xx range, as asnStore/PR): a real
// push-to-execute target, so getRFQs reflects it — never a fabricated peer.
// Keyed by id. Seeded from the fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockRfqs } from '../../../../data/mockRfqs';
import type { RFQ, RfqSeed } from '../../../../data/mockRfqs';
import { respondedSupplierIdsOf } from '../../../../data/rfqResponses';
import { isSubmittedResponse, stageOf, stageRespondersOf } from '../../../../data/rfqStage';
import { quotationStore } from './quotationStore';
import { stageResponseStore } from './stageResponseStore';

// SRC-1 — THE STORE HOLDS NO RESPONSE LIST. A row is an `RfqSeed`; every read
// hands back an `RFQ` whose `respondedSupplierIds` is computed from the
// quotation store at that moment, and every write drops whatever list the
// caller carried. One fact, one place: a quotation submitted a second ago is in
// the next read, and no write site has to remember to say so.
function strip(r: RFQ | RfqSeed): RfqSeed {
  const {
    respondedSupplierIds: _derived,
    stageResponses: _answers,
    myStageDraft: _draft,
    ...seed
  } = r as RFQ;
  return { ...seed, materialIds: [...seed.materialIds], invitedSupplierIds: [...seed.invitedSupplierIds] };
}

// RFx-1 — WHO HAS ANSWERED DEPENDS ON THE STAGE. At RFQ an answer is a
// quotation, as it always was. At RFI and RFP it is a stage response recorded
// AT THAT STAGE: an answer to the RFI is not an answer to the RFP that follows
// it, so the list empties when the event advances and fills again.
//
// RFx-2 — ONLY SUBMITTED ANSWERS ARE ATTACHED. A supplier's draft is its own
// work in progress; it is filtered out HERE, so no read built on this store —
// the buyer's board, a policy hook, a widget — can hold one. The supplier reads
// its own draft through `rfqSupplierView`, which asks the response store.
function project(r: RfqSeed): RFQ {
  const stage = stageOf(r);
  const answers = stageResponseStore.forRfq(r.id).filter(isSubmittedResponse);
  return {
    ...r,
    respondedSupplierIds:
      stage === 'RFQ'
        ? respondedSupplierIdsOf(r.id, quotationStore.all())
        : stageRespondersOf(answers, r.id, stage),
    stageResponses: answers,
  };
}

let rows: RfqSeed[] = mockRfqs.map(strip);
let seq = 0;

export const rfqStore = {
  /** All RFQs, each with its response list derived from the quotations. */
  all(): readonly RFQ[] {
    return rows.map(project);
  },
  /** One RFQ by id, or undefined. */
  get(id: string): RFQ | undefined {
    const row = rows.find((r) => r.id === id);
    return row ? project(row) : undefined;
  },
  /** IMMUTABLE update — swap in a new RFQ + new array (see purchaseOrderStore). */
  update(id: string, next: (r: RFQ) => RFQ): void {
    rows = rows.map((r) => (r.id === id ? strip(next(project(r))) : r));
  },
  /** Add a newly-created RFQ (creation). New array reference. */
  add(rfq: RFQ): void {
    rows = [strip(rfq), ...rows];
  },
  /** Store-assigned RFQ number for a creation (distinct 9xx range, as asnStore). */
  nextNumber(): string {
    seq += 1;
    return `RFQ-2026-${900 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = mockRfqs.map(strip);
    seq = 0;
  },
};

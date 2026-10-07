// ────────────────────────────────────────────────────────────────────────────
// Stage-response store (RFx-1).
//
// A supplier's answers at the RFI and RFP stages of a sourcing event. Same
// contract as `quotationStore`: reads resolve FROM here and a creation ADDS a
// row with a store-assigned number. RFx-2 — a row may be born a `Draft`, which
// its supplier re-saves and then submits (`update`, immutable); a `Submitted`
// row is a record and nothing edits it.
//
// Seeded from `mockStageResponses` — the answers on the one seeded event that
// has stages (`rfq-018`). `reset()` restores the seed (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockStageResponses } from '../../../../data/mockStageResponses';
import type { StageResponse } from '../../../../data/rfqStage';

let rows: StageResponse[] = [...mockStageResponses];
let seq = 0;

export const stageResponseStore = {
  /** Every stage response. */
  all(): readonly StageResponse[] {
    return rows;
  },
  /** One response by id, or undefined. */
  get(id: string): StageResponse | undefined {
    return rows.find((r) => r.id === id);
  },
  /** Every response on one event, across its stages. */
  forRfq(rfqId: string): readonly StageResponse[] {
    return rows.filter((r) => r.rfqId === rfqId);
  },
  /** Add a newly-recorded response (creation). New array reference. */
  add(response: StageResponse): void {
    rows = [...rows, response];
  },
  /** IMMUTABLE update — swap in a new row + new array (see `rfqStore.update`). */
  update(id: string, next: (r: StageResponse) => StageResponse): void {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /** Store-assigned number for a response (the 9xx range, as `quotationStore`). */
  nextNumber(): string {
    seq += 1;
    return `RSP-2026-${900 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = [...mockStageResponses];
    seq = 0;
  },
};

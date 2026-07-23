// ─────────────────────────────────────────────────────────────────────────────
// C3 — the minimal outbound-request STORE (the persisted ask event, LAW 3).
//
// Same contract shape as `schedulingAgreementStore`: reads resolve FROM here; the
// ONE mutator is an IMMUTABLE APPEND (a new array with the new record — nothing is
// mutated in place); `reset()` restores the seed for test isolation. ONE mutator
// by design, so a command wrapper can front it later (C4) without touching C3 —
// this is deliberately NOT a transition machine (no 11th lifecycle) and NOT
// command-wrapped yet.
// ─────────────────────────────────────────────────────────────────────────────

import type { OutboundRequestRecord } from './outbound';
import { OUTBOUND_REQUEST_SEED } from './outboundFixtures';

let rows: OutboundRequestRecord[] = [...OUTBOUND_REQUEST_SEED];

export const outboundRequestStore = {
  /** All ask events — the source `deriveOutboundQueue`'s `sentRecords` reads from. */
  all(): readonly OutboundRequestRecord[] {
    return rows;
  },
  /** This supplier's ask events (convenience own-scope read). */
  forSupplier(supplierId: string): readonly OutboundRequestRecord[] {
    return rows.filter((r) => r.supplierId === supplierId);
  },
  /** IMMUTABLE APPEND — the ONE mutator. A new array; the record is never edited. */
  append(record: OutboundRequestRecord): void {
    rows = [...rows, record];
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = [...OUTBOUND_REQUEST_SEED];
  },
};

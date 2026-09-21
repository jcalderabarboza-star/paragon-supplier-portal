// ────────────────────────────────────────────────────────────────────────────
// Mutable MaterialRequest store (R8).
//
// Same contract as `supplierApplicationStore` / `purchaseRequisitionStore`:
// reads resolve FROM here, and the four request verbs mutate it through the
// dispatcher — never directly from a page.
//
// ── ⚠️ IT SEEDS EMPTY, AND THAT IS THE RULING RATHER THAN AN OVERSIGHT ───────
//
// `supplierApplicationStore`'s ground, transferred because it holds: **nobody
// has ever asked for a material.** A hand-written row here would be a request
// in a state no act put it in, carrying a `submittedAt` nobody submitted at and
// a `submittedBy` nobody set — rendered on a master-data queue beside rows a
// real dispatch produced, with nothing to tell them apart.
//
// **Every row in this store is therefore produced by
// `t_materialrequest_submit`.** That is "fixtures grown through dispatched
// verbs" taken literally, and it is affordable here for the same reason it was
// there: the lane is new, so there is no existing surface whose empty state
// would become a regression.
//
// ⚠️ **THE COST, STATED.** An empty population is the `EMPTY-INPUT-REPORTS-
// CLEAN-01` shape: any assertion of the form "no row is malformed" passes
// vacuously over `[]`. Every spec against this store therefore DISPATCHES
// first and asserts MEMBERSHIP second, and the population guard runs FIRST in
// the file — by membership, never by a count.
//
// ── ⚠️ AND IT JOINS NO ANCHORED FAMILY, WHICH IS A DECISION, NOT AN OMISSION ─
//
// `FAMILY_ANCHORS` exists to keep AUTHORED fixture dates coherent with
// `DECLARED_PRESENT`. Every date in this store is written by the dispatcher at
// the instant of the act, so there is nothing authored to re-anchor and
// `shiftFields` has nothing to route. Declaring a ninth family over a corpus
// that opens empty would be `EMPTY-INPUT-REPORTS-CLEAN-01` wearing an anchor.
//
// **The consequence, accepted rather than worked around: NO SURFACE RENDERS A
// DAY-COUNT for a request.** A waiting-time label is a day-label and would put
// this lane inside `readingInstantGate`'s jurisdiction. The queue's real
// question — *which requests has nobody started?* — is answered by
// `status === 'Submitted'` and by sorting on `submittedAt`, neither of which
// needs one.
// ────────────────────────────────────────────────────────────────────────────

import type { MaterialRequest } from '../../types';

let rows: MaterialRequest[] = [];
let seq = 0;

export const materialRequestStore = {
  /** Every request (the mutable source reads resolve from). */
  all(): readonly MaterialRequest[] {
    return rows;
  },
  /** One request by id, or undefined. */
  get(id: string): MaterialRequest | undefined {
    return rows.find((r) => r.id === id);
  },
  /** Record a new request. Newest first — a queue reads top-down. */
  add(request: MaterialRequest): void {
    rows = [request, ...rows];
  },
  /** Apply a transition's effects. No-op when absent — the dispatcher has
   *  already proven existence via `readState`, so this cannot be reached with
   *  an unknown id; the guard is defence in depth, not a fallback. */
  update(id: string, fn: (r: MaterialRequest) => MaterialRequest): void {
    rows = rows.map((r) => (r.id === id ? fn(r) : r));
  },
  /**
   * Store-assigned identity. The platform convention — the store mints it,
   * never the caller, so nothing outside can choose which row it is writing
   * over, and no surface can invent a number for a record that does not exist.
   */
  nextId(): string {
    seq += 1;
    return `mr-${String(seq).padStart(4, '0')}`;
  },
  /**
   * The human-readable reference for the CURRENT sequence position. Minted in
   * the same step as the id so the two can never disagree.
   *
   * ⚠️ **THE `MR-` PREFIX IS HYGIENE, NOT ENFORCEMENT.** Measured free at
   * authoring (zero occurrences across `src` + `docs` + `gate` + `scripts`,
   * against `RM-` at 774 by the same matcher in the same run), but C9 §3 says
   * *"Nothing may parse a material code"*, so nothing may lean on this. What
   * keeps a request out of the code space is `MaterialRequest.materialCode`
   * being the LITERAL type `null`, and `codesOfKeys` being a filter.
   */
  numberFor(id: string): string {
    return `MR-2026-${id.slice('mr-'.length)}`;
  },
  /** Restore the empty seed (test isolation). */
  reset(): void {
    rows = [];
    seq = 0;
  },
};

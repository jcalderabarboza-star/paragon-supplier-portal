// ────────────────────────────────────────────────────────────────────────────
// Mutable PslListing store (PSL P3).
//
// Same contract as `supplierApplicationStore` / `materialRequestStore`: reads
// resolve FROM here, and the eight PSL verbs mutate it through the dispatcher —
// never directly from a page.
//
// ── ⚠️ IT SEEDS EMPTY, AND THAT RETIRES A FROZEN FIXTURE (operator ruling h) ─
//
// P1 shipped nine `PslListing` LITERALS in `mock/fixtures/pslListings.ts`. Two
// shipped stores refuse that shape by name, in the same words, and the words
// are the reason this file opens empty rather than importing them:
//
//   *"A hand-written row here would be a request in a state no act put it in,
//   carrying a `submittedAt` nobody submitted at and a `submittedBy` nobody
//   set — rendered on a queue beside rows a real dispatch produced, WITH
//   NOTHING TO TELL THEM APART."*  (`materialRequestStore.ts`)
//
// The nine survive as PAYLOADS in `pslSeed.ts` and are grown through the real
// verbs, so every row in this store passes the same hooks a later act will,
// lands in the DR-10 trail, and takes a store-assigned id and store-assigned
// ledger instants.
//
// ⚠️ **THE COST, STATED.** An empty population is the
// `EMPTY-INPUT-REPORTS-CLEAN-01` shape: any assertion of the form "no row is
// malformed" passes vacuously over `[]`. Every spec against this store
// therefore SEEDS first and asserts MEMBERSHIP second, and the population guard
// runs FIRST in the file — by membership, never by a count.
//
// ── ⚠️ THE ID FORMAT IS `psl-NNN`, AND THE PADDING IS LOAD-BEARING ──────────
//
// Three digits, so the seed's dispatch order reproduces `psl-001` … `psl-009`
// exactly as the retired fixture authored them. That is not nostalgia: those
// ids are deep-link targets (`?id=psl-003` opens the profile tab on a listing)
// and `recordAnchorId` renders them into the DOM, so changing them would break
// every link anybody has ever copied out of this portal. The store still MINTS
// identity — the caller never chooses it — which is the rule that matters.
//
// ── ⚠️ AND IT JOINS NO ANCHORED FAMILY, WHICH IS A DECISION ────────────────
//
// `FAMILY_ANCHORS` exists to keep AUTHORED fixture dates coherent with
// `DECLARED_PRESENT`. The dates this store ASSIGNS — every `statusHistory.at`,
// `publishedAt`, `capDecidedAt` — are written by the dispatcher at the instant
// of the act, so there is nothing authored to re-anchor. The dates it STORES
// from a payload (`validFrom` / `validUntil`) are re-anchored by `pslSeed.ts`
// BEFORE they are dispatched, which is where the `psl` family still lives and
// where `pslListings.fixture.test.ts` still re-derives both window edges.
//
// ⚠️ **THE CONSEQUENCE, ACCEPTED RATHER THAN WORKED AROUND: A SEEDED ROW'S
// LEDGER SAYS IT WAS RECORDED TODAY, ON A DESIGNATION THAT MAY HAVE RUN LAST
// YEAR.** That is a BACKFILL and it is the normal way an existing preferred
// supplier list enters a new portal on day one. The ledger `at` says when
// Paragon learned of the designation; `validFrom` / `validUntil` say when it
// applies. They are different axes and they are legitimately different — the
// same split `publishedAt` already makes against validity.
// ────────────────────────────────────────────────────────────────────────────

import type { PslListing } from '../../pslListing';

let rows: PslListing[] = [];
let seq = 0;

export const pslStore = {
  /** Every listing (the mutable source reads resolve from). */
  all(): readonly PslListing[] {
    return rows;
  },
  /** One listing by id, or undefined. */
  get(id: string): PslListing | undefined {
    return rows.find((r) => r.id === id);
  },
  /** Record a new listing. Appended, so the seed's dispatch order is the
   *  store's order and `psl-001` reads first — unlike the queues, a governance
   *  register is read oldest-first. `listingsForSupplier` re-sorts for the
   *  surface anyway, so this order is a fact about the store and not a claim
   *  about any screen. */
  add(listing: PslListing): void {
    rows = [...rows, listing];
  },
  /** Apply a transition's effects. No-op when absent — the dispatcher has
   *  already proven existence via `readState`, so this cannot be reached with
   *  an unknown id; the guard is defence in depth, not a fallback. */
  update(id: string, fn: (r: PslListing) => PslListing): void {
    rows = rows.map((r) => (r.id === id ? fn(r) : r));
  },
  /**
   * Store-assigned identity. The platform convention — the store mints it,
   * never the caller, so nothing outside can choose which row it is writing
   * over, and no surface can invent a number for a record that does not exist.
   */
  nextId(): string {
    seq += 1;
    return `psl-${String(seq).padStart(3, '0')}`;
  },
  /** Restore the empty seed (test isolation). */
  reset(): void {
    rows = [];
    seq = 0;
  },
};

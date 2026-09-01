// ────────────────────────────────────────────────────────────────────────────
// Mutable SupplierApplication store (B1).
//
// Same contract as `supplierDocumentStore` / `purchaseRequisitionStore`: reads
// resolve FROM here, and the application verbs mutate it through the dispatcher
// — never directly from a page.
//
// ── ⚠️ IT SEEDS EMPTY, AND THAT IS THE RULING RATHER THAN AN OVERSIGHT ───────
//
// Every other store in this directory opens on a fixture. This one opens on
// `[]`, because **nobody has ever applied.** A seeded application would be a
// hand-stamped row describing an event that did not happen, on the one lane
// whose entire reason for existing is that the platform currently TELLS AN
// OUTSIDER something happened when nothing did
// (`SupplierRegistration.tsx:1289` mints a random number; `:1203` renders it).
// Seeding a plausible application here would be the same lie one layer down,
// and harder to see.
//
// **Every row in this store is therefore produced by `t_application_submit`.**
// That is the constraint "fixtures grown through dispatched verbs" taken
// literally, and it is affordable here precisely because the lane is new: there
// is no existing surface whose empty state would become a regression.
//
// ⚠️ **THE COST, STATED.** An empty population is the `EMPTY-INPUT-REPORTS-
// CLEAN-01` shape: any assertion of the form "no row is malformed" passes
// vacuously over `[]`. Every spec against this store therefore DISPATCHES
// first and asserts membership second, and the population guard runs first in
// the file.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierApplication } from '../../types';

function clone(a: SupplierApplication): SupplierApplication {
  return { ...a, declarations: a.declarations.map((d) => ({ ...d })) };
}

let rows: SupplierApplication[] = [];
let seq = 0;

export const supplierApplicationStore = {
  /** Every application (the mutable source reads resolve from). */
  all(): readonly SupplierApplication[] {
    return rows;
  },
  /** One application by id, or undefined. */
  get(id: string): SupplierApplication | undefined {
    return rows.find((a) => a.id === id);
  },
  /** Record a new application. Newest first — a queue reads top-down. */
  add(application: SupplierApplication): void {
    rows = [application, ...rows];
  },
  /** Apply a transition's effects. No-op when absent — the dispatcher has
   *  already proven existence via `readState`, so this cannot be reached with
   *  an unknown id; the guard is defence in depth, not a fallback. */
  update(id: string, fn: (a: SupplierApplication) => SupplierApplication): void {
    rows = rows.map((a) => (a.id === id ? fn(a) : a));
  },
  /**
   * Store-assigned identity. The platform convention — the store mints it,
   * never the caller, so nothing outside can choose which row it is writing
   * over, and no surface can invent a number for a record that does not exist.
   */
  nextId(): string {
    seq += 1;
    return `app-${String(seq).padStart(4, '0')}`;
  },
  /** The human-readable reference for the CURRENT sequence position. Minted in
   *  the same step as the id so the two can never disagree. */
  numberFor(id: string): string {
    return `APP-2026-${id.slice('app-'.length)}`;
  },
  /** Restore the empty seed (test isolation). */
  reset(): void {
    rows = [];
    seq = 0;
  },
};

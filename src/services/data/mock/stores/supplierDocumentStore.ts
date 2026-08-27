// ────────────────────────────────────────────────────────────────────────────
// Mutable SupplierDocument store (§82).
//
// Same contract as `requirementResponseStore` / `inventoryDeclarationStore`:
// reads resolve FROM here, and the supplier-document verbs mutate it through the
// dispatcher — never directly from a page.
//
// ⚠️ **WHY THIS FILE EXISTS AT ALL, STATED ONCE.** Until §82 `supplierDocument`
// was one of the flows with no `CommandTarget`, so its four verbs could not fire
// and `DOCUMENTS` was read straight out of the fixture module by
// `MockProcurementService`. A frozen array is the correct shape for data nothing
// writes; it is the wrong shape the moment a verb does, because a page that
// mutates a module-level literal is the un-governed write path this platform
// does not have. The store is the seam that keeps the write inside the
// dispatcher.
// ────────────────────────────────────────────────────────────────────────────

import { DOCUMENTS } from '../fixtures/supplierDocuments';
import type { SupplierDocument } from '../../types';

function clone(d: SupplierDocument): SupplierDocument {
  return {
    ...d,
    ...(d.declaration ? { declaration: { ...d.declaration } } : {}),
  };
}

let rows: SupplierDocument[] = DOCUMENTS.map(clone);
let seq = 0;

export const supplierDocumentStore = {
  /** All documents (the mutable source reads resolve from). */
  all(): readonly SupplierDocument[] {
    return rows;
  },
  /** One document by id, or undefined. */
  get(id: string): SupplierDocument | undefined {
    return rows.find((d) => d.id === id);
  },
  /** Add a newly-declared document (creation). New array reference, newest first
   *  — a supplier that has just declared should see its own act at the top. */
  add(doc: SupplierDocument): void {
    rows = [doc, ...rows];
  },
  /** Apply a transition's effects to one document. No-op when absent — the
   *  dispatcher has already proven existence via `readState`, so this cannot be
   *  reached with an unknown id; the guard is defence in depth, not a fallback. */
  update(id: string, fn: (d: SupplierDocument) => SupplierDocument): void {
    rows = rows.map((d) => (d.id === id ? fn(d) : d));
  },
  /**
   * Store-assigned id for a declaration (distinct 9xxx range; fixtures are
   * `doc-0xx`). The platform convention — the store mints the identity, never
   * the caller, so a supplier cannot choose which document it is writing over.
   */
  nextNumber(): string {
    seq += 1;
    return `doc-${9000 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = DOCUMENTS.map(clone);
    seq = 0;
  },
};

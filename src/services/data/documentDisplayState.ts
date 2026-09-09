// ────────────────────────────────────────────────────────────────────────────
// THE ONE DISPLAY STATE A DOCUMENT ROW SHOWS — computed, shared by every
// surface that renders one.
//
// ⚠️ **WHY THIS EXISTS, AND IT IS NOT THAT THE STORED LITERAL IS WRONG.**
// That was the reason on file until #323, and it was FALSE: stored and computed
// agree on every row today (`8c68d77` shifted the fixture to
// `DECLARED_PRESENT`, and the claim that they disagreed survives only against
// `DOCUMENTS_RAW`, which no consumer reads). A batch justified by a corrected
// premise must carry the corrected premise, so here it is.
//
// **`SupplierDocument.status` IS BOTH THE DISPLAY FIELD AND THE DISPATCHER'S
// STATE CURSOR.** `supplierDocumentTarget.readState` reads it and
// `applyTransition` writes `status: toState`
// (`mock/MockCommandService.ts`) — so the field a badge renders is the field
// legality is decided against. And `'Expiring Soon'` is NOT among
// `getFlow('supplierDocument').states`: two of sixteen fixture rows sit in a
// state the machine does not declare.
//
// ⚠️ **THE HARM IS LATENT AND DATED, NOT PRESENT — MEASURED, NOT ASSUMED.**
// Probed with a working control: `doc-006` (`Awaiting Upload`) dispatches
// `t_supplierdoc_submit` → `done`, while `doc-001` (`Expiring Soon`) and
// `doc-005` (`Valid`) both refuse `ILLEGAL_TRANSITION`. An out-of-flow
// `'Expiring Soon'` therefore refuses IDENTICALLY to an in-flow `'Valid'`, and
// nothing is broken today. **The day a renewal verb declares `from: ['Valid']`,
// `doc-001` and `doc-202` are silently excluded by a DISPLAY literal** — a
// clock word deciding a legality question. Computing the display state is what
// lets the stored field go back to being only a cursor.
//
// ── ⚠️ WHY THE VOCABULARY IS ITS OWN AND NOT `SupplierDocumentStatus` ───────
//   `documentExpiry` answers a CLOCK question (`no-expiry | expired | expiring
//   | current`); the stored union answers a LIFECYCLE question and is missing
//   `'Expired'`, which #316 retired deliberately — *"a union member no code
//   produces is the fabrication shape"*. Mapping the classifier onto the union
//   would have to re-add it, which is the one thing that ruling forbids.
//
//   So neither vocabulary is bent to the other: **this is a third, DISPLAY
//   vocabulary**, lowercase so it can never be mistaken for a stored value, and
//   it is the only thing a badge renders. The precedent is one file over —
//   `SupplierCertsExpiringWidget` already renders `widget.certsExpiring.state.
//   expired` (EN *Expired* / ID *Kedaluwarsa*) with no union member behind it.
//   That was the answer to *"what does the badge say when a row computes
//   expired?"* before this module existed; this generalises it rather than
//   inventing it.
//
// ── ⚠️ AND IT DELIBERATELY PRODUCES NO UNION STRING ─────────────────────────
//   `projectionGate/derive.ts` classifies a display state by grepping its
//   OWNING files for a write (`status: 'X'` · `return 'X'` · `= 'X'`).
//   `supplierDocument`'s ownership is `/supplierDocuments|supplierDocumentStore|
//   SupplierDocuments/`, so `SupplierDocuments.tsx` and the page's i18n
//   fragment are both in scope. This module returns TOKENS and the labels are
//   the platform's existing `status.*` keys, so after this batch the string
//   `'Expiring Soon'` still comes from exactly two places — the two fixture
//   rows — and `displayStates.ts`'s `stored-in-fixtures` row stays literally
//   true.
//   **That is a consequence of the vocabulary being separate, not a way around
//   the gate**: the day the fixture literal is retired, the row becomes
//   `produced-by-nothing` and the gate says so on its own. Retiring it is the
//   next batch and its own ruling.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierDocument } from './types';
import { documentExpiry } from './dayProjection';

/**
 * What a reader sees on a document row. Lowercase by convention: a stored
 * `SupplierDocumentStatus` is Title Case, so the two can never be confused at
 * a call site or in a grep.
 */
export type DocumentDisplayState =
  // ── the lifecycle half — passed through from the stored cursor, unchanged.
  //    These ARE `getFlow('supplierDocument').states` members and carry no
  //    clock content, so computing them would be inventing an opinion.
  | 'awaiting-upload'
  | 'under-review'
  | 'rejected'
  // ── the clock half — decided by `documentExpiry`, never read from the row.
  | 'valid'
  | 'expiring'
  | 'expired';

/**
 * The stored members whose meaning is LIFECYCLE, not clock.
 *
 * ⚠️ Derived as a set rather than written as an `if` chain so the exhaustive
 * `switch` below stays exhaustive under `tsc`: adding a union member without
 * deciding which half it belongs to is then a type error, not a silent default.
 */
const LIFECYCLE_PASSTHROUGH = {
  'Awaiting Upload': 'awaiting-upload',
  'Under Review': 'under-review',
  Rejected: 'rejected',
} as const satisfies Partial<Record<SupplierDocument['status'], DocumentDisplayState>>;

/**
 * A document's display state, COMPUTED (law 0.5).
 *
 * ⚠️ **THE CLOCK ONLY DECIDES THE CLOCK HALF.** A document `Awaiting Upload`
 * with a date in the past is still awaiting upload — reading the clock there
 * would let an expiry answer a question about whether a file arrived. So the
 * lifecycle members pass through and only `'Valid'` (and the stored
 * `'Expiring Soon'` this batch exists to stop reading) reach `documentExpiry`.
 *
 * `no-expiry` folds into `valid`: an absent date must not manufacture an alarm,
 * which is the same answer `documentExpiry` gives it by refusing to say
 * `expired`.
 */
export function documentDisplayState(
  doc: Pick<SupplierDocument, 'status' | 'expiryDate'>,
  nowIso: string,
): DocumentDisplayState {
  const passthrough = (
    LIFECYCLE_PASSTHROUGH as Record<string, DocumentDisplayState | undefined>
  )[doc.status];
  if (passthrough) return passthrough;

  switch (documentExpiry(doc, nowIso)) {
    case 'expired':
      return 'expired';
    case 'expiring':
      return 'expiring';
    case 'current':
    case 'no-expiry':
      return 'valid';
  }
}

/**
 * The i18n key for a display state's label — ONE map, so no surface spells it
 * alone.
 *
 * ⚠️ **EVERY KEY HERE ALREADY EXISTED. NO NEW COPY WAS WRITTEN, AND THAT WAS
 * MEASURED RATHER THAN ASSUMED.** A first draft of this batch authored a fresh
 * `documentState.*` fragment with hand-written ID values and got `Under Review`
 * wrong — *Dalam Peninjauan* against the tree's *Sedang Ditinjau* — which is a
 * silent copy change dressed as a refactor. Derived instead, through
 * `statusLabelKey`: all six labels resolve in `statusLabel.ts`, in BOTH
 * locales, **including `Expired`** (`status.expired` → EN *Expired* / ID
 * *Kedaluwarsa*) — the one this batch most expected to have to invent, because
 * #316 retired the union MEMBER. It retired a member, not a word: the label
 * outlived it, which is the difference between a vocabulary and a type.
 *
 * Pointing at the canonical keys rather than copying their values is also what
 * stops this map drifting from `statusLabel.ts` the first time a translation is
 * corrected in one place.
 */
export const DISPLAY_STATE_LABEL_KEY: Readonly<
  Record<DocumentDisplayState, string>
> = {
  'awaiting-upload': 'status.awaiting_upload',
  'under-review': 'status.under_review',
  rejected: 'status.rejected',
  valid: 'status.valid',
  expiring: 'status.expiring_soon',
  expired: 'status.expired',
};

/**
 * Pill tone per display state.
 *
 * ⚠️ **`expired` IS `danger` AND `expiring` IS `warning`, WHICH IS A DISTINCTION
 * THE STORED UNION COULD NOT MAKE** — it had one member for both once `Expired`
 * was retired, so a dead certificate and one with months left wore the same
 * amber. That is the visible half of what computing buys, and it is reachable
 * the moment any document passes its date.
 */
export const DISPLAY_STATE_TONE: Readonly<
  Record<DocumentDisplayState, 'success' | 'warning' | 'danger' | 'neutral'>
> = {
  'awaiting-upload': 'neutral',
  'under-review': 'neutral',
  rejected: 'danger',
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
};

/**
 * The i18n key for the ACTION a display state calls for.
 *
 * ⚠️ **THE LABEL IS THE HALF THAT WOULD HAVE BEEN LEFT BEHIND.** A badge that
 * computes beside an action that does not is the same split one field over —
 * the page would show a computed state next to a stored verb. `expired` maps to
 * `renew` for the same reason `expiring` does: a dead certificate needs
 * renewing at least as much as a dying one, and `view` would be the softer lie.
 */
export const DISPLAY_STATE_ACTION_KEY: Readonly<
  Record<DocumentDisplayState, string>
> = {
  'awaiting-upload': 'supplierDashboard.docs.action.upload',
  // ⚠️ `view`, NOT `upload` — `supplierdoc:upload` is unauthored, so an Upload
  // label here would name a verb the platform does not have. The refusal and
  // its reason live on `/supplier/documents`; this tile sends the reader there.
  rejected: 'supplierDashboard.docs.action.view',
  'under-review': 'supplierDashboard.docs.action.view',
  valid: 'supplierDashboard.docs.action.view',
  expiring: 'supplierDashboard.docs.action.renew',
  expired: 'supplierDashboard.docs.action.renew',
};

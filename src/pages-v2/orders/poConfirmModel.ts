// ────────────────────────────────────────────────────────────────────────────
// poConfirmModel (CP-0 · W1 · 2f-c) — the ONE read of the PO-confirm line
// quantities.
//
// 2f-FIND-03 (as amended). The retired path was a `type="number"` cell read
// with `Number(e.target.value)` straight into `confirmedQtys: number[]` — a
// state shape with no representation for "blank", the exact 2f-a lesson.
//
// THE INVERTED LOCKS — why this batch is the mirror of 2f-b. BuyerContracts
// (2f-b) had a parse gate possible but NO dispatcher behind it: one lock, by
// necessity. This surface is the opposite: the SECOND lock exists and HOLDS —
// `t_po_confirm` requires `confirmedQuantities` and the
// `poConfirmQtyWithinOrdered` policy enforces `0 < q ≤ ordered` per line — but
// the FIRST lock was missing entirely. A cleared field fabricated a 0 into
// surface state, dispatched, and was bounced by the policy after the fact,
// with the dispatcher's raw English debug string as the only explanation. And
// the one reading the policy structurally cannot catch — "1.500" misread as
// 1.5, inside bounds — sailed through and was stamped onto the stored line,
// where `expectedValue = Σ(confirmedQty × unitPrice)` feeds the 3-way invoice
// match. This module is the first lock, built in front of a second that was
// already load-bearing: the first full two-lock build in the 2f arc.
//
// HOLDS NO DOMAIN RULE, deliberately (the `grLineQuantities` discipline). The
// bound `0 < q ≤ ordered` is the POLICY's law, expressed once in
// `confirmedQtyWithinBounds` (`services/transitions/policies.ts`) and shared
// with the surface's courtesy mirror — it does not belong in a parser, and
// duplicating it here would be a second recipe. This module answers only "what
// number did the operator type", never "is that number allowed".
//
// BLANK REFUSES. These cells are SEEDED from the ordered quantity, so an
// untouched blank cannot exist — every blank is operator-cleared, and a
// cleared confirmation is not a confirmation of none. A typed zero parses
// intact (a real assertion); it is the POLICY that refuses it (`0 < q`),
// which the surface mirrors in the operator's language. Whether a supplier
// should be able to short-confirm a line to zero is the dispatcher's
// commercial rule, preserved verbatim.
//
// PURE and DOM-free: every state is confirmable headlessly, including the ones
// a `type="number"` field hides by eating the token before React sees it.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** One line's read. Exported so each cell reports ITSELF — the per-field
 *  lesson carried from 2e-b-4b, per line instead of per field. */
export type PoLineQtyOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

/**
 * Read one line's confirmed quantity, honestly.
 *
 * No convention `hint`: a supplier's confirm form carries no origin
 * convention, so a token legal under both readings ("1.500" = 1500 or 1.5)
 * REFUSES rather than being guessed — this is the exact token that previously
 * passed the policy as 1.5 and poisoned the match expectation.
 *
 * No whole-number rule (the `readMoq` reasoning): PO lines are denominated in
 * the material's UOM — KG and L as well as PCS — where fractional
 * confirmations are ordinary.
 */
export function readConfirmedQty(raw: string): PoLineQtyOutcome {
  const parsed = normalizeQty(raw);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, reason: parsed.reason };
}

/** The composite the DISPATCH reads: every line, or the first refusal with its
 *  line index so the failure can name where it is. */
export type PoConfirmQtysOutcome =
  | { readonly ok: true; readonly quantities: readonly number[] }
  | { readonly ok: false; readonly line: number; readonly reason: QtyRefusalReason };

/**
 * Read the whole confirmation. Built from the per-line read above, so a cell's
 * inline message and the dispatch decision can never come from different
 * judgements. Sequential by design — it names the FIRST refusing line, because
 * its caller only needs to know whether the confirmation may dispatch; the
 * per-line reads exist for everything else.
 */
export function readConfirmedQuantities(raws: readonly string[]): PoConfirmQtysOutcome {
  const quantities: number[] = [];
  for (let i = 0; i < raws.length; i++) {
    const read = readConfirmedQty(raws[i]);
    if (!read.ok) return { ok: false, line: i, reason: read.reason };
    quantities.push(read.value);
  }
  return { ok: true, quantities };
}

/**
 * Seed a raw cell from the ordered quantity.
 *
 * CANONICAL, ungrouped — `String(n)`, never `formatNumber(n)`. A grouped seed
 * ("150.000" for PO-2025-00108's PET bottles) is exactly the token
 * `normalizeQty` refuses as AMBIGUOUS, so the form would open refusing its own
 * untouched defaults on every line. Fourth site of the IntakeAdjustDrawer
 * warning (PR-2b → 2f-a `seedQty` → 2f-b `seedContractNumber` → here) — and
 * the first where the seeds are routinely LARGE enough to group, so the trap
 * is live on open, not latent.
 */
export function seedConfirmQty(value: number): string {
  return String(value);
}

// ────────────────────────────────────────────────────────────────────────────
// grLineQuantities (CP-0 · W1 · 2f-a) — the ONE read of a goods-receipt line's
// received / accepted pair.
//
// 2f-FIND-01. This is the numeric entry closest to inventory truth in the
// product, and it was the 2e-a pattern intact: `type="number"` inputs read with
// a bare `Number(e.target.value)` straight into `LineDraft.qtyReceived:number`.
// The stored GR carries these, `qtyRejected` is DERIVED from the pair, and
// `grHasRejects` rolls them up into the header disposition — so a misread here
// does not merely record a wrong quantity, it decides whether a receipt is
// Approved, Partially Approved or Rejected.
//
// TWO FAILURES, one of them not even locale-conditional:
//   · a cleared field became `Number('') === 0`, and 0 satisfied EVERY existing
//     guard (not negative ✓, accepted ≤ received ✓, no rejection reason owed
//     because rejected is 0 ✓) — so it posted a receipt asserting that nothing
//     arrived and nothing was rejected; and
//   · `type="number"` REJECTS a comma-grouped token outright: typing "1,500" in
//     en-US leaves `.value === ""`, which then took the same `|| 0` path to a
//     silent zero. That one needs no id-ID browser at all.
//
// WHY THE STATE SHAPE WAS THE FIX, not a means to it. `qtyReceived: number` has
// no representation for "blank": there is no string to parse and therefore no
// parse boundary to correct. The draft is now raw-backed
// (`qtyReceivedRaw: string`), the same shape as `QuoteForm.unitPrice` (2e-a),
// `DraftRfq.totalQty` (2e-b-4) and IntakeAdjustDrawer's `acceptedRaw` (PR-2b).
// Only then can blank be a value distinct from zero.
//
// A GUARD IS ONLY ASKABLE OF A VALUE THAT EXISTS — the third named site of the
// IntakeAdjustDrawer C6-LOCK pattern (PR-2b), after `rfqCreateModel` (2e-b-4a).
// The wizard's three receipt guards were never WRONG; they were answerable only
// because a fabricated zero made them answerable. This module deliberately holds
// NO domain rule: the sign check, the `accepted ≤ received` invariant and the
// rejection-reason requirement all stay exactly where they were, in
// `receiptValid`, and simply become unreachable under a refusal. That is
// strictly stronger than adding a fourth blank-check, and it leaves all three
// individually untouched.
//
// BLANK REFUSES (operator ruling, 2f-a). Both quantities are REQUIRED. A line
// with no received quantity is not a fact, it is an unfinished inspection — and
// the lifecycle already models that (`goodsReceiptLine.flow.ts` `Pending →
// Inspected`). Representing it a second time as an absent quantity would encode
// one state in two places and would touch transition-schema surface the SE Team
// reads as spec. So blank never reaches the store, and a TYPED zero keeps its
// full meaning: nothing arrived, and someone asserted it.
//
// NO WHOLE-NUMBER RULE, deliberately — the same reasoning as `readMoq`. A GR
// line is denominated in the material's UOM (KG and L as well as PCS), where a
// fractional receipt is ordinary. Inventing a rule here would refuse real
// deliveries, which is a harm rather than a caution.
//
// PURE and DOM-free: every state is confirmable headlessly, including the ones a
// `type="number"` field hides by eating the token.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** Which half of the pair refused, so a surface can mark the offending input. */
export type GrQtyField = 'received' | 'accepted';

export type GrLineQtyOutcome =
  | { readonly ok: true; readonly received: number; readonly accepted: number }
  | {
      readonly ok: false;
      readonly field: GrQtyField;
      readonly reason: QtyRefusalReason;
    };

/**
 * Read one line's received/accepted pair, honestly.
 *
 * The ONE parse. The field messages, the receipt guard, the derived
 * `qtyRejected`, the header rollup and the dispatched payload all read THIS
 * result, so none of them can disagree about what arrived.
 *
 * No convention `hint`: a dock operator's form carries no origin convention, so
 * a token legal under both readings ("1.500" = 1500 or 1.5) REFUSES rather than
 * being guessed — on a quantity that becomes inventory, guessing is the one
 * thing that must not happen.
 *
 * `received` is judged first, so a line with both halves unreadable names the
 * received field — the one the operator fills first.
 *
 * Negative input needs no branch: `normalizeQty` rejects a leading `-` as
 * NOT_NUMERIC before any convention is considered. The wizard's own sign guard
 * is therefore belt-and-braces, and is left in place unchanged.
 */
export function readGrLineQuantities(
  receivedRaw: string,
  acceptedRaw: string,
): GrLineQtyOutcome {
  const received = normalizeQty(receivedRaw);
  if (!received.ok) return { ok: false, field: 'received', reason: received.reason };

  const accepted = normalizeQty(acceptedRaw);
  if (!accepted.ok) return { ok: false, field: 'accepted', reason: accepted.reason };

  return { ok: true, received: received.value, accepted: accepted.value };
}

/**
 * Seed a raw field from a known numeric quantity (the shipment/ASN line).
 *
 * CANONICAL, ungrouped — `String(n)`, never `formatNumber(n)`. A grouped seed
 * ("2.400") is exactly the token `normalizeQty` refuses as AMBIGUOUS, so the
 * form would open by refusing its own untouched default. IntakeAdjustDrawer
 * carries the same warning for the same reason.
 */
export function seedQty(value: number): string {
  return String(value);
}

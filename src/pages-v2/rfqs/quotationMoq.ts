// ────────────────────────────────────────────────────────────────────────────
// quotationMoq (CP-0 · W1 · 2e-b-2) — the ONE read of a supplier's minimum
// order quantity, and the three states it can honestly be in.
//
// FIND-02, the captures-what-it-discards defect. The quote form has always
// collected a minimum order quantity and then DROPPED it: the field wrote to
// local form state, `buildQuotationSubmitPayload` never received it, and the
// minted quotation carried no trace of it. A supplier who typed "we cannot
// break a 100,000-unit batch" was shown a field that accepted the sentence and
// a confirmation that never mentioned it again.
//
// That is the same honesty class as a fabricated fact, arrived at from the
// other side: a fabricated fact asserts something nobody said, a dropped one
// silently un-says something they did. And this particular fact is not
// cosmetic — where a supplier's minimum EXCEEDS the RFQ quantity, it is a real
// constraint on the bid. A buyer comparing two quotes without it can award one
// that cannot legally be ordered at the quantity being sourced.
//
// THREE STATES:
//   · BLANK          → LEGAL, and means "same as the RFQ quantity" (the field's
//                      own stated default). Never a refusal, and never a zero:
//                      it resolves to `null`, which the payload OMITS.
//   · UNREADABLE     → refused. "abc" is not a constraint, and "1.500" means
//                      1500 in Indonesian and 1.5 in English — a minimum read
//                      1000× wrong is worse than none at all.
//   · A STATED VALUE → preserved exactly, through the payload to the entity.
//
// WHY A STATED ZERO IS REFUSED. A minimum of nothing is not a minimum, and the
// supplier who means it already has a one-keystroke way to say so: clear the
// field. Accepting it would put "MOQ 0" in front of a buyer as though it were a
// commercial term, and would leave the one value a broken parser fabricates
// indistinguishable from a value someone typed. The `readBidPrice` ZERO_PRICE
// precedent, applied to the field's own domain.
//
// NO WHOLE-NUMBER RULE, deliberately. Lead time gets one (`FRACTIONAL_DAYS`)
// because a delivery promise is a whole number of days. A minimum order
// quantity is denominated in the RFQ's UOM — KG, L, MT as well as PCS — where a
// fractional minimum is ordinary. Inventing a rule here would refuse legal
// bids, which is a real harm rather than a conservative one.
//
// This batch STOPS THE DROP and nothing else. Whether a minimum that exceeds
// the RFQ quantity should warn the buyer, flag the comparison, or block the
// award is a live commercial question and its own dispatch — see MOQ-FIND-01.
//
// PURE and DOM-free (Correction-2): every state is confirmable headlessly,
// including the ones a `type="number"` field hides by eating the token.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/**
 * Why a minimum order quantity was refused.
 *
 * `EMPTY_QTY` is deliberately NOT in the union: on this field a blank is the
 * documented default, not an omission, so the type itself records that emptiness
 * can never be a refusal here. Contrast `LeadTimeRefusalReason`, where it is —
 * the same emptiness, two different domain rulings, each stated where it applies.
 */
export type MoqRefusalReason = Exclude<QtyRefusalReason, 'EMPTY_QTY'> | 'ZERO_MOQ';

export type MoqOutcome =
  /** `moq: null` is the STATED ABSENCE — "same as the RFQ quantity" — not a zero. */
  | { readonly ok: true; readonly moq: number | null }
  | { readonly ok: false; readonly reason: MoqRefusalReason };

/**
 * Read a supplier's typed minimum order quantity, honestly.
 *
 * The ONE parse. The field-level message, the submit gate, and the dispatched
 * payload all read this result, so none of them can disagree about what the
 * supplier's minimum is — and nothing here can produce a number they did not
 * type. There is no `|| 0` and no `?? 0`: the absence case has its own value
 * (`null`) precisely so it can never be confused with a quantity of zero.
 *
 * Negative input needs no branch: `normalizeQty` rejects a leading `-` as
 * NOT_NUMERIC before any convention is considered.
 */
export function readMoq(raw: string): MoqOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) {
    // The one refusal this field converts into a legal answer. A supplier who
    // has no minimum leaves the box alone, and the platform must not tell them
    // they got it wrong.
    if (parsed.reason === 'EMPTY_QTY') return { ok: true, moq: null };
    return { ok: false, reason: parsed.reason };
  }
  if (parsed.value === 0) return { ok: false, reason: 'ZERO_MOQ' };
  return { ok: true, moq: parsed.value };
}

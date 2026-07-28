// ────────────────────────────────────────────────────────────────────────────
// quotationPrice (CP-0 · W1 · 2e-a) — the ONE read of a supplier's bid price.
//
// A quoted unit price is not a display string that happens to look numeric: it
// is the fact the award engine RANKS SUPPLIERS BY. `scoreQuotations`
// (`lib/quoteScore.ts`) anchors `minPrice` across the whole RFQ set, so ONE
// misread price does not merely record itself wrong — it re-anchors every rival
// bid to a price nobody offered and hands `topRanked` to the wrong supplier.
// That is the false-deficit chain one governed level worse: it does not accuse,
// it awards.
//
// Before this batch the quote form read `form.unitPrice` THREE times with three
// different recipes — `parseFloat` ∘ comma-strip (the total preview),
// `parseFloat` bare (the submit gate), and `Number` ∘ comma-strip ∘ `|| 0` (the
// payload that becomes the governed fact). An Indonesian supplier typing the
// ordinary "1.500" was read as 1.5 by all three and outbid every rival by 1000×;
// a token those recipes could not read at all became `|| 0` — Rp 0, a price no
// supplier ever offered, attached to a real audited quotation number.
//
// So this module does two things and nothing else:
//   · routes the price through `normalizeQty` — the ONE legal numeric parser —
//     with NO convention hint (a supplier's own form carries no origin
//     convention; per 2c the UI language is not one either), so a token legal
//     under both readings REFUSES instead of being guessed; and
//   · adds the ONE domain rule `normalizeQty` cannot know: on a competitive bid
//     line, zero is not a price.
//
// It is PURE and DOM-free on purpose (Correction-2): every refusal branch here
// is confirmable headlessly, including the ones a `type="number"` field would
// have hidden from a jsdom test.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/**
 * Why a bid price was refused. Extends the parser's own vocabulary with the one
 * refusal that is a DOMAIN rule rather than a reading failure: `ZERO_PRICE`.
 *
 * A zero here is perfectly readable — it is simply not a bid. `normalizeQty`
 * is right to return it (a typed 0 is a legal QUANTITY: "cannot supply at all",
 * `requirementResponse.flow.ts:35`), and this layer is right to reject it: a
 * quotation is an offer to sell at a price, and Rp 0 is not an offer. The two
 * rulings do not conflict because they are about different facts — which is
 * exactly why the zero rule lives HERE and not inside the shared parser.
 *
 * Free-goods / bundled zero-price lines are a genuine commercial construct and
 * a SEPARATE capability (booked, 2e-FIND-04) — they need their own line type and
 * their own audit story, not a hole in the bid-price gate.
 */
export type PriceRefusalReason = QtyRefusalReason | 'ZERO_PRICE';

export type PriceOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: PriceRefusalReason };

/**
 * Read a supplier's typed bid price, honestly.
 *
 * The ONE parse. The total preview, the submit gate, and the dispatched payload
 * all read THIS result, so none of them can disagree about what the supplier
 * typed — and a refusal never becomes a number. A refused price produces NO
 * quotation, and therefore never reaches the ranking engine at all.
 *
 * Negative input needs no branch: `normalizeQty` rejects a leading `-` as
 * NOT_NUMERIC before any convention is considered.
 */
export function readBidPrice(raw: string): PriceOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  // Readable, but not a bid. Never coerced, never defaulted — refused by name so
  // the supplier is told which rule they hit, not handed a generic "invalid".
  if (parsed.value === 0) return { ok: false, reason: 'ZERO_PRICE' };
  return { ok: true, value: parsed.value };
}

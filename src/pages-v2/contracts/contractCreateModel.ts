// ────────────────────────────────────────────────────────────────────────────
// contractCreateModel (CP-0 · W1 · 2f-b) — the ONE read of the contract-create
// wizard's two numbers: the total contract value and the notice period.
//
// 2f-FIND-02. The retired path read `draft.value` THREE times with three
// recipes — the step gate (`Number(draft.value) > 0`), the review summary
// (`formatIDR(Number(draft.value))`) and the built entity
// (`Number(draft.value) || 0`) — and `draft.noticeRequiredDays` three more
// (`Number(...) || 0` into the entity, and twice in the review row). Both inputs
// were `type="number"`, so the browser reached the token before the app did.
// The same shape 2e-a retired on the bid price and 2e-b-4a on the RFQ quantity.
//
// WHAT ACTUALLY GOT THROUGH, and what did not — stated precisely, because the
// two fields fail differently:
//
//   · `value` — the `> 0` step gate INCIDENTALLY blocked the two zero-shaped
//     failures: a blank (`Number('') === 0`) and a comma-grouped "1,500" that
//     `type="number"` empties in en-US both fail `0 > 0` and hold the wizard on
//     step 2, silently, with no cause named. What the gate could NOT catch is
//     the one reading that is plausible and wrong: "1.500" is a VALID float, so
//     `Number` returns 1.5, `1.5 > 0` passes, and an Indonesian buyer recording
//     a Rp 1,500 contract stored Rp 1.5 — then `formatIDR` (0 fraction digits)
//     rounded it to "Rp 2" in the table. A 1000× understatement of a commercial
//     commitment, displayed as a confident number.
//   · `noticeRequiredDays` — has NO gate at all, so `|| 0` ran unopposed: a
//     cleared field became a stated notice requirement of zero days.
//
// SEPARATION OF PARSE FROM ASSEMBLY, and PER-FIELD READS FROM THE START — the
// two lessons carried from 2e-b-4a/4b rather than re-learned. `readContractValue`
// and `readNoticeRequiredDays` let each input answer for ITSELF, so a refusal is
// never invisible because a different field happens to be blank first; the
// sequential composite exists only for the gate and the entity, where the single
// question is "may this proceed".
//
// ONE LOCK, BY NECESSITY — NOT BY OVERSIGHT. Every prior surface in this arc had
// TWO locks: the parse gate on the surface, and `requiredFields` on the
// dispatcher behind it (2e-b-4a put `totalQty` into `t_rfq_create` precisely so
// a hand-crafted dispatch could not bypass the wizard). BuyerContracts has no
// second lock available: it imports only `useContracts()` — a read — and the
// "created" contract is client-fabricated into local `extraContracts` state
// (CTR-FABRICATION-01, filed and UNSCHEDULED, deliberately untouched here).
// There is no command, no `requiredFields`, no store to refuse. So the gate
// below is the ONLY thing standing between a blank and a fabricated zero, and it
// has to hold alone. A future seat: when CTR-FABRICATION-01 is fixed, mirror
// `value` into the create verb's `requiredFields` and this becomes two locks.
//
// BLANK REFUSES on both fields (operator ruling, 2f-b) — the third field-pair to
// take the ruling after `readGrLineQuantities` (2f-a) and `totalQty` (2e-b-4a).
// A contract value is the commitment itself, and a notice period the wizard is
// actively asking for is a term of the agreement; neither has a defensible
// reading of "the operator left it alone". A TYPED zero stays a real assertion
// on both, and is preserved intact — the distinction exists to protect it, not
// to suppress it. (`value === 0` still fails the pre-existing `> 0` step gate,
// which is preserved verbatim: whether a zero-value contract should be legal is
// a commercial question, not a parsing one.)
//
// NO WHOLE-NUMBER RULE on either field, the `readMoq` reasoning: a notice period
// is conventionally whole but nothing here needs to legislate it, and inventing
// a rule refuses real input for no gain.
//
// PURE and DOM-free: every state is confirmable headlessly — including the ones
// a `type="number"` field hides by eating the token before React sees it.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** Which numeric field refused, so a surface can point at the offending input
 *  rather than disable Next anonymously. Flat (not a nested wrapper) so it works
 *  as a DIRECT discriminant — TypeScript narrows a union on `refusal.field`, but
 *  not through a `refusal.field.kind` (the TS7053 trap hit in 2e-b-4a). */
export type ContractNumericField = 'value' | 'noticeRequiredDays';

/** One field's read. Exported so each input reports itself independently. */
export type ContractNumberOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

/** A refusal that names its field. Both fields are REQUIRED, so both can carry
 *  the full reason union including `EMPTY_QTY` — unlike the RFQ pair, where an
 *  optional budget excluded it. */
export type ContractDraftRefusal = {
  readonly field: ContractNumericField;
  readonly reason: QtyRefusalReason;
};

export type ContractDraftOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | ({ readonly ok: false } & ContractDraftRefusal);

/** The wizard draft fields the created contract's numbers come from (a
 *  structural subset of BuyerContracts' `DraftContract`). */
export interface ContractNumbersDraft {
  readonly value: string;
  readonly noticeRequiredDays: string;
}

/** Both numbers, through the one legal parse. */
export interface NormalizedContractNumbers {
  readonly value: number;
  readonly noticeRequiredDays: number;
}

/**
 * Read the total contract value. REQUIRED — a blank refuses.
 *
 * No convention `hint`: a buyer's own form carries no origin signal, so a token
 * legal under both readings ("1.500" = 1500 or 1.5) REFUSES rather than being
 * guessed. That is the entire defect this batch closes: `Number` did not refuse,
 * it picked, and it picked the reading that understates a commitment 1000×.
 *
 * Negative input needs no branch — `normalizeQty` rejects a leading `-` as
 * NOT_NUMERIC before any convention is considered, so dropping the input's
 * `min="0"` (a `type="number"` affordance that never bound the parse anyway)
 * loses nothing.
 */
export function readContractValue(raw: string): ContractNumberOutcome {
  const parsed = normalizeQty(raw);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, reason: parsed.reason };
}

/**
 * Read the notice period. REQUIRED, same ruling, same parser.
 *
 * WHY THIS IS THE SAME FUNCTION SHAPE AS THE VALUE and not a special case: the
 * asymmetry on this field is about WHEN IT IS ASKED, not about what a blank
 * means once asked. That belongs to the surface (which decides whether to render
 * the input), not to the parse. Keeping it out of here is what leaves
 * CTR-HIDDEN-SEED-01 a contract-terms question for the operator instead of a
 * decision smuggled into a parser.
 */
export function readNoticeRequiredDays(raw: string): ContractNumberOutcome {
  const parsed = normalizeQty(raw);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, reason: parsed.reason };
}

/**
 * Normalise both numbers — the composite the STEP GATE and the CREATED ENTITY
 * read. Built from the two per-field reads above, so a field's inline message
 * and the wizard's decision can never come from different judgements.
 *
 * Sequential by design: it names the FIRST field that refuses, because its
 * callers only need to know whether the draft may proceed. `value` is judged
 * first — it is the field the operator fills, and the one the step gate is
 * about.
 *
 * This is not a second recipe. Every read here and above goes through the SAME
 * `normalizeQty` on the SAME string; what 2e-a retired was three DIFFERENT
 * parsers, not one parser asked twice.
 */
export function normalizeContractNumbers(
  draft: ContractNumbersDraft,
): ContractDraftOutcome<NormalizedContractNumbers> {
  const value = readContractValue(draft.value);
  if (!value.ok) return { ok: false, field: 'value', reason: value.reason };

  const notice = readNoticeRequiredDays(draft.noticeRequiredDays);
  if (!notice.ok) {
    return { ok: false, field: 'noticeRequiredDays', reason: notice.reason };
  }

  return {
    ok: true,
    value: { value: value.value, noticeRequiredDays: notice.value },
  };
}

/**
 * Seed a raw field from a known numeric default.
 *
 * CANONICAL, ungrouped — `String(n)`, never `formatNumber(n)`. A grouped seed
 * ("2.400") is exactly the token `normalizeQty` refuses as AMBIGUOUS, so a form
 * seeded through a display formatter would open by refusing its own untouched
 * default. The IntakeAdjustDrawer (PR-2b) and `seedQty` (2f-a) carry the same
 * warning for the same reason; the notice period's `'90'` default is why this
 * page needs it too.
 */
export function seedContractNumber(value: number): string {
  return String(value);
}

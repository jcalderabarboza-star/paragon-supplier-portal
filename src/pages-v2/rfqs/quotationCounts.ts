// ────────────────────────────────────────────────────────────────────────────
// quotationCounts (CP-0 · W1 · 2e-b) — the ONE read of the quote form's two
// integer COUNTS: lead time (days) and minimum order quantity.
//
// 2e-a took the bid price off `parseFloat`. These two were left standing, and
// they are not symmetric:
//
//  · LEAD TIME is the OTHER live-scored axis (`CRITERIA_WEIGHTS.leadTime` = 0.2).
//    It reached the payload as `Number(raw) || 0` — the same fabrication branch
//    the price had, on a fact the award engine ranks. And the `|| 0` here is not
//    a harmless default: `quoteScore.ts:117` filters non-positive lead times out
//    of `minLead`, and `ratioToBest` (`:101`) returns 0 for `value <= 0`. So a
//    fabricated zero does NOT read as "instant delivery, best possible score" —
//    it reads as UNSCOREABLE, and silently forfeits a fifth of the supplier's
//    composite. Same shape as the price zero: a bid destroyed by a parser, not
//    an award stolen from a rival. (`quoteScore.test.ts:48` is the standing
//    proof of that guard; this module is what stops the input from testing it.)
//
//  · MOQ is not scored at all — it is a CONSTRAINT the buyer needs and, until
//    this batch, never received: the field was collected and then dropped on the
//    floor when the payload was built (2e-FIND-02). A supplier whose minimum
//    exceeds the RFQ quantity has said something material about whether they can
//    fill the order; silence is the wrong way to carry that.
//
// Both route through `normalizeQty` — the ONE legal parser, no convention hint
// (a supplier's own form carries no origin convention) — and then add the domain
// rules the shared parser cannot know. PURE and DOM-free (Correction-2): every
// refusal branch is confirmable headlessly, including the ones a `type="number"`
// field hides from a jsdom test by eating the token before React sees it.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** The form's two lead-time units. The entity stores days. */
export type LeadTimeUnit = 'days' | 'weeks';

/**
 * Why a lead time was refused. Two domain refusals on top of the parser's:
 *
 * · `FRACTIONAL_DAYS` — a lead time is a whole number of days. "2,5" weeks is
 *   17.5 days, and neither rounding it (fabricating a half-day the supplier did
 *   not commit to) nor storing it (a fractional governed fact the whole fixture
 *   set contradicts) is honest. Ask instead.
 * · `ZERO_LEAD_TIME` — refused because the scoring engine cannot score it: a
 *   non-positive lead time is filtered out of `minLead` and scores 0, the WORST
 *   value on the axis. A stored 0 therefore cannot mean "same day"; it can only
 *   mean "this axis is forfeit". The retired gate already demanded `> 0` — this
 *   keeps that rule and gives it a name and a reason.
 */
export type LeadTimeRefusalReason =
  | QtyRefusalReason
  | 'FRACTIONAL_DAYS'
  | 'ZERO_LEAD_TIME';

export type LeadTimeOutcome =
  | { readonly ok: true; readonly days: number }
  | { readonly ok: false; readonly reason: LeadTimeRefusalReason };

/**
 * Read a supplier's typed lead time as a whole number of DAYS.
 *
 * The ONE parse: the submit gate, the field-level refusal, and the dispatched
 * payload all read this result, so no two of them can disagree about what the
 * supplier promised. A refusal never becomes a number — least of all zero.
 */
export function readLeadTimeDays(
  raw: string,
  unit: LeadTimeUnit,
): LeadTimeOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  if (parsed.value === 0) return { ok: false, reason: 'ZERO_LEAD_TIME' };
  // The unit conversion happens INSIDE the parse boundary, so the integer rule
  // is applied to the number that is actually stored — "2,5 weeks" is refused
  // for the same reason "2,5 days" is, not accidentally allowed through because
  // the multiplication happened somewhere else.
  const days = unit === 'weeks' ? parsed.value * 7 : parsed.value;
  if (!Number.isInteger(days)) return { ok: false, reason: 'FRACTIONAL_DAYS' };
  return { ok: true, days };
}

/**
 * Why a minimum order quantity was refused. `EMPTY_QTY` is absent by design —
 * blank is the field's documented default ("Leave blank if same as RFQ qty"),
 * so an empty MOQ is a legal answer, not a refusal.
 */
export type MoqRefusalReason =
  | Exclude<QtyRefusalReason, 'EMPTY_QTY'>
  | 'FRACTIONAL_UNITS';

export type MoqOutcome =
  /** `units: null` = the supplier stated no minimum of their own. */
  | { readonly ok: true; readonly units: number | null }
  | { readonly ok: false; readonly reason: MoqRefusalReason };

/**
 * Read a supplier's typed minimum order quantity.
 *
 * Blank is LEGAL and means null — "no minimum of my own", the field's own hint.
 * That is deliberately not the same fact as a typed 0, which is the positive
 * claim "there is no minimum at all". Unlike a price or a lead time, a zero here
 * is a real and harmless answer, and it enters no ranking — which is exactly why
 * the zero rule lives per-field and not inside the shared parser.
 */
export function readMoq(raw: string): MoqOutcome {
  if (raw.trim() === '') return { ok: true, units: null };
  const parsed = normalizeQty(raw);
  if (!parsed.ok) {
    // EMPTY_QTY is unreachable — the blank was answered above.
    return { ok: false, reason: parsed.reason as MoqRefusalReason };
  }
  if (!Number.isInteger(parsed.value)) {
    return { ok: false, reason: 'FRACTIONAL_UNITS' };
  }
  return { ok: true, units: parsed.value };
}

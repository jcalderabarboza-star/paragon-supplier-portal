// ────────────────────────────────────────────────────────────────────────────
// quotationLeadTime (CP-0 · W1 · 2e-b-1) — the ONE read of a supplier's lead
// time, and the four states it can honestly be in.
//
// FIND-05. Lead time is the portal's second LIVE-scored axis
// (`CRITERIA_WEIGHTS.leadTime` = 0.2) and, since 2e-b-1, it is scored on an
// ABSOLUTE scale where fewer days is better and zero is the best possible value
// (`quoteScore.ts` → `leadTimeScoreFor`). That makes every fabricated zero on
// this path a maximum score handed to a supplier who never promised it — a
// parse artifact deciding a buyer's recommendation.
//
// The retired path fabricated zeros twice over: `Number(raw) || 0` in the
// payload builder turned anything unreadable into 0, and the field was
// `type="number"`, so "abc" never even reached the code as text — the browser
// erased it to "" and the `|| 0` finished the job. On an axis where 0 = 100,
// garbage did not merely score badly; it WON.
//
// THREE STATES (operator ruling, 2e-b-1a — a POLICY REVERSAL of 2e-b-1's four):
//   · UNREADABLE
//     or BLANK     → refused. "abc", "3.5", "1.500" are never defaulted and
//                    never truncated; and a blank is no longer an honest
//                    absence, it is an INCOMPLETE BID.
//   · INTEGER ≥ 1  → scored normally.
//   · INTEGER 0    → legal and BEST — same-day supply is real. Because it is
//                    also the value a typo or a parse artifact would produce,
//                    the surface gates it behind an explicit same-day
//                    acknowledgement (`requiresSameDayAck`); this module reports
//                    that the ack is owed, and the page enforces it.
//
// WHY BLANK STOPPED BEING NEUTRAL (JJ, commercial). 2e-b-1 treated an unstated
// lead time as an absence and dropped the axis for it — neither rewarded nor
// punished. That is arithmetically honest and commercially wrong: a price with
// no delivery promise is an INCOMPLETE bid, not a comparable one, and scoring it
// on price alone hides exactly the risk that matters. In an emergency sourcing
// event "cheapest, delivers in two months" is worse than dearer and fast, and a
// quote that never said which one it is must not reach the comparison at all.
// The platform does not score an incomplete bid as complete.
//
// PURE and DOM-free (Correction-2): every state is confirmable headlessly,
// including the ones a `type="number"` field hides by eating the token.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** The form's two lead-time units. The entity stores days. */
export type LeadTimeUnit = 'days' | 'weeks';

/**
 * Why a lead time was refused. `EMPTY_QTY` is BACK in the union (2e-b-1a) — a
 * blank is a refusal again, because the field is required. `FRACTIONAL_DAYS` is
 * the one domain rule on top of the parser's: a delivery promise is a whole
 * number of days, and the retired path's response to "3.5" was to truncate it
 * to 3 — a promise the supplier did not make, one day earlier than the one they
 * did.
 */
export type LeadTimeRefusalReason = QtyRefusalReason | 'FRACTIONAL_DAYS';

export type LeadTimeOutcome =
  | {
      readonly ok: true;
      /** Always a stated number of days — there is no absent case (2e-b-1a). */
      readonly days: number;
      /** True only for a stated 0 — the surface must collect an ack first. */
      readonly requiresSameDayAck: boolean;
    }
  | { readonly ok: false; readonly reason: LeadTimeRefusalReason };

/**
 * Read a supplier's typed lead time as a whole number of DAYS.
 *
 * The ONE parse. The field-level message, the submit gate, and the dispatched
 * payload all read this result, so none of them can disagree about what the
 * supplier promised — and nothing here can produce a number the supplier did
 * not type. There is no `|| 0`, no `?? 0`, and no truncation.
 *
 * A blank falls through to `normalizeQty`, which names it `EMPTY_QTY` — the same
 * refusal every other required numeric field on this portal gives it. 2e-b-1
 * short-circuited it into a legal absence; 2e-b-1a deliberately does not.
 */
export function readLeadTimeDays(
  raw: string,
  unit: LeadTimeUnit,
): LeadTimeOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  // The unit conversion happens INSIDE the parse boundary, so the whole-days
  // rule is applied to the number that is actually stored: "2,5 weeks" is
  // refused for the same reason "2,5 days" is, rather than slipping through
  // because it happened to be whole in the unit the supplier picked.
  const days = unit === 'weeks' ? parsed.value * 7 : parsed.value;
  if (!Number.isInteger(days)) return { ok: false, reason: 'FRACTIONAL_DAYS' };

  return { ok: true, days, requiresSameDayAck: days === 0 };
}

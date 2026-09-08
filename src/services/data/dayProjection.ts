// ────────────────────────────────────────────────────────────────────────────
// Day-count projection (law 0.5) — the ONE place a "days until X" is computed.
//
// Generalizes the `complianceProjection` / `invoiceProjection` pattern to every
// surface that renders a day-count against a date. Pure functions of
// `(date, now)`: `now` is INJECTED, so the projection is deterministic and
// testable and no function here reads a clock of its own.
//
// ── ⚠️ THE DISCRIMINATOR THIS MODULE EXISTS TO ENFORCE ──────────────────────
//   **A stored value must not be a function of the READ instant.** A difference
//   between two STORED dates is a durable fact and may be stored; a difference
//   against `now` is wrong tomorrow and must be computed here. That axis — not
//   "number vs state" — is what decides membership, which is why this module
//   returns numbers while law 0.5's sentence names states. See
//   `C2-schemas.md:111` for the law and `enforcement.ts:118` for the precedent
//   that its storing half reaches numbers (`daysRemaining: 873`, 483 days stale).
//
// ── ⚠️ WHAT THIS REPLACED, AND WHY A PIN WAS NOT A FIX ──────────────────────
//   Three functions named `daysUntil` existed. One read `Date.now()`
//   (`SupplierDocuments`), one read a module-scope pin
//   (`BuyerSourcing`: `REFERENCE_TODAY = 2026-05-18`), and `SupplierRFQs`
//   carried a second, DIFFERENT pin (`RFQ_TODAY_MS = 2026-04-25`). **The two
//   pins disagreed by 23 days**, so the same RFQ deadline rendered two
//   different day-counts on two surfaces of one app. A pin is a stale clock
//   with better manners: it makes a surface deterministic by making it wrong on
//   a schedule nobody is watching. Both are deleted; the clock is injected at
//   the surface and the projection is pure.
//
// ── ROUNDING IS EXACT, NOT A CHOICE ─────────────────────────────────────────
//   `now` is truncated to its DAY before subtracting, and the date arguments are
//   `YYYY-MM-DD` (midnight UTC). Both endpoints are therefore whole days, the
//   difference is an exact multiple of a day, and `round`/`ceil`/`floor` agree.
//   The retired call sites used two different rounding modes; unifying them is
//   behaviour-preserving BECAUSE of the truncation, not in spite of it.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierDocument } from './types';

const MS_PER_DAY = 86_400_000;

/** The `YYYY-MM-DD` day of an ISO instant — the same helper the compliance and
 *  invoice projections use, for the same reason (see ROUNDING above). */
function day(nowIso: string): string {
  return nowIso.slice(0, 10);
}

/**
 * Whole days from `now` until `dateIso` — negative once the date is past.
 *
 * `null` when there is no date to count to. ⚠️ **An UNPARSEABLE date also
 * returns `null`, and that conflation is deliberate rather than overlooked.**
 * A distinct `'unreadable'` answer would be a value NOTHING IN THE TREE CAN
 * PRODUCE — every `expiryDate` / deadline in the fixtures is either `null` or a
 * valid ISO day — and `projectionGate`'s own vocabulary names that shape
 * `produced-by-nothing` and treats it as a defect. A branch no input reaches is
 * not honesty; it is an unreachable claim. If a real unparseable date ever
 * arrives, THAT is when the third answer earns its place.
 */
export function daysUntil(
  dateIso: string | null | undefined,
  nowIso: string,
): number | null {
  if (!dateIso) return null;
  const target = Date.parse(dateIso);
  if (!Number.isFinite(target)) return null;
  return Math.round((target - Date.parse(day(nowIso))) / MS_PER_DAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE ZERO BOUNDARY — STATED ONCE, HERE, AND READ RATHER THAN RESTATED.
//
// **A date that is TODAY is PAST.** `days <= 0`, not `days < 0`. Ruled by the
// operator; the ground is that a second convention is a second present wearing
// different clothes — the same argument that retired `SDC_SIMULATED_NOW`.
//
// ── ⚠️ AND THE PREMISE THE RULING WAS GIVEN WAS MINE, AND IT WAS WRONG ──────
//   It was reported as *"the only convention the tree ships — the only one that
//   discriminates zero."* **Measured false, by a better instrument.** The first
//   census matched on the IDENTIFIER `days` followed by a comparison, which is
//   a NAME-shaped matcher (rules 1 and 2 in one pass), and TWO of the three
//   shipped classifiers never spell that name:
//
//     documentExpiry        (below)                  days <= 0     TODAY IS PAST
//     computeStatus         complianceProjection.ts  remaining < 0 TODAY IS NOT PAST
//     isOverdue             invoiceProjection.ts     dueDate < day(now)  ditto
//
//   Re-derived from the SIGNATURE instead — every exported function taking an
//   injected `now` — with a known-true control (`documentExpiry` found) and a
//   known-false one (`shiftIso` absent). **`days <= 0` is the MINORITY
//   convention, 1 of 3.** The ruling stands on its own reasoning; the reason
//   GIVEN for it does not, and it is corrected here rather than left standing
//   because a wrong premise with a specific name is the most believable kind.
//
// ── ⚠️ WHY THE OTHER TWO ARE NOT CONVERTED IN THIS BATCH ────────────────────
//   Not oversight and not scope-timidity — each conversion CHANGES WHAT A LIVE
//   SURFACE SAYS, and the blast radius is measured rather than assumed:
//     · `complianceProjection` — `SAMPLE-HALAL-0005B` (sup-005, HALAL_BPJPH)
//       carries `expiryDate: '2026-08-31'`, which is `DECLARED_PRESENT`
//       EXACTLY. Converting flips it `Expiring → Expired` at the demo's own
//       instant, on the halal lane. 1 of 9 dated registry rows.
//     · `invoiceProjection` — 0 of 13 invoices are due at `P` today, so the
//       conversion is behaviour-neutral NOW and still a semantic change the
//       day a fixture moves.
//   Both are filed. Converting them is a ruling about two lanes, not a
//   refactor, and this batch was scoped `for obligation only`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is a day-count PAST? The one place the zero boundary is decided.
 *
 * `null` (no date, or an unparseable one — `daysUntil` conflates them
 * deliberately, see above) is **not past**: an absent date must not manufacture
 * an alarm, which is the same answer `documentExpiry` already gives it by
 * returning `'no-expiry'` rather than `'expired'`.
 */
export function isPast(days: number | null): boolean {
  return days !== null && days <= 0;
}

/** The window (days) before expiry within which a supplier document reads as
 *  expiring. Deliberately NOT `complianceProjection`'s 90: that governs the
 *  halal cert registry, this governs the document shelf, and collapsing two
 *  windows because they are both windows is how one surface silently adopts
 *  another's policy. */
export const DOCUMENT_EXPIRING_WINDOW_DAYS = 180;

/**
 * A supplier document's expiry state, COMPUTED (law 0.5).
 *
 * ⚠️ **THIS IS THE SOURCE, AND `SupplierDocument.status` IS NOT.** The stored
 * status carries `'Expiring Soon'` as a literal — the exact clock state law 0.5
 * forbids storing — and it is measurably wrong: `doc-001` (the MUI halal
 * certificate) and `doc-202` both store `'Expiring Soon'` on certificates that
 * expired months ago, while three documents genuinely inside the window store
 * `'Valid'`. Every surface that renders expiry reads THIS function, so the page
 * and the dashboard widget cannot disagree — the DR-7 payoff, applied to a
 * clock instead of to a persona.
 *
 * The stored literal is left in place: retiring it is the stored-states
 * disposal, which is filed and deliberately not touched here.
 */
export type DocumentExpiry = 'no-expiry' | 'expired' | 'expiring' | 'current';

export function documentExpiry(
  doc: Pick<SupplierDocument, 'expiryDate'>,
  nowIso: string,
): DocumentExpiry {
  const days = daysUntil(doc.expiryDate, nowIso);
  if (days === null) return 'no-expiry';
  // ⚠️ READS `isPast` rather than restating `days <= 0`. The literal that stood
  // here was the tree's ONLY statement of the boundary, which is exactly how a
  // convention becomes a per-site opinion. Behaviour is unchanged — this is the
  // refactor that makes "stated once" true rather than aspirational.
  if (isPast(days)) return 'expired';
  if (days <= DOCUMENT_EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'current';
}

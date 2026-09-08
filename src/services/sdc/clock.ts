// ────────────────────────────────────────────────────────────────────────────
// SDC-4a — the ONE shared SIMULATED clock for the collaboration loop.
//
// The SDC loop is deterministic and lives on a FIXED simulated timeline (the
// SDC-0 fixtures are dated Aug–Oct 2026). This clock is the single source of
// "now" for BOTH:
//   · the SDC display selectors (chase-overdue / coverage lead-time), and
//   · the SDC write stamps (a declaration's declaredAt, a response's submittedAt),
// so a fresh write is stamped WITHIN the simulated timeline — chronologically
// AFTER the seed — instead of at the real wall-clock. The real clock (today
// 2026-07-20) sits BEFORE the future-dated seed (Aug 2026); stamping a write
// with it made latest-by-timestamp prefer the seed, so a fresh declare never
// became "current" (the SDC-4 collision). Unifying the clock here removes the
// clock half of that defect; the seq-order selectors (declarationRecency) remove
// the ordering half — belt AND braces.
//
// DECLARED-SIMULATED, never the real clock: the surface shows this as the
// "sample clock, as of …" meta line, never as the live clock. A real wall-clock
// is a post-F1 concern (when real identities + a real feed re-base the timeline
// to real dates). This module deliberately does NOT call `new Date()`.
//
// INJECTABLE (set/reset) for TESTS ONLY — the app never mutates it; the default
// IS the simulated now. Non-SDC command stamps (invoice / PO / RFQ / quotation)
// keep their own clocks — this is the SDC loop's clock alone.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../data/fixturePresent';

/**
 * The simulated "now" (ISO). Sits PAST the latest seed fixture (2026-08-18) and
 * PAST the R2 response deadline (publishedAt 2026-08-15 + RESPONSE_DUE_DAYS 7 =
 * 2026-08-22), so the chase list resolves its overdue state deterministically
 * (BuyerCollaboration pins exactly this as-of).
 *
 * ⚠️ **IT IS NO LONGER ITS OWN PRESENT — IT DERIVES FROM `DECLARED_PRESENT`.**
 * This module used to declare `'2026-08-25T12:00:00.000Z'` as a literal, which
 * made it the SECOND declared present in shipped code: the fixture families read
 * 2026-09-07 while this lane read 2026-08-25, thirteen days apart, and four
 * surfaces rendered that gap honestly with nothing anywhere explaining it. Two
 * clocks that disagree by RULING are defensible; two that disagree by ACCIDENT
 * are not, and nothing in the tree recorded a ruling.
 *
 * **The reconciliation moved `P`, not this lane's fixtures.** `MANDATE_LEAD_DAYS`
 * is 47 so that `DECLARED_PRESENT` lands inside this lane's own coherent window
 * (2026-08-25..2026-09-01, both edges set by `sa-0002` seq 6 against
 * `ANTICIPATION_DAYS`) — so not one SDC fixture had to move and not one
 * assertion had to be re-tuned. `fixturePresent.guard.test.ts` pins the present
 * inside `SDC_WINDOW`, so a re-authored `sa-0002` fires the gate by name instead
 * of silently falsifying this lane.
 *
 * The TIME-OF-DAY is retained and is load-bearing: `deliveryChase.test.ts`
 * documents that a 12:00Z instant is 19:00 Jakarta, which is what keeps the
 * day-granular window boundaries crisp on both sides of the offset.
 */
export const SDC_SIMULATED_NOW = `${DECLARED_PRESENT}T12:00:00.000Z`;

let current = SDC_SIMULATED_NOW;

export const sdcClock = {
  /** The simulated "now" (ISO) — read by the SDC write stamps + display selectors. */
  now(): string {
    return current;
  },
  /** TEST SEAM — override the simulated now. Never called by app code. */
  set(iso: string): void {
    current = iso;
  },
  /** TEST SEAM — restore the default simulated now. */
  reset(): void {
    current = SDC_SIMULATED_NOW;
  },
};

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

/**
 * The simulated "now" (ISO). Sits PAST the latest seed fixture (2026-08-18) and
 * PAST the R2 response deadline (publishedAt 2026-08-15 + RESPONSE_DUE_DAYS 7 =
 * 2026-08-22), so the chase list resolves its overdue state deterministically
 * (BuyerCollaboration pins exactly this as-of). Held identical to the value the
 * P2 surface used inline before 4a, so the repoint changes nothing observable.
 */
export const SDC_SIMULATED_NOW = '2026-08-25T12:00:00.000Z';

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

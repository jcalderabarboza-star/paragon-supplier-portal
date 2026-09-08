// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT, AND THE PER-FAMILY ANCHORS — `FIXTURE-PRESENT-01` (d).
//
// ⚠️ **THE FIXTURE SET HAD AN IMPLICIT "NOW" THAT NOTHING OWNED, NOTHING
// DECLARED, AND NOTHING MOVED.** `FIXTURE-PRESENT-01` (`docs/findings.md`, split
// out of `2e-c-6-FIND-01` on #157) named the question and four options. This
// module is option **(d)** — declared intent plus a computed literal — ruled
// 2026-09-08 after (a), (b) and (c) were each eliminated on measurement:
//
//   (a) ONE frozen present for the whole tree. **Not buildable.** The families'
//       coherent windows do not share a common instant — the intersection is
//       EMPTY BY FIVE DAYS (derived below). One present would make one family
//       permanently false to serve another.
//   (b) A ROLLING present read from the wall clock at fixture load. **Ruled out
//       twice.** `2e-c-6-FIND-01` rejected it because a clock read inside seed
//       data makes every spec that reads a fixture time-dependent; and it fails
//       WHERE NOTHING COULD SEE IT — every fixture is a module-scope `const`, so
//       it resolves at IMPORT, while `usePinnedDemoClock`'s `Date` proxy installs
//       in `beforeEach`. 205 specs would go time-dependent with no instrument
//       able to notice.
//   (c) PERIODIC MANUAL RE-ANCHOR of the literals. **Rejected by ruling.** Moving
//       one cluster widens the gap to the others; moving everything to one date
//       invents a coherent past that never existed.
//
// ── THE SHAPE ───────────────────────────────────────────────────────────────
//   ONE declared present `P`. Each family declares its OWN anchor `A` — the
//   instant that family's rows were authored for. Its dates are shifted by
//   `P − A` at module load, so the family reads as though today were `A`.
//
//   The algebra, which is why per-family anchors work where one present cannot:
//
//       resolved = date + (P − A)     ⇒     daysUntil(resolved, P) = date − A
//
//   **`P` CANCELS.** Every family's internal clock-derived state is decided by
//   its own anchor alone, so no family is ever bent to serve another's. That is
//   the whole reason the empty intersection is not a blocker: it is the thing
//   per-family anchors exist for.
//
// ── ⚠️ WHAT `P` STILL DECIDES, BECAUSE IT DOES NOT CANCEL EVERYWHERE ────────
//   (1) Comparisons against the ABSOLUTE CLASS below — dates that are facts
//       about the world and never shift. `AI-NIAC-6612` (`mockShipments`) is
//       authored to flip `SATISFIED → SCHEME_INVALID` on the BPJPH mandate with
//       no date on the document changing; `P` is what puts the demo before or
//       after that.
//   (2) Any CROSS-FAMILY date comparison. Families that reference each other
//       must therefore SHARE an anchor, and a family whose partner is NOT
//       anchored yet cannot move at all — which is why `contract` and
//       `obligation` are measured but deferred below. That is not caution:
//       shifting contracts alone reddened `fulfillment.test.ts` ten times.
//
// ── ⚠️ THE PRESENT IS FROZEN, AND THE BUMP IS A RULING ──────────────────────
//   `DECLARED_PRESENT` never reads a clock. It moves when the operator rules it
//   and not otherwise: **one edit to `MANDATE_LEAD_DAYS`, visible in a diff.**
//   It is deliberately NOT a schedule and NOT a gate — a present that moves on
//   its own is option (b) wearing this module's name.
//
//   Between bumps the wall clock drifts away from `P`, and each family tolerates
//   that drift only as far as its own window is wide. The tolerances are stated
//   per family below. Of the ANCHORED families `supplierDocument` is the
//   binding one at ±41 days; the deferred `obligation` is tighter still at ±8,
//   which is worth knowing before it is anchored — it is the family that will
//   ask for a bump first, and the one whose stored states may deserve retiring
//   rather than anchoring.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ `sdcClock` — DISPOSITION: **STAYS SEPARATE IN THIS BATCH.** Stated, not
// folded in silently.
//
// `SDC_SIMULATED_NOW` (`services/sdc/clock.ts`, 2026-08-25) is ALREADY this
// shape for one lane — a frozen declared present with a test seam, rendered
// honestly by three surfaces as "sample clock, as of …". It is the precedent
// this module generalises, and the right end state is that it READS the origin:
// `sdc` becomes a family anchored on 2026-08-25 and `SDC_SIMULATED_NOW` becomes
// `DECLARED_PRESENT`, exactly as the five `TODAY` pins were retired here.
//
// **It is NOT done here, and the reason is a measurement rather than scope.**
// Repointing the clock WITHOUT shifting the SDC fixtures with it would move the
// loop's "now" 13 days away from data that did not move — and that loop's whole
// point is that its overdue state resolves DETERMINISTICALLY (`publishedAt`
// 2026-08-15 + `RESPONSE_DUE_DAYS` 7 = 2026-08-22, which `BuyerCollaboration`
// pins). A clock retired onto this present before its family is anchored is the
// SDC-4 collision reintroduced, which is the defect `sdcClock` was built to fix.
// The two must move in one batch; they are not in this one.
// ─────────────────────────────────────────────────────────────────────────────

import { BPJPH_MANDATE_DATE } from './complianceProjection';

const MS_PER_DAY = 86_400_000;

/** UTC midnight of a date-bearing string's DATE part. */
const dayMs = (value: string): number =>
  Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);

// ─────────────────────────────────────────────────────────────────────────────
// THE ABSOLUTE CLASS — dates that do NOT move with the present.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **A DATE THAT MUST NOT MOVE IS AS MUCH A DECLARATION AS ONE THAT MUST.**
 *
 * These are facts about the world, not about the fixture set: shifting one would
 * silently reschedule a law. `fixturePresent.guard.test.ts` asserts that every
 * member is absent from every family's shifted field list, so a future edit that
 * routes one of these through `shiftIso` goes red by name.
 *
 * `BPJPH_MANDATE_DATE` (GR 42/2024) is the sole member today and is imported
 * rather than restated — `BuyerCompliance` used to carry its own
 * `new Date('2026-10-17')`, a duplicate that would not have moved with the
 * constant. It now reads this one.
 */
export const ABSOLUTE_DATES: Readonly<Record<string, string>> = {
  BPJPH_MANDATE_DATE,
};

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **THE DISTANCE IS DATA, NOT A COINCIDENCE.**
 *
 * The declared present is expressed as a lead time on the BPJPH mandate because
 * that is the ONE date this platform must genuinely reason about — every other
 * date in the tree is now relative. Forty days puts the demo INSIDE the run-up:
 * the mandate is ahead and actionable, which is the state the halal lane exists
 * to show, rather than the aftermath, where the decision has already been taken
 * out of the buyer's hands.
 *
 * It also lands one day before this batch's ratification (2026-09-08), so no
 * family is stale on the day it ships.
 *
 * **To move the demo across the mandate, change this number and nothing else.**
 * A negative value puts the present after the mandate; that is the intended way
 * to demonstrate the scheme retirement, and it is a one-line ruling.
 */
export const MANDATE_LEAD_DAYS = 40;

/** The declared present (`YYYY-MM-DD`). Frozen. Never reads a clock. */
export const DECLARED_PRESENT: string = new Date(
  dayMs(BPJPH_MANDATE_DATE) - MANDATE_LEAD_DAYS * MS_PER_DAY,
)
  .toISOString()
  .slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// THE PER-FAMILY ANCHORS
// ─────────────────────────────────────────────────────────────────────────────

/** Every fixture family that carries a shifted date. */
export type FixtureFamily =
  | 'supplierDocument'
  | 'shipment'
  | 'goodsReceipt'
  | 'inventory';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ `contract` AND `obligation` ARE MEASURED, WINDOWED, AND DELIBERATELY NOT
// ANCHORED HERE — and the reason is a coupling, not scope.
//
// Their coherent windows are known and are asserted from the raw literals by
// `fixturePresent.guard.test.ts`, which does not need them shifted to do it:
//
//     contract     2026-05-17 .. 2026-06-05   (9 rows, the 5 authored bands)
//     obligation   2026-05-17 .. 2026-06-01   (17 rows; ±8d — the TIGHT family)
//     ⇒ they intersect at 2026-05-17 .. 2026-06-01, so they would SHARE an
//       anchor of 2026-05-24. Obligations name contract ids, so they must.
//
// **WHAT STOPS THEM IS `ctr-003`.** `services/delivery/fixtures.ts` negotiates a
// scheduling agreement over that contract, starting at the contract's own start
// date, and `fixtures.integrity.test.ts` asserts every release date falls inside
// the contract's validity window. Shift contracts and that calendar must shift
// with them — but the calendar is read by the DELIVERY lane, which runs on
// `SDC_SIMULATED_NOW`, and that clock is not anchored in this batch (see the
// disposition note at the top). Moving the schedule while its clock stands still
// is the SDC-4 collision the `sdcClock` module exists to prevent.
//
// Measured, not predicted: shifting contracts reddened `fulfillment.test.ts` in
// ten places, every one of them a release-date-versus-arrival comparison.
//
// **They move in the batch that anchors the SDC lane, and not before.**
// ─────────────────────────────────────────────────────────────────────────────

export interface FamilyAnchor {
  /** The instant this family's rows were authored for. */
  readonly anchor: string;
  /**
   * The family's COHERENT WINDOW — every origin at which all of its stored
   * clock-derived states are true. `null` where the family stores no such state,
   * in which case the anchor is derived some other way and `why` says how.
   */
  readonly window: readonly [string, string] | null;
  /** How far the wall clock may drift from `DECLARED_PRESENT` before a stored state goes false. */
  readonly toleranceDays: number | null;
  /** How the anchor was derived. Re-derived by the guard, never trusted from here. */
  readonly why: string;
}

/**
 * ⚠️ **EACH ANCHOR IS DERIVED FROM ITS OWN FAMILY. NO FAMILY IS BENT TO ANOTHER.**
 *
 * Where a family stores clock-derived states, the anchor is the MIDPOINT of its
 * coherent window — not an endpoint — because the present drifts between bumps
 * and the midpoint maximises the drift the family tolerates in BOTH directions.
 */
export const FAMILY_ANCHORS: Readonly<Record<FixtureFamily, FamilyAnchor>> = {
  // 8 dated documents; `documentExpiry` (180d) is the real projection.
  // The late end is bound by doc-005 (ISO 9001, expires 2026-11-09, stored
  // 'Valid' — needs > 180 days). The early end by doc-202 (expires 2026-08-19,
  // stored 'Expiring Soon').
  supplierDocument: {
    anchor: '2026-04-01',
    window: ['2026-02-20', '2026-05-12'],
    toleranceDays: 41,
    why: 'midpoint of the window on which all 8 dated documents agree with documentExpiry',
  },

  // No stored clock state to solve for. The anchor is EVIDENCED rather than
  // derived from states: three page-local `TODAY` pins all read 2026-05-20
  // (BuyerGoodsReceipt, BuyerShipments, BuyerInventory), and the retired
  // `daysInTransit` back-solve landed on the same day. Four instruments, one
  // date — which is why the pins could be retired onto it without moving a
  // rendered number.
  shipment: {
    anchor: '2026-05-20',
    window: null,
    toleranceDays: null,
    why: 'the three page-local TODAY pins and the retired daysInTransit back-solve all read 2026-05-20',
  },
  goodsReceipt: {
    anchor: '2026-05-20',
    window: null,
    toleranceDays: null,
    why: 'max(receivedDate) is 2026-05-20, identical to the page pins',
  },

  // ⚠️ Its own rows declare it: `lastUpdated` runs 2025-04-02..2025-04-06, a full
  // YEAR behind every other family. That is why inventory moves furthest here,
  // and why "refresh the fixtures" was rejected — a uniform shift would have left
  // this family a year adrift instead of four months.
  inventory: {
    anchor: '2025-04-06',
    window: null,
    toleranceDays: null,
    why: 'max(lastUpdated) — the family declares its own as-of date and nothing else does',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THE SHIFT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The coherent windows of the families that are MEASURED but NOT anchored yet.
 * Kept here as data rather than prose so the gate can hold them against the raw
 * literals every run — a deferred family's window decays exactly as fast as an
 * anchored one's, and nothing else would notice.
 */
export const DEFERRED_WINDOWS: Readonly<
  Record<'contract' | 'obligation', readonly [string, string]>
> = {
  contract: ['2026-05-17', '2026-06-05'],
  obligation: ['2026-05-17', '2026-06-01'],
};

/** Whole days a family's dates move: `DECLARED_PRESENT − anchor`. */
export function shiftDays(family: FixtureFamily): number {
  return Math.round(
    (dayMs(DECLARED_PRESENT) - dayMs(FAMILY_ANCHORS[family].anchor)) / MS_PER_DAY,
  );
}

/**
 * Shift one date-bearing string, preserving everything after the date part —
 * `rejectedAt` carries a time and a `+07:00` offset, and a shift that dropped
 * them would silently rewrite the value's precision as well as its day.
 */
export function shiftIso(value: string, family: FixtureFamily): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(value);
  if (!m) return value;
  const shifted = new Date(dayMs(value) + shiftDays(family) * MS_PER_DAY);
  return `${shifted.toISOString().slice(0, 10)}${m[4]}`;
}

/**
 * Shift the named date fields of every row. Returns NEW rows — the raw literals
 * stay in the fixture source, readable, so the authoring intent a reviewer needs
 * is never encoded away into an offset.
 *
 * A field holding `null` / `undefined` / `''` is left exactly as it is: absence
 * is a real answer here (a BPJPH certificate has no expiry at all under GR
 * 42/2024) and must not become a date.
 */
export function shiftFields<T extends object>(
  rows: readonly T[],
  family: FixtureFamily,
  fields: readonly (keyof T)[],
): T[] {
  return rows.map((row) => {
    const next = { ...row };
    for (const f of fields) {
      const v = next[f];
      if (typeof v === 'string' && v !== '') {
        next[f] = shiftIso(v, family) as T[typeof f];
      }
    }
    return next;
  });
}

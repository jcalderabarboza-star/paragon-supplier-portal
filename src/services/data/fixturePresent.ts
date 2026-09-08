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
//       must therefore SHARE an anchor — which is exactly what `contract` and
//       `obligation` now do, because obligations name contract ids. A pair that
//       shares an anchor is only as free as the INTERSECTION of their windows,
//       never as free as either alone.
//
// ── ⚠️ THE PRESENT IS FROZEN, AND THE BUMP IS A RULING ──────────────────────
//   `DECLARED_PRESENT` never reads a clock. It moves when the operator rules it
//   and not otherwise: **one edit to `MANDATE_LEAD_DAYS`, visible in a diff.**
//   It is deliberately NOT a schedule and NOT a gate — a present that moves on
//   its own is option (b) wearing this module's name.
//
//   Between bumps the wall clock drifts away from `P`, and each family tolerates
//   that drift only as far as its own window allows. **NO TOLERANCE FIGURE IS
//   RESTATED HERE** (`FLOOR-IN-PROSE-01`): the sentence that stood in this spot
//   named two, and BOTH were wrong within one batch — one because the rounding
//   rule overstated it, the other because the family it called "deferred" is
//   anchored two paragraphs below. Read `toleranceDays` off `FAMILY_ANCHORS`;
//   the gate re-derives every one of them from the windows each run.
//
//   The family that will ask for a re-anchor FIRST is whichever carries the
//   smallest `toleranceDays` — derive it, do not remember it.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ `sdcClock` — DISPOSITION: **RETIRED ONTO THIS PRESENT.** There is now ONE
// declared present in shipped code.
//
// `SDC_SIMULATED_NOW` (`services/sdc/clock.ts`) was a second frozen present at
// 2026-08-25 — the precedent this module generalises. It now READS
// `DECLARED_PRESENT`, exactly as the five `TODAY` pins were retired here.
//
// ── ⚠️ AND IT WAS DONE BY MOVING `P`, NOT BY MOVING THE SDC FIXTURES ────────
//   The SDC family's COHERENT WINDOW was derived by sweeping the clock day by
//   day across the lane's own 52 spec files: **2026-08-25 .. 2026-09-01**. Both
//   bounds are set by ONE line — `sa-0002` item A **seq 6**, release 2026-09-01
//   — from opposite sides of `ANTICIPATION_DAYS` (7): the nudge needs
//   `0 <= daysBetween(now, releaseDate) <= 7`.
//
//   `MANDATE_LEAD_DAYS` is 47 rather than 40 because `BPJPH − 47 = 2026-08-31`
//   sits INSIDE that window, so the clock retires with **no SDC fixture moved
//   and no assertion re-tuned**. Moving the family instead cost 8 assertions
//   across 4 files and shifted 58 literals; moving `P` cost one tautology.
//
// ── ⚠️ WHAT THIS BUYS AND WHAT IT COSTS — SAY IT PLAINLY ────────────────────
//   **`P` IS CURRENTLY PINNED BY A DEMO FIXTURE.** Re-author `sa-0002`'s seq 6
//   and the SDC window moves; `P` must move with it or the lane goes false.
//   That hostage is deliberate and it is VISIBLE: `fixturePresent.guard.test.ts`
//   asserts `DECLARED_PRESENT` sits inside `SDC_WINDOW`, so the day the fixture
//   is re-authored the gate fires BY NAME rather than the demo quietly drifting.
//
//   **OPTION 1 IS FILED, NOT DISMISSED — and here is how to stop being hostage.**
//   Make `sdc` a real anchored family: give it `anchor: '2026-08-25'`, route
//   `sdc/fixtures.ts` · `delivery/demoFixtures.ts` · `delivery/demoFixturesScale.ts`
//   · `channel/outboundFixtures.ts` through `shiftFields`, and **`P` cancels out
//   entirely** (`daysUntil(date + (P − A), P) = date − A`), after which
//   `MANDATE_LEAD_DAYS` is free again and `SDC_WINDOW` stops constraining it.
//   It is hygiene, not a blocker, and it rides a later surface batch in that
//   lane. The cost when it comes: ~20 hardcoded `'2026-08-25'` literals across
//   14 spec files, which must be DERIVED rather than re-pinned.
//
// ── ⚠️ RETRACTED, QUOTED RATHER THAN DELETED (it was wrong, and it shipped) ──
//   This block previously read, and `fixturePresent.guard.test.ts` repeated it:
//
//       "the calendar is read by the DELIVERY lane, which runs on
//        `SDC_SIMULATED_NOW`, and that clock is not anchored in this batch.
//        Moving the schedule while its clock stands still is the SDC-4
//        collision the `sdcClock` module exists to prevent."
//
//   **MEASURED FALSE.** `services/delivery` imports nothing from `mockContracts`
//   and no clock at all. Shifting contract + obligation + `START_DATE` with the
//   clock standing still broke 2 files / 11 tests, and `fixtures.integrity.test.ts`
//   stayed GREEN — not one failure was a clock-vs-schedule collision. The real
//   coupling was `START_DATE` being a hand-maintained DUPLICATE of
//   `ctr-003.startDate`, plus ten hardcoded `eta` literals inside
//   `fulfillment.test.ts`. The two families were then shifted together and the
//   damage was exactly additive (19 = 11 + 8, 6 files = 2 + 4): **zero
//   interaction.** The deferral was real; its stated reason was not.
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
 * **To move the demo across the mandate, change this number and nothing else.**
 * A negative value puts the present after the mandate; that is the intended way
 * to demonstrate the scheme retirement, and it is a one-line ruling.
 *
 * ⚠️ **47, NOT 40 — AND THE SEVEN DAYS ARE LOAD-BEARING.** `BPJPH − 47` is
 * 2026-08-31, which sits inside `SDC_WINDOW` below. That is what let the SDC
 * loop's separate present retire onto this one without moving a single SDC
 * fixture. **This number is NOT free while `sdc` remains unanchored** — the
 * guard pins `DECLARED_PRESENT` inside `SDC_WINDOW`, so raising or lowering it
 * past that boundary goes red by name rather than quietly falsifying the lane.
 * Anchoring `sdc` (see the disposition note above) is what makes it free again.
 */
export const MANDATE_LEAD_DAYS = 47;

/**
 * ⚠️ **THE SDC LOOP'S COHERENT WINDOW — the constraint on `MANDATE_LEAD_DAYS`.**
 *
 * `sdc` is the one family that is coherent WITHOUT being shifted, because `P`
 * was moved to meet it instead. It therefore has a window and no anchor, which
 * is the exact inverse of every family below.
 *
 * Derived empirically, not from a predicate anyone invented: `SDC_SIMULATED_NOW`
 * was swept day by day over the lane's own 52 spec files and the green band was
 * 2026-08-25..2026-09-01. Both edges are `sa-0002` item A seq 6 (release
 * 2026-09-01) against `ANTICIPATION_DAYS` — 7 days before it, and the day
 * itself. `chase/deliveryChase.ts` is where that rule lives.
 */
export const SDC_WINDOW: readonly [string, string] = ['2026-08-25', '2026-09-01'];

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
  | 'inventory'
  | 'contract'
  | 'obligation';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ `contract` AND `obligation` ARE NOW ANCHORED, AND THEY SHARE ONE ANCHOR.
//
// **They must share it: obligations name contract ids**, so a due date and the
// contract it hangs off are a CROSS-FAMILY comparison, and those are exactly the
// comparisons `P` does not cancel for. Two anchors would silently re-time every
// obligation against its own contract.
//
// The shared anchor is the MIDPOINT OF THE INTERSECTION of the two windows,
// re-derived from the raw literals rather than inherited:
//
//     contract     2026-03-17 .. 2026-06-05   (bound early by ctr-007, late by ctr-008)
//     obligation   2026-05-17 .. 2026-06-01   (bound early by obl-007a, late by
//                                              obl-003a / obl-004a / obl-010c)
//     ∩            2026-05-17 .. 2026-06-01   → midpoint 2026-05-24, ±7 days
//
// ⚠️ **THE PREVIOUSLY-DECLARED CONTRACT WINDOW WAS WRONG AT ITS EARLY EDGE** —
// it read `2026-05-17`, derived at #319 from authored "bands" that no shipped
// code implements. Re-derived from the two predicates that DO read `endDate`
// against a clock (`matchesGroup`'s 0..90 band in `BuyerContracts.tsx` and
// `expiryTone` in `contracts/contractView.tsx`), the early bound is 2026-03-17.
// The intersection is unaffected because obligation binds both of its edges, so
// the anchor is the same number for a better reason.
//
// **Corroboration from a second, independent instrument:** the retired
// `daysUntilExpiry` field back-solved 12 of 13 contract rows to 2026-05-20 —
// four days from the midpoint and comfortably inside the intersection. Two
// instruments, one neighbourhood.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **ONE ANCHOR HELD BY TWO FAMILIES.** Named once so the two entries below
 * cannot drift apart in a later edit — obligations reference contract ids, and
 * two literals that must be equal are two literals that will one day differ.
 * The midpoint of `2026-05-17 .. 2026-06-01`.
 */
export const SHARED_CONTRACT_ANCHOR = '2026-05-24';

/**
 * The families that share `SHARED_CONTRACT_ANCHOR`, declared as data so the gate
 * can assert the sharing rather than trusting the two literals to match.
 */
export const SHARED_ANCHOR_FAMILIES = ['contract', 'obligation'] as const;

/**
 * The intersection those two are anchored on. `toleranceDays` for BOTH is half
 * of THIS, never half of either family's own window — the pair is only as free
 * as the narrower constraint they jointly satisfy.
 */
export const SHARED_ANCHOR_INTERSECTION: readonly [string, string] = [
  '2026-05-17',
  '2026-06-01',
];

export interface FamilyAnchor {
  /** The instant this family's rows were authored for. */
  readonly anchor: string;
  /**
   * The family's COHERENT WINDOW — every origin at which all of its stored
   * clock-derived states are true. `null` where the family stores no such state,
   * in which case the anchor is derived some other way and `why` says how.
   */
  readonly window: readonly [string, string] | null;
  /**
   * How far the wall clock may drift from `DECLARED_PRESENT` before a stored
   * state goes false.
   *
   * ⚠️ **THE DISTANCE TO THE NEARER EDGE, NOT HALF THE WINDOW.** An anchor is
   * rarely exactly centred (a window of even width has no integer midpoint), so
   * `round(span / 2)` promises drift the family does not have —
   * `supplierDocument` declared 41 while its early edge sits 40 days away. The
   * edge that breaks FIRST is the only honest number, and for a SHARED anchor
   * it is measured against the INTERSECTION rather than either own window.
   */
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
    toleranceDays: 40,
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

  // ⚠️ ONE ANCHOR, TWO FAMILIES — obligations name contract ids, so the pair is
  // a cross-family comparison and `P` does not cancel across it. The value is
  // the midpoint of the INTERSECTION of the two windows, not of either alone.
  contract: {
    anchor: SHARED_CONTRACT_ANCHOR,
    window: ['2026-03-17', '2026-06-05'],
    toleranceDays: 7,
    why: 'midpoint of the contract ∩ obligation intersection; own window bound by ctr-007 / ctr-008',
  },
  obligation: {
    anchor: SHARED_CONTRACT_ANCHOR,
    window: ['2026-05-17', '2026-06-01'],
    toleranceDays: 7,
    why: 'the same shared anchor; this family BINDS both edges of the intersection',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THE SHIFT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **`DEFERRED_WINDOWS` IS RETIRED — THERE ARE NO DEFERRED FAMILIES LEFT.**
 *
 * It held `contract` and `obligation` as measured-but-unanchored. Both are
 * anchored above now, so their windows live in `FAMILY_ANCHORS[…].window` beside
 * every other family's and the gate holds them by the same code path. Keeping an
 * empty "deferred" register would be a second place for a window to be declared,
 * which is how the two copies of the contract window disagreed in the first
 * place.
 *
 * ⚠️ **`ctr-013` IS THE ONE CONTRACT ROW THAT DOES NOT MOVE, AND THAT IS A
 * MEMBERSHIP RULING, NOT AN EXCEPTION.** It exists solely to host `sa-0002`
 * (its own comment says so), whose calendar is authored against the SDC clock.
 * So for date purposes `ctr-013` belongs to the SDC family, exactly as
 * `delivery/fixtures.ts`'s `START_DATE` belongs to the CONTRACT family despite
 * its directory: **membership follows the coupling, not the file it sits in.**
 * Shifting it with its neighbours moves its start to 2026-06-08 and strands
 * `sa-0002`'s first two releases outside their own contract —
 * `agreementContractWindow.guard.test.ts` is what holds that closed.
 */
export const SDC_FAMILY_CONTRACT_IDS: readonly string[] = ['ctr-013'];

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

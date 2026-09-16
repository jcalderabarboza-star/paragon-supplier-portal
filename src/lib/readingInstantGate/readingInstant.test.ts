// ────────────────────────────────────────────────────────────────────────────
// THE READING-INSTANT GATE — what this tree computes its day-labels against.
//
// The derivation lives in `derive.ts` and is what `clockDrift` binds its
// population to. This file is the bilateral pin: the derived table must equal a
// stated expectation, in BOTH directions, so neither a classifier that has
// stopped looking nor a page that quietly re-points its clock can pass.
//
// ── ⚠️ THE EXPECTATION IS A PIN, NOT THE SOURCE OF TRUTH ────────────────────
//   `EXPECTED` below is a hand-written map, and that is allowed for exactly one
//   reason: it is asserted EQUAL to a derivation, never consulted in place of
//   one. `clockDrift` reads the derived value; nothing reads this constant. A
//   hand-written list consulted as truth is the thing CLAUDE.md forbids — this
//   is the pin-reach convention, where the list exists so that a change to the
//   tree has to be acknowledged by a human editing a line.
//
// ── ⚠️ WHAT THIS GATE DOES NOT GUARD (the reach block) ──────────────────────
//   1. **A `now` threaded through helpers beyond the classifier's reach.** It
//      follows identifiers to their declarations, template substitutions, and
//      member/call receivers, to a depth of 6. A `now` assembled through a
//      function call, an object method (`sdcClock.now()`), or a parameter
//      default is reported UNRESOLVED, never guessed. 14 such sites exist and
//      are listed by the derivation; NONE is attributed to an anchored family,
//      which is the only reason they do not sink the drift verdict today.
//   2. **Write stamps.** `MockCommandService` writes `submittedDate`,
//      `dueDate` and `paymentDate` at the wall clock. Those are WRITES, not
//      projections: they mint a stored date rather than compute a label, so no
//      projection call site exists for the classifier to see. A fixture written
//      at the wall clock and then read at `P` is a real defect class this gate
//      is blind to.
//   3. **Unanchored families.** PO and RFQ are read at the wall clock (8 sites)
//      and are not `FixtureFamily` members, so no anchor, window or tolerance
//      exists for them and `clockDrift` cannot judge them. They appear here
//      ONLY as the anti-vacuity control.
//   4. **Whether `P` still tells the story the fixture literals were written
//      for.** This gate proves a family is read at the declared present; it
//      says nothing about whether that present is still the right one. That is
//      the `MANDATE_LEAD_DAYS` ruling, and it is an operator's, not a gate's.
//   5. **Render-time reality.** This is a static walk. A component that
//      computes a label inline, without calling a function with a now-ish
//      parameter, is invisible to it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  buildRepoProgram,
  deriveReadingInstants,
  deriveProjectionFunctions,
  deriveFamilyEntityTypes,
  deriveAllCallSites,
  type FamilyInstant,
} from './derive';
import { FAMILY_ANCHORS, type FixtureFamily } from '../../services/data/fixturePresent';

const program = buildRepoProgram(process.cwd());
const families = Object.keys(FAMILY_ANCHORS) as FixtureFamily[];
const readings = deriveReadingInstants(program, families);

/**
 * ⚠️ THE PIN. Every anchored family, and the instant its labels are computed
 * against. Editing a page's `TODAY` to `new Date()` must change a line here.
 */
const EXPECTED: Readonly<Record<FixtureFamily, FamilyInstant>> = {
  supplierDocument: 'P',
  shipment: 'P',
  // No projection call site reaches these two: nothing computes a day-label
  // for them anywhere in `src/`. Distinct from `P`, and deliberately so.
  goodsReceipt: 'NO-CALL-SITES',
  inventory: 'NO-CALL-SITES',
  contract: 'P',
  obligation: 'P',
  invoice: 'P',
};

describe('POPULATION GUARD — the instrument is looking at the shipped tree', () => {
  // §42b / EMPTY-INPUT-REPORTS-CLEAN-01. Over an empty program every claim
  // below passes having examined nothing, and the pass would be indistinguish-
  // able from a green gate.
  it('the program, the projection functions and the families are all non-empty', () => {
    expect(program.getSourceFiles().length).toBeGreaterThan(100);
    expect(families.length).toBeGreaterThan(0);
    expect(deriveProjectionFunctions(program).size).toBeGreaterThan(10);
    expect(deriveAllCallSites(program).length).toBeGreaterThan(20);
  });

  it('the projection-function derivation finds known members and rejects a non-member', () => {
    const fns = deriveProjectionFunctions(program);
    // KNOWN-GOOD, one per shape: a function declaration, and an arrow-function
    // const. The second is the one the first draft of this instrument missed.
    expect([...fns.keys()]).toContain('daysUntil');
    expect([...fns.keys()]).toContain('unacknowledgedOver48h');
    // KNOWN-BAD: an exported function with no instant parameter is not a
    // projection, however clock-adjacent its name.
    expect([...fns.keys()]).not.toContain('isPast');
    expect([...fns.keys()]).not.toContain('formatIDR');
  });

  it('every family resolves to an entity type — the attribution is not empty', () => {
    const types = deriveFamilyEntityTypes(program);
    for (const f of families) expect(types.get(f), f).toBeTruthy();
    // KNOWN-GOOD: the mapped-type unwrap really happened. `inventory`'s corpus
    // prints as `Omit<InventoryRecord, "stockStatus">`; matching the printed
    // string would attribute nothing to it and report a confident verdict for
    // the wrong reason.
    expect(types.get('inventory')).toBe('InventoryRecord');
    expect(types.get('supplierDocument')).toBe('SupplierDocument');
  });
});

describe('⚠️ the derived reading instants, pinned bilaterally', () => {
  it('every anchored family matches the pin — and the pin covers every family', () => {
    const derived = Object.fromEntries(readings.map((r) => [r.family, r.instant]));
    // Direction 1: nothing derived is missing from the pin.
    expect(Object.keys(derived).sort()).toEqual([...families].sort());
    // Direction 2: the values agree, family by family so a failure names one.
    for (const f of families) expect(derived[f], f).toBe(EXPECTED[f]);
  });

  it('⚠️ no anchored family is UNRESOLVED — the verdict rests on this', () => {
    // If this fails, `clockDrift` reports `unresolved-instant` and the live
    // gate goes red. Stated here too, because the cause is in this file.
    const bad = readings.filter((r) => r.instant === 'UNRESOLVED');
    expect(
      bad.map((r) => `${r.family}: ${r.sites.filter((s) => s.provenance === 'UNRESOLVED').map((s) => `${s.file}:${s.line} now=${s.nowText}`).join(' | ')}`),
    ).toEqual([]);
  });

  it('every P family reaches at least one DECIDING site, not only forwarded ones', () => {
    // A family whose every site is FORWARDED establishes no instant — it would
    // be `NO-CALL-SITES`, not `P`. This asserts the distinction is real rather
    // than an artifact of the aggregation.
    for (const r of readings) {
      const deciding = r.sites.filter((s) => s.provenance !== 'FORWARDED');
      if (r.instant === 'P') expect(deciding.length, r.family).toBeGreaterThan(0);
      if (r.instant === 'NO-CALL-SITES') expect(deciding.length, r.family).toBe(0);
    }
  });
});

describe('⚠️ ANTI-VACUITY — a classifier that returns P for everything must fail', () => {
  it('known WALL sites OUTSIDE the anchored families are classified WALL', () => {
    // ⚠️ **THE CONTROL THAT MAKES THE TABLE ABOVE MEAN SOMETHING.** Every
    // anchored family is `P` today, so a classifier hard-wired to return `P`
    // would reproduce the pin exactly and this gate would be green while
    // examining nothing — `EMPTY-INPUT-REPORTS-CLEAN-01` in the shape that is
    // hardest to see, because the answer is right.
    //
    // These sites are real, they are wall-read, and they are NOT in any
    // anchored family: `buyerDerivations`' PO and RFQ tiers take `now: Date`
    // straight from `new Date()`. A `P`-returning classifier fails here.
    const wall = deriveAllCallSites(program).filter((s) => s.provenance === 'WALL');
    expect(wall.length).toBeGreaterThan(0);
    const files = new Set(wall.map((s) => s.file));
    expect([...files].some((f) => f.includes('BuyerDashboard'))).toBe(true);
    expect([...files].some((f) => f.includes('widgets/'))).toBe(true);
    // …and by name, so a wall set that drifts to some other file is not
    // silently accepted as "still non-empty".
    expect(wall.map((s) => s.fn)).toContain('unacknowledgedOver48h');

    // THE OTHER DIRECTION: no wall-read site belongs to an anchored family.
    // If one ever does, that family leaves `P` and `clockDrift` starts judging
    // it — which is the design, and this line is where it is noticed.
    const familySites = new Set(
      readings.flatMap((r) => r.sites.map((s) => `${s.file}:${s.line}`)),
    );
    for (const s of wall) {
      expect(familySites.has(`${s.file}:${s.line}`), `${s.file}:${s.line}`).toBe(false);
    }
  });

  it('the three provenances are all actually produced by the shipped tree', () => {
    // A classifier that can only ever emit one label is not classifying.
    const provs = new Set(deriveAllCallSites(program).map((s) => s.provenance));
    expect(provs).toContain('P');
    expect(provs).toContain('WALL');
    expect(provs).toContain('FORWARDED');
  });
});

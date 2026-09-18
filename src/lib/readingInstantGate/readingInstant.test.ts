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

import ts from 'typescript';
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

/** Windows paths reach `ts` with backslashes; `derive.ts`'s `inSrc` matches on
 *  `/src/`, so the synthetic file keys must be normalised the same way. */
const norm = (f: string): string => f.replace(/\\/g, '/');

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
  // PSL (P1). `pslDisplayStatus` / `bestPslStatus` / `pslStatusFor` are called
  // from `BuyerSuppliers`, `BuyerSupplierProfile` and `BuyerSourcing`, all of
  // which pin `DECLARED_PRESENT` at module scope for the reason
  // `BuyerContracts` states — the corpus is anchored, so a wall-clock read
  // would decay on a calendar day with no commit involved.
  psl: 'P',
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
  // ⚠️ **THE CONTROL THAT MAKES THE TABLE ABOVE MEAN SOMETHING.** Every anchored
  // family is `P` today, so a classifier hard-wired to return `P` would reproduce
  // the pin exactly and this gate would be green while examining nothing —
  // `EMPTY-INPUT-REPORTS-CLEAN-01` in the shape that is hardest to see, because
  // the answer is right.
  //
  // ⚠️ **IT USED TO READ THE SHIPPED TREE, AND THE TREE STOPPED CARRYING THE
  // DEFECT.** Until #363 the control named real sites: `BuyerDashboard.tsx:144`
  // and three dashboard widgets called `buyerDerivations`' PO and RFQ tiers with
  // `new Date()`. That batch removed every one of them — the dashboard reads the
  // declared present and renders no clock-relative figure over an unanchored
  // family at all — so `deriveAllCallSites` over `src/` now returns **zero** WALL
  // sites, and the control could no longer fire.
  //
  // ⚠️ **A CONTROL THAT CAN NO LONGER FIRE IS WORSE THAN NONE, SO IT IS
  // RE-POINTED RATHER THAN DELETED OR WEAKENED.** The probe below reconstructs
  // the EXACT geometry the tree occupied — an exported arrow with a `now`
  // parameter, called with a bare `new Date()` — and requires the SHIPPED
  // classifier to return WALL and to NAME the function
  // (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`; §71's *fire it at the defect the fix
  // removed*). It is deliberately NOT a count.
  //
  // ⚠️ **AND THE SYNTHETIC FILES SIT UNDER `/src/`, WHICH IS LOAD-BEARING.**
  // `deriveAllCallSites` skips anything outside `src/`; a harness that put them
  // elsewhere would derive an EMPTY population and read as "yes, it catches the
  // bad thing — there is nothing bad here" (§40e, the stored-field gate's own
  // first run). The known-GOOD half below is what says the probe examined
  // something at all.
  const SYNTHETIC_ROOT = `${norm(process.cwd())}/src/__reading-instant-probe__`;

  const probeProgram = (): ts.Program => {
    const files: Record<string, string> = {
      // The exported arrow with a now-ish parameter — `buyerDerivations`'
      // shape, which is the one an earlier draft of `derive.ts` could not see
      // at all (it walked only `FunctionDeclaration`), and a plain declaration
      // beside it so both matcher branches are exercised.
      [`${SYNTHETIC_ROOT}/derivations.ts`]: [
        'export const unacknowledgedOver48h = (rows: readonly string[], now: Date) =>',
        '  rows.filter(() => now.getTime() > 0);',
        'export function projectAt(row: string, nowIso: string): string {',
        '  return row + nowIso;',
        '}',
      ].join('\n'),
      // THE DEFECT, verbatim in shape: `BuyerDashboard.tsx:144` until #363.
      [`${SYNTHETIC_ROOT}/wallCaller.ts`]: [
        "import { unacknowledgedOver48h } from './derivations';",
        'export const late = unacknowledgedOver48h([], new Date());',
      ].join('\n'),
      // THE KNOWN-GOOD TWIN, in the same program: a caller pinned to the
      // declared present, which must NOT classify WALL.
      [`${SYNTHETIC_ROOT}/pinnedCaller.ts`]: [
        "import { projectAt } from './derivations';",
        "export const DECLARED_PRESENT = '2026-08-31';",
        "export const pinned = projectAt('x', `${DECLARED_PRESENT}T00:00:00.000Z`);",
      ].join('\n'),
      // ⚠️ THE DESTRUCTURED-PARAMETER SHAPE — a React component receiving its
      // instant as a prop, which is the ordinary way a component gets one and
      // which the classifier could NOT see until the PSL batch. `nowIso` is
      // declared as a `BindingElement`, not a `Parameter`, so it fell through
      // to `UNRESOLVED` — and ONE unresolved site poisons its whole family.
      // Beside it, a site that must STAY `UNRESOLVED`, so the new arm is shown
      // to be narrow rather than a blanket "call it forwarded".
      [`${SYNTHETIC_ROOT}/destructuredCaller.ts`]: [
        "import { projectAt } from './derivations';",
        'export const Card = ({ nowIso }: { nowIso: string }) =>',
        "  projectAt('x', nowIso);",
        'declare const opaque: { now: string };',
        "export const murky = projectAt('y', opaque.now);",
      ].join('\n'),
    };
    const host = ts.createCompilerHost({}, true);
    const readFile = host.readFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    host.readFile = (f) => files[norm(f)] ?? readFile(f);
    host.fileExists = (f) => norm(f) in files || fileExists(f);
    return ts.createProgram(Object.keys(files), { noEmit: true, strict: true }, host);
  };

  it('the shipped classifier returns WALL for the shape this tree shipped until #363', () => {
    const sites = deriveAllCallSites(probeProgram());

    // KNOWN-GOOD FIRST: the probe examined a real population. Without this the
    // WALL assertion below could pass over nothing and read as a working guard.
    // ⚠️ THE LIST GREW WHEN THE DESTRUCTURED-PARAMETER FILE JOINED THIS
    // PROGRAM, and it is UPDATED rather than loosened to a `toContain`: three
    // `projectAt` sites (pinned, destructured, opaque) and one
    // `unacknowledgedOver48h`. An exhaustive list is what makes the WALL
    // assertion below mean "exactly one of these is WALL".
    expect(sites.map((s) => s.fn).sort()).toEqual([
      'projectAt',
      'projectAt',
      'projectAt',
      'unacknowledgedOver48h',
    ]);

    const wall = sites.filter((s) => s.provenance === 'WALL');
    expect(wall.map((s) => s.fn)).toEqual(['unacknowledgedOver48h']);

    // KNOWN-BAD: the pinned caller in the SAME program must NOT be WALL, so a
    // classifier that answered WALL for everything fails here too.
    expect(
      sites.find((s) => norm(s.file).includes('pinnedCaller'))?.provenance,
    ).toBe('P');
  });

  it('⚠️ A DESTRUCTURED PARAMETER IS FORWARDED, AND THE ARM IS NARROW', () => {
    // BOTH DIRECTIONS, IN ONE PROGRAM (rule 4 — probe the guard both ways).
    // The FORWARDED half is the reclassification the PSL batch needed: a
    // component taking `nowIso` as a prop establishes no instant, exactly as a
    // plain parameter does not. The UNRESOLVED half is what says the new arm is
    // NARROW — if it were a blanket, both sites below would read FORWARDED and
    // every family in the tree would silently become unfalsifiable.
    const sites = deriveAllCallSites(probeProgram()).filter((s) =>
      norm(s.file).includes('destructuredCaller'),
    );
    // KNOWN-GOOD: the probe examined this file at all (§40e — a population of
    // zero reads as 'nothing bad here').
    expect(sites.length).toBe(2);
    expect(sites.map((s) => s.provenance).sort()).toEqual(['FORWARDED', 'UNRESOLVED']);
  });

  it('the shipped tree now has NO wall-read projection call site, and that is the claim', () => {
    // The other half of the batch that retired the control's old subject: this
    // asserts the removal rather than assuming it, so a wall-clock read that
    // creeps back into any projection call site turns this red.
    const wall = deriveAllCallSites(program).filter((s) => s.provenance === 'WALL');
    expect(wall.map((s) => `${s.file}:${s.line} ${s.fn}`)).toEqual([]);
  });

  it('no wall-read site belongs to an anchored family', () => {
    // If one ever does, that family leaves `P` and `clockDrift` starts judging
    // it — which is the design, and this line is where it is noticed. Vacuous
    // today by construction (the set above is empty); it is kept because it is
    // the assertion that must survive the day a WALL site returns.
    const wall = deriveAllCallSites(program).filter((s) => s.provenance === 'WALL');
    const familySites = new Set(
      readings.flatMap((r) => r.sites.map((s) => `${s.file}:${s.line}`)),
    );
    for (const s of wall) {
      expect(familySites.has(`${s.file}:${s.line}`), `${s.file}:${s.line}`).toBe(false);
    }
  });

  it('the classifier actually produces more than one label over the shipped tree', () => {
    // A classifier that can only ever emit one label is not classifying. WALL is
    // no longer among them in `src/` — the probe above is what proves it is
    // still reachable — so this asserts the labels the tree DOES produce.
    const provs = new Set(deriveAllCallSites(program).map((s) => s.provenance));
    expect(provs).toContain('P');
    expect(provs).toContain('FORWARDED');
    expect(provs).toContain('UNRESOLVED');
    expect(provs.size).toBeGreaterThan(1);
  });
});

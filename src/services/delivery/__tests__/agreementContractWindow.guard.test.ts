// ─────────────────────────────────────────────────────────────────────────────
// EVERY SCHEDULING AGREEMENT'S CALENDAR SITS INSIDE ITS OWN CONTRACT'S VALIDITY
// WINDOW — the guard that did not exist, added BEFORE the coupling fired.
//
// ⚠️ **THE GAP THIS CLOSES.** `fixtures.integrity.test.ts` asserts exactly this
// for ONE agreement — `sa-0001` over `ctr-003` — and nothing asserted it for any
// other. That was survivable only while nothing moved contracts. The batch that
// anchors the `contract` family moves twelve of them by +99 days, and a
// scheduling agreement whose calendar is authored against the SDC clock does NOT
// move with them. **That is precisely the shape that pushes a release outside
// its contract with nothing noticing**, so the guard lands with the shift rather
// than after it.
//
// ⚠️ **AND THE POPULATION IS THE POINT, NOT THE ASSERTION.** A guard that
// checked `sa-0001` again would have been green and useless. This derives EVERY
// exported agreement and joins each to its OWN contract, so an agreement added
// tomorrow is covered without anybody editing this file. The bilateral control
// (`EXPECTED_AGREEMENT_IDS`) is what makes a shrinking population red instead of
// quietly reassuring — `EMPTY-INPUT-REPORTS-CLEAN-01` is the failure this shape
// refuses.
//
// ── WHY MEMBERSHIP FOLLOWS THE COUPLING, NOT THE DIRECTORY ──────────────────
//   Two rows in this tree sit in one family while living somewhere else:
//     · `delivery/fixtures.ts` `START_DATE` duplicates `ctr-003.startDate`, so it
//       belongs to the CONTRACT family though it lives under `services/delivery`.
//     · `ctr-013` exists ONLY to host `sa-0002` (its own comment says so), and
//       `sa-0002`'s calendar is authored against the SDC clock. So `ctr-013`
//       belongs to the SDC family though it lives in `mockContracts`.
//   Both are stated at their sites. This guard is what keeps the second one
//   honest: shift `ctr-013` with its neighbours and `sa-0002` falls out of it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { SCHEDULING_AGREEMENTS } from '../fixtures';
import { SCHEDULING_AGREEMENT_DEMO } from '../demoFixtures';
import { SCALE_DEMO_AGREEMENTS } from '../demoFixturesScale';
import type { SchedulingAgreement } from '../types';
import { mockContracts } from '../../../data/mockContracts';

/** Every agreement this tree exports, joined to the contract it names. */
const ALL: readonly SchedulingAgreement[] = [
  ...SCHEDULING_AGREEMENTS,
  SCHEDULING_AGREEMENT_DEMO,
  ...SCALE_DEMO_AGREEMENTS,
];

/**
 * ⚠️ BILATERAL. Declared == derived as SETS. An agreement that stops being
 * exported is as red as one that appears unannounced, so this cannot go quietly
 * empty and report clean.
 */
const EXPECTED_AGREEMENT_IDS = [
  'sa-0001', 'sa-0002',
  'sa-1001', 'sa-1002', 'sa-1003', 'sa-1004', 'sa-1005', 'sa-1006', 'sa-1007',
].sort();

const day = (iso: string) => iso.slice(0, 10);

interface Row {
  readonly agreementId: string;
  readonly contractId: string;
  readonly lineSeq: number;
  readonly releaseSeq: number;
  readonly releaseDate: string;
  readonly start: string;
  readonly end: string;
}

/** One row per SCHEDULE LINE — the grain the claim is actually about. */
const rows: Row[] = ALL.flatMap((a) => {
  const c = mockContracts.find((x) => x.id === a.contractId);
  if (!c) return [];
  return a.items.flatMap((i) =>
    i.scheduleLines.map((l) => ({
      agreementId: a.id,
      contractId: a.contractId,
      lineSeq: i.lineSeq,
      releaseSeq: l.releaseSeq,
      releaseDate: day(l.releaseDate),
      start: day(c.startDate),
      end: day(c.endDate),
    })),
  );
});

const outside = (r: Row) => r.releaseDate < r.start || r.releaseDate > r.end;

describe('POPULATION CONTROLS — the assertion below means nothing without these', () => {
  it('every exported agreement is present, both directions', () => {
    expect([...ALL.map((a) => a.id)].sort()).toEqual(EXPECTED_AGREEMENT_IDS);
  });

  it('every agreement resolves to a real contract — no silent drop to zero rows', () => {
    // A missing contract would make `rows` shrink and the central assertion pass
    // over nothing. Name the join failures rather than counting the survivors.
    const unresolved = ALL.filter(
      (a) => !mockContracts.some((c) => c.id === a.contractId),
    ).map((a) => `${a.id} -> ${a.contractId}`);
    expect(unresolved).toEqual([]);
  });

  it('the row population is non-empty and covers every agreement', () => {
    expect(rows.length).toBeGreaterThan(50);
    expect([...new Set(rows.map((r) => r.agreementId))].sort()).toEqual(EXPECTED_AGREEMENT_IDS);
  });
});

/**
 * ⚠️ **THE INVARIANT DOES NOT HOLD TODAY, AND THIS RECORDS WHERE — BILATERALLY,
 * SHRINK-ONLY. IT IS A DATA DEFECT HELD HONESTLY, NOT AN EXEMPTION.**
 *
 * The guard was added expecting to find a LATENT coupling. It found a live one:
 * on `main`, before any date moved, SIX releases across three agreements already
 * sat outside their contracts with nothing watching. Anchoring the contract
 * family changed the membership rather than the fact — it repaired four
 * (`sa-1006`, `sa-1007`, and three of `sa-1004`'s) and exposed one (`sa-1001`,
 * whose contract's start moved past its first release).
 *
 * ⚠️ **THE SPLIT IS THE FINDING.** Both survivors are `demoFixturesScale`
 * agreements — SIMULATED volume fixtures that borrow real contract ids so the
 * nested contract-detail tab has something to render. Their calendars were never
 * authored to sit inside those contracts. The two DESIGNED agreements,
 * `sa-0001` and `sa-0002`, are clean and are asserted clean below, so this list
 * can never be used to excuse the pair the model actually cares about.
 *
 * Declared == derived as SETS, so a row that quietly stops violating is as red
 * as one that quietly starts. **It can only ever shrink truthfully.**
 */
const KNOWN_OUT_OF_WINDOW = [
  // ctr-010 starts 9 days AFTER this release once the contract family is anchored.
  'sa-1001/10/1',
  // ctr-008 ends 19 days BEFORE this release — the last survivor of the original six.
  'sa-1004/10/4',
].sort();

const key = (r: Row) => `${r.agreementId}/${r.lineSeq}/${r.releaseSeq}`;

describe('⚠️ EVERY RELEASE DATE SITS INSIDE ITS CONTRACT VALIDITY WINDOW', () => {
  it('the out-of-window set is EXACTLY the declared one — both directions', () => {
    const derived = rows.filter(outside).map(key).sort();
    expect(derived).toEqual(KNOWN_OUT_OF_WINDOW);
  });

  it('⚠️ the two DESIGNED agreements are clean — the exception list cannot cover them', () => {
    // sa-0001 (the pristine ctr-003 anchor) and sa-0002 (the surface demo) are
    // the agreements the object model is actually demonstrated on. If either
    // ever needs an exception row, the fixture is wrong, not the guard.
    const designed = rows.filter((r) => r.agreementId === 'sa-0001' || r.agreementId === 'sa-0002');
    expect(designed.length).toBeGreaterThan(0);
    expect(designed.filter(outside)).toEqual([]);
    expect(KNOWN_OUT_OF_WINDOW.some((k) => k.startsWith('sa-000'))).toBe(false);
  });

  it('⚠️ the boundary is REAL — a calendar pushed outside is caught, both edges', () => {
    // Rule 4: assert a known-GOOD input passes before believing a known-BAD one
    // failed. Without this the assertion above could be vacuously true.
    const real = rows[0];
    expect(outside(real)).toBe(false);
    expect(outside({ ...real, releaseDate: '1999-01-01' })).toBe(true); // before start
    expect(outside({ ...real, releaseDate: '2099-01-01' })).toBe(true); // after end
    // And exactly ON each edge is INSIDE — the window is inclusive.
    expect(outside({ ...real, releaseDate: real.start })).toBe(false);
    expect(outside({ ...real, releaseDate: real.end })).toBe(false);
  });

  it('⚠️ ctr-013 hosts sa-0002 and must NOT be shifted with the contract family', () => {
    // The named instance of "membership follows the coupling". `sa-0002`'s
    // calendar is authored against the SDC clock; `ctr-013` exists to contain it.
    // Shifting ctr-013 by the contract delta (+99d) moves its start to 2026-06-08
    // and strands sa-0002's first two releases — measured, not predicted.
    const sa2 = rows.filter((r) => r.agreementId === 'sa-0002');
    expect(sa2.length).toBeGreaterThan(0);
    expect(sa2.every((r) => r.contractId === 'ctr-013')).toBe(true);

    const ctr013 = mockContracts.find((c) => c.id === 'ctr-013')!;
    expect(day(ctr013.startDate)).toBe('2026-03-01'); // UNSHIFTED, by ruling

    const earliest = sa2.map((r) => r.releaseDate).sort()[0];
    expect(earliest).toBe('2026-04-01');
    // The counterfactual, asserted rather than described: had ctr-013 shifted,
    // this release would be outside it.
    expect(earliest < '2026-06-08').toBe(true);
  });
});

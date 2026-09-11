// ─────────────────────────────────────────────────────────────────────────────
// THE OBLIGATION ROLLUP, ASSERTED AT THE VALUE, THE ORACLE, THE PROPERTY AND
// THE ABSENCE.
//
// ── ⚠️ WHY EVERY PIN BELOW IS A NAMED MEMBER REACHED THROUGH A VALUE ─────────
//   `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`: an id-only control is
//   exactly the control a corpus replacement walks through, and a row count is
//   worse still, because a replacement usually preserves it by construction.
//   The claim this file makes is ABOUT THE VALUES, so the values are pinned —
//   all thirteen, as an exact map. Re-anchoring `mockObligations` with
//   `shiftFields` moves only dates and leaves every assertion here green;
//   adding, removing or re-completing a row moves a number and turns it red,
//   which is the sensitivity this spec exists for.
//
// ── ⚠️ AND THE RETIRED LITERALS ARE PINNED IN THE NEGATIVE ───────────────────
//   `asnRefIntegrity.test.ts`'s shape: the correction is a fact in the file
//   rather than a note in a PR body. `STORED_BEFORE` records what the contract
//   rows claimed, so "the stored numbers were wrong on 8 of 13" can be re-read
//   as evidence instead of believed.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mockContracts } from '../../data/mockContracts';
import { mockObligations, type ContractObligation } from '../../data/mockObligations';
import { obligationRollup } from './obligationRollup';
import { obligationDisplay, isObligationComplete } from './obligationProjection';

/**
 * ⚠️ THE POPULATION CONTROL, AND IT IS DERIVED FROM SOMETHING THE CODE UNDER
 * TEST CANNOT REACH. `obligationRollup` decides membership by `contractId`, so
 * deriving "which contracts have obligations?" by asking the rollup would let a
 * mutation collapse the population and the assertions together — red on the
 * control, vacuous everywhere else (§86). These read the two fixture arrays.
 */
describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('both fixtures are non-empty and carry the keys the rollup folds on', () => {
    expect(mockContracts.length).toBeGreaterThan(5);
    expect(mockObligations.length).toBeGreaterThan(20);
    expect(mockObligations.every((o) => typeof o.contractId === 'string')).toBe(true);
    // MEMBERSHIP, never a count: one contract known to own obligations and one
    // known to own none. Both read off the fixture, not off the rollup.
    const owners = new Set(mockObligations.map((o) => o.contractId));
    expect(owners.has('ctr-001')).toBe(true);
    expect(owners.has('ctr-013')).toBe(false);
  });
});

/**
 * ⚠️ THE EXACT MAP. Every contract, both counters, as literals.
 * Sums: 40 obligations, 16 complete — stated so a partial corpus is visible.
 */
const EXPECTED: Readonly<Record<string, { total: number; met: number }>> = {
  'ctr-001': { total: 5, met: 1 },
  'ctr-002': { total: 4, met: 1 },
  'ctr-003': { total: 3, met: 1 },
  'ctr-004': { total: 4, met: 2 },
  'ctr-005': { total: 5, met: 1 },
  'ctr-006': { total: 3, met: 1 },
  'ctr-007': { total: 2, met: 1 },
  'ctr-008': { total: 4, met: 2 },
  'ctr-009': { total: 3, met: 3 },
  'ctr-010': { total: 4, met: 2 },
  'ctr-011': { total: 0, met: 0 },
  'ctr-012': { total: 3, met: 1 },
  'ctr-013': { total: 0, met: 0 },
};

/**
 * What the RETIRED fields claimed, row for row. Eight disagree with `EXPECTED`,
 * and the direction is uniform: the stored `met` was never BELOW the truth.
 * That uniformity is what ruled out "the obligation fixture is thin" — a thin
 * fixture shorts the COUNT, and the count agreed on 12 of 13.
 */
const STORED_BEFORE: Readonly<Record<string, { count: number; met: number }>> = {
  'ctr-001': { count: 5, met: 3 },
  'ctr-002': { count: 4, met: 2 },
  'ctr-003': { count: 3, met: 2 },
  'ctr-004': { count: 4, met: 3 },
  'ctr-005': { count: 5, met: 3 },
  'ctr-006': { count: 3, met: 2 },
  'ctr-007': { count: 2, met: 1 },
  'ctr-008': { count: 4, met: 4 },
  'ctr-009': { count: 3, met: 3 },
  'ctr-010': { count: 4, met: 2 },
  'ctr-011': { count: 0, met: 0 },
  'ctr-012': { count: 3, met: 1 },
  'ctr-013': { count: 3, met: 2 },
};

describe('obligationRollup — the computed counters', () => {
  for (const [id, want] of Object.entries(EXPECTED)) {
    it(`${id} rolls up to ${want.total} obligations, ${want.met} met`, () => {
      expect(obligationRollup(id, mockObligations)).toEqual(want);
    });
  }

  it('the rollup partitions the store exactly — no row counted twice or lost', () => {
    const total = Object.keys(EXPECTED)
      .map((id) => obligationRollup(id, mockObligations).total)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(mockObligations.length);
    expect(total).toBe(40);
  });

  it('⚠️ ctr-013 is the largest disagreement, and it reads ZERO', () => {
    // The Delivery-Agreement demo anchor. It stored `obligationCount: 3` against
    // a store holding no rows for it at all — the one row where the retired
    // field was the only record of an intention. The honest computed answer is
    // 0, and it is pinned here so that authoring those three obligation rows
    // later is a DELIBERATE act that turns this red rather than a silent one.
    expect(obligationRollup('ctr-013', mockObligations)).toEqual({ total: 0, met: 0 });
    expect(STORED_BEFORE['ctr-013']).toEqual({ count: 3, met: 2 });
  });

  it('a contract id the store never names rolls up to zero, not to everything', () => {
    // The negative control for the filter. Mutate `o.contractId !== contractId`
    // away and this returns the whole store.
    expect(obligationRollup('ctr-does-not-exist', mockObligations)).toEqual({
      total: 0,
      met: 0,
    });
  });
});

describe('⚠️ the stored counters were WRONG — re-asserted in the negative', () => {
  it('disagreed on exactly eight contracts, named', () => {
    const disagreeing = Object.keys(EXPECTED).filter((id) => {
      const was = STORED_BEFORE[id];
      const now = EXPECTED[id];
      return was.count !== now.total || was.met !== now.met;
    });
    expect(disagreeing).toEqual([
      'ctr-001',
      'ctr-002',
      'ctr-003',
      'ctr-004',
      'ctr-005',
      'ctr-006',
      'ctr-008',
      'ctr-013',
    ]);
  });

  it('and never in the other direction — the stored `met` was never too LOW', () => {
    // This is the assertion that ruled out a thin fixture. If a future edit
    // makes it false, the ruling that produced this batch needs re-reading.
    for (const [id, was] of Object.entries(STORED_BEFORE)) {
      expect(was.met, id).toBeGreaterThanOrEqual(EXPECTED[id].met);
    }
  });

  it('ctr-008 claimed every obligation met while one of its own was Overdue', () => {
    const rows = mockObligations.filter((o) => o.contractId === 'ctr-008');
    expect(rows.map((o) => o.status).sort()).toEqual([
      'Completed',
      'Completed',
      'In Progress',
      'Overdue',
    ]);
    expect(STORED_BEFORE['ctr-008'].met).toBe(4);
    expect(obligationRollup('ctr-008', mockObligations).met).toBe(2);
  });
});

describe('⚠️ `met` has ONE source, and an INDEPENDENT oracle agrees with it', () => {
  it('agrees with `obligationDisplay` row for row — one rule, not two', () => {
    // NOT an independent check and must not be read as one: both call
    // `isObligationComplete`. It asserts the SHARING, which is the property
    // `obligationsMet` lacked — a second copy of the rule, free to drift.
    for (const id of Object.keys(EXPECTED)) {
      const viaDisplay = mockObligations.filter(
        (o) =>
          o.contractId === id &&
          obligationDisplay(o, '2026-09-11T00:00:00.000Z') === 'Completed',
      ).length;
      expect(obligationRollup(id, mockObligations).met, id).toBe(viaDisplay);
    }
  });

  it("agrees with the fixture's authored `status` literal — the real oracle", () => {
    // `obligationProjection.ts` designates the stored literal as the oracle the
    // projection is asserted against. It is reached by NEITHER function, so this
    // is the independent measurement the test above is not.
    for (const id of Object.keys(EXPECTED)) {
      const authored = mockObligations.filter(
        (o) => o.contractId === id && o.status === 'Completed',
      ).length;
      expect(obligationRollup(id, mockObligations).met, id).toBe(authored);
    }
  });

  it('and the two predicates cannot be satisfied by different rows', () => {
    for (const o of mockObligations) {
      expect(isObligationComplete(o), o.id).toBe(o.status === 'Completed');
    }
  });
});

describe('⚠️ THE PROPERTY THE STORED VERSION COULD NEVER HAVE HAD', () => {
  const extra = (over: Partial<ContractObligation>): ContractObligation => ({
    id: 'obl-probe',
    contractId: 'ctr-013',
    title: 'probe',
    description: 'probe',
    dueDate: '2026-12-01',
    status: 'Upcoming',
    category: 'Documentation',
    owner: 'Buyer',
    ...over,
  });

  it('adding an obligation moves the count, with NO fixture edited', () => {
    const before = obligationRollup('ctr-013', mockObligations);
    const after = obligationRollup('ctr-013', [...mockObligations, extra({})]);
    expect(before).toEqual({ total: 0, met: 0 });
    expect(after).toEqual({ total: 1, met: 0 });
  });

  it('completing it moves `met` too', () => {
    const done = extra({ status: 'Completed', completedDate: '2026-11-30' });
    expect(obligationRollup('ctr-013', [...mockObligations, done])).toEqual({
      total: 1,
      met: 1,
    });
  });

  it('and an obligation on a DIFFERENT contract moves neither', () => {
    const elsewhere = extra({ id: 'obl-probe-2', contractId: 'ctr-001' });
    expect(obligationRollup('ctr-013', [...mockObligations, elsewhere])).toEqual({
      total: 0,
      met: 0,
    });
    expect(obligationRollup('ctr-001', [...mockObligations, elsewhere]).total).toBe(6);
  });
});

/**
 * ⚠️ THE DUPLICATE-SOURCE ASSERTION. `retiredDayFields.test.ts`'s shape applied
 * to a non-clock field: the only claim that cannot rot is the ABSENCE, so
 * restoring either stored counter goes red BY NAME. A type-level check alone
 * would not do it — a fixture could carry the key through an `as` cast, and a
 * runtime `delete` satisfies a property check — so the bytes are read too.
 */
describe('⚠️ the stored counters are RETIRED — one source or none', () => {
  const CONTRACTS_SRC = 'src/data/mockContracts.ts';
  const WIZARD_SRC = 'src/pages-v2/BuyerContracts.tsx';
  const decl = (f: string) => new RegExp(`^\\s*${f}\\s*:\\s*number\\s*;`, 'm');
  const value = (f: string) => new RegExp(`^\\s*${f}\\s*:\\s*-?[0-9]+,`, 'm');

  it('no contract row carries either property', () => {
    for (const c of mockContracts) {
      expect(c, c.contractNumber).not.toHaveProperty('obligationCount');
      expect(c, c.contractNumber).not.toHaveProperty('obligationsMet');
    }
  });

  it('the fixture SOURCE declares neither, and states no value for either', () => {
    const src = readFileSync(CONTRACTS_SRC, 'utf8');
    expect(decl('obligationCount').test(src)).toBe(false);
    expect(decl('obligationsMet').test(src)).toBe(false);
    expect(value('obligationCount').test(src)).toBe(false);
    expect(value('obligationsMet').test(src)).toBe(false);
    // ⚠️ THE CONTROLS. A regex that matched nothing would pass all four above
    // while the fields sat in the file. These two are fields the row still has.
    expect(decl('performanceScore').test(src)).toBe(true);
    expect(value('noticeRequiredDays').test(src)).toBe(true);
  });

  it('the wizard no longer MINTS either — the one non-fixture writer is gone', () => {
    const src = readFileSync(WIZARD_SRC, 'utf8');
    // The retirement note NAMES both fields, so a bare substring search would
    // find them there and read the retirement as the defect. Matching the WRITE
    // shape — the field at the head of a line, followed by `:` — is what
    // separates a mint from a mention.
    expect(/^\s*obligationCount\s*:/m.test(src)).toBe(false);
    expect(/^\s*obligationsMet\s*:/m.test(src)).toBe(false);
    // CONTROL: a field the wizard still writes, matched by the same shape.
    expect(/^\s*noticeRequiredDays\s*:/m.test(src)).toBe(true);
  });
});

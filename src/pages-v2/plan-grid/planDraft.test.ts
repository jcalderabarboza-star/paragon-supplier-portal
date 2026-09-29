// ────────────────────────────────────────────────────────────────────────────
// B3 · the PLANNED overlay and the push, proven on the REAL seam and the REAL
// dispatcher — a grid row built by `buildPlanBlocks` over `derivePlanningFacts`,
// and `t_intake_commit` fired through `MockCommandService`.
//
// ⚠️ ONE INTAKE LINE PER SPEC. The dispatcher's replay ledger (the cascade's
// idempotency key is the line id) outlives a store reset, so a line re-used
// across specs would answer the second spec with the first one's result.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from '../../services/data/mock/MockCommandService';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { DataError, type CommandResult, type QueryScope } from '../../services/data/types';
import { VIEWS } from '../../services/planning/views';
import { somoHorizon } from '../../services/planning/facts';
import { somoIntakeLineId } from '../../services/planning/somoIntake';
import { visibleMeasures } from './visibleMeasures';
import { buildPlanBlocks, isEditableCell, type PlanRow } from './planGridModel';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyPaste,
  applyPushOutcomes,
  cellKey,
  pushBlocked,
  pushEntries,
  reasonOwed,
  reconcile,
  removeEntry,
  setReason,
  type CommitVars,
  type PlanDraft,
} from './planDraft';

const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const SUPPLIER: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: ['supplier'] };
const commands = new MockCommandService();

const VIEW = VIEWS.find((v) => v.viewId === 'rm-plan')!;
const HORIZON = somoHorizon('month').slice(0, VIEW.horizonLength);
const MEASURES = visibleMeasures(VIEW.measuresShown);

/** The grid's own rows for these materials, built exactly as the grid builds them. */
function rowsOf(...codes: string[]): PlanRow[] {
  const out = derivePlanningFacts({ horizon: HORIZON, measures: MEASURES, materialCodes: codes });
  if (!out.ok) throw new Error('horizon refused');
  return buildPlanBlocks(out.facts, HORIZON, MEASURES).flatMap((b) => b.rows);
}
const acceptedRow = (code: string) => rowsOf(code).find((r) => r.measureId === 'acceptedQty')!;
const commitVia = (scope: QueryScope) => (v: CommitVars) =>
  commands.dispatch(
    scope,
    {
      transitionId: 't_intake_commit',
      entity: 'intakeLine',
      entityId: v.lineId,
      payload: {
        acceptedQty: v.acceptedQty,
        acceptedQtyRaw: v.acceptedQtyRaw,
        numberConvention: v.numberConvention,
        ...(v.overrideReason ? { overrideReason: v.overrideReason } : {}),
      },
    },
    v.causationId,
  );
const raisedFrom = (lineId: string) => purchaseRequisitionStore.all().filter((p) => p.intakeLineId === lineId);

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

describe('THE REGISTRY DECIDES which cell is editable, not the page', () => {
  it('an acceptedQty cell on a material row is editable and anchored to its intake line', () => {
    const row = acceptedRow('SIM-RM-0001');
    expect(isEditableCell(row, '2026-08')).toBe(true);
    expect(row.seamRefs?.['2026-08']).toBe(somoIntakeLineId('SIM-RM-0001', '2026-08'));
    // the producer's delivered quantity, not yet committed
    expect(row.cells['2026-08']).toBe(11700);
    expect(row.committedCells?.['2026-08']).toBe(false);
  });

  it('KNOWN-BAD: demand, SOMO’s proposal and a supplier-grain allocation are not', () => {
    const rows = rowsOf('SIM-RM-0001');
    for (const m of ['demand', 'suggestedQty', 'allocation', 'confirmed'] as const) {
      const r = rows.find((x) => x.measureId === m)!;
      expect(isEditableCell(r, '2026-08'), m).toBe(false);
      expect(r.seamRefs, m).toBeUndefined();
    }
  });

  it('a real master code has no generated intake line, so its accepted cell has nothing to anchor to', () => {
    expect(rowsOf('RM-EMUL-3310').some((r) => r.measureId === 'acceptedQty')).toBe(false);
  });
});

describe('an edit creates a PLANNED overlay entry, keyed by the seam row', () => {
  it('an edit creates a PLANNED entry with the raw, the parsed value and the baseline', () => {
    const row = acceptedRow('SIM-RM-0001');
    const d = applyEdit(EMPTY_DRAFT, row, '2026-08', '12500', 'TYPED', 'en');
    const ref = somoIntakeLineId('SIM-RM-0001', '2026-08');
    expect(d.entries.get(ref)).toMatchObject({
      seamRef: ref,
      raw: '12500',
      value: 12500,
      baseline: 11700,
      origin: 'TYPED',
      planState: 'PLANNED',
    });
  });

  it('⚠️ the overlay is never found in any seam array — rows, facts and the read seam all hold the producer’s figure', async () => {
    const row = acceptedRow('SIM-RM-0003');
    const before = JSON.stringify(row);
    const ref = row.seamRefs!['2026-08'];
    let d = applyEdit(EMPTY_DRAFT, row, '2026-08', '777', 'TYPED', 'en');
    d = applyPaste(d, [row], HORIZON, { row: 0, col: 1 }, '888\t999', 'en').draft;
    expect(d.entries.size).toBe(3);

    // the row the grid holds is byte-identical
    expect(JSON.stringify(row)).toBe(before);
    // a fresh derivation and the read seam carry no planned value at any anchor
    const planned = new Map([...d.entries.values()].map((e) => [e.seamRef, e.value]));
    const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon: HORIZON, measures: MEASURES });
    const hits = page.items.filter((f) => planned.has(f.sourceRef) && f.value === planned.get(f.sourceRef));
    expect(hits).toEqual([]);
    // CONTROL: the anchors ARE in the seam — the search looked where the value would be
    expect(page.items.some((f) => f.sourceRef === ref && f.measureId === 'acceptedQty')).toBe(true);
    expect(rowsOf('SIM-RM-0003').find((r) => r.measureId === 'acceptedQty')!.cells['2026-08']).not.toBe(777);
  });

  it('a refused parse shows at the cell with its reason and enters nothing', () => {
    const row = acceptedRow('SIM-RM-0005');
    let d = applyEdit(EMPTY_DRAFT, row, '2026-08', 'abc', 'TYPED', 'en');
    expect(d.entries.size).toBe(0);
    expect(d.refusals.get(cellKey(row.id, '2026-08'))).toMatchObject({ raw: 'abc', reason: 'NOT_NUMERIC' });
    d = applyEdit(d, row, '2026-08', '  ', 'TYPED', 'en');
    expect(d.refusals.get(cellKey(row.id, '2026-08'))?.reason).toBe('EMPTY_QTY');
    // a readable edit of the same cell clears the refusal
    d = applyEdit(d, row, '2026-08', '100', 'TYPED', 'en');
    expect(d.refusals.size).toBe(0);
    expect(d.entries.size).toBe(1);
  });

  it('the seat’s convention decides "12.000": twelve thousand under ID, twelve under EN (the parser’s rule with a hint)', () => {
    const row = acceptedRow('SIM-RM-0005');
    expect([...applyEdit(EMPTY_DRAFT, row, '2026-08', '12.000', 'TYPED', 'id').entries.values()][0].value).toBe(12000);
    expect([...applyEdit(EMPTY_DRAFT, row, '2026-08', '12.000', 'TYPED', 'en').entries.values()][0].value).toBe(12);
  });

  it('remove drops exactly one change', () => {
    const row = acceptedRow('SIM-RM-0005');
    let d = applyEdit(EMPTY_DRAFT, row, '2026-08', '1', 'TYPED', 'en');
    d = applyEdit(d, row, '2026-09', '2', 'TYPED', 'en');
    d = removeEntry(d, row.seamRefs!['2026-08']);
    expect([...d.entries.keys()]).toEqual([row.seamRefs!['2026-09']]);
  });
});

describe('a multi-cell paste — every cell judged on its own', () => {
  it('pasted values enter the overlay with origin PASTE (the EXTERNAL marker)', () => {
    const row = acceptedRow('SIM-RM-0007');
    const r = applyPaste(EMPTY_DRAFT, [row], HORIZON, { row: 0, col: 0 }, '100\t200\t300\t400\t500\n', 'en');
    expect(r).toMatchObject({ planned: 5, refused: 0, outside: 0 });
    expect([...r.draft.entries.values()].map((e) => [e.bucket, e.value, e.origin])).toEqual([
      ['2026-08', 100, 'PASTE'],
      ['2026-09', 200, 'PASTE'],
      ['2026-10', 300, 'PASTE'],
      ['2026-11', 400, 'PASTE'],
      ['2026-12', 500, 'PASTE'],
    ]);
  });

  it('a paste over a read-only column is refused cell by cell, naming who owns the figure', () => {
    const rows = rowsOf('SIM-RM-0007');
    const demandAt = rows.findIndex((r) => r.measureId === 'demand');
    const acceptedAt = rows.findIndex((r) => r.measureId === 'acceptedQty');
    // two rows × two buckets, starting on demand: the demand cells refuse, the accepted ones plan
    const text = acceptedAt === demandAt + 2 ? '1\t2\n3\t4\n5\t6' : '';
    expect(text, 'row order is demand · suggestedQty · acceptedQty').not.toBe('');
    const r = applyPaste(EMPTY_DRAFT, rows, HORIZON, { row: demandAt, col: 0 }, text, 'en');
    expect(r).toMatchObject({ planned: 2, refused: 4, outside: 0 });
    expect(r.draft.refusals.get(cellKey(rows[demandAt].id, '2026-08'))).toMatchObject({ reason: 'READ_ONLY', source: 'SOMO', raw: '1' });
    expect(r.draft.refusals.get(cellKey(rows[demandAt + 1].id, '2026-09'))).toMatchObject({ reason: 'READ_ONLY', raw: '4' });
    expect([...r.draft.entries.values()].map((e) => e.value)).toEqual([5, 6]);
  });

  it('a gap bucket on the EDITABLE row is refused as NO_SEAM_ROW — never as read-only with the wrong owner', () => {
    // SIM-RM-0003: SOMO emitted no proposal for 2026-11 (browser QA found the
    // paste over it reading "read-only — the planner owns this figure").
    const row = acceptedRow('SIM-RM-0003');
    expect(row.cells['2026-11']).toBeNull();
    expect(row.seamRefs?.['2026-11']).toBeUndefined();
    const d = applyEdit(EMPTY_DRAFT, row, '2026-11', '15000', 'PASTE', 'en');
    expect(d.entries.size).toBe(0);
    expect(d.refusals.get(cellKey(row.id, '2026-11'))).toEqual({ rowId: row.id, bucket: '2026-11', raw: '15000', reason: 'NO_SEAM_ROW' });
  });

  // ⚠️ OPERATOR RULING (B4a): a PASTED token whose reading differs between EN
  // and ID is refused as AMBIGUOUS whatever the seat; a TYPED one keeps the
  // seat's convention. Both directions, both conventions, pinned.
  it.each([
    ['12.000', 'id'],
    ['12.000', 'en'],
    ['12,000', 'id'],
    ['12,000', 'en'],
  ] as const)('a pasted "%s" is refused as AMBIGUOUS under the %s seat — retype asked', (raw, conv) => {
    const row = acceptedRow('SIM-RM-0007');
    const r = applyPaste(EMPTY_DRAFT, [row], HORIZON, { row: 0, col: 0 }, raw, conv);
    expect(r).toMatchObject({ planned: 0, refused: 1 });
    expect(r.draft.refusals.get(cellKey(row.id, '2026-08'))).toEqual({ rowId: row.id, bucket: '2026-08', raw, reason: 'AMBIGUOUS_QTY' });
  });

  it('KNOWN-GOOD: a paste that reads the same in both conventions is planned — plain digits, and ID-only grouping', () => {
    const row = acceptedRow('SIM-RM-0007');
    const r = applyPaste(EMPTY_DRAFT, [row], HORIZON, { row: 0, col: 0 }, '12000\t1.234.567\t2,5', 'id');
    expect(r).toMatchObject({ planned: 3, refused: 0 });
    expect([...r.draft.entries.values()].map((e) => e.value)).toEqual([12000, 1234567, 2.5]);
  });

  it('a TYPED "12.000" keeps the seat’s convention — the ruling is paste-only', () => {
    const row = acceptedRow('SIM-RM-0007');
    expect([...applyEdit(EMPTY_DRAFT, row, '2026-08', '12.000', 'TYPED', 'id').entries.values()][0].value).toBe(12000);
    expect([...applyEdit(EMPTY_DRAFT, row, '2026-08', '12,000', 'TYPED', 'en').entries.values()][0].value).toBe(12000);
  });

  it('cells past the grid’s edge are counted, never silently dropped', () => {
    const row = acceptedRow('SIM-RM-0007');
    const r = applyPaste(EMPTY_DRAFT, [row], HORIZON, { row: 0, col: HORIZON.length - 1 }, '1\t2\n3', 'en');
    expect(r).toMatchObject({ planned: 1, refused: 0, outside: 2 });
  });
});

describe('the reason rule at push (A2 — owed only off the producer’s baseline)', () => {
  it('the reason rule at push: an owed, blank reason blocks THAT row before dispatch; the others go', async () => {
    const a = acceptedRow('SIM-RM-0009');
    let d = applyEdit(EMPTY_DRAFT, a, '2026-08', String(a.cells['2026-08']), 'TYPED', 'en'); // as delivered
    d = applyEdit(d, a, '2026-09', '1', 'TYPED', 'en'); // off baseline, no reason
    const [asDelivered, moved] = [...d.entries.values()];
    expect(reasonOwed(asDelivered)).toBe(false);
    expect(reasonOwed(moved)).toBe(true);
    expect(pushBlocked(moved)).toBe(true);

    const calls: string[] = [];
    const out = await pushEntries([...d.entries.values()], (v) => {
      calls.push(v.lineId);
      return commitVia(BUYER)(v);
    }, 'en');
    expect(calls).toEqual([asDelivered.seamRef]);
    expect(out.map((o) => o.kind)).toEqual(['dispatched', 'blocked']);

    // with the reason written, the same row dispatches and the reason travels
    d = setReason(d, moved.seamRef, 'Trimmed to line capacity');
    expect(pushBlocked(d.entries.get(moved.seamRef)!)).toBe(false);
    const again = await pushEntries([d.entries.get(moved.seamRef)!], commitVia(BUYER), 'en');
    expect(again[0].kind).toBe('dispatched');
    expect(intakeLineStore.get(moved.seamRef)).toMatchObject({ state: 'Committed', committedQty: 1, overrideReason: 'Trimmed to line capacity' });
  });
});

describe('push of N rows = N commits under ONE causation anchor', () => {
  it('three rows → three commits, the first mints the anchor and rows 2..3 carry it; three requisitions', async () => {
    const row = acceptedRow('SIM-RM-0011');
    let d: PlanDraft = EMPTY_DRAFT;
    for (const b of ['2026-08', '2026-09', '2026-10']) d = applyEdit(d, row, b, String(row.cells[b]), 'TYPED', 'en');
    const refs = [...d.entries.keys()];
    const out = await pushEntries([...d.entries.values()], commitVia(BUYER), 'en');
    expect(out.map((o) => o.kind)).toEqual(['dispatched', 'dispatched', 'dispatched']);

    const events = commandAuditSink
      .byEvent('t_intake_commit')
      .filter((e) => out.some((o) => o.kind === 'dispatched' && o.correlationId === e.correlationId));
    expect(events).toHaveLength(3);
    const anchor = (out[0] as { correlationId: string }).correlationId;
    const byCorr = new Map(events.map((e) => [e.correlationId, e.causationId]));
    expect(byCorr.get(anchor)).toBeUndefined();
    expect(out.slice(1).map((o) => byCorr.get((o as { correlationId: string }).correlationId))).toEqual([anchor, anchor]);
    for (const ref of refs) expect(raisedFrom(ref), ref).toHaveLength(1);
  });

  it('a second push of a committed line is refused by A2 legality and stays PLANNED with its reason', async () => {
    const row = acceptedRow('SIM-RM-0013');
    const d = applyEdit(EMPTY_DRAFT, row, '2026-08', String(row.cells['2026-08']), 'TYPED', 'en');
    const e = [...d.entries.values()][0];
    expect((await pushEntries([e], commitVia(BUYER), 'en'))[0].kind).toBe('dispatched');
    const second = await pushEntries([e], commitVia(BUYER), 'en');
    expect(second[0]).toMatchObject({ kind: 'failed' });
    expect((second[0] as { reason: string }).reason).toMatch(/ILLEGAL_TRANSITION/);
    expect(applyPushOutcomes(d, second).entries.get(e.seamRef)).toMatchObject({ planState: 'PLANNED' });
    expect(raisedFrom(e.seamRef)).toHaveLength(1);
  });
});

describe('both failure channels stay PLANNED (C6 §6 invariant 3)', () => {
  it('both channels: a THROWN SCOPE_DENIED and a RETURNED policy refusal each leave the row PLANNED with a reason', async () => {
    const row = acceptedRow('SIM-RM-0015');
    let d = applyEdit(EMPTY_DRAFT, row, '2026-08', '5', 'TYPED', 'en');
    d = setReason(d, row.seamRefs!['2026-08'], 'x');
    d = applyEdit(d, row, '2026-09', '0', 'TYPED', 'en'); // INTAKE_QTY_FLOOR refuses zero
    d = setReason(d, row.seamRefs!['2026-09'], 'y');
    const [thrownRow, returnedRow] = [...d.entries.values()];

    const thrown = await pushEntries([thrownRow], commitVia(SUPPLIER), 'en');
    expect(thrown[0]).toEqual({ seamRef: thrownRow.seamRef, kind: 'failed', reason: 'SCOPE_DENIED' });
    const returned = await pushEntries([returnedRow], commitVia(BUYER), 'en');
    expect(returned[0].kind).toBe('failed');
    expect((returned[0] as { reason: string }).reason).toMatch(/INTAKE_QTY_FLOOR/);

    const after = applyPushOutcomes(d, [...thrown, ...returned]);
    expect(after.entries.get(thrownRow.seamRef)).toMatchObject({ planState: 'PLANNED', failureReason: 'SCOPE_DENIED' });
    expect(after.entries.get(returnedRow.seamRef)).toMatchObject({ planState: 'PLANNED' });
    expect(after.entries.get(returnedRow.seamRef)!.failureReason).toMatch(/INTAKE_QTY_FLOOR/);
    expect(intakeLineStore.stateOf(thrownRow.seamRef)).toBe('Pending');
    expect(intakeLineStore.stateOf(returnedRow.seamRef)).toBe('Pending');
  });

  it('a stub that throws a DataError and one that returns failed are told apart by reason, never swallowed', async () => {
    const row = acceptedRow('SIM-RM-0015');
    const e = [...applyEdit(EMPTY_DRAFT, row, '2026-10', String(row.cells['2026-10']), 'TYPED', 'en').entries.values()][0];
    const throws = async (): Promise<CommandResult> => {
      throw new DataError('UPSTREAM', 'down');
    };
    const fails = async (): Promise<CommandResult> => ({ correlationId: 'c', transitionId: 't_intake_commit', status: 'failed', reason: 'NOPE' });
    expect(await pushEntries([e], throws, 'en')).toEqual([{ seamRef: e.seamRef, kind: 'failed', reason: 'UPSTREAM' }]);
    expect(await pushEntries([e], fails, 'en')).toEqual([{ seamRef: e.seamRef, kind: 'failed', reason: 'NOPE' }]);
  });
});

describe('the ONLY exit — the seam agrees (C6 §3)', () => {
  const seed = () => {
    const row = acceptedRow('SIM-RM-0017');
    return { row, d: applyEdit(EMPTY_DRAFT, row, '2026-08', '42', 'TYPED', 'en') };
  };

  it('a PUSHING entry clears only when the seam holds the same figure AS COMMITTED', () => {
    const { row, d } = seed();
    const ref = row.seamRefs!['2026-08'];
    const pushing = applyPushOutcomes(d, [{ seamRef: ref, kind: 'dispatched', correlationId: 'c1' }]);
    expect(reconcile(pushing, () => ({ value: 42, committed: false })).entries.has(ref)).toBe(true);
    expect(reconcile(pushing, () => ({ value: 42, committed: true })).entries.has(ref)).toBe(false);
    expect(reconcile(pushing, () => ({ value: 41, committed: true })).entries.get(ref)).toMatchObject({
      planState: 'PLANNED',
      failureReason: 'SEAM_DISAGREES',
    });
  });

  it('push-only-exit: a PLANNED entry never clears, even when the seam happens to agree', () => {
    const { row, d } = seed();
    expect(reconcile(d, () => ({ value: 42, committed: true })).entries.get(row.seamRefs!['2026-08'])?.planState).toBe('PLANNED');
  });

  it('end to end: commit, re-read the seam, and it agrees — committed, at the planned figure', async () => {
    const row = acceptedRow('SIM-RM-0021');
    // the first bucket SOMO proposed anything in — a gap bucket has no line to commit
    const b = HORIZON.find((x) => row.seamRefs?.[x])!;
    const d = applyEdit(EMPTY_DRAFT, row, b, String(row.cells[b]), 'TYPED', 'en');
    const out = await pushEntries([...d.entries.values()], commitVia(BUYER), 'en');
    expect(out[0].kind).toBe('dispatched');
    const pushing = applyPushOutcomes(d, out);
    const fresh = acceptedRow('SIM-RM-0021');
    expect(fresh.committedCells?.[b]).toBe(true);
    const cleared = reconcile(pushing, (ref) =>
      ref === fresh.seamRefs![b] ? { value: fresh.cells[b], committed: true } : undefined,
    );
    expect(cleared.entries.size).toBe(0);
  });
});

describe('INTAKE_QTY_AGREES honours the convention the surface states', () => {
  const fire = (lineId: string, payload: Record<string, unknown>) =>
    commands.dispatch(BUYER, { transitionId: 't_intake_commit', entity: 'intakeLine', entityId: lineId, payload });

  it('KNOWN-GOOD: "12.000" read under ID commits 12,000 — the grid’s ID seat', async () => {
    const id = somoIntakeLineId('SIM-RM-0023', '2026-08');
    const r = await fire(id, { acceptedQty: 12000, acceptedQtyRaw: '12.000', numberConvention: 'id', overrideReason: 'r' });
    expect(r.status).not.toBe('failed');
  });

  it('KNOWN-BAD: the same token with NO convention is still refused as ambiguous (the drawer’s path)', async () => {
    const id = somoIntakeLineId('SIM-RM-0023', '2026-09');
    const r = await fire(id, { acceptedQty: 12000, acceptedQtyRaw: '12.000', overrideReason: 'r' });
    expect(r.reason).toMatch(/INTAKE_QTY_AGREES: acceptedQtyRaw is unreadable \(AMBIGUOUS_QTY\)/);
  });

  it('KNOWN-BAD: an unrecognised convention is refused, never dropped to the hint-free parse', async () => {
    const id = somoIntakeLineId('SIM-RM-0023', '2026-10');
    const r = await fire(id, { acceptedQty: 12000, acceptedQtyRaw: '12000', numberConvention: 'de', overrideReason: 'r' });
    expect(r.reason).toMatch(/numberConvention must be 'id' or 'en'/);
  });
});

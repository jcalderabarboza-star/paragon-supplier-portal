// ────────────────────────────────────────────────────────────────────────────
// B4b-1 · allocation in the grid (Design 1 §5.3): a supplier's `allocation`
// cell edits the OPEN DRAFT through the same overlay as B3, is refused AT THE
// CELL when Σ over suppliers would pass SOMO's total, and pushes as
// `t_publication_allocate` under the push's one causation anchor. Rows are the
// real seam's rows (the real dispatcher opens the draft), so the anchors the
// grid edits are the anchors the service minted.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../../services/data/mock/stores/forecastPublicationStore';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { totalKey } from '../../services/sdc';
import type { CommandResult, QueryScope } from '../../services/data/types';
import { buildPlanBlocks, isEditableCell, type PlanRow } from './planGridModel';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyPaste,
  cellKey,
  pushEntries,
  reasonOwed,
  reconcile,
  type AllocateVars,
  type CommitVars,
  type EditContext,
  type PlanDraft,
} from './planDraft';

const commands = new MockCommandService();
const PLANNER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] };
const HORIZON = ['2026-08', '2026-09', '2026-10'];
const PV = 'PV-2026-08.2';
const B = '2026-08';

const openDraft = async (): Promise<string> => {
  const r = await commands.dispatch(PLANNER, {
    transitionId: 't_publication_open',
    entity: 'forecastPublication',
    payload: { planVersion: PV, grain: 'month', horizon: HORIZON, sourceRef: `somo-emission@${PV}` },
  });
  return r.entityId!;
};

const rowsFor = (code: string): readonly PlanRow[] => {
  const out = derivePlanningFacts({ horizon: HORIZON, measures: ['allocation'], materialCodes: [code] });
  if (!out.ok) throw new Error('refused');
  return buildPlanBlocks(out.facts, HORIZON, ['allocation']).flatMap((b) => b.rows);
};
const rowOf = (rows: readonly PlanRow[], sup: string) => rows.find((r) => r.supplierId === sup)!;
const ctxFor = (id: string, rows: readonly PlanRow[]): EditContext => ({
  rows,
  totalOf: (code, bucket) => forecastPublicationStore.get(id)!.totals[totalKey(code, bucket)],
});

const allocateVia = (calls: AllocateVars[]) => async (v: AllocateVars): Promise<CommandResult> => {
  calls.push(v);
  return commands.dispatch(
    PLANNER,
    {
      transitionId: 't_publication_allocate',
      entity: 'forecastPublication',
      entityId: v.publicationId,
      payload: {
        materialCode: v.materialCode,
        periodBucket: v.periodBucket,
        supplierId: v.supplierId,
        forecastQty: v.forecastQty,
        forecastQtyRaw: v.forecastQtyRaw,
        numberConvention: v.numberConvention,
        basis: 'planner-split',
      },
    },
    v.causationId,
  );
};
const noCommit = async (_v: CommitVars): Promise<CommandResult> => {
  throw new Error('no intake row in this push');
};

beforeEach(() => forecastPublicationStore.reset());

describe('an allocation cell is editable ONLY where the open draft anchors it', () => {
  it('CONTROL: with no draft, the supplier rows exist and are NOT editable — and an edit names why', () => {
    const rows = rowsFor('RM-EMUL-3310');
    const r = rowOf(rows, 'sup-002');
    expect(r.cells[B]).toBe(6000); // the published split, read-only
    expect(isEditableCell(r, B)).toBe(false);
    const d = applyEdit(EMPTY_DRAFT, r, B, '5000', 'TYPED', 'en');
    expect(d.refusals.get(cellKey(r.id, B))?.reason).toBe('NO_OPEN_DRAFT');
    expect(d.entries.size).toBe(0);
  });

  it('with a draft, the collaborating suppliers’ cells are editable, and an edit enters the overlay owing no reason', async () => {
    const id = await openDraft();
    const rows = rowsFor('RM-EMUL-3310');
    expect(rows.map((r) => r.supplierId)).toEqual(['sup-002', 'sup-005']);
    const r = rowOf(rows, 'sup-002');
    expect(isEditableCell(r, B)).toBe(true);
    const d = applyEdit(EMPTY_DRAFT, r, B, '5000', 'TYPED', 'en', ctxFor(id, rows));
    const e = d.entries.get(r.seamRefs![B])!;
    expect(e).toMatchObject({ supplierId: 'sup-002', value: 5000, baseline: null, measureId: 'allocation' });
    expect(reasonOwed(e)).toBe(false);
  });
});

describe('Σ over suppliers ≤ SOMO’s total is refused AT THE CELL (integrity #4)', () => {
  it('KNOWN-GOOD at the total, KNOWN-BAD one over it — with the sum and the total in the refusal', async () => {
    const id = await openDraft();
    const rows = rowsFor('RM-EMUL-3310');
    const ctx = ctxFor(id, rows);
    let d: PlanDraft = applyEdit(EMPTY_DRAFT, rowOf(rows, 'sup-002'), B, '6000', 'TYPED', 'en', ctx);
    const ok = applyEdit(d, rowOf(rows, 'sup-005'), B, '4000', 'TYPED', 'en', ctx);
    expect(ok.entries.get(rowOf(rows, 'sup-005').seamRefs![B])?.value).toBe(4000);
    const over = applyEdit(d, rowOf(rows, 'sup-005'), B, '4001', 'TYPED', 'en', ctx);
    expect(over.refusals.get(cellKey(rowOf(rows, 'sup-005').id, B))).toMatchObject({ reason: 'OVER_TOTAL', sum: 10001, total: 10000 });
    expect(over.entries.has(rowOf(rows, 'sup-005').seamRefs![B])).toBe(false);
    // a sibling's PLANNED value is what counts — lower it, and the same 4001 fits
    d = applyEdit(d, rowOf(rows, 'sup-002'), B, '5999', 'TYPED', 'en', ctx);
    expect(applyEdit(d, rowOf(rows, 'sup-005'), B, '4001', 'TYPED', 'en', ctx).entries.get(rowOf(rows, 'sup-005').seamRefs![B])?.value).toBe(4001);
  });

  it('a paste is measured the same way, cell by cell', async () => {
    const id = await openDraft();
    const rows = rowsFor('RM-EMUL-3310');
    const total = (code: string, bucket: string) => forecastPublicationStore.get(id)!.totals[totalKey(code, bucket)];
    const r = applyPaste(EMPTY_DRAFT, rows, HORIZON, { row: 0, col: 0 }, '7000\n4000', 'en', total);
    expect([r.planned, r.refused]).toEqual([1, 1]);
    expect(r.draft.refusals.get(cellKey(rowOf(rows, 'sup-005').id, B))?.reason).toBe('OVER_TOTAL');
  });
});

describe('push — t_publication_allocate per row, one anchor, lowers before raises', () => {
  it('routes to the draft named by the anchor, lands in the store, and the seam re-read clears the overlay', async () => {
    const id = await openDraft();
    let rows = rowsFor('RM-EMUL-3310');
    const ctx = ctxFor(id, rows);
    let d = applyEdit(EMPTY_DRAFT, rowOf(rows, 'sup-002'), B, '6000', 'TYPED', 'en', ctx);
    d = applyEdit(d, rowOf(rows, 'sup-005'), B, '4000', 'TYPED', 'en', ctx);
    const calls: AllocateVars[] = [];
    const out = await pushEntries([...d.entries.values()], noCommit, 'en', allocateVia(calls));
    expect(out.map((o) => o.kind)).toEqual(['dispatched', 'dispatched']);
    // both are raises from nothing: the smaller delta goes first (the lowers-first order)
    expect(calls.map((c) => [c.publicationId, c.supplierId, c.materialCode, c.periodBucket, c.forecastQty])).toEqual([
      [id, 'sup-005', 'RM-EMUL-3310', B, 4000],
      [id, 'sup-002', 'RM-EMUL-3310', B, 6000],
    ]);
    // ONE anchor: the first row mints it, the second passes it
    expect(calls[0].causationId).toBeUndefined();
    expect(calls[1].causationId).toBe((out[0] as { correlationId: string }).correlationId);
    expect(forecastPublicationStore.get(id)!.lines.map((l) => [l.supplierId, l.forecastQty])).toEqual([
      ['sup-005', 4000],
      ['sup-002', 6000],
    ]);
    // C6 §3 — the seam now agrees, so the entries clear (the draft is the seam)
    rows = rowsFor('RM-EMUL-3310');
    const seam = new Map(
      rows.flatMap((r) => (r.seamRefs?.[B] ? [[r.seamRefs[B], { value: r.cells[B] ?? 0, committed: true }] as const] : [])),
    );
    const pushed = { entries: new Map([...d.entries].map(([k, e]) => [k, { ...e, planState: 'PUSHING' as const }])), refusals: d.refusals };
    expect(reconcile(pushed, (ref) => seam.get(ref)).entries.size).toBe(0);
  });

  it('a move from one supplier to another pushes the LOWER first, so the raise is not refused against the old split', async () => {
    const id = await openDraft();
    const rows0 = rowsFor('RM-EMUL-3310');
    await pushEntries(
      [...applyEdit(EMPTY_DRAFT, rowOf(rows0, 'sup-002'), B, '6000', 'TYPED', 'en', ctxFor(id, rows0)).entries.values(),
       ...applyEdit(EMPTY_DRAFT, rowOf(rows0, 'sup-005'), B, '4000', 'TYPED', 'en', ctxFor(id, rows0)).entries.values()],
      noCommit,
      'en',
      allocateVia([]),
    );
    const rows = rowsFor('RM-EMUL-3310');
    const ctx = ctxFor(id, rows);
    // raise sup-002 first in the overlay, then lower sup-005 — the order a planner might type
    let d = applyEdit(EMPTY_DRAFT, rowOf(rows, 'sup-005'), B, '1000', 'TYPED', 'en', ctx);
    d = applyEdit(d, rowOf(rows, 'sup-002'), B, '9000', 'TYPED', 'en', ctx);
    const raiseFirst = [d.entries.get(rowOf(rows, 'sup-002').seamRefs![B])!, d.entries.get(rowOf(rows, 'sup-005').seamRefs![B])!];
    const calls: AllocateVars[] = [];
    const out = await pushEntries(raiseFirst, noCommit, 'en', allocateVia(calls));
    expect(calls.map((c) => c.supplierId)).toEqual(['sup-005', 'sup-002']);
    expect(out.every((o) => o.kind === 'dispatched')).toBe(true);
    expect(forecastPublicationStore.get(id)!.lines.map((l) => [l.supplierId, l.forecastQty]).sort()).toEqual([
      ['sup-002', 9000],
      ['sup-005', 1000],
    ]);
  });

  it('a refusal at dispatch keeps the row PLANNED with its reason (the hook still decides)', async () => {
    const id = await openDraft();
    const rows = rowsFor('RM-EMUL-3310');
    // no context → the cell cannot measure Σ; the hook refuses at dispatch instead
    const d = applyEdit(EMPTY_DRAFT, rowOf(rows, 'sup-002'), B, '10001', 'TYPED', 'en');
    const out = await pushEntries([...d.entries.values()], noCommit, 'en', allocateVia([]));
    expect(out[0]).toMatchObject({ kind: 'failed' });
    expect((out[0] as { reason: string }).reason).toMatch(/PUB_ALLOC_WITHIN_TOTAL/);
    expect(forecastPublicationStore.get(id)!.lines).toEqual([]);
  });

  it('an allocation entry with no allocate dispatcher is NOT_ROUTABLE, never sent down the intake path', async () => {
    const id = await openDraft();
    const rows = rowsFor('RM-EMUL-3310');
    const d = applyEdit(EMPTY_DRAFT, rowOf(rows, 'sup-002'), B, '100', 'TYPED', 'en', ctxFor(id, rows));
    const out = await pushEntries([...d.entries.values()], noCommit, 'en');
    expect(out).toEqual([{ seamRef: rowOf(rows, 'sup-002').seamRefs![B], kind: 'failed', reason: 'NOT_ROUTABLE' }]);
  });
});

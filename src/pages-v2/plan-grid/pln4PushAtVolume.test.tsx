// ────────────────────────────────────────────────────────────────────────────
// PLN-4 · PUSH AT VOLUME (R-PLN P1; ruling R3).
//
// Measured on built main before this batch: a push of 50 planned rows took
// 9.5 s, and the page painted nothing for 9.4 s of it — every row re-derived
// the whole planning read and every procurement list, and nothing let the
// browser in between rows. The panel listing those 50 rows stood 2,743 px tall
// ABOVE the grid. A reason had to be typed 50 times.
//
// And R3: the requisitions list could not tell an intake-committed requisition
// from a hand-raised one, offered no bulk act, and left blank (or said "None")
// for every field no producer here supplies.
//
// Each spec below fails on the tree before PLN-4.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, BUYER as BUYER_IDENTITY } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import i18n from '../../lib/i18n';
import TimePhasedGrid from './TimePhasedGrid';
import BuyerRequisitions from '../BuyerRequisitions';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import { buildPlanBlocks, type PlanRow } from './planGridModel';
import { visibleMeasures } from './visibleMeasures';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyReasonToRows,
  pushEntries,
  summarizePush,
  type PlanDraftEntry,
  type PushProgress,
} from './planDraft';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import { somoIntakeLineId } from '../../services/planning/somoIntake';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS } from '../../services/planning/views';
import { planningMaster } from '../../services/planning/somoFixture';
import { SYSTEM_ROLES, rolesHolding } from '../../services/transitions/businessRoles';
import { intakeCategory } from '../requisitions/prCreatePayload';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import type { CommandResult, QueryScope } from '../../services/data/types';

// Seats — the person from the roster, never a spelled id (C10 §6.3).
const PLANNING_1_ID = SAMPLE_PEOPLE.find((p) => p.role === 'planning' && p.ordinal === 1)!.personId;
const PLANNING_1: CurrentIdentity = {
  ...BUYER_IDENTITY,
  businessRoles: ['planning'],
  actor: { kind: 'RESOLVED', person: { personId: PLANNING_1_ID } },
};
const REQUISITIONER: CurrentIdentity = { ...BUYER_IDENTITY, businessRoles: ['requisitioner'] };
const PROCUREMENT: CurrentIdentity = { ...BUYER_IDENTITY, businessRoles: ['procurement'] };
// E2E-1 — approving or rejecting a requisition needs a named person (PR_DECIDER_UNATTRIBUTED).
const PROCUREMENT_NAMED: CurrentIdentity = {
  ...PROCUREMENT,
  actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'procurement' && p.ordinal === 1)!.personId } },
};
const scopeOf = (roles: readonly string[], personId?: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(personId ? { actor: { kind: 'RESOLVED', person: { personId } } } : {}),
});

const PM = VIEWS.find((v) => v.viewId === 'pm-plan')!;
const HORIZON = somoHorizon('week').slice(0, PM.horizonLength);
const MEASURES = visibleMeasures(PM.measuresShown);

/** Each material's accepted-quantity row in the weekly plan, from the seam. */
const acceptedRows = (codes: readonly string[]): PlanRow[] => {
  const out = derivePlanningFacts({ horizon: HORIZON, measures: MEASURES, materialCodes: [...codes] });
  if (!out.ok) throw new Error('refused');
  return buildPlanBlocks(out.facts, HORIZON, MEASURES)
    .flatMap((b) => b.rows)
    .filter((r) => r.measureId === 'acceptedQty');
};

/**
 * Up to 50 editable cells over these packaging materials, each 10% over SOMO
 * (so each owes a reason).
 *
 * ⚠️ EACH PAGE SPEC TAKES ITS OWN MATERIALS. The cascade's replay key is the
 * line id and outlives a store reset, so a line committed by one spec is a
 * replay — and raises no requisition — in the next (the PLN-3 W47 lesson).
 */
const cellsOf = (codes: readonly string[]) => {
  const cells: { row: PlanRow; bucket: string; raw: string }[] = [];
  for (const row of acceptedRows(codes)) {
    for (const bucket of HORIZON) {
      const base = row.cells[bucket];
      if (cells.length < 50 && row.seamRefs?.[bucket] && typeof base === 'number' && base > 0) {
        cells.push({ row, bucket, raw: String(Math.round(base * 1.1)) });
      }
    }
  }
  return cells;
};
const FIFTY = cellsOf(['SIM-PM-0004', 'SIM-PM-0008', 'SIM-PM-0012', 'SIM-PM-0014']);
const FIFTY_B = cellsOf(['SIM-PM-0016', 'SIM-PM-0022', 'SIM-PM-0026', 'SIM-PM-0030', 'SIM-PM-0034', 'SIM-PM-0038']);
const FEW_C = cellsOf(['SIM-PM-0042']).slice(0, 4);
const FEW_D = cellsOf(['SIM-PM-0046']).slice(0, 4);

/** Makes the edits a cell would make, through the provider's own `edit`. */
const Seed: React.FC<{ cells: typeof FIFTY }> = ({ cells }) => {
  const api = usePlanDraft()!;
  return (
    <button type="button" onClick={() => cells.forEach((c) => api.edit(c.row, c.bucket, c.raw, 'PASTE'))}>
      seed
    </button>
  );
};

const mountGrid = (cells: typeof FIFTY, queryClient?: QueryClient) => {
  renderWithProviders(
    <PlanDraftProvider>
      <Seed cells={cells} />
      <TimePhasedGrid viewId="pm-plan" />
    </PlanDraftProvider>,
    { route: '/buyer/plan-grid', identity: PLANNING_1, ...(queryClient ? { queryClient } : {}) },
  );
  fireEvent.click(screen.getByText('seed'));
};

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─── 1 · the push itself ────────────────────────────────────────────────────

describe('PLN-4 · a push of 50 rows — one anchor, one refresh, a page that keeps painting', () => {
  it('the population this file rests on: 50 cells, each owing a reason, none held for magnitude', () => {
    expect(FIFTY).toHaveLength(50);
    let d = EMPTY_DRAFT;
    for (const c of FIFTY) d = applyEdit(d, c.row, c.bucket, c.raw, 'PASTE', 'en');
    expect(d.entries.size).toBe(50);
    expect([...d.entries.values()].every((e) => e.value !== e.baseline)).toBe(true);
  });

  it('reports progress after every row and hands the browser a pause BETWEEN rows — one anchor throughout', async () => {
    let d = EMPTY_DRAFT;
    for (const c of FIFTY.slice(0, 5)) d = applyEdit(d, c.row, c.bucket, c.raw, 'PASTE', 'en');
    const rows = [...d.entries.values()].map((e) => ({ ...e, reason: 'Q4 launch buffer' }));
    const seen: PushProgress[] = [];
    const pauses = vi.fn(async () => {});
    const anchors: (string | undefined)[] = [];
    const commit = async (v: { causationId?: string }): Promise<CommandResult> => {
      anchors.push(v.causationId);
      const r: CommandResult = { correlationId: `c-${anchors.length}`, transitionId: 't_intake_commit', status: 'done' };
      return r;
    };
    const out = await pushEntries(rows, commit, 'en', undefined, { onProgress: (p) => seen.push(p), yieldBetween: pauses });
    expect(out.every((o) => o.kind === 'dispatched')).toBe(true);
    expect(pauses).toHaveBeenCalledTimes(4); // between rows — never before the first
    expect(seen.map((p) => p.done)).toEqual([1, 2, 3, 4, 5]);
    expect(seen.every((p) => p.total === 5)).toBe(true);
    // ONE anchor: the first row mints it, rows 2..n pass it.
    expect(anchors).toEqual([undefined, 'c-1', 'c-1', 'c-1', 'c-1']);
  });

  it('the summary counts what went in and what did not, with each reason and how many it held', () => {
    const s = summarizePush([
      { seamRef: 'a', kind: 'dispatched', correlationId: 'x' },
      { seamRef: 'b', kind: 'blocked', reason: 'REASON_REQUIRED' },
      { seamRef: 'c', kind: 'failed', reason: 'ILLEGAL_TRANSITION:Committed->Committed' },
      { seamRef: 'd', kind: 'blocked', reason: 'REASON_REQUIRED' },
      { seamRef: 'e', kind: 'dispatched', correlationId: 'x' },
    ]);
    expect(s).toEqual({
      total: 5,
      committed: 2,
      refused: 3,
      reasons: [
        ['REASON_REQUIRED', 2],
        ['ILLEGAL_TRANSITION:Committed->Committed', 1],
      ],
    });
  });

  it('on the page: Push all commits 50 lines and refreshes the planning read ONCE — not once per row', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    mountGrid(FIFTY, qc);
    fireEvent.click(screen.getByTestId('plan-select-owed'));
    fireEvent.change(screen.getByTestId('plan-bulk-reason'), { target: { value: 'Q4 launch buffer' } });
    fireEvent.click(screen.getByTestId('plan-bulk-apply'));
    invalidate.mockClear();

    fireEvent.click(screen.getByTestId('plan-push-all'));
    // The progress is SAID while it runs, counted from one.
    expect(await screen.findByTestId('plan-push-progress')).toHaveTextContent(/^Pushing \d+ of 50…$/);
    await waitFor(() => expect(screen.getByTestId('plan-push-result')).toHaveTextContent('Last push: 50 committed · 0 refused, of 50'), {
      timeout: 20000,
    });
    expect(screen.queryByTestId('plan-push-progress')).toBeNull();
    expect(intakeLineStore.all().filter((r) => r.state === 'Committed')).toHaveLength(50);
    expect(purchaseRequisitionStore.all().filter((r) => r.intakeLineId)).toHaveLength(50);
    const planningRefreshes = invalidate.mock.calls.filter(([f]) => JSON.stringify(f?.queryKey) === '["planning"]');
    expect(planningRefreshes).toHaveLength(1);
  }, 30000);

  it('a push with refusals in it says how many went, how many did not, and why — EN and ID', async () => {
    for (const lang of ['en', 'id'] as const) {
      intakeLineStore.reset();
      purchaseRequisitionStore.reset();
      await i18n.changeLanguage(lang);
      const cells = lang === 'en' ? FEW_C : FEW_D;
      const { unmount } = renderWithProviders(
        <PlanDraftProvider>
          <Seed cells={cells} />
          <TimePhasedGrid viewId="pm-plan" />
        </PlanDraftProvider>,
        { route: '/buyer/plan-grid', identity: PLANNING_1 },
      );
      fireEvent.click(screen.getByText('seed'));
      // Two of the four get a reason; the other two are held before dispatch.
      const refs = cells.map((c) => c.row.seamRefs![c.bucket]);
      fireEvent.click(screen.getByTestId(`plan-select-${refs[0]}`));
      fireEvent.click(screen.getByTestId(`plan-select-${refs[1]}`));
      fireEvent.change(screen.getByTestId('plan-bulk-reason'), { target: { value: 'Q4' } });
      fireEvent.click(screen.getByTestId('plan-bulk-apply'));
      fireEvent.click(screen.getByTestId('plan-push-all'));
      const result = await screen.findByTestId('plan-push-result', {}, { timeout: 10000 });
      expect(result).toHaveTextContent(
        lang === 'en' ? 'Last push: 2 committed · 2 refused, of 4' : 'Kiriman terakhir: 2 dikomit · 2 ditolak, dari 4',
      );
      expect(within(result).getByTestId('plan-push-result-reasons')).toHaveTextContent(
        lang === 'en' ? /^2 × Not pushed — a reason is required/ : /^2 × Tidak dikirim — alasan wajib/,
      );
      unmount();
    }
  }, 30000);
});

// ─── 2 · the bulk reason ────────────────────────────────────────────────────

describe('PLN-4 · "apply this reason to selected" — one reason per committed row in the record', () => {
  it('writes the reason onto each selected row that owes one, and onto nothing else', () => {
    let d = EMPTY_DRAFT;
    for (const c of FIFTY.slice(0, 3)) d = applyEdit(d, c.row, c.bucket, c.raw, 'PASTE', 'en');
    // A fourth row at SOMO's own figure owes no reason.
    const asDelivered = FIFTY[3];
    d = applyEdit(d, asDelivered.row, asDelivered.bucket, String(asDelivered.row.cells[asDelivered.bucket]), 'TYPED', 'en');
    const refs = [...d.entries.keys()];
    const pushing: PlanDraftEntry = { ...d.entries.get(refs[2])!, planState: 'PUSHING' };
    d = { entries: new Map(d.entries).set(refs[2], pushing), refusals: d.refusals };

    const r = applyReasonToRows(d, refs, '  Q4 launch buffer ');
    expect(r.applied).toBe(2);
    expect(r.draft.entries.get(refs[0])!.reason).toBe('Q4 launch buffer');
    expect(r.draft.entries.get(refs[1])!.reason).toBe('Q4 launch buffer');
    expect(r.draft.entries.get(refs[2])!.reason).toBe(''); // PUSHING — not rewritten under its own dispatch
    expect(r.draft.entries.get(refs[3])!.reason).toBe(''); // owes none
    // A blank reason applies to nothing.
    expect(applyReasonToRows(d, refs, '   ').applied).toBe(0);
  });

  it('on the page: one reason for 50 rows — and EACH requisition records it as its own decision', async () => {
    expect(FIFTY_B).toHaveLength(50);
    mountGrid(FIFTY_B);
    expect(screen.getByTestId('plan-draft-owed')).toHaveTextContent('50 still need a reason');
    fireEvent.click(screen.getByTestId('plan-select-owed'));
    expect(screen.getByTestId('plan-bulk-apply')).toHaveTextContent('Apply to selected (50)');
    fireEvent.change(screen.getByTestId('plan-bulk-reason'), { target: { value: 'Q4 launch buffer' } });
    fireEvent.click(screen.getByTestId('plan-bulk-apply'));
    expect(screen.getByTestId('plan-bulk-note')).toHaveTextContent('Reason applied to 50 changes');
    expect(screen.queryByTestId('plan-draft-owed')).toBeNull();

    fireEvent.click(screen.getByTestId('plan-push-all'));
    await waitFor(() => expect(purchaseRequisitionStore.all().filter((r) => r.intakeLineId)).toHaveLength(50), { timeout: 20000 });
    const prs = purchaseRequisitionStore.all().filter((r) => r.intakeLineId);
    // One decision per requisition, each carrying the reason, each about ITS line.
    expect(prs.every((p) => p.decision?.reason === 'Q4 launch buffer')).toBe(true);
    expect(new Set(prs.map((p) => p.intakeLineId)).size).toBe(50);
    expect(intakeLineStore.all().every((r) => r.state !== 'Committed' || r.overrideReason === 'Q4 launch buffer')).toBe(true);
  }, 30000);

  it('ID — the bulk reason is Indonesian', async () => {
    await i18n.changeLanguage('id');
    mountGrid(FIFTY.slice(0, 3));
    expect(screen.getByText('Pilih setiap perubahan yang perlu alasan (3)')).toBeInTheDocument();
    expect(screen.getByTestId('plan-draft-owed')).toHaveTextContent('3 masih perlu alasan');
  });
});

// ─── 3 · the panel stops burying the grid ───────────────────────────────────

describe('PLN-4 · the planned changes sit below the grid and in a sticky bar, never above it', () => {
  it('the list follows the grid in the page and the bar comes last, stuck to the foot of the view', async () => {
    mountGrid(FIFTY.slice(0, 6));
    const grid = await screen.findByTestId('tp-grid');
    const details = screen.getByTestId('plan-draft-details');
    const bar = screen.getByTestId('plan-draft-bar');
    expect(grid.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(grid.compareDocumentPosition(screen.getByTestId('plan-draft-panel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.className).toMatch(/\bsticky\b/);
    expect(bar.className).toMatch(/\bbottom-0\b/);
  });

  it('collapses to the one-line bar and opens again, keeping every change', async () => {
    mountGrid(FIFTY.slice(0, 6));
    fireEvent.click(screen.getByTestId('plan-changes-toggle'));
    expect(screen.queryByTestId('plan-draft-details')).toBeNull();
    expect(screen.getByTestId('plan-draft-banner')).toHaveTextContent('6 planned changes — not committed until pushed');
    expect(screen.getByTestId('plan-changes-toggle')).toHaveTextContent('Show changes (6)');
    expect(screen.getByTestId('plan-changes-toggle')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByTestId('plan-changes-toggle'));
    expect(screen.getByTestId('plan-draft-rows').querySelectorAll('tbody tr')).toHaveLength(6);
  });
});

// ─── 4 · R3 — the requisitions list ─────────────────────────────────────────

const commitAs = (scope: QueryScope, lineId: string, qty: number) =>
  new MockCommandService().dispatch(scope, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: lineId,
    payload: { acceptedQty: qty, acceptedQtyRaw: String(qty) },
  });
/** A line no other spec commits — the replay key outlives a reset (see `cellsOf`). */
const R3_POOL = cellsOf(['SIM-PM-0068', 'SIM-PM-0070']).map((c) => ({
  id: c.row.seamRefs![c.bucket],
  bucket: c.bucket,
  qty: c.row.cells[c.bucket] as number,
}));
let r3Cursor = 0;
const nextLine = () => R3_POOL[r3Cursor++];
const prFor = (lineId: string) => purchaseRequisitionStore.all().find((r) => r.intakeLineId === lineId)!;

describe('PLN-4 · R3 — what a requisition raised from an intake line carries', () => {
  it('the cascade fills the derivable fields: category from the master, the raising lane, the bucket', async () => {
    const line = nextLine();
    const r = await commitAs(scopeOf(['planning'], PLANNING_1_ID), line.id, line.qty);
    expect(r.status).not.toBe('failed');
    const pr = prFor(line.id);
    const entry = planningMaster()['SIM-PM-0068'];
    expect(entry.materialType).toBe('VERP');
    expect(pr.category).toBe(`Packaging · ${entry.materialGroup}`);
    expect(pr.requestorRole).toBe('planning');
    expect(pr.periodBucket).toBe(line.bucket);
    // …and NOTHING is invented for what nobody supplies.
    expect(pr.requiredDate).toBe('');
    expect(pr.costCenter).toBe('');
    expect(pr.requestor).toBe('');
  });

  it('the raising lane is READ OFF THE ACT — the seat lane that holds the commit atom', async () => {
    expect(rolesHolding('intake:triage')).toEqual(['planning']);
    // A wide seat holding every lane still names the ONE lane that commits.
    const line = nextLine();
    await commitAs(scopeOf(Object.keys(SYSTEM_ROLES).filter((r) => r !== 'admin' && r !== 'buyer_all')), line.id, line.qty);
    expect(prFor(line.id).requestorRole).toBe('planning');
  });

  it('an authored line names no material code, so it gets NO category — never a guessed one', () => {
    const authored = PR_INTAKE_LINES.find((l) => l.id === 'pil-grid-001')!;
    expect(intakeCategory(authored)).toBeUndefined();
    expect(intakeCategory({ id: somoIntakeLineId('SIM-PM-0068', '2026-W45') })).toMatch(/^Packaging · /);
    expect(intakeCategory({ id: somoIntakeLineId('SIM-RM-0031', '2026-09') })).toMatch(/^Raw material · /);
  });
});

describe('PLN-4 · R3 — the list shows bucket and origin, and says where an unsupplied field is set', () => {
  it('EN: an intake row reads its bucket, "Intake line", the Planning lane and "Set in SAP"; a form row reads "Manual"', async () => {
    const line = nextLine();
    await commitAs(scopeOf(['planning'], PLANNING_1_ID), line.id, line.qty);
    const pr = prFor(line.id);
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText(pr.prNumber);
    expect(screen.getByText('Bucket')).toBeInTheDocument();
    expect(screen.getByText('Origin')).toBeInTheDocument();
    expect(screen.getByTestId(`pr-bucket-${pr.id}`)).toHaveTextContent(line.bucket);
    expect(screen.getByTestId(`pr-origin-${pr.id}`)).toHaveTextContent('Intake line');
    const row = screen.getByTestId(`pr-origin-${pr.id}`).closest('tr')!;
    expect(within(row).getByText('Planning lane')).toBeInTheDocument();
    expect(within(row).getAllByText('Set in SAP').length).toBe(2); // required day · source of supply
    expect(within(row).queryByText('None')).toBeNull();
    // KNOWN-GOOD: a hand-raised fixture row keeps its own values.
    expect(screen.getByTestId('pr-origin-pr-004')).toHaveTextContent('Manual');
    expect(screen.getByTestId('pr-bucket-pr-004')).toHaveTextContent('—');
    expect(within(screen.getByTestId('pr-origin-pr-004').closest('tr')!).queryByText('Set in SAP')).toBeNull();
  });

  // ⚠️ PLN-5 · RE-PINNED BY RULING: "asupan" (intake) became the planner's term
  // "usulan" across the ID copy, so the origin reads "Baris usulan" — and the old
  // word is asserted GONE from the row, not merely not looked for.
  it('ID: Periode · Asal · Baris usulan · Jalur Perencanaan · Diisi di SAP', async () => {
    await i18n.changeLanguage('id');
    const line = nextLine();
    await commitAs(scopeOf(['planning'], PLANNING_1_ID), line.id, line.qty);
    const pr = prFor(line.id);
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText(pr.prNumber);
    expect(screen.getByText('Periode')).toBeInTheDocument();
    expect(screen.getByText('Asal')).toBeInTheDocument();
    const row = screen.getByTestId(`pr-origin-${pr.id}`).closest('tr')!;
    expect(within(row).getByText('Baris usulan')).toBeInTheDocument();
    expect(row.textContent).not.toMatch(/asupan/i);
    expect(within(row).getByText('Jalur Perencanaan')).toBeInTheDocument();
    expect(within(row).getAllByText('Diisi di SAP').length).toBe(2);
  });

  it('the drawer: category and requestor derived; required day, cost centre, source and text "Set in SAP"', async () => {
    const line = nextLine();
    await commitAs(scopeOf(['planning'], PLANNING_1_ID), line.id, line.qty);
    const pr = prFor(line.id);
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText(pr.prNumber));
    await screen.findByText(`PR ${pr.prNumber}`);
    expect(screen.getAllByText(pr.category).length).toBeGreaterThan(0);
    expect(screen.getByTestId('pr-source-set-in-sap')).toBeInTheDocument();
    for (const f of ['requiredDate', 'costCenter', 'justification']) {
      expect(screen.getAllByTestId(`pr-set-in-sap-${f}`).length, f).toBeGreaterThan(0);
    }
  });
});

describe('PLN-4 · R3 — bulk submit and bulk approve, each act gated on its own lane', () => {
  const twoDrafts = async () => {
    const [x, y] = [nextLine(), nextLine()];
    await commitAs(scopeOf(['planning'], PLANNING_1_ID), x.id, x.qty);
    await commitAs(scopeOf(['planning'], PLANNING_1_ID), y.id, y.qty);
    return [prFor(x.id), prFor(y.id)];
  };

  it('a requisitioner submits two drafts at once; the store moves and the summary says so', async () => {
    const [a, b] = await twoDrafts();
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await screen.findByText(a.prNumber);
    fireEvent.click(screen.getByTestId(`pr-select-${a.id}`));
    fireEvent.click(screen.getByTestId(`pr-select-${b.id}`));
    expect(screen.getByTestId('pr-bulk-count')).toHaveTextContent('2 requisitions selected');
    fireEvent.click(screen.getByTestId('pr-bulk-submit'));
    await waitFor(() => expect(screen.getByTestId('pr-bulk-result')).toHaveTextContent('Submitted 2 of 2 · 0 refused'));
    expect(purchaseRequisitionStore.get(a.id)!.status).toBe('Pending Approval');
    expect(purchaseRequisitionStore.get(b.id)!.status).toBe('Pending Approval');
  });

  it('procurement approves every pending one at once — each by its own act', async () => {
    const [a, b] = await twoDrafts();
    const svc = new MockCommandService();
    for (const p of [a, b]) await svc.dispatch(scopeOf(['requisitioner']), { transitionId: 't_pr_submit', entity: 'purchaseRequisition', entityId: p.id });
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT_NAMED });
    await screen.findByText(a.prNumber);
    fireEvent.click(screen.getByTestId('pr-select-all'));
    const pending = purchaseRequisitionStore.all().filter((r) => r.status === 'Pending Approval').length;
    expect(screen.getByTestId('pr-bulk-approve')).toHaveTextContent(`Approve selected (${pending})`);
    fireEvent.click(screen.getByTestId('pr-bulk-approve'));
    await waitFor(() => expect(screen.getByTestId('pr-bulk-result')).toHaveTextContent(`Approved ${pending} of ${pending} · 0 refused`));
    for (const p of [a, b]) {
      expect(purchaseRequisitionStore.get(p.id)!.status).toBe('Approved');
      expect(purchaseRequisitionStore.get(p.id)!.approvedBy).toBeDefined();
    }
  });

  it('⚠️ SEGREGATION, PINNED: planning and the requisitioner get no bulk approve — they read who approves', async () => {
    const [draft] = await twoDrafts();
    for (const identity of [PLANNING_1, REQUISITIONER]) {
      const { unmount } = renderWithProviders(<BuyerRequisitions />, { identity });
      await screen.findByText('PR-2026-00344');
      fireEvent.click(screen.getByTestId('pr-select-pr-004'));
      expect(screen.queryByTestId('pr-bulk-approve')).toBeNull();
      expect(screen.getByTestId('handoff-pr-bulk-approve').textContent).toMatch(/Procurement/);
      unmount();
    }
    // …and the mirror: procurement holds no `pr:submit`, so it reads who submits.
    const { unmount } = renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText(draft.prNumber);
    fireEvent.click(screen.getByTestId(`pr-select-${draft.id}`));
    expect(screen.queryByTestId('pr-bulk-submit')).toBeNull();
    expect(screen.getByTestId('handoff-pr-bulk-submit').textContent).toMatch(/Requisitioner/);
    unmount();
  });

  it('⚠️ AND AT THE DISPATCHER: a bulk approve under a planning seat is refused document by document', async () => {
    const pending = purchaseRequisitionStore.all().filter((r) => r.status === 'Pending Approval');
    expect(pending.length).toBeGreaterThan(0);
    const svc = new MockCommandService();
    for (const p of pending) {
      const r = await svc.dispatch(scopeOf(['planning'], PLANNING_1_ID), { transitionId: 't_pr_approve', entity: 'purchaseRequisition', entityId: p.id });
      expect(r.reason).toBe('ROLE_NOT_PERMITTED:pr:approve');
      expect(purchaseRequisitionStore.get(p.id)!.status).toBe('Pending Approval');
    }
  });

  it('a refused document stops nothing: the summary counts it and says why', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText('PR-2026-00344');
    fireEvent.click(screen.getByTestId('pr-select-pr-004'));
    // Approved behind the page's back — the list still shows it pending.
    purchaseRequisitionStore.update('pr-004', (r) => ({ ...r, status: 'Approved' }));
    fireEvent.click(screen.getByTestId('pr-bulk-approve'));
    const result = await screen.findByTestId('pr-bulk-result');
    expect(result).toHaveTextContent('Approved 0 of 1 · 1 refused');
    expect(within(result).getByTestId('pr-bulk-refusals').textContent).toMatch(/^1 × /);
  });
});

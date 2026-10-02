// ────────────────────────────────────────────────────────────────────────────
// PLN-3 · WHO PUSHES, AND ONE INTAKE POPULATION (R-PLN P0 #5, #6; ruling R1).
//
// P0 #5 — the planner could plan and not push. The three intake verbs required
//   `pr:create`, the REQUISITIONER's atom, so a seat holding only the planning
//   lane edited a cell and read "Awaiting Requisitioner" under its own change.
//   R1: the planning lane holds the intake commit; its cascade creates the PR;
//   approving that PR stays procurement's.
//
// P0 #6 — two intake populations. Intake Review listed four authored lines; the
//   grid committed generated SOMO lines it never listed. A generated line could
//   not be dismissed anywhere, and a line dismissed in the queue still read
//   PLANNED — and editable — in its plan-tab cell. The page is retired into the
//   grid's intake-review view (Design 1 D8), over ONE population.
//
// Each spec below fails on the tree before PLN-3.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useTranslation } from 'react-i18next';
import type { CellProps } from 'react-datasheet-grid';
import { renderWithProviders, BUYER as BUYER_IDENTITY } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import i18n from '../../lib/i18n';
import { formatNumber } from '../../lib/format';
import PlanGrid from '../PlanGrid';
import TimePhasedGrid, { PlanBucketCell } from './TimePhasedGrid';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import { IntakeTriageProvider, intakeReviewColumns } from './IntakeReviewView';
import { buildPlanBlocks, isDismissedCell, isEditableCell, type PlanRow } from './planGridModel';
import { visibleMeasures } from './visibleMeasures';
import { filterIntakeLines } from '../intake-review/intakeReviewModel';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { MockProcurementService } from '../../services/data/mock/MockProcurementService';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import { generatedIntakeLines, somoIntakeLineId } from '../../services/planning/somoIntake';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS } from '../../services/planning/views';
import { usePlanningFacts } from '../../services/query/planningHooks';
import { useIntakeReview } from '../../services/query/hooks';
import { getTransition } from '../../services/transitions';
import { SYSTEM_ROLES, rolesHolding } from '../../services/transitions/businessRoles';
import { INTAKE_TRIAGE_ATOM } from '../../services/transitions/flows/intakeLine.flow';
import { BUYER_NAV } from '../../components/layout-v2/navModel';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import type { IntakeLine, QueryScope } from '../../services/data/types';

// Planning 1, from the roster — never a spelled id (C10 §6.3, `simUsrNamespace.test.ts`).
const PLANNING_1_ID = SAMPLE_PEOPLE.find((p) => p.role === 'planning' && p.ordinal === 1)!.personId;
const PLANNING_1: CurrentIdentity = {
  ...BUYER_IDENTITY,
  businessRoles: ['planning'],
  actor: { kind: 'RESOLVED', person: { personId: PLANNING_1_ID } },
};
const REQUISITIONER: CurrentIdentity = { ...BUYER_IDENTITY, businessRoles: ['requisitioner'] };
const seat = (roles: readonly string[], personId?: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(personId ? { actor: { kind: 'RESOLVED', person: { personId } } } : {}),
});

/** SIM-PM-0068 is packaging, planned weekly; W45 is a week SOMO proposed for. */
const LINE = somoIntakeLineId('SIM-PM-0068', '2026-W45');
const NEIGHBOUR = somoIntakeLineId('SIM-PM-0068', '2026-W46');
const prsFor = (lineId: string) => purchaseRequisitionStore.all().filter((r) => r.intakeLineId === lineId);
const commit = (scope: QueryScope, lineId: string, qty: number) =>
  new MockCommandService().dispatch(scope, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: lineId,
    payload: { acceptedQty: qty, acceptedQtyRaw: String(qty) },
  });
const qtyOf = (lineId: string) => generatedIntakeLines().find((l) => l.id === lineId)!.acceptedQty;

/** SIM-PM-0068's accepted-quantity row in the weekly plan, from the seam. */
const acceptedRow = (): { row: PlanRow; horizon: readonly string[] } => {
  const pm = VIEWS.find((v) => v.viewId === 'pm-plan')!;
  const horizon = somoHorizon('week').slice(0, pm.horizonLength);
  const measures = visibleMeasures(pm.measuresShown);
  const out = derivePlanningFacts({ horizon, measures, materialCodes: ['SIM-PM-0068'] });
  if (!out.ok) throw new Error('refused');
  const row = buildPlanBlocks(out.facts, horizon, measures)
    .flatMap((b) => b.rows)
    .find((r) => r.measureId === 'acceptedQty')!;
  return { row, horizon };
};

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

// ─── 1 · R1 — the planning lane holds the intake commit ─────────────────────

describe('PLN-3 · R1 — the planning lane holds the intake commit (P0 #5)', () => {
  it('all three intake verbs require the ONE atom, and planning is the one lane holding it', () => {
    expect(INTAKE_TRIAGE_ATOM).toBe('intake:triage');
    for (const id of ['t_intake_dismiss', 't_intake_restore', 't_intake_commit']) {
      expect(getTransition(id)!.requiredRole, id).toBe(INTAKE_TRIAGE_ATOM);
    }
    expect(rolesHolding(INTAKE_TRIAGE_ATOM)).toEqual(['planning']);
    // The requisitioner keeps the manual requisition and no longer triages.
    expect(SYSTEM_ROLES.requisitioner).toContain('pr:create');
    expect(SYSTEM_ROLES.requisitioner).not.toContain(INTAKE_TRIAGE_ATOM);
  });

  it('⚠️ PINNED: planning cannot approve or reject a requisition — procurement holds both', () => {
    for (const atom of ['pr:approve', 'pr:reject']) {
      expect(SYSTEM_ROLES.planning, atom).not.toContain(atom);
      expect(rolesHolding(atom), atom).toEqual(['procurement']);
    }
  });

  it('⚠️ PINNED at the dispatcher, both ways: a planning seat approving is refused by ROLE; procurement is not', async () => {
    const pending = purchaseRequisitionStore.all().find((r) => r.status === 'Pending Approval')!;
    expect(pending).toBeDefined();
    const svc = new MockCommandService();
    const approve = (scope: QueryScope) =>
      svc.dispatch(scope, { transitionId: 't_pr_approve', entity: 'purchaseRequisition', entityId: pending.id });

    const byPlanner = await approve(seat(['planning'], PLANNING_1_ID));
    expect(byPlanner.status).toBe('failed');
    expect(byPlanner.reason).toBe('ROLE_NOT_PERMITTED:pr:approve');
    expect(purchaseRequisitionStore.get(pending.id)!.status).toBe('Pending Approval');

    // KNOWN-GOOD — procurement passes the ROLE gate on the same act. Whatever
    // a later rule says, it is not the role, so the refusal above is the lane's.
    const byProcurement = await approve(seat(['procurement']));
    expect(byProcurement.reason ?? '').not.toMatch(/^ROLE_NOT_PERMITTED/);
  });

  it('Planning 1 commits a generated line end to end: one Draft requisition, naming its line', async () => {
    // A line of its own: the cascade's replay key outlives a store reset, and the
    // page spec below commits LINE.
    const own = somoIntakeLineId('SIM-PM-0068', '2026-W47');
    const res = await commit(seat(['planning'], PLANNING_1_ID), own, qtyOf(own));
    expect(res.status, res.reason).toBe('done');
    expect(intakeLineStore.stateOf(own)).toBe('Committed');
    const prs = prsFor(own);
    expect(prs).toHaveLength(1);
    expect(prs[0].status).toBe('Draft');
    expect(prs[0].quantity).toBe(qtyOf(own));
  });

  it('KNOWN-BAD — the requisitioner, the old holder, is refused by ROLE and raises nothing', async () => {
    const res = await commit(seat(['requisitioner']), LINE, qtyOf(LINE));
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:intake:triage');
    expect(intakeLineStore.stateOf(LINE)).toBe('Pending');
    expect(prsFor(LINE)).toEqual([]);
  });

  /** Plants one planned change on SIM-PM-0068 W45, as a typed edit would. */
  const renderPlanTab = (identity: CurrentIdentity) => {
    const { row } = acceptedRow();
    const Seed: React.FC = () => {
      const api = usePlanDraft()!;
      return (
        <button type="button" onClick={() => api.edit(row, '2026-W45', String(row.cells['2026-W45']), 'TYPED')}>
          seed
        </button>
      );
    };
    renderWithProviders(
      <PlanDraftProvider>
        <Seed />
        <TimePhasedGrid viewId="pm-plan" currentGrain="week" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid', identity },
    );
    fireEvent.click(screen.getByText('seed'));
  };

  it('on the page: Planning 1 pushes its planned change from the grid, and the requisition is raised', async () => {
    renderPlanTab(PLANNING_1);
    expect(screen.queryByTestId('handoff-plan-push')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`plan-push-row-${LINE}`));
    await waitFor(() => expect(prsFor(LINE), screen.getByTestId('plan-draft-panel').textContent ?? '').toHaveLength(1));
    expect(intakeLineStore.stateOf(LINE)).toBe('Committed');
  });

  it('KNOWN-BAD on the page: a requisitioner seat reads whose act it is, with no push control', async () => {
    renderPlanTab(REQUISITIONER);
    expect(screen.queryByTestId(`plan-push-row-${LINE}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('plan-draft-panel')).toHaveTextContent('Awaiting Planning');
  });
});

// ─── 2 · one intake population ───────────────────────────────────────────────

describe('PLN-3 · one intake population — the queue is the set the grid commits (P0 #6)', () => {
  const buyer = seat(['planning']);

  it('the intake read lists every authored AND every generated line — the same set, member for member', async () => {
    const ids = new Set((await new MockProcurementService().getIntakeLines(buyer)).items.map((l) => l.id));
    const expected = new Set([...PR_INTAKE_LINES.map((l) => l.id), ...generatedIntakeLines().map((l) => l.id)]);
    expect([...ids].filter((id) => !expected.has(id))).toEqual([]);
    expect([...expected].filter((id) => !ids.has(id))).toEqual([]);
    // Named members, both producers; and a line SOMO never emits is absent.
    expect(ids.has('pil-somo-001')).toBe(true);
    expect(ids.has('pil-grid-001')).toBe(true);
    expect(ids.has(LINE)).toBe(true);
    expect(ids.has(somoIntakeLineId('SIM-PM-0068', '2026-11'))).toBe(false); // off its grain (PLN-2)
  });

  it('a line dismissed in the queue reads DISMISSED in its plan-tab cell, and is not editable there', async () => {
    const res = await new MockCommandService().dispatch(buyer, {
      transitionId: 't_intake_dismiss',
      entity: 'intakeLine',
      entityId: LINE,
    });
    expect(res.status, res.reason).toBe('done');
    const listed = (await new MockProcurementService().getIntakeLines(buyer)).items.find((l) => l.id === LINE)!;
    expect(listed.state).toBe('Dismissed');

    const { row } = acceptedRow();
    expect(row.seamRefs!['2026-W45']).toBe(LINE);
    expect(isDismissedCell(row, '2026-W45')).toBe(true);
    expect(isEditableCell(row, '2026-W45')).toBe(false);
    // KNOWN-GOOD — the neighbouring week is untouched and still editable.
    expect(row.seamRefs!['2026-W46']).toBe(NEIGHBOUR);
    expect(isDismissedCell(row, '2026-W46')).toBe(false);
    expect(isEditableCell(row, '2026-W46')).toBe(true);
  });

  it('and RESTORE brings it back everywhere — the cell is editable again', async () => {
    const svc = new MockCommandService();
    await svc.dispatch(buyer, { transitionId: 't_intake_dismiss', entity: 'intakeLine', entityId: LINE });
    await svc.dispatch(buyer, { transitionId: 't_intake_restore', entity: 'intakeLine', entityId: LINE });
    const { row } = acceptedRow();
    expect(isDismissedCell(row, '2026-W45')).toBe(false);
    expect(isEditableCell(row, '2026-W45')).toBe(true);
  });

  it('the plan cell SAYS it was dismissed, EN and ID', async () => {
    const { unmount } = renderWithProviders(<PlanBucketCell value={1000} derived={false} dismissed />);
    expect(screen.getByTestId('tp-cell-dismissed')).toHaveTextContent('Dismissed');
    expect(screen.getByTestId('tp-cell').getAttribute('title')).toMatch(/set aside in Intake review/);
    unmount();
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<PlanBucketCell value={1000} derived={false} dismissed />);
      expect(screen.getByTestId('tp-cell-dismissed')).toHaveTextContent('Diabaikan');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('on the page: Dismiss in the intake view reaches the plan tab’s read — no reload', async () => {
    const pm = VIEWS.find((v) => v.viewId === 'pm-plan')!;
    const horizon = somoHorizon('week').slice(0, pm.horizonLength);
    const measures = visibleMeasures(pm.measuresShown);
    // What the plan tab reads, mounted beside the queue under ONE query cache.
    const PlanTabRead: React.FC = () => {
      const fact = usePlanningFacts(horizon, measures).data?.items.find(
        (f) => f.measureId === 'acceptedQty' && f.sourceRef === LINE,
      );
      return <div data-testid="plan-read">{fact ? (fact.dismissed ? 'dismissed' : 'planned') : 'loading'}</div>;
    };
    const QueueRow: React.FC = () => {
      const { t } = useTranslation();
      const line = useIntakeReview().data?.items.find((l) => l.id === LINE);
      if (!line) return null;
      return (
        <div data-testid="queue-row">
          {intakeReviewColumns(t, () => {}).map((c, i) => {
            const Cell = c.component as React.FC<CellProps<IntakeLine>>;
            return <Cell key={i} {...({ rowData: line } as unknown as CellProps<IntakeLine>)} />;
          })}
        </div>
      );
    };
    renderWithProviders(
      <IntakeTriageProvider>
        <QueueRow />
        <PlanTabRead />
      </IntakeTriageProvider>,
      { identity: PLANNING_1 },
    );
    await waitFor(() => expect(screen.getByTestId('plan-read')).toHaveTextContent('planned'));
    const row = await screen.findByTestId('queue-row');
    fireEvent.click(within(row).getByRole('button', { name: /^Dismiss /i }));
    await waitFor(() => expect(within(row).getByText(/^Dismissed$/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('plan-read')).toHaveTextContent('dismissed'));
  });

  it('the queue opens on the pending lines and narrows by state and by code', async () => {
    const svc = new MockCommandService();
    await svc.dispatch(buyer, { transitionId: 't_intake_dismiss', entity: 'intakeLine', entityId: LINE });
    const lines = (await new MockProcurementService().getIntakeLines(buyer)).items;
    const pending = filterIntakeLines(lines, { state: 'Pending', query: '' }).map((l) => l.id);
    expect(pending).not.toContain(LINE);
    expect(pending).toContain(NEIGHBOUR);
    expect(filterIntakeLines(lines, { state: 'Dismissed', query: '' }).map((l) => l.id)).toEqual([LINE]);
    const byCode = filterIntakeLines(lines, { state: 'all', query: 'sim-pm-0068' });
    expect(byCode.length).toBeGreaterThan(1);
    expect(byCode.every((l) => l.id.startsWith('pil-somo-SIM-PM-0068@'))).toBe(true);
  });
});

// ─── 3 · the page is retired into the view ───────────────────────────────────

describe('PLN-3 · Intake Review is retired into the grid’s intake-review view (Design 1 D8)', () => {
  it('the old route redirects to the view — read off the router itself', () => {
    const router = readFileSync(resolve(__dirname, '../../router/AppRouter.tsx'), 'utf8');
    expect(router).toMatch(
      /<Route path="\/buyer\/intake-review" element=\{<Navigate to="\/buyer\/plan-grid\?view=intake-review" replace \/>\} \/>/,
    );
    // The page itself is gone — nothing renders the retired surface.
    expect(router).not.toMatch(/import IntakeReview\b/);
  });

  it('the grid opens on the view the link names, and on Raw materials without one', async () => {
    const { unmount } = renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=intake-review' });
    expect(screen.getByRole('tab', { name: 'Intake review' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('tp-view-intake-review')).toBeInTheDocument();
    unmount();
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByRole('tab', { name: 'Raw materials' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('tp-view-intake-review')).not.toBeInTheDocument();
  });

  it('the nav points at the grid only — no second door to a second queue', () => {
    const paths = BUYER_NAV.flatMap((g) => g.items.map((i) => i.path));
    expect(paths).toContain('/buyer/plan-grid');
    expect(paths).not.toContain('/buyer/intake-review');
  });

  it('the queue summary counts the WHOLE population, from the one read', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=intake-review' });
    const total = PR_INTAKE_LINES.length + generatedIntakeLines().length;
    const summary = await screen.findByTestId('intake-summary');
    await waitFor(() => expect(summary).toHaveTextContent(`${formatNumber(total)} inbound requirement lines`));
  });
});

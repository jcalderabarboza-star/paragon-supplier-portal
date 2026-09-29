// ────────────────────────────────────────────────────────────────────────────
// B3 · the overlay ON THE PAGE — the banner, the remove control, the push, and
// the seam agreeing. The virtualised grid lays out no rows under jsdom, so a
// harness inside the SAME provider makes the edits the cell would make (the
// cell's own path is `api.edit`, and the typing itself is proven in the
// browser); everything after the edit is the shipped surface.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { DataError, type IDataService } from '../../services/data/types';
import { VIEWS } from '../../services/planning/views';
import { somoHorizon } from '../../services/planning/facts';
import { visibleMeasures } from './visibleMeasures';
import { buildPlanBlocks, type PlanRow } from './planGridModel';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import TimePhasedGrid from './TimePhasedGrid';
import type { EditOrigin } from './planDraft';

const VIEW = VIEWS.find((v) => v.viewId === 'rm-plan')!;
const HORIZON = somoHorizon('month').slice(0, VIEW.horizonLength);
const MEASURES = visibleMeasures(VIEW.measuresShown);

const acceptedRow = (code: string): PlanRow => {
  const out = derivePlanningFacts({ horizon: HORIZON, measures: MEASURES, materialCodes: [code] });
  if (!out.ok) throw new Error('refused');
  return buildPlanBlocks(out.facts, HORIZON, MEASURES).flatMap((b) => b.rows).find((r) => r.measureId === 'acceptedQty')!;
};

/** Makes the edits a cell would make, through the provider's own `edit`. */
const Seed: React.FC<{ row: PlanRow; edits: readonly [string, string, EditOrigin][] }> = ({ row, edits }) => {
  const api = usePlanDraft()!;
  return (
    <button type="button" onClick={() => edits.forEach(([b, raw, o]) => api.edit(row, b, raw, o))}>
      seed
    </button>
  );
};

const mount = (row: PlanRow, edits: readonly [string, string, EditOrigin][], opts: { service?: IDataService; queryClient?: QueryClient } = {}) => {
  renderWithProviders(
    <PlanDraftProvider>
      <Seed row={row} edits={edits} />
      <TimePhasedGrid viewId="rm-plan" />
    </PlanDraftProvider>,
    { route: '/buyer/plan-grid', ...opts },
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

describe('B3 · the banner — what is planned, and that a reload drops it', () => {
  it('EN — "N planned changes — not committed until pushed", and the reload is stated before it happens', () => {
    const row = acceptedRow('SIM-RM-0031');
    mount(row, [['2026-08', '100', 'TYPED'], ['2026-09', '200', 'PASTE']]);
    expect(screen.getByTestId('plan-draft-banner').textContent).toBe('2 planned changes — not committed until pushed');
    expect(screen.getByText(/a reload drops every change that has not been pushed/)).toBeInTheDocument();
    // the pasted one carries the EXTERNAL marker; the typed one does not
    expect(within(screen.getByTestId(`plan-draft-row-${row.seamRefs!['2026-09']}`)).getByText('External')).toBeInTheDocument();
    expect(within(screen.getByTestId(`plan-draft-row-${row.seamRefs!['2026-08']}`)).queryByText('External')).toBeNull();
  });

  it('ID — the banner and the reload statement are Indonesian', async () => {
    await i18n.changeLanguage('id');
    mount(acceptedRow('SIM-RM-0031'), [['2026-08', '100', 'TYPED'], ['2026-09', '200', 'PASTE']]);
    expect(screen.getByTestId('plan-draft-banner').textContent).toBe('2 perubahan terencana — belum dikomit sampai dikirim');
    expect(screen.getByText(/memuat ulang menghapus setiap perubahan yang belum dikirim/)).toBeInTheDocument();
    expect(screen.getByText('Eksternal')).toBeInTheDocument();
  });

  it('remove-one-change drops exactly that change; the last removal removes the banner', () => {
    const row = acceptedRow('SIM-RM-0031');
    mount(row, [['2026-08', '100', 'TYPED'], ['2026-09', '200', 'TYPED']]);
    fireEvent.click(screen.getByTestId(`plan-remove-${row.seamRefs!['2026-08']}`));
    expect(screen.getByTestId('plan-draft-banner').textContent).toBe('1 planned change — not committed until pushed');
    fireEvent.click(screen.getByTestId(`plan-remove-${row.seamRefs!['2026-09']}`));
    expect(screen.queryByTestId('plan-draft-panel')).toBeNull();
  });
});

describe('B3 · a refusal at the page — shown with its reason, planning nothing', () => {
  it('a refused edit lists its reason and raises NO banner — nothing is planned', () => {
    const row = acceptedRow('SIM-RM-0031');
    mount(row, [['2026-08', 'abc', 'TYPED']]);
    expect(screen.queryByTestId('plan-draft-banner')).toBeNull();
    expect(within(screen.getByTestId('plan-draft-refusals')).getByText(/“abc” — not a number/)).toBeInTheDocument();
  });
});

describe('B3 · push from the page', () => {
  it('the reason is asked for only where the planner left the baseline, and a blank one dispatches nothing', async () => {
    const row = acceptedRow('SIM-RM-0033');
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    mount(row, [['2026-08', '1', 'TYPED']]);
    const ref = row.seamRefs!['2026-08'];
    expect(screen.getByLabelText(/Reason — SIM-RM-0033 2026-08/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`plan-push-row-${ref}`));
    expect(await screen.findByTestId(`plan-draft-failure-${ref}`)).toHaveTextContent(/a reason is required/);
    expect(dispatch.mock.calls.filter((c) => c[1].entityId === ref)).toEqual([]);
    dispatch.mockRestore();
  });

  it('success clears the overlay when the seam agrees — and the cache never held the planned value', async () => {
    const row = acceptedRow('SIM-RM-0035');
    const b = HORIZON.find((x) => row.seamRefs?.[x])!;
    const ref = row.seamRefs![b];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mount(row, [[b, '4321', 'TYPED']], { queryClient: qc });
    fireEvent.change(screen.getByLabelText(new RegExp(`Reason — SIM-RM-0035 ${b}`)), { target: { value: 'Capacity' } });

    // ⚠️ the overlay is not in ANY cached seam array while it is planned
    await waitFor(() => expect(qc.getQueryCache().getAll().some((q) => Array.isArray((q.state.data as { items?: unknown })?.items))).toBe(true));
    const cachedHit = () =>
      qc.getQueryCache().getAll().some((q) =>
        ((q.state.data as { items?: { sourceRef?: string; value?: unknown }[] })?.items ?? []).some(
          (f) => f.sourceRef === ref && f.value === 4321,
        ),
      );
    expect(cachedHit()).toBe(false);

    fireEvent.click(screen.getByTestId(`plan-push-row-${ref}`));
    await waitFor(() => expect(screen.queryByTestId('plan-draft-panel')).toBeNull());
    // the seam now holds it — as COMMITTED, from the store, after a re-read
    expect(intakeLineStore.get(ref)).toMatchObject({ state: 'Committed', committedQty: 4321, overrideReason: 'Capacity' });
    expect(cachedHit()).toBe(true);
  });

  it('a THROWN refusal leaves the row PLANNED with its reason on the page', async () => {
    const row = acceptedRow('SIM-RM-0037');
    const ref = row.seamRefs!['2026-08'];
    const throwing: IDataService = {
      ...mockDataService,
      commands: {
        ...mockDataService.commands,
        dispatch: async () => {
          throw new DataError('SCOPE_DENIED', 'no');
        },
      },
    };
    mount(row, [['2026-08', String(row.cells['2026-08']), 'TYPED']], { service: throwing });
    fireEvent.click(screen.getByTestId(`plan-push-row-${ref}`));
    expect(await screen.findByTestId(`plan-draft-failure-${ref}`)).toBeInTheDocument();
    expect(screen.getByTestId('plan-draft-banner').textContent).toBe('1 planned change — not committed until pushed');
    expect(intakeLineStore.stateOf(ref)).toBe('Pending');
  });

  it('a RETURNED refusal (A2 legality — the line is already committed) leaves the row PLANNED with its reason', async () => {
    const row = acceptedRow('SIM-RM-0039');
    const ref = row.seamRefs!['2026-08'];
    intakeLineStore.put({ lineId: ref, state: 'Committed', committedQty: 5 });
    mount(row, [['2026-08', String(row.cells['2026-08']), 'TYPED']]);
    fireEvent.click(screen.getByTestId(`plan-push-row-${ref}`));
    expect(await screen.findByTestId(`plan-draft-failure-${ref}`)).toHaveTextContent(
      /not in a state this action can be taken from.*\(Committed->Committed\)/,
    );
    expect(screen.getByTestId('plan-draft-banner')).toBeInTheDocument();
    expect(intakeLineStore.get(ref)?.committedQty).toBe(5);
  });
});

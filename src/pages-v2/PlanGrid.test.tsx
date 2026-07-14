import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import PlanGrid from './PlanGrid';
import { isLive } from '../services/liveness';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// PlanGrid (G1.2a) — the READ-ONLY plan-grid surface, honest-render contract.
//
// The grid BODY is virtualized (react-datasheet-grid + @tanstack/react-virtual)
// and does not lay out rows under jsdom's zero-height viewport — the row-level
// keyboard/fill/paste interaction is covered by BROWSER QA. What IS asserted
// here is the honesty contract that must hold on the real engine and is
// jsdom-reliable: the page renders the registry-derived SIMULATED pill (green
// unreachable), the read-only sandbox banner, and localizes EN/ID. The what-if
// recompute + overlay-never-merged logic is proven in planGridModel.test.ts;
// the per-row SIMULATED×PLANNED chip in PlanCellMarker.test.tsx.
// ────────────────────────────────────────────────────────────────────────────

describe('PlanGrid — honest render (page-level)', () => {
  it('renders the SIMULATED page pill from the registry — never Live', () => {
    // precondition: the registry does not green purchaseRequisitions
    expect(isLive('purchaseRequisitions')).toBe(false);

    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });

    // LivenessPill reads isLive('purchaseRequisitions') → the amber readiness note
    expect(
      screen.getByText(/awaiting live PR producer/i),
    ).toBeInTheDocument();
    // green "Live" affordance is structurally unreachable
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
  });

  it('renders the read-only planning-sandbox banner (honest framing)', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByText(/This grid is read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here is pushed to procurement/i)).toBeInTheDocument();
  });

  it('renders both grid sections — award scenario and requisition intake', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    // Scope to the section headings — the loose text also appears in the
    // virtualized engine's sticky/measurement render.
    expect(screen.getByRole('heading', { name: /Award scenario/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Requisition intake/i })).toBeInTheDocument();
  });

  it('surfaces the client-computed marker on the what-if column (C6 §5)', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByText(/Client-computed/i)).toBeInTheDocument();
  });

  it('exposes the editable what-if weights control seeded from DEFAULT_WEIGHTS', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    // the four criteria weight labels are present
    const region = screen.getByTestId('whatif-weights');
    expect(within(region).getByText(/Compliance/i)).toBeInTheDocument();
    expect(within(region).getByText(/Reliability/i)).toBeInTheDocument();
  });
});

describe('PlanGrid — i18n', () => {
  it('localizes the header to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
      expect(screen.getAllByText(/Grid Perencanaan/i).length).toBeGreaterThan(0);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

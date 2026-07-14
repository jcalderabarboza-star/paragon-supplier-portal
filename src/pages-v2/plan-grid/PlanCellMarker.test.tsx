import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import PlanCellMarker from './PlanCellMarker';
import { isLive } from '../../services/liveness';

// ────────────────────────────────────────────────────────────────────────────
// PlanCellMarker — the per-row honest-render chip (C6 §5 conjunction).
//
// Renders TWO tokens: the source tier (from the registry authority `isLive`)
// and the plan state (a per-row C6 overlay-axis value). The load-bearing
// guarantee: the source-tier half is NOT a caller boolean — it is read from
// `isLive(capability)`, so green ("Live") is STRUCTURALLY UNREACHABLE for a
// capability the registry does not green (purchaseRequisitions is gate-2 shut).
// ────────────────────────────────────────────────────────────────────────────

describe('PlanCellMarker — source tier is the registry authority', () => {
  it('renders SIMULATED for purchaseRequisitions (isLive is false) — never Live', () => {
    // precondition: the registry does NOT green purchaseRequisitions (two-gate)
    expect(isLive('purchaseRequisitions')).toBe(false);

    renderWithProviders(<PlanCellMarker capability="purchaseRequisitions" planState="PLANNED" />);

    expect(screen.getByText('Simulated')).toBeInTheDocument();
    // green is structurally unreachable — the Live label must be absent
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('renders the PLANNED plan-state token alongside the tier', () => {
    renderWithProviders(<PlanCellMarker capability="purchaseRequisitions" planState="PLANNED" />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('there is no prop that forces green — the source tier is not caller-supplied', () => {
    // The component's only inputs are capability + planState; neither can turn
    // a non-live capability green. Rendering with a committed plan-state still
    // shows SIMULATED because the SOURCE tier is independent of plan state.
    renderWithProviders(<PlanCellMarker capability="purchaseRequisitions" planState="committed" />);
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});

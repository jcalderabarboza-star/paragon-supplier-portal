import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { isLive } from '../services/liveness';
import BuyerRisk from './BuyerRisk';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerRisk — four honest states', () => {
  it('data: renders the buyer risk intelligence workspace', async () => {
    renderWithProviders(<BuyerRisk />);
    expect(
      await screen.findByText('Supply Risk & Scenario Intelligence'),
    ).toBeInTheDocument();
    // A geopolitical risk row proves the scoped data reads resolved.
    expect(await screen.findByText('Taiwan / China')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerRisk />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(
      screen.queryByText('Supply Risk & Scenario Intelligence'),
    ).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerRisk />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerRisk />, { identity: SUPPLIER });
    expect(await screen.findByText('No risk intelligence yet')).toBeInTheDocument();
  });
});

// The honesty lock (CP-0 · W2). This prevents the REGRESSION CLASS, not just the
// one instance: while the `risk` capability is SIMULATED, the page must render NO
// hand-rolled live/real-time affordance — only the capability-driven honest marker.
describe('BuyerRisk — honesty: no live affordance while SIMULATED', () => {
  it('registry classifies `risk` as SIMULATED (precondition)', () => {
    expect(isLive('risk')).toBe(false);
  });

  it('renders the honest capability-driven "Sample" marker, never a LIVE/Real-time claim', async () => {
    const { container } = renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');
    // No hand-rolled liveness claim survives anywhere on the page…
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.queryByText(/real-time risk monitoring/i)).not.toBeInTheDocument();
    // …and the pulsing "live" dot and its keyframes are gone.
    expect(container.querySelector('.risk-live-pulse')).toBeNull();
    // The ONLY honesty marker is the SIMULATED-derived pill (green is unreachable).
    expect(screen.getByText('Sample')).toBeInTheDocument();
  });
});

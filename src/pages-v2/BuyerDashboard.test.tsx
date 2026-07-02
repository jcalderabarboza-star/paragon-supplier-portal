import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerDashboard from './BuyerDashboard';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerDashboard — four honest states', () => {
  it('data: renders the command center once the reads resolve', async () => {
    renderWithProviders(<BuyerDashboard />);
    expect(
      await screen.findByText('Procurement Command Center'),
    ).toBeInTheDocument();
    // Real production-line row from the service (not a fixture import).
    expect(await screen.findByText('Line A — Skin Care')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerDashboard />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Procurement Command Center')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerDashboard />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: supplier persona sees the empty state (buyer-only aggregates)', async () => {
    renderWithProviders(<BuyerDashboard />, { identity: SUPPLIER });
    expect(await screen.findByText('No command-center data')).toBeInTheDocument();
  });
});

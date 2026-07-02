import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
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

import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerAnalytics from './BuyerAnalytics';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerAnalytics — four honest states', () => {
  it('data: renders the analytics workspace with wired reads', async () => {
    renderWithProviders(<BuyerAnalytics />);
    expect(
      await screen.findByText('Analytics & Procurement Intelligence'),
    ).toBeInTheDocument();
    // A performance-table row proves the supplier-performance read resolved.
    expect(await screen.findByText('Zhejiang NHU Vitamins Co.')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerAnalytics />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(
      screen.queryByText('Analytics & Procurement Intelligence'),
    ).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerAnalytics />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerAnalytics />, { identity: SUPPLIER });
    expect(await screen.findByText('No analytics yet')).toBeInTheDocument();
  });
});

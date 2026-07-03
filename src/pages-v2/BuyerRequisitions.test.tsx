import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerRequisitions from './BuyerRequisitions';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerRequisitions — four honest states', () => {
  it('data: renders the requisitions workspace with wired reads', async () => {
    renderWithProviders(<BuyerRequisitions />);
    expect(await screen.findByText('Purchase Requisitions')).toBeInTheDocument();
    // A relocated PR proves the read resolved and drove the table.
    expect(await screen.findByText('PR-2026-00341')).toBeInTheDocument();
    // Numeric estimatedValue renders through the compact IDR formatter (lowercase jt).
    expect(await screen.findByText('Rp 79.0jt')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerRequisitions />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Purchase Requisitions')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerRequisitions />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: SUPPLIER });
    expect(await screen.findByText('No requisitions yet')).toBeInTheDocument();
  });
});

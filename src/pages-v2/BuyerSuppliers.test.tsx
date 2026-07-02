import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerSuppliers from './BuyerSuppliers';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerSuppliers — four honest states', () => {
  it('data: renders the directory once the suppliers resolve', async () => {
    renderWithProviders(<BuyerSuppliers />);
    expect(await screen.findByText('Supplier Directory')).toBeInTheDocument();
    expect(await screen.findByText(/records · last updated/)).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerSuppliers />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Directory')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerSuppliers />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no suppliers are in scope', async () => {
    // A supplier persona sees no directory (suppliers.list returns empty).
    renderWithProviders(<BuyerSuppliers />, { identity: SUPPLIER });
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument();
  });
});

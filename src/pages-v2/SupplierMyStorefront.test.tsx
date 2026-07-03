import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierMyStorefront from './SupplierMyStorefront';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('SupplierMyStorefront — identity states', () => {
  it('data: renders the storefront once the supplier identity resolves', async () => {
    renderWithProviders(<SupplierMyStorefront />, { identity: SUPPLIER });
    expect(await screen.findByText('My Catalog')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the supplier read is pending', () => {
    renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('My Catalog')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the supplier read throws', async () => {
    renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });
});

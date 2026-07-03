import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierRFQs from './SupplierRFQs';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('SupplierRFQs — identity states', () => {
  it('data: renders the sourcing workspace once the supplier identity resolves', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findByText('My Sourcing Events')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the supplier read is pending', () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('My Sourcing Events')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the supplier read throws', async () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });
});

import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerDiscovery from './BuyerDiscovery';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerDiscovery — four honest states', () => {
  it('data: renders discovery for the buyer once the reads resolve', async () => {
    renderWithProviders(<BuyerDiscovery />);
    expect(await screen.findByText('Supplier Discovery')).toBeInTheDocument();
    expect(await screen.findByText('Candidates Identified')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerDiscovery />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Candidates Identified')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerDiscovery />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only surface)', async () => {
    renderWithProviders(<BuyerDiscovery />, { identity: SUPPLIER });
    expect(await screen.findByText('No discovery data yet')).toBeInTheDocument();
  });
});

import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import Marketplace from './Marketplace';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('Marketplace — four honest states', () => {
  it('data: renders the marketplace once suppliers resolve', async () => {
    renderWithProviders(<Marketplace />);
    expect(await screen.findByText('Global Supplier Marketplace')).toBeInTheDocument();
    expect(await screen.findByText('Total Suppliers')).toBeInTheDocument();
    // The open-RFQ teaser is visibly marked as static, not live data.
    expect(await screen.findByText('Sample data')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<Marketplace />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Suppliers')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<Marketplace />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no suppliers are in scope', async () => {
    renderWithProviders(<Marketplace />, { identity: SUPPLIER });
    expect(await screen.findByText('No suppliers in the marketplace')).toBeInTheDocument();
  });
});

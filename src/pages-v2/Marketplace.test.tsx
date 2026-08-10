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
    // D-CENSUS-8 — was `findByText('Sample data')`, a hardcoded English literal that
    // vanished under Bahasa (MARKER-I18N-HOLE-01). It is now the registry-derived,
    // translated ProvenanceMarker, and there are TWO of them: one page-level (the
    // supplier grid + KPI tiles, which had no marker at all) and one on the open-RFQ
    // teaser that previously carried the only badge on the route. findAll, and assert
    // the count, so losing either one fails here.
    expect(await screen.findAllByText('Sample')).toHaveLength(2);
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

import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierStorefront from './SupplierStorefront';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// The page reads a :id route param, so mount it behind a matching Route.
const routed = (
  <Routes>
    <Route path="/marketplace/supplier/:id" element={<SupplierStorefront />} />
  </Routes>
);

describe('SupplierStorefront — honest states', () => {
  it('data: renders the storefront + scoped catalog for a known supplier', async () => {
    renderWithProviders(routed, { route: '/marketplace/supplier/sup-007' });
    // A sup-007 catalog product proves the scoped storefront read resolved.
    expect(
      await screen.findByText('Signature ingredient (per request)'),
    ).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(routed, {
      route: '/marketplace/supplier/sup-007',
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(routed, {
      route: '/marketplace/supplier/sup-007',
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('not found: shows the fallback for an unknown supplier id', async () => {
    renderWithProviders(routed, { route: '/marketplace/supplier/sup-999' });
    expect(
      await screen.findByText('Supplier storefront not found'),
    ).toBeInTheDocument();
  });
});

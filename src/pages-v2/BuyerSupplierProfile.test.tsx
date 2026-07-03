import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerSupplierProfile from './BuyerSupplierProfile';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// The page reads a :id route param, so mount it behind a matching Route.
const routed = (
  <Routes>
    <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
  </Routes>
);

describe('BuyerSupplierProfile — honest states', () => {
  it('data: renders the profile for a known supplier', async () => {
    renderWithProviders(routed, { route: '/buyer/suppliers/sup-007' });
    expect(await screen.findByText('Company overview')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(routed, {
      route: '/buyer/suppliers/sup-007',
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(routed, {
      route: '/buyer/suppliers/sup-007',
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('not found: shows the fallback for an unknown supplier id', async () => {
    renderWithProviders(routed, { route: '/buyer/suppliers/sup-999' });
    expect(await screen.findByText('Supplier not found')).toBeInTheDocument();
  });

  it('catalog tab: renders catalog rows folded onto the storefront read', async () => {
    renderWithProviders(routed, { route: '/buyer/suppliers/sup-007' });
    await screen.findByText('Company overview');
    fireEvent.click(screen.getByRole('tab', { name: 'Catalog' }));
    expect(
      await screen.findByText('PET Bottle 100ml Airless Pump'),
    ).toBeInTheDocument();
  });

  it('compliance tab: renders certs incl. the D-4 pending variant + upload date', async () => {
    renderWithProviders(routed, { route: '/buyer/suppliers/sup-007' });
    await screen.findByText('Company overview');
    fireEvent.click(screen.getByRole('tab', { name: 'Compliance' }));
    expect(await screen.findByText('BPOM Registration')).toBeInTheDocument();
    // The seeded pending-review document exercises the 'pending' status variant.
    expect(await screen.findByText('GMP Certificate')).toBeInTheDocument();
    expect(await screen.findByText('Pending')).toBeInTheDocument();
  });

  it('performance tab: recent POs fold onto usePurchaseOrders (no Sample data pill)', async () => {
    renderWithProviders(routed, { route: '/buyer/suppliers/sup-007' });
    await screen.findByText('Company overview');
    fireEvent.click(screen.getByRole('tab', { name: 'Performance' }));
    expect(await screen.findByText('Recent purchase orders')).toBeInTheDocument();
    // A real sup-007 PO proves the scoped read drove the table.
    expect(await screen.findByText('PO-2025-00108')).toBeInTheDocument();
    // The former "Sample data" pill is gone from this section.
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

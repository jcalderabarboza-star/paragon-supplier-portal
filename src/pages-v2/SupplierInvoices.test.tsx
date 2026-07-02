import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierInvoices from './SupplierInvoices';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no invoices on file (sup-007/002/005 have fixtures).
const SUPPLIER_NO_INVOICES: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
};

describe('SupplierInvoices — four honest states', () => {
  it('data: renders the scoped invoice workspace for the seeded supplier', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    expect(await screen.findByText('My Invoices')).toBeInTheDocument();
    expect(await screen.findByText('Payments Received')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Payments Received')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no invoices', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER_NO_INVOICES });
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument();
  });
});

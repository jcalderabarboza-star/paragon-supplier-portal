import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
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

// The honest submit path (UI): the Draft row's Submit button dispatches the real
// verb through the command seam (Draft → Submitted), not a toast stub.
describe('SupplierInvoices — Submit dispatches the real verb', () => {
  it('submits a Draft invoice through the command seam (Draft → Submitted)', async () => {
    invoiceStore.reset();
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    await screen.findByText('My Invoices');

    // sup-007 has exactly one Draft: INV-2026-BRL-0055 (inv-brl-0055).
    fireEvent.click(await screen.findByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(invoiceStore.get('inv-brl-0055')!.status).toBe('Submitted');
    });
  });
});

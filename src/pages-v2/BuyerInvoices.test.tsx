import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import BuyerInvoices from './BuyerInvoices';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no buyer invoices scoped to it → empty result.
const SUPPLIER_NO_INVOICES: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT No Invoices',
};

describe('BuyerInvoices — four honest states', () => {
  it('data: renders the invoice workspace once the list resolves', async () => {
    renderWithProviders(<BuyerInvoices />);
    expect(await screen.findByText('Invoices & Payment')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the list is pending', () => {
    renderWithProviders(<BuyerInvoices />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Invoices & Payment')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the list read throws', async () => {
    renderWithProviders(<BuyerInvoices />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when the scoped list is empty', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: SUPPLIER_NO_INVOICES });
    expect(await screen.findByText('No invoices')).toBeInTheDocument();
  });
});

// The DR-7 honest-payment path (UI): releasing an Approved invoice goes through
// the Option-B SAP boundary — interim 'Releasing Payment' with NO payment ref,
// then settlement mints the real ref. No client-side "paid" fabrication.
describe('BuyerInvoices — release payment is Option B (no fabrication)', () => {
  it('release → Releasing Payment (no ref) → settle → Payment Released (real ref)', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');

    // inv-giv-0892 is Approved (matched), no payment ref yet.
    fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
    fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));

    // Interim: submitted to SAP, no payment reference asserted yet.
    await waitFor(() => {
      expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Releasing Payment');
    });
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toBeNull();

    // Settlement mints the real FI doc + payment ref (Option B).
    await waitFor(
      () => {
        expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Payment Released');
      },
      { timeout: 2500 },
    );
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toMatch(/^PAY-/);
  });
});

import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
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

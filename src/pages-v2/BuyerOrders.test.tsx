import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerOrders from './BuyerOrders';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// POs are supplier-scoped (not a buyer-only aggregate), so the empty state is
// reached by an empty result, not a persona. Override just getPurchaseOrders to
// return [] while delegating every other procurement method to the real mock.
const noOrders: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getPurchaseOrders') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerOrders — four honest states', () => {
  it('data: renders the PO workspace with wired reads', async () => {
    renderWithProviders(<BuyerOrders />);
    // The KPI strip only renders in the data branch — proof the read resolved.
    expect(await screen.findByText('Total Open POs')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerOrders />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Open POs')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerOrders />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no purchase orders', async () => {
    renderWithProviders(<BuyerOrders />, { service: noOrders });
    expect(await screen.findByText('No purchase orders yet')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT — the buyer's half of the same silence, and the TERMINAL
// control beside it.
//
// ⚠️ **THE TERMINAL ASSERTION IS NOT PADDING.** A line that names a waiter over
// a CLOSED document is the same defect as the silence, pointed forward: it tells
// a reader to expect something that will never come. `ended` renders nothing,
// and this is what proves the arm is wired rather than merely declared.
// ─────────────────────────────────────────────────────────────────────────────
describe('BuyerOrders — who acts next', () => {
  it('a PO in Confirmed names S/4HANA to the buyer too — the wait is SAP’s, not the supplier’s', async () => {
    renderWithProviders(<BuyerOrders />);
    fireEvent.click(await screen.findByText('PO-2025-00102'));
    const line = await screen.findByTestId('next-act-buyer-po');
    expect(line).toHaveAttribute('data-next-act', 'external');
    expect(line).toHaveTextContent('Awaiting S/4HANA');
  });

  it('⚠️ a CLOSED PO says NOTHING — an ended document has nobody acting next', async () => {
    renderWithProviders(<BuyerOrders />);
    fireEvent.click(await screen.findByText('PO-2025-00111'));
    // The drawer is open on a terminal document…
    expect(await screen.findByText('PO-2025-00111')).toBeInTheDocument();
    // …and the line is absent, not merely empty.
    expect(screen.queryByTestId('next-act-buyer-po')).toBeNull();
  });
});

import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import OrdersToConfirmWidget from './OrdersToConfirmWidget';

// The reference adapter for the proving pair. It is LIVE by construction — the
// count derives from the real PO store via usePurchaseOrders — so it must wear
// the green "Live" pill, never "Sample data".
describe('OrdersToConfirmWidget — live adapter', () => {
  it('renders as a Live widget titled "Orders to confirm"', async () => {
    renderWithProviders(<OrdersToConfirmWidget />, { identity: SUPPLIER });
    expect(await screen.findByText('Orders to confirm')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

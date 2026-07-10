import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SupplierInvoicePaymentWidget from './SupplierInvoicePaymentWidget';
import SupplierRfqToRespondWidget from './SupplierRfqToRespondWidget';

// Both supplier adapters are LIVE by construction (count derives from a real
// store via a hook) → green "Live" pill, never "Sample data".
const CASES: [string, React.ComponentType][] = [
  ['Invoice payment', SupplierInvoicePaymentWidget],
  ['RFQs to respond', SupplierRfqToRespondWidget],
];

describe('Supplier live widgets — Live by construction', () => {
  it.each(CASES)('%s renders as a Live widget', async (title, Widget) => {
    renderWithProviders(<Widget />, { identity: SUPPLIER });
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

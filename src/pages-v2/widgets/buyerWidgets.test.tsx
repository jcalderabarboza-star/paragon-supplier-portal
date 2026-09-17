import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import BuyerInvoiceAgingWidget from './BuyerInvoiceAgingWidget';
import BuyerRfqAwaitingAwardWidget from './BuyerRfqAwaitingAwardWidget';
import BuyerOpenPoWidget from './BuyerOpenPoWidget';
import BuyerGoodsReceiptWidget from './BuyerGoodsReceiptWidget';
import BuyerAsnInboundWidget from './BuyerAsnInboundWidget';

// Every buyer adapter is LIVE by construction — its count derives from a real
// store via a hook — so each must wear the green "Live" pill, never "Sample data".
const CASES: [string, React.ComponentType, string][] = [
  ['Invoices — AP aging', BuyerInvoiceAgingWidget, 'Invoices — AP aging'],
  ['RFQs awaiting award', BuyerRfqAwaitingAwardWidget, 'RFQs awaiting award'],
  ['Open purchase orders', BuyerOpenPoWidget, 'Open purchase orders'],
  ['Goods receipts', BuyerGoodsReceiptWidget, 'Goods receipts — 3-way match'],
  ['Inbound shipments', BuyerAsnInboundWidget, 'Inbound shipments (ASN)'],
];

describe('Buyer live widgets — Live by construction', () => {
  it.each(CASES)('%s renders as a Live widget', async (_name, Widget, title) => {
    renderWithProviders(<Widget />, { identity: BUYER });
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

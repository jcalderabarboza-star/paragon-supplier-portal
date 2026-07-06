import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import type { IDataService, ASN } from '../services/data/types';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty result, not a persona.
const noGRs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getGoodsReceipts') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerGoodsReceipt — four honest states', () => {
  it('data: renders the QC workspace with wired reads', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Rejection Rate (30d)')).toBeInTheDocument();
    expect(screen.getByText('Goods Receipt & Quality Control')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Rejection Rate (30d)')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no goods receipts', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: noGRs });
    expect(await screen.findByText('No goods receipts yet')).toBeInTheDocument();
  });
});

// A live, receivable ASN seeded straight into the store — the UI-path proof that
// the GR source selector resolves ASNs from the service seam, not fixtures only.
const uiTestAsn = (): ASN => ({
  asnNumber: 'ASN-UITEST-1',
  supplierId: 'sup-007',
  poReference: 'PO-2025-00108',
  status: 'Submitted',
  carrier: 'JNE',
  trackingNumber: 'TRK-UI-1',
  eta: '2026-05-25',
  details: {
    originCity: 'PT UI Test Supplier',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  lineItems: [
    {
      materialCode: 'PK-UITEST-1',
      description: 'UI test carton',
      orderedQty: 100,
      shippedQty: 100,
      lotNumber: 'LOT-UI-1',
    },
  ],
});

describe('BuyerGoodsReceipt — GR from a live store ASN (UI path)', () => {
  it('receives a GR from a store ASN via the source selector, not fixtures only', async () => {
    goodsReceiptStore.reset();
    asnStore.reset();
    asnStore.add(uiTestAsn());

    renderWithProviders(<BuyerGoodsReceipt />);
    await screen.findByText('Rejection Rate (30d)'); // data branch loaded

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));

    // The live submitted ASN is offered as a receivable source (dock ∪ store).
    const sourceRow = await screen.findByText('ASN-UITEST-1');
    fireEvent.click(sourceRow);

    // Step through the wizard defaults (all accepted, checks pass).
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → details
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → quality
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → disposition
    fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));

    // A real GR was created for the store ASN — through the command seam — and
    // the supplier is derived from the ASN's PO (not left blank).
    await waitFor(() => {
      const gr = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-UITEST-1');
      expect(gr).toBeTruthy();
      expect(gr!.supplierName).not.toBe('—');
      expect(gr!.supplierName.length).toBeGreaterThan(0);
    });
  });

  it('mixed quantities → derived Partially Approved → posted → ASN discrepancy cascade', async () => {
    goodsReceiptStore.reset();
    asnStore.reset();
    asnStore.add(uiTestAsn());

    renderWithProviders(<BuyerGoodsReceipt />);
    await screen.findByText('Rejection Rate (30d)');

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
    fireEvent.click(await screen.findByText('ASN-UITEST-1'));

    // Step 1 → Details, then accept 60 of 100 received (40 rejected → mixed line).
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(
      screen.getByLabelText('Accepted quantity for PK-UITEST-1'),
      { target: { value: '60' } },
    );
    fireEvent.change(
      await screen.findByLabelText('Rejection reason for PK-UITEST-1'),
      { target: { value: '40 cartons crushed in transit' } },
    );

    // Details → Quality → Disposition.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // The header disposition is DERIVED and displayed (no free-choice radio).
    expect(screen.getByText(/Header Disposition/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));

    // Partial-approve is the only path that both POSTS and cascades: the GR posts
    // to SAP and the linked ASN flips to Discrepancy.
    await waitFor(() => {
      const gr = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-UITEST-1');
      expect(gr?.status).toBe('Posted to SAP');
    });
    expect(asnStore.get('ASN-UITEST-1')!.status).toBe('Discrepancy');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E2E-2 · THE ORDER AND THE SHIP NOTICE SHOW WHAT WAS RECEIVED, ON BOTH SIDES.
//
// Found on the end-to-end walk: after receipt, invoice and payment the order
// still read Confirmed with nothing stamped, the ship notice still read
// Submitted, and the supplier was still offered "Create ASN".
//
// The order's status is SAP's. So nothing here moves a status; the pages READ
// the posted receipts and say what they found, and say whose the status is.
//
// Held here, in EN and ID:
//   1. buyer and supplier read the same received block on the same order — the
//      receipt number, its date, the accepted quantity against the confirmed
//      one — and the sentence that SAP keeps the official status;
//   2. an order with nothing received says so (the known-good twin of 1);
//   3. the order's STATUS IS NOT MOVED by any of it;
//   4. a supplier is not offered "Create ASN" on a fully received order, in the
//      order panel, the orders list, or the shipment page's order picker — and
//      IS on a confirmed order with goods still owed;
//   5. a ship notice shows the receipt recorded against it, on both sides.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { receivedOnOrder } from '../services/data/orderReceipt';
import { formatDate } from '../lib/format';
import type { ASN } from '../services/data/types';
import type { GoodsReceipt } from '../data/mockGoodsReceipts';
import i18n from '../lib/i18n';
import BuyerOrders from './BuyerOrders';
import SupplierOrders from './SupplierOrders';
import BuyerShipments from './BuyerShipments';
import SupplierShipments from './SupplierShipments';
import SupplierDashboard from './SupplierDashboard';
import { ReceivedOnOrder, ReceivedOnNotice } from '../components/v2-features/ReceivedBlock';

const LOCALES = ['en', 'id'] as const;
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

/** sup-002's order: Confirmed, and fully received by one posted receipt. */
const FULL = 'PO-2025-00102';
const FULL_GR = 'GR-2026-014';
/** sup-007's order: Confirmed, nothing received. */
const OWED = 'PO-2025-00107';
const SUP_002: CurrentIdentity = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'sup-002' };

beforeEach(async () => {
  purchaseOrderStore.reset();
  goodsReceiptStore.reset();
  asnStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  purchaseOrderStore.reset();
  goodsReceiptStore.reset();
  asnStore.reset();
  await i18n.changeLanguage('en');
});

const po = (n: string) => purchaseOrderStore.all().find((p) => p.poNumber === n)!;

describe('E2E-2 · the population this file rests on', () => {
  it('one order is fully received and still Confirmed; the other is Confirmed with nothing received', () => {
    const full = receivedOnOrder(po(FULL), goodsReceiptStore.all());
    expect(po(FULL).status).toBe('Confirmed');
    expect(po(FULL).supplierId).toBe('sup-002');
    expect(full.fullyReceived).toBe(true);
    expect(full.receipts.map((r) => r.grNumber)).toEqual([FULL_GR]);
    expect(po(OWED).status).toBe('Confirmed');
    expect(po(OWED).supplierId).toBe(SUPPLIER.supplierId);
    expect(receivedOnOrder(po(OWED), goodsReceiptStore.all()).receipts).toEqual([]);
  });

  it('the sentences exist in both locales and differ between them', () => {
    for (const key of ['received.order.title', 'received.order.full', 'received.order.none', 'received.order.sapOwns', 'received.notice.none', 'received.notice.sapOwns']) {
      expect(i18n.t(key, { lng: 'en' }), key).not.toBe(key);
      expect(i18n.t(key, { lng: 'en' }), key).not.toBe(i18n.t(key, { lng: 'id' }));
    }
    expect(i18n.t('received.order.sapOwns', { lng: 'en' })).toMatch(/SAP/);
    expect(i18n.t('received.order.sapOwns', { lng: 'id' })).toMatch(/SAP/);
  });
});

const expectFullBlock = (block: HTMLElement, testId: string) => {
  const date = formatDate(goodsReceiptStore.all().find((g) => g.grNumber === FULL_GR)!.receivedDate);
  expect(within(block).getByTestId(`${testId}-full`)).toHaveTextContent(tr('received.order.full'));
  expect(within(block).getByTestId(`${testId}-lines`)).toHaveTextContent('RM-EMUL-9410');
  expect(within(block).getByTestId(`${testId}-lines`)).toHaveTextContent(
    tr('received.order.line', { accepted: i18n.language === 'id' ? '8.000' : '8,000', confirmed: i18n.language === 'id' ? '8.000' : '8,000', uom: 'KG' }),
  );
  const receipt = within(block).getByTestId(`${testId}-receipt-${FULL_GR}`);
  expect(receipt).toHaveTextContent(FULL_GR);
  expect(receipt).toHaveTextContent(date);
  expect(receipt).toHaveTextContent('MAT-DOC-501205');
  // The receipt also carries a material this order does not: the row counts the
  // order's own 8,000, not the receipt's 18,000.
  expect(receipt).toHaveTextContent(tr('received.receipt.accepted', { qty: i18n.language === 'id' ? '8.000' : '8,000' }));
  expect(receipt.textContent).not.toMatch(/18[.,]000/);
  expect(within(block).getByTestId(`${testId}-sap-note`)).toHaveTextContent(tr('received.order.sapOwns'));
  expect(within(block).queryByTestId(`${testId}-none`)).toBeNull();
};

describe.each(LOCALES)('E2E-2 · the order shows what was received [%s]', (lng) => {
  it('the BUYER reads the receipt, the accepted quantity and whose the status is', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText(FULL));
    expectFullBlock(await screen.findByTestId('buyer-order-received'), 'buyer-order-received');
    // Nothing moved the order.
    expect(po(FULL).status).toBe('Confirmed');
  });

  it('the SUPPLIER reads the same block on the same order, and is not offered a ship notice', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierOrders />, { identity: SUP_002 });
    const row = (await screen.findByText(FULL)).closest('tr')!;
    // In the list the row's action is not "Create ASN".
    expect(within(row).queryByText(tr('supplierOrders.action.createAsn'))).toBeNull();
    // The row's own button reads "View" and OPENS the panel — it used to fire the
    // ship-notice toast for any Confirmed order.
    fireEvent.click(within(row).getByRole('button', { name: tr('supplierOrders.action.view') }));
    expectFullBlock(await screen.findByTestId('supplier-order-received'), 'supplier-order-received');
    expect(screen.queryByTestId('po-create-asn')).toBeNull();
    expect(po(FULL).status).toBe('Confirmed');
  });

  it('KNOWN-GOOD TWIN — an order with goods still owed says nothing is received, and Create ASN is offered', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    const row = (await screen.findByText(OWED)).closest('tr')!;
    expect(within(row).getByText(tr('supplierOrders.action.createAsn'))).toBeInTheDocument();
    fireEvent.click(screen.getByText(OWED));
    const block = await screen.findByTestId('supplier-order-received');
    expect(within(block).getByTestId('supplier-order-received-none')).toHaveTextContent(tr('received.order.none'));
    expect(within(block).queryByTestId('supplier-order-received-full')).toBeNull();
    expect(within(block).getByTestId('supplier-order-received-sap-note')).toHaveTextContent(tr('received.order.sapOwns'));
    expect(screen.getByTestId('po-create-asn')).toHaveTextContent(tr('supplierOrders.action.createAsn'));
  });
});

describe('E2E-2 · the receipt arriving is what changes the page — nothing else', () => {
  it('posting a receipt for everything owed removes the offer and shows the receipt', async () => {
    // The owed order, then a posted receipt for its whole confirmed quantity.
    const order = po(OWED);
    const gr: GoodsReceipt = {
      id: 'gr-e2e2',
      grNumber: 'GR-E2E2-001',
      asnId: 'asn-e2e2',
      asnNumber: 'ASN-E2E2-1',
      poNumber: OWED,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      receivedDate: '2026-08-30',
      receivedBy: 'Warehouse',
      status: 'Posted to SAP',
      sapMaterialDoc: 'MAT-DOC-E2E2',
      inspectionResults: order.lineItems.map((li) => ({
        materialCode: li.materialCode,
        description: li.description,
        qtyExpected: li.confirmedQty,
        qtyReceived: li.confirmedQty,
        qtyAccepted: li.confirmedQty,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
      })),
      disposition: 'Accept',
    };
    goodsReceiptStore.add(gr);
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    const row = (await screen.findByText(OWED)).closest('tr')!;
    expect(within(row).queryByText(tr('supplierOrders.action.createAsn'))).toBeNull();
    fireEvent.click(screen.getByText(OWED));
    const block = await screen.findByTestId('supplier-order-received');
    expect(within(block).getByTestId('supplier-order-received-full')).toBeInTheDocument();
    expect(within(block).getByTestId('supplier-order-received-receipt-GR-E2E2-001')).toHaveTextContent('MAT-DOC-E2E2');
    expect(screen.queryByTestId('po-create-asn')).toBeNull();
    expect(po(OWED).status).toBe('Confirmed');
  });

  it('a receipt that is only inspected changes nothing: the offer stays', async () => {
    const order = po(OWED);
    goodsReceiptStore.add({
      id: 'gr-e2e2-b',
      grNumber: 'GR-E2E2-002',
      asnId: 'asn-e2e2',
      asnNumber: 'ASN-E2E2-1',
      poNumber: OWED,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      receivedDate: '2026-08-30',
      receivedBy: 'Warehouse',
      status: 'Approved',
      inspectionResults: order.lineItems.map((li) => ({
        materialCode: li.materialCode,
        description: li.description,
        qtyExpected: li.confirmedQty,
        qtyReceived: li.confirmedQty,
        qtyAccepted: li.confirmedQty,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
      })),
      disposition: 'Accept',
    });
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText(OWED));
    expect(await screen.findByTestId('supplier-order-received-none')).toBeInTheDocument();
    expect(screen.getByTestId('po-create-asn')).toBeInTheDocument();
  });
});

describe.each(LOCALES)('E2E-2 · the ship notice shows its receipt [%s]', (lng) => {
  const NOTICE = 'ASN-E2E2-9';
  const seedNotice = (withReceipt: boolean) => {
    const order = po(OWED);
    const asn: ASN = {
      asnNumber: NOTICE,
      supplierId: order.supplierId,
      poReference: OWED,
      status: 'Submitted',
      carrier: 'Sample Courier',
      trackingNumber: 'TRK-E2E2',
      eta: '2026-09-02',
      details: {
        originCity: 'Surabaya',
        destinationWarehouse: 'NDC J6, Jakarta',
        totalCartons: 10,
        grossWeightKg: 100,
        temperatureRequirement: 'Ambient',
      },
      lineItems: order.lineItems.map((li) => ({
        materialCode: li.materialCode,
        description: li.description,
        orderedQty: li.confirmedQty,
        shippedQty: 1000,
        lotNumber: 'LOT-E2E2',
      })),
    };
    asnStore.add(asn);
    if (withReceipt) {
      goodsReceiptStore.add({
        id: 'gr-e2e2-n',
        grNumber: 'GR-E2E2-009',
        asnId: NOTICE,
        asnNumber: NOTICE,
        poNumber: OWED,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        receivedDate: '2026-08-30',
        receivedBy: 'Warehouse',
        status: 'Posted to SAP',
        sapMaterialDoc: 'MAT-DOC-E2E2-9',
        inspectionResults: [{
          materialCode: order.lineItems[0].materialCode,
          description: order.lineItems[0].description,
          qtyExpected: 1000,
          qtyReceived: 1000,
          qtyAccepted: 900,
          qtyRejected: 100,
          visualCheck: 'Pass',
          packagingCheck: 'Pass',
        }],
        disposition: 'Accept',
      });
    }
  };
  const acc = () => tr('received.receipt.accepted', { qty: '900' });
  const rej = () => tr('received.receipt.rejected', { qty: '100' });

  it('the BUYER reads the receipt on the notice, and the notice keeps its own status', async () => {
    seedNotice(true);
    await i18n.changeLanguage(lng);
    renderWithProviders(<BuyerShipments />, { identity: BUYER });
    const row = await screen.findByTestId(`ship-notice-${NOTICE}`);
    fireEvent.click(within(row).getByRole('button'));
    const block = await screen.findByTestId(`ship-notice-received-${NOTICE}`);
    const receipt = within(block).getByTestId(`ship-notice-received-${NOTICE}-receipt-GR-E2E2-009`);
    expect(receipt).toHaveTextContent('GR-E2E2-009');
    expect(receipt).toHaveTextContent(formatDate('2026-08-30'));
    expect(receipt).toHaveTextContent(acc());
    expect(receipt).toHaveTextContent(rej());
    expect(receipt).toHaveTextContent('MAT-DOC-E2E2-9');
    expect(block).toHaveTextContent(tr('received.notice.sapOwns'));
    expect(asnStore.get(NOTICE)!.status).toBe('Submitted');
  });

  it('the SUPPLIER reads the same receipt on its own notice', async () => {
    seedNotice(true);
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const cell = await screen.findByText(NOTICE);
    fireEvent.click(within(cell.closest('tr')!).getAllByRole('button')[0]);
    const block = await screen.findByTestId(`asn-received-${NOTICE}`);
    const receipt = within(block).getByTestId(`asn-received-${NOTICE}-receipt-GR-E2E2-009`);
    expect(receipt).toHaveTextContent(acc());
    expect(receipt).toHaveTextContent(rej());
    expect(receipt).toHaveTextContent('MAT-DOC-E2E2-9');
  });

  it('KNOWN-GOOD TWIN — a notice with no posted receipt says so, on both sides', async () => {
    seedNotice(false);
    await i18n.changeLanguage(lng);
    const first = renderWithProviders(<BuyerShipments />, { identity: BUYER });
    const row = await screen.findByTestId(`ship-notice-${NOTICE}`);
    fireEvent.click(within(row).getByRole('button'));
    expect(await screen.findByTestId(`ship-notice-received-${NOTICE}-none`)).toHaveTextContent(tr('received.notice.none'));
    first.unmount();
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const cell = await screen.findByText(NOTICE);
    fireEvent.click(within(cell.closest('tr')!).getAllByRole('button')[0]);
    expect(await screen.findByTestId(`asn-received-${NOTICE}-none`)).toHaveTextContent(tr('received.notice.none'));
  });
});

describe.each(LOCALES)('E2E-2 · a receipt row never adds quantities of different materials [%s]', (lng) => {
  const ref = (materials: number, accepted: number, rejected: number) => ({
    grNumber: `GR-M-${materials}`,
    asnNumber: 'ASN-M',
    receivedDate: '2026-08-30',
    accepted,
    rejected,
    materials,
    settled: false,
  });

  it('one material: the quantity; several: how many; none of the order\'s: says so', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(
      <ReceivedOnOrder
        testId="rb"
        received={{ receipts: [ref(1, 900, 100), ref(2, 4800, 0), ref(0, 0, 0)], lines: [], fullyReceived: false }}
      />,
    );
    const one = screen.getByTestId('rb-receipt-GR-M-1');
    expect(one).toHaveTextContent(tr('received.receipt.accepted', { qty: '900' }));
    expect(one).toHaveTextContent(tr('received.receipt.rejected', { qty: '100' }));
    expect(one).toHaveTextContent(tr('received.receipt.posting'));
    const two = screen.getByTestId('rb-receipt-GR-M-2');
    expect(two).toHaveTextContent(tr('received.receipt.materials', { count: 2 }));
    expect(two.textContent).not.toMatch(/4[.,]800/);
    const none = screen.getByTestId('rb-receipt-GR-M-0');
    expect(none).toHaveTextContent(tr('received.receipt.noneOfOrder'));
    expect(none.textContent).not.toContain(tr('received.receipt.accepted', { qty: '0' }));
  });

  it('the same rule on a ship notice', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<ReceivedOnNotice testId="rn" receipts={[ref(2, 4800, 0)]} />);
    const two = screen.getByTestId('rn-receipt-GR-M-2');
    expect(two).toHaveTextContent(tr('received.receipt.materials', { count: 2 }));
    expect(two.textContent).not.toMatch(/4[.,]800/);
  });
});

describe('E2E-2 · the supplier dashboard does not ask a fully received order for a ship notice', () => {
  const orderRow = async () => {
    // The orders table row, not the briefing card: the row whose first cell is the number.
    const cells = await screen.findAllByText(FULL);
    return cells.map((c) => c.closest('tr')).find(Boolean)!;
  };

  it('the orders table reads "View" for it, and the briefing does not name it', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUP_002 });
    const row = await orderRow();
    await waitFor(() => expect(within(row).getByRole('button')).toHaveTextContent(tr('supplierDashboard.orders.action.view')));
    expect(within(row).queryByText(tr('supplierDashboard.orders.action.createAsn'))).toBeNull();
    expect(screen.queryByText(tr('supplierDashboard.briefing.asn.title', { po: FULL }))).toBeNull();
  });

  it('KNOWN-GOOD TWIN — with the receipt un-posted, the same order is asked for one in both places', async () => {
    goodsReceiptStore.update('gr-014', (g) => ({ ...g, status: 'Approved' }));
    renderWithProviders(<SupplierDashboard />, { identity: SUP_002 });
    const row = await orderRow();
    await waitFor(() => expect(within(row).getByRole('button')).toHaveTextContent(tr('supplierDashboard.orders.action.createAsn')));
    expect(await screen.findByText(tr('supplierDashboard.briefing.asn.title', { po: FULL }))).toBeInTheDocument();
  });
});

describe('E2E-2 · the shipment page does not offer a fully received order for a new ship notice', () => {
  it('the fully received order is not awaiting a ship notice; the same order with its receipt un-posted is', async () => {
    const first = renderWithProviders(<SupplierShipments />, { identity: SUP_002 });
    // The page's own data has landed (the title alone also renders while loading):
    // sup-002's seeded ship notice is listed, and the receipts read has settled.
    await screen.findByText('ASN-2025-00301');
    await waitFor(() => expect(goodsReceiptStore.all().length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByText(FULL)).toBeNull();
    first.unmount();
    // KNOWN-GOOD TWIN — the only thing changed is that the receipt is no longer posted.
    goodsReceiptStore.update('gr-014', (g) => ({ ...g, status: 'Approved' }));
    expect(receivedOnOrder(po(FULL), goodsReceiptStore.all()).fullyReceived).toBe(false);
    renderWithProviders(<SupplierShipments />, { identity: SUP_002 });
    expect(await screen.findByText(FULL)).toBeInTheDocument();
  });
});

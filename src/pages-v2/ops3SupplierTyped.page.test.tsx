// ─────────────────────────────────────────────────────────────────────────────
// OPS-3 — WHAT THE SUPPLIER TYPED ARRIVES. What a person sees.
//
// The dispatcher's half is `services/data/mock/ops3SupplierTyped.test.ts`. This
// file drives the two forms and reads the two sides:
//   · the supplier confirms an order with a date, a note and a short quantity,
//     and both the supplier's panel and the buyer's panel show the stored three;
//   · the buyer's timeline shows the time of that act, not seeded hours;
//   · the ship-notice form shows every order line at its confirmed quantity,
//     and what it sends is what the notice then holds;
//   · the buyer's shipments page lists the notice in its own state.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import type { QueryScope } from '../services/data/types';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { formatDate, formatDateTime } from '../lib/format';
import i18n from '../lib/i18n';
import SupplierOrders from './SupplierOrders';
import BuyerOrders from './BuyerOrders';
import SupplierShipments from './SupplierShipments';
import BuyerShipments from './BuyerShipments';
import { sentShipNotices } from './shipments/SupplierShipNotices';

const svc = new MockCommandService();
const supplierScope = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
/** The two-line order's supplier, as a seat. */
const SUP_005 = {
  ...SUPPLIER,
  supplierId: 'sup-005',
  supplierName: 'Sample Personal Care Emulsifiers GmbH',
};

beforeEach(async () => {
  purchaseOrderStore.reset();
  asnStore.reset();
  await i18n.changeLanguage('en');
});

describe('OPS-3 · the supplier confirms — the date, the note and the quantity are sent and shown back', () => {
  it('PO-2025-00108: a short quantity, a new date and a note reach the store and the panel reads them from it', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    await screen.findByText('PO-2025-00108');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    fireEvent.change(await screen.findByLabelText('Confirmed PK-PETB-8802'), {
      target: { value: '140000' },
    });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-04-25');
    fireEvent.change(dateInput, { target: { value: '2025-05-02' } });
    fireEvent.change(screen.getByPlaceholderText('Optional message…'), {
      target: { value: 'Mould change — one week late, 10,000 short.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();

    // THE STORE holds what was typed.
    const po = purchaseOrderStore.get('po-008')!;
    expect(po.confirmedDeliveryDate).toBe('2025-05-02');
    expect(po.confirmationNote).toBe('Mould change — one week late, 10,000 short.');
    expect(po.lineItems[0].confirmedQty).toBe(140000);
    expect(po.confirmedAt).toBeDefined();

    // And the panel shows the STORED values — the note, the time of the act.
    expect(screen.getByTestId('po-confirmed-note')).toHaveTextContent(
      'Mould change — one week late, 10,000 short.',
    );
    expect(screen.getAllByText(formatDateTime(po.confirmedAt)).length).toBeGreaterThan(0);
    expect(screen.getByTestId('po-confirmed-delivery')).toHaveTextContent('02 May 2025');
    expect(screen.getByTestId('po-line-confirmed-0')).toHaveTextContent('140,000 PCS');
  });

  it('⚠️ a later visit reads the same three back — the summary is not the form’s memory', async () => {
    await svc.dispatch(supplierScope('sup-007'), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: {
        confirmedQuantities: [140000],
        confirmedDeliveryDate: '2025-05-02',
        confirmationNote: 'Mould change.',
      },
    });
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    expect(await screen.findByTestId('po-confirmed-delivery')).toHaveTextContent('02 May 2025');
    expect(screen.getByTestId('po-confirmation-note')).toHaveTextContent('Mould change.');
    expect(screen.getByTestId('po-line-confirmed-0')).toHaveTextContent('140,000 PCS');
    expect(screen.getByTestId('po-confirmed-at')).toHaveTextContent(
      formatDateTime(purchaseOrderStore.get('po-008')!.confirmedAt),
    );
  });

  it('an order still awaiting confirmation shows no confirmation — known-absent', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    await screen.findByText('Key facts');
    expect(screen.queryByTestId('po-confirmed-delivery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('po-line-confirmed-0')).not.toBeInTheDocument();
  });
});

describe('OPS-3 · the buyer sees what the supplier confirmed, and when', () => {
  const confirm108 = () =>
    svc.dispatch(supplierScope('sup-007'), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: {
        confirmedQuantities: [140000],
        confirmedDeliveryDate: '2025-05-02',
        confirmationNote: 'Mould change.',
      },
    });

  it('the panel shows the confirmed date, the note and the confirmed quantity', async () => {
    expect((await confirm108()).status).toBe('done');
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    expect(await screen.findByTestId('buyer-po-confirmed-delivery')).toHaveTextContent('02 May 2025');
    expect(screen.getByTestId('buyer-po-confirmation-note')).toHaveTextContent('Mould change.');
    expect(screen.getByTestId('buyer-po-line-confirmed-li-008a')).toHaveTextContent('140,000 PCS');
  });

  it('⚠️ the timeline shows the real time of the act — not the seeded "96h after send"', async () => {
    expect((await confirm108()).status).toBe('done');
    const at = purchaseOrderStore.get('po-008')!.confirmedAt!;
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    await screen.findByText('Confirmed by Supplier');
    // Twice: the key fact and the timeline entry.
    expect(screen.getAllByText(formatDateTime(at))).toHaveLength(2);
    expect(screen.queryByText('96h after send')).not.toBeInTheDocument();
  });

  it('a seeded order has no act on record: its authored hours stay, and no time is shown', async () => {
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00107'));
    await screen.findByText('Confirmed by Supplier');
    expect(screen.getByText('48h after send')).toBeInTheDocument();
    expect(screen.queryByTestId('buyer-po-confirmed-at')).not.toBeInTheDocument();
    // The seeded confirmed date and quantity are still read back.
    expect(screen.getByTestId('buyer-po-confirmed-delivery')).toHaveTextContent('08 Apr 2025');
  });

  it('an order not yet confirmed shows no confirmation block — known-absent', async () => {
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    await screen.findByText('Confirmed by Supplier');
    expect(screen.queryByTestId('buyer-po-confirmed-delivery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('buyer-po-line-confirmed-li-008a')).not.toBeInTheDocument();
    // …and it never claimed an acknowledgement time for an order nobody acknowledged.
    expect(screen.queryByText('96h after send')).not.toBeInTheDocument();
  });
});

describe('OPS-3 · the ship-notice form — every line, the confirmed quantity, and all of it sent', () => {
  const confirm105Short = () =>
    svc.dispatch(supplierScope('sup-005'), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-005',
      payload: { confirmedQuantities: [4500, 300], confirmedDeliveryDate: '2025-05-20' },
    });

  it('walks the form for a two-line order and stores what the review step showed', async () => {
    expect((await confirm105Short()).status).toBe('done');
    const before = new Set(asnStore.all().map((a) => a.asnNumber));
    const { container } = renderWithProviders(<SupplierShipments />, { identity: SUP_005 });
    fireEvent.click(await screen.findByRole('tab', { name: /Create ASN/ }));

    // STEP 1 — both lines of the order, at the CONFIRMED quantity.
    const lines = await screen.findByTestId('asn-po-lines-po-005');
    expect(within(lines).getAllByRole('listitem')).toHaveLength(2);
    expect(lines).toHaveTextContent('4,500 KG');
    expect(lines).toHaveTextContent('300 KG');
    expect(lines).not.toHaveTextContent('5,000 KG');
    fireEvent.click(screen.getByText('PO-2025-00105'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // STEP 2 — one lot per line; packages, weight, batch, notes.
    fireEvent.change(await screen.findByPlaceholderText('e.g. SMPL2026001234'), {
      target: { value: 'TRK-OPS3-UI' },
    });
    const dates = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: '2026-09-01' } });
    fireEvent.change(dates[1], { target: { value: '2026-09-04' } });
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: '42' } });
    fireEvent.change(numbers[1], { target: { value: '5120.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. PKG-2026-441'), {
      target: { value: 'B-0901' },
    });
    fireEvent.change(screen.getByLabelText('Lot number AI-NIAC-6601'), {
      target: { value: 'LOT-NIAC-77' },
    });
    fireEvent.change(screen.getByLabelText('Lot number AI-HYALU-6610'), {
      target: { value: 'LOT-HYA-12' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Temperature controlled/), {
      target: { value: 'Keep below 25 °C.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // STEP 3 — the review shows every line and every value.
    const review = await screen.findByTestId('asn-review-lines');
    expect(within(review).getAllByRole('row')).toHaveLength(3);
    expect(review).toHaveTextContent('4,500 KG');
    expect(review).toHaveTextContent('LOT-NIAC-77');
    expect(review).toHaveTextContent('LOT-HYA-12');
    expect(screen.getByText('5120.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Keep below 25 °C.')).toBeInTheDocument();
    expect(
      screen.getByText('All values shown will be transmitted to Paragon and stored on the ship notice.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit ASN' }));

    // WHAT WAS SHOWN IS WHAT IS STORED.
    await waitFor(() =>
      expect(asnStore.all().some((a) => !before.has(a.asnNumber) && a.status === 'Submitted')).toBe(true),
    );
    const asn = asnStore.all().find((a) => !before.has(a.asnNumber))!;
    expect(asn.poReference).toBe('PO-2025-00105');
    expect(asn.trackingNumber).toBe('TRK-OPS3-UI');
    expect(asn.eta).toBe('2026-09-04');
    expect(asn.details.shipDate).toBe('2026-09-01');
    expect(asn.details.totalCartons).toBe(42);
    expect(asn.details.grossWeightKg).toBe(5120.5);
    expect(asn.details.batchNumber).toBe('B-0901');
    expect(asn.details.notes).toBe('Keep below 25 °C.');
    expect(asn.lineItems.map((l) => [l.materialCode, l.shippedQty, l.lotNumber])).toEqual([
      ['AI-NIAC-6601', 4500, 'LOT-NIAC-77'],
      ['AI-HYALU-6610', 300, 'LOT-HYA-12'],
    ]);
  });

  it('a package count that is not a whole number above zero stops the step and says why', async () => {
    expect((await confirm105Short()).status).toBe('done');
    const { container } = renderWithProviders(<SupplierShipments />, { identity: SUP_005 });
    fireEvent.click(await screen.findByRole('tab', { name: /Create ASN/ }));
    fireEvent.click(await screen.findByText('PO-2025-00105'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(await screen.findByPlaceholderText('e.g. SMPL2026001234'), {
      target: { value: 'TRK' },
    });
    const dates = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[1], { target: { value: '2026-09-04' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. PKG-2026-441'), { target: { value: 'B' } });
    // Known-good first: with the numbers blank the step may proceed.
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.queryByTestId('asn-number-refusal')).not.toBeInTheDocument();
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: '2.5' } });
    expect(screen.getByTestId('asn-number-refusal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('OPS-3 · supplier ship notices appear on the buyer’s shipments page, in their own state', () => {
  it('the population: every sent notice, and no draft', () => {
    const all = asnStore.all();
    const sent = sentShipNotices(all);
    expect(all.some((a) => a.status === 'Draft')).toBe(true);
    expect(sent.some((a) => a.status === 'Draft')).toBe(false);
    expect(sent.map((a) => a.asnNumber)).toContain('ASN-2025-00302');
    expect(sent.length).toBe(all.filter((a) => a.status !== 'Draft').length);
  });

  it('lists each sent notice with its state, and leaves the draft out', async () => {
    renderWithProviders(<BuyerShipments />, { identity: BUYER });
    const section = await screen.findByTestId('supplier-ship-notices');
    await within(section).findByTestId('ship-notice-ASN-2025-00302');
    const draft = asnStore.all().find((a) => a.status === 'Draft')!;
    expect(within(section).queryByTestId(`ship-notice-${draft.asnNumber}`)).not.toBeInTheDocument();
    for (const a of sentShipNotices(asnStore.all())) {
      expect(within(section).getByTestId(`ship-notice-${a.asnNumber}`)).toBeInTheDocument();
    }
    expect(within(section).getByTestId('ship-notices-count')).toHaveTextContent(
      `${sentShipNotices(asnStore.all()).length} notices`,
    );
  });

  it('⚠️ a notice the supplier just submitted is there, with what was typed and the confirmed quantity', async () => {
    await svc.dispatch(supplierScope('sup-005'), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-005',
      payload: { confirmedQuantities: [4500, 300] },
    });
    const made = await svc.dispatch(supplierScope('sup-005'), {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: 'PO-2025-00105',
        packages: 42,
        grossWeightKg: 5120,
        shipDate: '2026-09-01',
        batchNumber: 'B-0901',
        lotNumbers: ['LOT-NIAC-77', 'LOT-HYA-12'],
        notes: 'Keep below 25 °C.',
      },
    });
    const asnNumber = made.entityId!;
    // A DRAFT is the supplier's own — not on the buyer's page yet.
    const first = renderWithProviders(<BuyerShipments />, { identity: BUYER });
    await screen.findByTestId('ship-notice-ASN-2025-00302');
    expect(screen.queryByTestId(`ship-notice-${asnNumber}`)).not.toBeInTheDocument();
    first.unmount();

    await svc.dispatch(supplierScope('sup-005'), {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: asnNumber,
      payload: { carrier: 'Sample Courier (illustrative)', trackingNumber: 'TRK-9', eta: '2026-09-04' },
    });
    renderWithProviders(<BuyerShipments />, { identity: BUYER });
    const row = await screen.findByTestId(`ship-notice-${asnNumber}`);
    expect(row).toHaveTextContent('PO-2025-00105');
    expect(row).toHaveTextContent('Sample Personal Care Emulsifiers GmbH');
    expect(row).toHaveTextContent('Submitted');
    expect(row).toHaveTextContent('TRK-9');
    expect(row).toHaveTextContent(formatDate('2026-09-01'));
    expect(row).toHaveTextContent('42');
    expect(row).toHaveTextContent('5,120 kg');
    fireEvent.click(within(row).getByRole('button'));
    const detail = await screen.findByTestId(`ship-notice-detail-${asnNumber}`);
    expect(detail).toHaveTextContent('B-0901');
    expect(detail).toHaveTextContent('Keep below 25 °C.');
    expect(detail).toHaveTextContent('LOT-NIAC-77');
    expect(detail).toHaveTextContent('4,500');
    expect(detail).toHaveTextContent('5,000');
  });

  it('the page’s search narrows the notices too', async () => {
    renderWithProviders(<BuyerShipments />, { identity: BUYER });
    await screen.findByTestId('ship-notice-ASN-2025-00302');
    fireEvent.change(screen.getByPlaceholderText(i18n.t('shipments.search.placeholder')), {
      target: { value: 'ASN-2025-00302' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('ship-notices-count')).toHaveTextContent('1 notice'),
    );
    expect(screen.getByTestId('ship-notices-count')).not.toHaveTextContent('notices');
  });
});

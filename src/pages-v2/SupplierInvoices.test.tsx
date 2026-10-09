import { screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import SupplierInvoices from './SupplierInvoices';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no invoices on file (sup-007/002/005 have fixtures).
const SUPPLIER_NO_INVOICES: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('SupplierInvoices — four honest states', () => {
  it('data: renders the scoped invoice workspace for the seeded supplier', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    expect(await screen.findByText('My Invoices')).toBeInTheDocument();
    expect(await screen.findByText('Payments Released')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Payments Released')).not.toBeInTheDocument();
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

// ── E2E-2 — THE NEW-INVOICE FORM OPENS ON THE ORDER'S LINES ────────────────
//
// ⚠️ **THE BLOCK THAT STOOD HERE IS RETIRED WITH ITS SUBJECT, NOT WEAKENED.** It
// held six claims about a free-typed "Amount (IDR)" field (CP-0 · W1 · 2f-d):
// that it was `type="text"`, that a blank did not nag, that "1.500" refused,
// that "185.000.000" read, that a typed zero said so, and that a readable
// amount enabled the create. The end-to-end walk found that field was the
// defect: an invoice took an order number and any amount a supplier typed.
// By ruling the form now opens on the order's lines, at the order's prices,
// for the quantity received and accepted, and the supplier may lower a
// quantity and never exceed it. The amount is the lines' total and is not typed.
//
// Each retired claim has its counterpart below on the QUANTITY field, which is
// read by the same parser (`readInvoiceAmount`, still held by
// `invoiceAmountModel.test.ts`): the input contract, the blank, the
// cross-convention token, the zero, the positive twin — plus the two the old
// field could not have: the ceiling, and an order with nothing received.
const SUP_002: CurrentIdentity = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'sup-002' };
/** sup-002's Confirmed order that is fully received: 8,000 KG accepted at Rp 109.375. */
const PO_RECEIVED = 'PO-2025-00102';
const MATERIAL = 'RM-EMUL-9410';
const QTY_LABEL = `Quantity to invoice for ${MATERIAL}`;

describe('SupplierInvoices — the new invoice opens on the order\'s lines (E2E-2)', () => {
  beforeEach(() => {
    invoiceStore.reset();
  });

  const openNewInvoice = async (identity: CurrentIdentity, po: string) => {
    renderWithProviders(<SupplierInvoices />, { identity });
    await screen.findByText('My Invoices');
    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
    fireEvent.change(await screen.findByLabelText('Purchase order'), { target: { value: po } });
  };
  const create = () => screen.getByRole('button', { name: 'Create draft' });

  it('no order chosen: no lines, no amount field, and the create is held', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUP_002 });
    await screen.findByText('My Invoices');
    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
    await screen.findByLabelText('Purchase order');
    expect(screen.queryByTestId('invoice-lines')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Amount (IDR)')).not.toBeInTheDocument();
    expect(create()).toBeDisabled();
  });

  it('POSITIVE TWIN — the lines open on the order\'s price and the accepted quantity, and the create is enabled', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    const qty = await screen.findByLabelText(QTY_LABEL);
    expect(qty).toHaveValue('8000');
    const line = screen.getByTestId(`invoice-line-${MATERIAL}`);
    expect(line).toHaveTextContent('Rp 109.375');
    expect(screen.getByTestId(`invoice-line-accepted-${MATERIAL}`)).toHaveTextContent('8,000 KG');
    expect(screen.getByTestId('invoice-lines-total')).toHaveTextContent('Rp 875.000.000');
    expect(screen.queryByTestId(`invoice-qty-refusal-${MATERIAL}`)).not.toBeInTheDocument();
    expect(create()).not.toBeDisabled();
  });

  it('THE LOCK — the quantity input is not type="number" (Ruling 6.2)', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    const qty = await screen.findByLabelText(QTY_LABEL);
    expect(qty).toHaveAttribute('type', 'text');
    expect(qty).toHaveAttribute('inputmode', 'decimal');
    expect(qty).not.toHaveAttribute('min');
    expect(qty).not.toHaveAttribute('max');
  });

  it('a LOWER quantity is admitted, and the amount follows it', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    fireEvent.change(await screen.findByLabelText(QTY_LABEL), { target: { value: '5000' } });
    expect(screen.queryByTestId(`invoice-qty-refusal-${MATERIAL}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('invoice-lines-total')).toHaveTextContent('Rp 546.875.000');
    expect(create()).not.toBeDisabled();
  });

  it('ONE MORE than was accepted REFUSES, names the ceiling, and holds the create', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    const qty = await screen.findByLabelText(QTY_LABEL);
    fireEvent.change(qty, { target: { value: '8001' } });
    const refusal = screen.getByTestId(`invoice-qty-refusal-${MATERIAL}`);
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal).toHaveTextContent(
      'More than was received and accepted on this line (8,000 KG). Invoice that quantity or less.',
    );
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('invoice-lines-total')).toHaveTextContent('—');
    expect(create()).toBeDisabled();
  });

  it('a cleared field speaks — a blank is not a quantity of zero', async () => {
    // The field is SEEDED now, so a blank is something the supplier did (the
    // 2f-a/2f-c rule for seeded cells), where the retired amount field was
    // unseeded and stayed silent.
    await openNewInvoice(SUP_002, PO_RECEIVED);
    fireEvent.change(await screen.findByLabelText(QTY_LABEL), { target: { value: '' } });
    expect(screen.getByTestId(`invoice-qty-refusal-${MATERIAL}`).textContent).toMatch(/a blank is not a quantity of zero/i);
    expect(create()).toBeDisabled();
  });

  it('a cross-convention "1.500" REFUSES — it is not silently read as 1.5', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    fireEvent.change(await screen.findByLabelText(QTY_LABEL), { target: { value: '1.500' } });
    expect(screen.getByTestId(`invoice-qty-refusal-${MATERIAL}`).textContent).toMatch(/can be read two ways/i);
    expect(create()).toBeDisabled();
  });

  it('a typed zero on the only line says that nothing is being invoiced', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    fireEvent.change(await screen.findByLabelText(QTY_LABEL), { target: { value: '0' } });
    expect(screen.queryByTestId(`invoice-qty-refusal-${MATERIAL}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('invoice-lines-all-zero')).toHaveTextContent(
      'Every line is at zero. Invoice a quantity on at least one line.',
    );
    expect(create()).toBeDisabled();
  });

  it('an order with NOTHING received says so, shows no lines, and holds the create', async () => {
    // sup-007's PO-2025-00107 is Confirmed and no receipt on it is posted.
    await openNewInvoice(SUPPLIER, 'PO-2025-00107');
    expect(await screen.findByTestId('invoice-nothing-received')).toHaveTextContent(
      'Nothing has been received and accepted on this order yet, so there is nothing to invoice.',
    );
    expect(screen.queryByTestId('invoice-lines')).not.toBeInTheDocument();
    expect(create()).toBeDisabled();
  });

  it('creating the draft stores the lines and their total — the number shown is the number stored', async () => {
    await openNewInvoice(SUP_002, PO_RECEIVED);
    fireEvent.change(await screen.findByLabelText(QTY_LABEL), { target: { value: '5000' } });
    const before = invoiceStore.all().map((i) => i.id);
    fireEvent.click(create());
    await waitFor(() => expect(invoiceStore.all().length).toBe(before.length + 1));
    const made = invoiceStore.all().find((i) => !before.includes(i.id))!;
    expect(made.poNumber).toBe(PO_RECEIVED);
    expect(made.lines).toEqual([{ materialCode: MATERIAL, qty: 5000, unitPrice: 109_375 }]);
    expect(made.amount).toBe(546_875_000);
    expect(made.status).toBe('Draft');
  });

  it('ID — the lines, the ceiling refusal and the nothing-received sentence read Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierInvoices />, { identity: SUP_002 });
      fireEvent.click(await screen.findByRole('button', { name: i18n.t('supplierInvoices.new.title') }));
      fireEvent.change(await screen.findByLabelText(i18n.t('supplierInvoices.new.poLabel')), {
        target: { value: PO_RECEIVED },
      });
      const qty = await screen.findByLabelText(`Kuantitas yang difakturkan untuk ${MATERIAL}`);
      fireEvent.change(qty, { target: { value: '8001' } });
      expect(screen.getByTestId(`invoice-qty-refusal-${MATERIAL}`)).toHaveTextContent(
        'Lebih banyak daripada yang diterima dan disetujui pada baris ini (8.000 KG). Fakturkan kuantitas itu atau kurang.',
      );
      expect(screen.getByTestId('invoice-lines')).toHaveTextContent('Diterima dan disetujui');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// OPS-1 · MONEY — what finance and the supplier are shown.
//
// The documents are produced through the shipped dispatcher (confirm, receive,
// post, invoice), then the two pages are rendered over them. The service rules
// are `services/data/mock/ops1Money.test.ts`; this file is the rendered copy.
// ────────────────────────────────────────────────────────────────────────────
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER, nameUnnamedApprovals } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import type { QueryScope, InspectionResult, ASN } from '../services/data/types';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import { personLabel } from '../services/identity/personLabel';
import type { ActorAttribution } from '../lib/enforcement';
import { NO_PERSON } from '../context/noPerson';
import i18n from '../lib/i18n';
import BuyerInvoices from './BuyerInvoices';
import SupplierInvoices from './SupplierInvoices';
import { useToast } from '../hooks/useToast';

/** Surfaces the toast queue into the DOM — the provider renders only children. */
function ToastSpy() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id}>{x.description}</li>
      ))}
    </ul>
  );
}
const Finance = () => (
  <>
    <BuyerInvoices />
    <ToastSpy />
  </>
);

const svc = new MockCommandService();
const PO = 'PO-2025-00105';
const B = 1_000_000_000;

const personWith = (role: string): ActorAttribution => {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role)!;
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};
const FINANCE_ACTOR = personWith('finance');
const OTHER_ACTOR = personWith('buyer_all');
const idOf = (a: ActorAttribution) => (a.kind === 'RESOLVED' ? a.person.personId : '');
const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o) as string;
const label = (a: ActorAttribution) => personLabel(idOf(a), t);

const FINANCE_1: CurrentIdentity = { ...BUYER, businessRoles: ['finance'], actor: FINANCE_ACTOR };
const FINANCE_OTHER: CurrentIdentity = { ...BUYER, businessRoles: ['finance'], actor: OTHER_ACTOR };
const FINANCE_NOBODY: CurrentIdentity = { ...BUYER, businessRoles: ['finance'], actor: NO_PERSON };
const SUP_005: CurrentIdentity = { ...SUPPLIER, supplierId: 'sup-005', supplierName: 'Sample Personal Care Emulsifiers GmbH' };

const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier, actor: NO_PERSON };
const receiving: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: NO_PERSON };
const financeScope = (actor: QueryScope['actor']): QueryScope => ({
  personaType: 'buyer', supplierId: null, businessRoles: ['finance'] as QueryScope['businessRoles'], actor,
});

const ok = async (p: Promise<{ status: string; reason?: string; entityId?: string; correlationId: string }>) => {
  const res = await p;
  expect(res.status, res.reason).not.toBe('failed');
  return res;
};
const line = (materialCode: string, acc: number): InspectionResult => ({
  materialCode, description: materialCode, qtyExpected: acc, qtyReceived: acc, qtyAccepted: acc, qtyRejected: 0,
  // OPS-2b — EDITED ON PURPOSE. These lines carried no seal or lot answer and were
  // accepted anyway; the dispatcher now refuses to accept a line whose required
  // regulatory check is unanswered (`gr_receipt_compliant`), so a receipt this
  // spec means to ACCEPT records both, as the receiving form does.
  halalSealCheck: 'Pass',
  bpomLotCheck: 'Pass',
  visualCheck: 'Pass', packagingCheck: 'Pass',
});
const asn = (asnNumber: string): ASN => ({
  asnNumber, supplierId: 'sup-005', poReference: PO, status: 'Submitted', carrier: 'Sample Courier', trackingNumber: 'T', eta: '2026-08-31',
  details: { originCity: 'Hamburg', destinationWarehouse: 'NDC J6, Jakarta', totalCartons: 1, grossWeightKg: 1, temperatureRequirement: 'Ambient' },
  lineItems: [
    { materialCode: 'AI-NIAC-6601', description: 'Niacinamide', orderedQty: 5000, shippedQty: 5000, lotNumber: 'L1' },
    { materialCode: 'AI-HYALU-6610', description: 'Sodium Hyaluronate', orderedQty: 300, shippedQty: 300, lotNumber: 'L2' },
  ],
});

let seq = 0;
const receiveAndPost = async (niacinamide: number) => {
  const asnNumber = `ASN-OPS1P-${++seq}`;
  asnStore.add(asn(asnNumber));
  const gr = await ok(svc.dispatch(receiving, {
    transitionId: 't_gr_create', entity: 'goodsReceipt',
    payload: { asnReference: asnNumber, receivedDate: '2026-08-31', receivedBy: 'QC Inspector', inspectionResults: [line('AI-NIAC-6601', niacinamide), line('AI-HYALU-6610', 300)] },
  }));
  for (const verb of ['t_gr_start_inspection', 't_gr_approve', 't_gr_post']) {
    await ok(svc.dispatch(receiving, { transitionId: verb, entity: 'goodsReceipt', entityId: gr.entityId! }));
  }
};
const invoice = async (amount: number): Promise<string> => {
  const c = await ok(svc.dispatch(supplier, { transitionId: 't_invoice_create', entity: 'invoice', payload: { poReference: PO, amount } }));
  await ok(svc.dispatch(supplier, { transitionId: 't_invoice_submit', entity: 'invoice', entityId: c.entityId!, payload: { amount } }));
  return c.entityId!;
};
const confirmPo = () =>
  ok(svc.dispatch(supplier, { transitionId: 't_po_confirm', entity: 'purchaseOrder', entityId: 'po-005', payload: { poId: 'po-005', confirmedQuantities: [5000, 300] } }));
const numberOf = (id: string) => invoiceStore.get(id)!.invoiceNumber;

/** The table row of an invoice number — the number also appears in the dispute banner. */
const rowOf = async (invoiceNumber: string): Promise<HTMLElement> => {
  const hits = await screen.findAllByText(invoiceNumber);
  const row = hits.map((h) => h.closest('tr')).find((r): r is HTMLTableRowElement => r !== null);
  expect(row, `no table row for ${invoiceNumber}`).toBeDefined();
  return row!;
};
const openNumber = async (invoiceNumber: string) => {
  const row = await rowOf(invoiceNumber);
  fireEvent.click(within(row).getAllByText(invoiceNumber)[0]);
  return screen.findByRole('dialog');
};
const openInvoice = (id: string) => openNumber(numberOf(id));
/** The description of the first toast matching `re`. */
const toastText = async (re: RegExp): Promise<string> => {
  let found = '';
  await waitFor(() => {
    const items = [...screen.getByTestId('toast-spy').querySelectorAll('li')].map((li) => li.textContent ?? '');
    const hit = items.find((x) => re.test(x));
    expect(hit, `no toast matching ${re} among ${JSON.stringify(items)}`).toBeDefined();
    found = hit!;
  });
  return found;
};

beforeEach(async () => {
  purchaseOrderStore.reset();
  goodsReceiptStore.reset();
  asnStore.reset();
  invoiceStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('OPS-1 · finance reads what the verdict rests on', () => {
  it('the second invoice for the same goods is held, with the reason and the four figures', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    await receiveAndPost(5000);
    renderWithProviders(<Finance />, { identity: FINANCE_1 });

    const held = await openInvoice(b);
    expect(within(held).getByTestId('invoice-match-desc')).toHaveTextContent(
      'Earlier invoices on this purchase order already claim what was received: Rp 2.000.000.000 is already invoiced and Rp 0 is left to pay.',
    );
    const figures = within(held).getByTestId('invoice-match-figures');
    expect(figures).toHaveTextContent('Ordered (confirmed quantity × PO price)Rp 2.000.000.000');
    expect(figures).toHaveTextContent('Received and acceptedRp 2.000.000.000');
    expect(figures).toHaveTextContent('Already invoicedRp 2.000.000.000');
    expect(figures).toHaveTextContent('This invoiceRp 2.000.000.000');
    // not disputed: no dispute section, and so no "no reason was recorded" on an invoice nobody disputed
    expect(within(held).queryByTestId('invoice-dispute-reason')).not.toBeInTheDocument();
    // held: nothing to approve
    expect(within(held).queryByRole('button', { name: 'Approve for payment' })).not.toBeInTheDocument();
    // the stated total disagrees with the lines, and the drawer says which one was used
    expect(within(held).getByTestId('invoice-po-total-disagrees')).toHaveTextContent(
      'The purchase order states a total of Rp 1.800.000.000, but its lines come to Rp 2.000.000.000; the match uses the lines.',
    );
    expect(invoiceStore.get(a)!.status).toBe('Matched');
  });

  it('half received: the invoice is held as more than was received, never as a price variance', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    await receiveAndPost(2500);
    renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openInvoice(a);
    expect(within(d).getByTestId('invoice-match-desc')).toHaveTextContent(
      'Invoiced for more than was received and accepted: Rp 2.000.000.000 is invoiced and Rp 1.450.000.000 is payable on what was received.',
    );
    expect(within(d).queryByText(/unit price exceeds/i)).not.toBeInTheDocument();
    expect(within(d).queryByText(/quantities \+ prices all reconcile/i)).not.toBeInTheDocument();
  });

  it('a seeded row with no figures says it carries none, and claims no reconciliation', async () => {
    renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const seeded = invoiceStore.all().find((i) => i.status === 'Approved' && i.matchStatus === 'Matched')!;
    const d = await openNumber(seeded.invoiceNumber);
    expect(within(d).getByTestId('invoice-match-desc')).toHaveTextContent('Recorded as matched. This row carries no match figures.');
    expect(within(d).queryByTestId('invoice-match-figures')).not.toBeInTheDocument();
  });
});

describe('OPS-1 · who approved and who released', () => {
  const matchedInvoice = async () => {
    await confirmPo();
    await receiveAndPost(5000);
    return invoice(2 * B);
  };

  it('the approval toast names the seated person, and the drawer shows them as approver', async () => {
    const id = await matchedInvoice();
    renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openInvoice(id);
    fireEvent.click(await within(d).findByRole('button', { name: 'Approve for payment' }));
    expect(await toastText(/^Approved by /)).toBe(`Approved by ${label(FINANCE_ACTOR)}. The payment is released by somebody else.`);
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/no person is resolved in this session/i);
    await waitFor(() => expect(screen.getByTestId('invoice-approver')).toHaveTextContent(label(FINANCE_ACTOR)));
    expect(invoiceStore.get(id)!.approvedBy).toEqual(FINANCE_ACTOR);
  });

  // ⚠️ REVERSED AT OPS-2, BY OPERATOR RULING. This read *"with nobody seated
  // the toast still says the approval was recorded without a named approver"*
  // and asserted the toast "Recorded without a named approver — no person is
  // resolved in this session". That sentence is deleted with the behaviour: the
  // approval is refused, the toast says why and what to do, and the invoice
  // does not move.
  it('with nobody seated the approval is REFUSED, and the toast says whose name it needs', async () => {
    const id = await matchedInvoice();
    renderWithProviders(<Finance />, { identity: FINANCE_NOBODY });
    const d = await openInvoice(id);
    fireEvent.click(await within(d).findByRole('button', { name: 'Approve for payment' }));
    expect(await toastText(/This seat names no person/)).toBe(
      'This seat names no person, and an approval is recorded against the person who decided it. Choose a sample user on the identity panel, then approve again.',
    );
    expect(invoiceStore.get(id)!.status).toBe('Matched');
    expect(invoiceStore.get(id)!.approvedBy).toBeUndefined();
  });

  it('OPS-2 — a seeded approval that names nobody offers Approve again, not Release; a named person takes it', async () => {
    const seeded = invoiceStore.all().find((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED')!;
    expect(seeded, 'the seed holds an Approved invoice with no named approver').toBeDefined();
    renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openNumber(seeded.invoiceNumber);
    // The release is not offered on an approval nobody answers for…
    expect(within(d).queryByRole('button', { name: 'Release payment' })).not.toBeInTheDocument();
    expect(within(d).getByTestId('invoice-approval-unnamed')).toHaveTextContent(
      'No named person approved this invoice. A named person approves it again before its payment is released.',
    );
    // …the way back is, and it records who took it.
    fireEvent.click(await within(d).findByRole('button', { name: 'Approve again' }));
    await waitFor(() => expect(invoiceStore.get(seeded.id)!.approvedBy).toEqual(FINANCE_ACTOR));
    expect(invoiceStore.get(seeded.id)!.status).toBe('Approved');
    await waitFor(() =>
      expect(within(d).queryByTestId('invoice-approval-unnamed')).not.toBeInTheDocument(),
    );
    expect(await within(d).findByRole('button', { name: 'Release payment' })).toBeInTheDocument();
    expect(within(d).getByTestId('invoice-approver')).toHaveTextContent(label(FINANCE_ACTOR));
  });

  it('OPS-2 — a seat that names nobody is refused Approve again too, by the same sentence', async () => {
    const seeded = invoiceStore.all().find((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED')!;
    renderWithProviders(<Finance />, { identity: FINANCE_NOBODY });
    const d = await openNumber(seeded.invoiceNumber);
    fireEvent.click(await within(d).findByRole('button', { name: 'Approve again' }));
    expect(await toastText(/This seat names no person/)).toContain('then approve again');
    expect(invoiceStore.get(seeded.id)!.approvedBy).toBeUndefined();
  });

  it('the approver is refused the release BY NAME, and no person id reaches the reader', async () => {
    const id = await matchedInvoice();
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), { transitionId: 't_invoice_approve', entity: 'invoice', entityId: id }));
    renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openInvoice(id);
    fireEvent.click(await within(d).findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await within(d).findByRole('button', { name: /^Confirm release/ }));
    const said = await toastText(/may not also release its payment/);
    expect(said).toBe(
      `${label(FINANCE_ACTOR)} approved this invoice and may not also release its payment. Approving an invoice and releasing its money are two authorities — somebody else releases it.`,
    );
    expect(document.body.textContent).not.toContain(idOf(FINANCE_ACTOR));
    expect(invoiceStore.get(id)!.status).toBe('Approved');
  });

  it('a seat with nobody in it is refused the release of a named approval, and told to pick a user', async () => {
    const id = await matchedInvoice();
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), { transitionId: 't_invoice_approve', entity: 'invoice', entityId: id }));
    renderWithProviders(<Finance />, { identity: FINANCE_NOBODY });
    const d = await openInvoice(id);
    fireEvent.click(await within(d).findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await within(d).findByRole('button', { name: /^Confirm release/ }));
    expect(await toastText(/approved by a named person/)).toBe(
      'This invoice was approved by a named person, so its payment must be released by a named person who is not the approver. Pick a sample user on the identity panel, then try again.',
    );
    expect(invoiceStore.get(id)!.status).toBe('Approved');
  });

  it('a different person releases it; the confirmation says the bank account is not held in the portal', async () => {
    const id = await matchedInvoice();
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), { transitionId: 't_invoice_approve', entity: 'invoice', entityId: id }));
    renderWithProviders(<Finance />, { identity: FINANCE_OTHER });
    const d = await openInvoice(id);
    fireEvent.click(await within(d).findByRole('button', { name: 'Release payment' }));
    expect(
      await within(d).findByText(/will be released\. The supplier’s bank account is not held in the portal — SAP pays to the account on the vendor record\./),
    ).toBeInTheDocument();
    expect(within(d).queryByText(/will be transferred to/)).not.toBeInTheDocument();
    fireEvent.click(within(d).getByRole('button', { name: /^Confirm release/ }));
    await waitFor(() => expect(invoiceStore.get(id)!.releasedBy).toEqual(OTHER_ACTOR));
    await waitFor(() => expect(screen.getByTestId('invoice-releaser')).toHaveTextContent(label(OTHER_ACTOR)));
    // The page settles the release about 1.2 s later. Wait for it here: invoice numbers
    // restart with every store reset, so a settle left pending would land on the NEXT
    // test's INV-2026-9001.
    await waitFor(() => expect(invoiceStore.get(id)!.status).toBe('Payment Released'), { timeout: 4000 });
  });

  it('an invoice that carries a bank account still names it', async () => {
    // OPS-2 — the seeded approval names nobody; a named person approves it
    // again first, so the release confirmation this spec reads is offered.
    await nameUnnamedApprovals();
    renderWithProviders(<Finance />, { identity: FINANCE_OTHER });
    const seeded = invoiceStore.all().find((i) => i.status === 'Approved' && i.bankAccount)!;
    const d = await openNumber(seeded.invoiceNumber);
    fireEvent.click(await within(d).findByRole('button', { name: 'Release payment' }));
    expect(await within(d).findByText(/will be transferred to/)).toBeInTheDocument();
    expect(within(d).getAllByText(seeded.bankAccount).length).toBeGreaterThan(0);
  });
});

describe('OPS-1 · the dispute reason reaches both sides', () => {
  it('finance reads the reason it wrote; the supplier reads the same words', async () => {
    await confirmPo();
    const id = await invoice(2 * B);
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), {
      transitionId: 't_invoice_dispute', entity: 'invoice', entityId: id, payload: { disputeReason: 'Third invoice for one purchase order.' },
    }));
    const buyerView = renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openInvoice(id);
    expect(within(d).getByTestId('invoice-dispute-reason')).toHaveTextContent('Third invoice for one purchase order.');
    expect(screen.getByText(/payment is held until each dispute is resolved/)).toBeInTheDocument();
    expect(screen.queryByText(/Quantity mismatch on PT Sample Packaging/)).not.toBeInTheDocument();
    buyerView.unmount();

    renderWithProviders(<SupplierInvoices />, { identity: SUP_005 });
    await openInvoice(id);
    expect(await screen.findByTestId('supplier-invoice-dispute-note')).toHaveTextContent(
      'This invoice is disputed. Payment is held until Paragon finance resolves it. Paragon’s reason: Third invoice for one purchase order.',
    );
    expect(screen.queryByText(/Quantity mismatch\. Credit note required/)).not.toBeInTheDocument();
  });

  it('a seeded dispute with no reason says none was recorded, to both', async () => {
    const seeded = invoiceStore.all().find((i) => i.status === 'Disputed' && i.supplierId === 'sup-005')!;
    const buyerView = renderWithProviders(<Finance />, { identity: FINANCE_1 });
    await openNumber(seeded.invoiceNumber);
    expect(await screen.findByTestId('invoice-dispute-reason')).toHaveTextContent('No reason was recorded for this dispute.');
    buyerView.unmount();
    renderWithProviders(<SupplierInvoices />, { identity: SUP_005 });
    await openNumber(seeded.invoiceNumber);
    expect(await screen.findByTestId('supplier-invoice-dispute-note')).toHaveTextContent('Paragon recorded no reason.');
  });
});

describe('OPS-1 · the supplier is not told money arrived before the bank says so', () => {
  const released = async (): Promise<string> => {
    await confirmPo();
    await receiveAndPost(5000);
    const id = await invoice(2 * B);
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), { transitionId: 't_invoice_approve', entity: 'invoice', entityId: id }));
    const rel = await ok(svc.dispatch(financeScope(OTHER_ACTOR), { transitionId: 't_invoice_release_payment', entity: 'invoice', entityId: id }));
    await svc.settle(financeScope(OTHER_ACTOR), rel.correlationId);
    expect(invoiceStore.get(id)!.status).toBe('Payment Released');
    return id;
  };

  it('at Payment Released the panel says the payment was released and that the bank has not confirmed it', async () => {
    const id = await released();
    renderWithProviders(<SupplierInvoices />, { identity: SUP_005 });
    expect(await screen.findByText('Payments Released')).toBeInTheDocument();
    expect(screen.queryByText('Payments Received')).not.toBeInTheDocument();
    const row = await rowOf(numberOf(id));
    fireEvent.click(within(row).getByRole('button', { name: 'Payment details' }));
    expect(await screen.findByTestId('supplier-payment-released')).toHaveTextContent(
      'Paragon has released this payment. The bank has not confirmed remittance yet, so this is not a record that the money has reached your account.',
    );
    expect(screen.queryByTestId('supplier-remittance-confirmed')).not.toBeInTheDocument();
    expect(screen.queryByText(/credited to your account/i)).not.toBeInTheDocument();
    expect(screen.getByText('Not held in the portal')).toBeInTheDocument();
  });

  it('only the bank’s fact — Remittance Received — shows the confirmed sentence', async () => {
    const id = await released();
    invoiceStore.update(id, (i) => ({ ...i, status: 'Remittance Received' }));
    renderWithProviders(<SupplierInvoices />, { identity: SUP_005 });
    const row = await rowOf(numberOf(id));
    fireEvent.click(within(row).getByRole('button', { name: 'Payment details' }));
    expect(await screen.findByTestId('supplier-remittance-confirmed')).toHaveTextContent('The bank has confirmed remittance of this payment.');
    expect(screen.queryByTestId('supplier-payment-released')).not.toBeInTheDocument();
  });
});

describe('OPS-1 · Bahasa Indonesia', () => {
  it('the held invoice, the refusal by name and the released payment read in Indonesian', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    await receiveAndPost(5000);
    await ok(svc.dispatch(financeScope(FINANCE_ACTOR), { transitionId: 't_invoice_approve', entity: 'invoice', entityId: a }));
    await i18n.changeLanguage('id');

    const buyerView = renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const held = await openInvoice(b);
    expect(within(held).getByTestId('invoice-match-desc')).toHaveTextContent(
      'Faktur sebelumnya pada pesanan pembelian ini sudah menagih yang diterima: Rp 2.000.000.000 sudah ditagih dan Rp 0 tersisa untuk dibayar.',
    );
    expect(within(held).getByTestId('invoice-po-total-disagrees')).toHaveTextContent('pencocokan memakai baris');
    buyerView.unmount();
    const second = renderWithProviders(<Finance />, { identity: FINANCE_1 });
    const d = await openInvoice(a);
    fireEvent.click(await within(d).findByRole('button', { name: 'Rilis pembayaran' }));
    fireEvent.click(await within(d).findByRole('button', { name: /^Konfirmasi rilis/ }));
    const said = await toastText(/tidak boleh juga merilis pembayarannya/);
    expect(said).toContain(personLabel(idOf(FINANCE_ACTOR), t));
    expect(said).toContain('Menyetujui faktur dan merilis dananya adalah dua kewenangan');
    expect(invoiceStore.get(a)!.status).toBe('Approved');
    second.unmount();

    const rel = await ok(svc.dispatch(financeScope(OTHER_ACTOR), { transitionId: 't_invoice_release_payment', entity: 'invoice', entityId: a }));
    await svc.settle(financeScope(OTHER_ACTOR), rel.correlationId);
    renderWithProviders(<SupplierInvoices />, { identity: SUP_005 });
    // In Indonesian the KPI's label and the status pill read alike; the KPI is the eyebrow.
    expect((await screen.findAllByText('Pembayaran Dirilis')).some((e) => e.className.includes('text-eyebrow'))).toBe(true);
    const row = await rowOf(numberOf(a));
    fireEvent.click(within(row).getByRole('button', { name: 'Rincian pembayaran' }));
    expect(await screen.findByTestId('supplier-payment-released')).toHaveTextContent(
      'Paragon telah merilis pembayaran ini. Bank belum mengonfirmasi pengiriman dana, sehingga ini bukan catatan bahwa dana telah masuk ke rekening Anda.',
    );
  });
});

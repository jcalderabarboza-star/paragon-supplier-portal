// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · THE SUPPLIER SIDE — what a person sees, EN and ID.
//
// The machine half is `services/data/mock/src2SupplierSide.test.ts` and the
// supplier's read is `src2SupplierScope.test.ts`. These add what only a
// rendered page can answer: that the card says the deadline has gone instead of
// offering a form, that the validity field refuses before the act, that the
// certificate step lists THIS supplier's documents, that what the supplier said
// reaches the buyer's comparison, and that each refusal is read in words.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { materialRequestStore } from '../services/data/mock/stores/materialRequestStore';
import { seedMaterialRequests } from '../services/data/mock/materialRequestSeed';
import { DOCUMENTS } from '../services/data/mock/fixtures/supplierDocuments';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import { NO_PERSON } from '../context/noPerson';
import { formatDate } from '../lib/format';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import i18n, { resources } from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import BuyerMaterialRequests from './BuyerMaterialRequests';
import SupplierRFQs from './SupplierRFQs';
import { useToast } from '../hooks/useToast';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Surfaces the toast queue into the DOM — `ToastProvider` renders only its
 *  children, so without this a toast is invisible to a spec. */
function ToastSpy() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>
          {t.title} {t.description}
        </li>
      ))}
    </ul>
  );
}
const Rfqs = () => (
  <>
    <SupplierRFQs />
    <ToastSpy />
  </>
);

const svc = new MockCommandService();
const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const sup007: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
};
const as = (supplierId: string): CurrentIdentity => ({ ...SUPPLIER, supplierId, supplierName: supplierId });

const DAY = 86_400_000;
const yesterday = new Date(Date.parse(DECLARED_PRESENT) - DAY).toISOString().slice(0, 10);

/** The card of one event on the supplier's Open tab. */
const card = async (rfqNumber: string): Promise<HTMLElement> =>
  (await screen.findByText(rfqNumber)).closest('.rounded-lg') as HTMLElement;

/** Open the quote panel of one event. */
const openPanel = async (rfqNumber: string) => {
  fireEvent.click(within(await card(rfqNumber)).getByRole('button', { name: /^(Submit quote|Kirim penawaran)$/ }));
  await screen.findByTestId('quote-certificates');
};

/** The panel's commit — the last button of that name (ID spells the card's the same). */
const commit = () => {
  const all = screen.getAllByRole('button', { name: /^(Submit quotation|Kirim penawaran)$/ });
  return all[all.length - 1];
};

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** A price, a lead time and a validity that all pass — the specs vary one thing. */
const fillSound = (validUntil = '2026-12-31') => {
  fill(/^(Unit price|Harga satuan)$/, '14200');
  fill(/^(Lead time|Waktu tunggu)$/, '10');
  fill(/^(Quote valid until|Penawaran berlaku hingga)$/, validUntil);
};

const toastText = () => screen.getByTestId('toast-spy').textContent ?? '';

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5 · an event past its response deadline offers no way in', () => {
  it('THE DEFECT, THEN THE FIX — the card says the deadline has gone, and has no Submit quote', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    const gone = await card('RFQ-2026-010');
    expect(within(gone).getByText('Response deadline passed')).toBeInTheDocument();
    expect(within(gone).getByTestId('rfq-deadline-passed')).toHaveTextContent(
      'The response deadline (28 Aug 2026) has passed. Quotations are no longer taken on this event.',
    );
    expect(within(gone).queryByRole('button', { name: 'Submit quote' })).not.toBeInTheDocument();
    // the retired reading: a deadline long gone printed as "0 days remaining"
    expect(within(gone).queryByText(/days remaining|days to deadline/)).not.toBeInTheDocument();
  });

  it('KNOWN-GOOD — an event inside its deadline counts the days and offers the form', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    const live = await card('RFQ-2026-011');
    expect(within(live).getByText('2 days remaining')).toBeInTheDocument();
    expect(within(live).getByRole('button', { name: 'Submit quote' })).toBeInTheDocument();
    expect(within(live).queryByTestId('rfq-deadline-passed')).not.toBeInTheDocument();
  });

  it('the day-count is measured from the declared present, as the buyer’s board measures it', async () => {
    rfqStore.update('rfq-011', (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    // due today: still open, zero days left, and the form is offered
    const live = await card('RFQ-2026-011');
    expect(within(live).getByText('0 days remaining')).toBeInTheDocument();
    expect(within(live).getByRole('button', { name: 'Submit quote' })).toBeInTheDocument();
  });

  it('ID — the same card in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    const gone = await card('RFQ-2026-010');
    expect(within(gone).getByText('Tenggat tanggapan telah lewat')).toBeInTheDocument();
    expect(within(gone).getByTestId('rfq-deadline-passed')).toHaveTextContent(
      'Tenggat tanggapan (28 Agu 2026) telah lewat. Penawaran tidak lagi diterima untuk acara ini.',
    );
    expect(within(gone).queryByRole('button', { name: 'Kirim penawaran' })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5 · a validity that has passed is refused on the field, before the act', () => {
  it('THE REFUSAL — said on the field, the commit is held, nothing is minted', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound(yesterday);
    expect(screen.getByTestId('quote-validity-refusal')).toHaveTextContent(
      `This date has already passed (today is ${formatDate(DECLARED_PRESENT)}).`,
    );
    expect(commit()).toBeDisabled();
    fireEvent.click(commit());
    expect(quotationStore.forRfq('rfq-011').map((q) => q.supplierId)).toEqual(['sup-005']);
  });

  it('KNOWN-GOOD — valid until today reads no refusal and submits', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound(DECLARED_PRESENT);
    expect(screen.queryByTestId('quote-validity-refusal')).not.toBeInTheDocument();
    expect(commit()).toBeEnabled();
    fireEvent.click(commit());
    await waitFor(() => expect(quotationStore.forRfq('rfq-011')).toHaveLength(2));
  });

  it('an untouched validity does not nag', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    expect(screen.queryByTestId('quote-validity-refusal')).not.toBeInTheDocument();
  });

  it('ID — the field refusal in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound(yesterday);
    expect(screen.getByTestId('quote-validity-refusal')).toHaveTextContent('Tanggal ini sudah lewat (hari ini 31 Agu 2026).');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5 · the machine’s refusals, read in the supplier’s words', () => {
  it('a second quotation — submitted from a panel left open after the first landed', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    // the first quotation lands from elsewhere while this panel stands open
    const first = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: { rfqId: 'rfq-011', supplierId: 'sup-007', unitPrice: 15_000, leadTimeDays: 12, currency: 'IDR', validUntil: '2026-12-31', paymentTermsOffered: '' },
    });
    expect(first.status, first.reason).toBe('done');
    fireEvent.click(commit());
    await waitFor(() =>
      expect(toastText()).toContain('You have already submitted a quotation on this event.'),
    );
    // never the machine's sentence, which names ids
    expect(toastText()).not.toMatch(/POLICY_REJECTED|QUOTE_ALREADY_SUBMITTED|sup-007|QUO-/);
    expect(quotationStore.forRfq('rfq-011').filter((q) => q.supplierId === 'sup-007')).toHaveLength(1);
  });

  it('an event the buyer closed while the panel stood open', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    const closed = await svc.dispatch(named, { transitionId: 't_rfq_close', entity: 'rfq', entityId: 'rfq-011', payload: {} });
    expect(closed.status, closed.reason).toBe('done');
    fireEvent.click(commit());
    await waitFor(() => expect(toastText()).toContain('This sourcing event is no longer open'));
    expect(toastText()).not.toMatch(/POLICY_REJECTED|QUOTE_EVENT_NOT_OPEN/);
    expect(quotationStore.forRfq('rfq-011')).toHaveLength(1);
  });

  it('a deadline that passes under an open panel', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    rfqStore.update('rfq-011', (r) => ({ ...r, responseDeadline: yesterday }));
    fireEvent.click(commit());
    await waitFor(() =>
      expect(toastText()).toContain('The response deadline of this event has passed.'),
    );
    expect(quotationStore.forRfq('rfq-011')).toHaveLength(1);
  });

  it('ID — the second-quotation refusal in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: { rfqId: 'rfq-011', supplierId: 'sup-007', unitPrice: 15_000, leadTimeDays: 12, currency: 'IDR', validUntil: '2026-12-31', paymentTermsOffered: '' },
    });
    fireEvent.click(commit());
    await waitFor(() =>
      expect(toastText()).toContain('Anda sudah mengirim penawaran untuk acara ini.'),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('7 · the certificate step lists the supplier’s own documents', () => {
  const CERTIFICATE_CATEGORIES = ['Halal Compliance', 'BPOM Regulatory', 'Quality'];
  const certificatesOf = (supplierId: string) =>
    DOCUMENTS.filter((d) => d.supplierId === supplierId && CERTIFICATE_CATEGORIES.includes(d.category));
  const listed = () =>
    within(screen.getByTestId('quote-certificates'))
      .getAllByTestId(/^quote-cert-doc-/)
      .map((el) => el.getAttribute('data-testid')!.replace('quote-cert-', ''));

  it('population — the fixture holds certificates for some suppliers and none for others', () => {
    expect(certificatesOf('sup-007').map((d) => d.id)).toContain('doc-001');
    expect(certificatesOf('sup-002').length).toBeGreaterThan(0);
    expect(certificatesOf('sup-008')).toEqual([]);
    // and sup-007 holds documents that are NOT certificates, to be left out
    expect(DOCUMENTS.filter((d) => d.supplierId === 'sup-007' && d.category === 'Tax & Legal').map((d) => d.id)).toContain('doc-003');
  });

  it('THE DEFECT, THEN THE FIX — the three hard-coded names are gone; the supplier’s documents are listed', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    const step = screen.getByTestId('quote-certificates');
    // the retired list, word for word
    expect(within(step).queryByText('Halal Certificate')).not.toBeInTheDocument();
    expect(within(step).queryByText('ISO 9001')).not.toBeInTheDocument();
    expect(within(step).queryByText('BPOM Registration')).not.toBeInTheDocument();
    expect(within(step).queryByText(/On file/)).not.toBeInTheDocument();
    // what this supplier actually holds, and nothing else of its file
    expect(listed().sort()).toEqual(certificatesOf('sup-007').map((d) => d.id).sort());
    expect(listed()).not.toContain('doc-003');
    expect(within(step).getByText('Halal Certificate — MUI No. 01011234561020')).toBeInTheDocument();
  });

  it('each reads the state it is in today — an expiring certificate is not ticked "on file"', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    // doc-001: the halal certificate, inside its renewal window at the declared present
    expect(screen.getByTestId('quote-cert-doc-001')).toHaveTextContent('Expiring Soon');
    expect(screen.getByTestId('quote-cert-doc-001')).toHaveTextContent('expires 14 Oct 2026');
    // doc-002: BPOM, a year out
    expect(screen.getByTestId('quote-cert-doc-002')).toHaveTextContent('Valid');
    // doc-006: a certificate of analysis not yet provided
    expect(screen.getByTestId('quote-cert-doc-006')).toHaveTextContent('Awaiting Upload');
  });

  it('ANOTHER supplier reads its own, and none of the first one’s', async () => {
    rfqStore.update('rfq-011', (r) => ({ ...r, invitedSupplierIds: [...r.invitedSupplierIds, 'sup-002'] }));
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    await openPanel('RFQ-2026-011');
    expect(listed().sort()).toEqual(certificatesOf('sup-002').map((d) => d.id).sort());
    expect(listed()).not.toContain('doc-001');
  });

  it('a supplier holding none is told so, not shown three ticks', async () => {
    rfqStore.update('rfq-010', (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
    renderWithProviders(<Rfqs />, { identity: as('sup-008') });
    await openPanel('RFQ-2026-010');
    expect(screen.getByTestId('quote-certificates-none')).toHaveTextContent(
      'No halal, BPOM or quality document is on file.',
    );
    expect(screen.queryAllByTestId(/^quote-cert-doc-/)).toHaveLength(0);
  });

  it('ID — the state labels and the empty line in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    expect(screen.getByTestId('quote-cert-doc-001')).toHaveTextContent('berakhir 14 Okt 2026');
    expect(screen.getByTestId('quote-cert-doc-006')).toHaveTextContent('Menunggu Unggahan');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('6 · what the supplier said reaches the buyer’s comparison', () => {
  const openComparison = async (rfqNumber: string) => {
    fireEvent.click(await screen.findByText(rfqNumber));
    await screen.findByRole('dialog');
  };

  const submitFromTheForm = async () => {
    const view = renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    fireEvent.change(screen.getByPlaceholderText(/Add any notes|Tambahkan catatan/), {
      target: { value: 'Tooling is ready; first lot ships from Cikarang.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 5 days|mis\. 5 hari/), {
      target: { value: '5 working days' },
    });
    fireEvent.change(screen.getByTestId('quote-attachment-input'), {
      target: { files: [new File(['%PDF-1.4'], 'berlina-quotation-011.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByTestId('quote-attachment-name')).toHaveTextContent('berlina-quotation-011.pdf');
    fireEvent.click(commit());
    await waitFor(() =>
      expect(quotationStore.forRfq('rfq-011').filter((q) => q.supplierId === 'sup-007')).toHaveLength(1),
    );
    view.unmount();
    return quotationStore.forRfq('rfq-011').find((q) => q.supplierId === 'sup-007')!;
  };

  it('THE DEFECT, THEN THE FIX — typed on the form, kept on the quotation, read by the buyer', async () => {
    const q = await submitFromTheForm();
    expect(q.sampleBatch).toBe('yes');
    expect(q.sampleLeadTime).toBe('5 working days');
    expect(q.attachmentName).toBe('berlina-quotation-011.pdf');
    expect(q.notes).toBe('Tooling is ready; first lot ships from Cikarang.');

    renderWithProviders(<BuyerSourcing />, { identity: BUYER_NAMED });
    await openComparison('RFQ-2026-011');
    expect(screen.getByTestId(`cmp-notes-${q.id}`)).toHaveTextContent('Tooling is ready; first lot ships from Cikarang.');
    expect(screen.getByTestId(`cmp-sample-${q.id}`)).toHaveTextContent('Can provide');
    expect(screen.getByTestId(`cmp-sample-lead-${q.id}`)).toHaveTextContent('5 working days');
    expect(screen.getByTestId(`cmp-attachment-${q.id}`)).toHaveTextContent('berlina-quotation-011.pdf');
    expect(screen.getByTestId(`cmp-valid-${q.id}`)).toHaveTextContent('31 Dec 2026');
    // the attachment row says what is and is not held
    expect(screen.getByText('Name only')).toBeInTheDocument();
  });

  it('a seeded quotation reads "Not stated", never "Cannot provide"', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_NAMED });
    await openComparison('RFQ-2026-011');
    expect(screen.getByTestId('cmp-sample-qt-011a')).toHaveTextContent('Not stated');
    expect(screen.getByTestId('cmp-sample-lead-qt-011a')).toHaveTextContent('Not stated');
    expect(screen.getByTestId('cmp-attachment-qt-011a')).toHaveTextContent('None attached');
  });

  it('a seeded note the buyer could never read is on the comparison now', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_NAMED });
    await openComparison('RFQ-2026-001');
    expect(screen.getByTestId('cmp-notes-qt-001b')).toHaveTextContent('BPOM-registered, competitive lead time.');
  });

  it('"No" on the form is kept as no, and the sample lead time goes with it', async () => {
    const view = renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    fillSound();
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 5 days/), { target: { value: '5 working days' } });
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    fireEvent.click(commit());
    await waitFor(() =>
      expect(quotationStore.forRfq('rfq-011').filter((q) => q.supplierId === 'sup-007')).toHaveLength(1),
    );
    view.unmount();
    const q = quotationStore.forRfq('rfq-011').find((x) => x.supplierId === 'sup-007')!;
    expect(q.sampleBatch).toBe('no');
    expect('sampleLeadTime' in q).toBe(false);

    renderWithProviders(<BuyerSourcing />, { identity: BUYER_NAMED });
    await openComparison('RFQ-2026-011');
    expect(screen.getByTestId(`cmp-sample-${q.id}`)).toHaveTextContent('Cannot provide');
  });

  it('the attachment can be taken off again before submitting, and the form says only the name is kept', async () => {
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    await openPanel('RFQ-2026-011');
    expect(screen.getByTestId('quote-attachment-note')).toHaveTextContent(
      'Only the file name is recorded with your quotation.',
    );
    fireEvent.change(screen.getByTestId('quote-attachment-input'), {
      target: { files: [new File(['x'], 'draft.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByTestId('quote-attachment-remove'));
    expect(screen.queryByTestId('quote-attachment-name')).not.toBeInTheDocument();
  });

  it('ID — the comparison rows in Indonesian', async () => {
    const q = await submitFromTheForm();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_NAMED });
    await openComparison('RFQ-2026-011');
    expect(screen.getByText('Catatan pemasok')).toBeInTheDocument();
    expect(screen.getByText('Dokumen penawaran')).toBeInTheDocument();
    expect(screen.getByTestId(`cmp-sample-${q.id}`)).toHaveTextContent('Dapat menyediakan');
    expect(screen.getByTestId('cmp-sample-qt-011a')).toHaveTextContent('Tidak dinyatakan');
    expect(screen.getByTestId(`cmp-valid-${q.id}`)).toHaveTextContent('31 Des 2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the category reads in the reader’s language on every surface that shows it', () => {
  // Not a fix of this batch: the card's pill already translated its label
  // (`StatusPill` owns that vocabulary). Held here so the three surfaces that
  // show a category are asserted side by side.
  it('the supplier’s event card — EN, then ID', async () => {
    const en = renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    expect(within(await card('RFQ-2026-011')).getByText('Packaging')).toBeInTheDocument();
    en.unmount();
    await i18n.changeLanguage('id');
    renderWithProviders(<Rfqs />, { identity: SUPPLIER });
    const idCard = await card('RFQ-2026-011');
    expect(within(idCard).getByText('Kemasan')).toBeInTheDocument();
    expect(within(idCard).queryByText('Packaging')).not.toBeInTheDocument();
  });

  it('the material-request list and its raise form — ID', async () => {
    materialRequestStore.reset();
    await seedMaterialRequests(new MockCommandService());
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerMaterialRequests />, {
      identity: { personaType: 'buyer', supplierId: null, supplierName: null, businessRoles: ['procurement', 'planning'], actor: NO_PERSON },
    });
    // the list: both seeded requests are Packaging
    expect((await screen.findAllByText('Kemasan')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Packaging')).not.toBeInTheDocument();
    // the raise form: every option of the closed union, in Indonesian
    fireEvent.click(screen.getByTestId('material-request-raise-open'));
    const options = within(await screen.findByTestId('material-request-category'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['Pewangi', 'Bahan Aktif', 'Kemasan', 'Pengemulsi', 'Botani', 'Lainnya']);
    materialRequestStore.reset();
  });

  it('KNOWN-GOOD — the same form in English is unchanged', async () => {
    materialRequestStore.reset();
    await seedMaterialRequests(new MockCommandService());
    renderWithProviders(<BuyerMaterialRequests />, {
      identity: { personaType: 'buyer', supplierId: null, supplierName: null, businessRoles: ['procurement', 'planning'], actor: NO_PERSON },
    });
    fireEvent.click(await screen.findByTestId('material-request-raise-open'));
    const options = within(await screen.findByTestId('material-request-category'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['Fragrance', 'Active Ingredients', 'Packaging', 'Emulsifiers', 'Botanical', 'Other']);
    materialRequestStore.reset();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('“penghargaan” (an honour) is not the word for an award decision', () => {
  const idStrings = Object.entries(resources.id.translation as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const glossary = readFileSync(resolve(__dirname, '../lib/glossary/refusals.glossary.ts'), 'utf8');

  it('population — the Indonesian bundle and the refusal glossary were both read', () => {
    expect(idStrings.length).toBeGreaterThan(2000);
    expect(idStrings.map(([k]) => k)).toContain('psl.toast.awardIntegrity');
    expect(glossary).toContain('AWARDEE_NOT_INVITED');
  });

  it('no Indonesian string in the app says it', () => {
    expect(idStrings.filter(([, v]) => /penghargaan/i.test(v)).map(([k]) => k)).toEqual([]);
    expect(glossary).not.toMatch(/penghargaan/i);
  });

  it('the award refusal says “pemenangan”, the board’s own word', () => {
    const byKey = new Map(idStrings);
    expect(byKey.get('psl.toast.awardIntegrity')).toMatch(/^Pemenangan tidak menyebut/);
    expect(byKey.get('sourcing.award.title')).toBe('Tindakan pemenangan');
    expect(glossary).toContain('sehingga pemenangan akan memberikan bisnis');
  });
});

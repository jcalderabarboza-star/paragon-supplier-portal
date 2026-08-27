// ────────────────────────────────────────────────────────────────────────────
// §82 — THE WALK, END TO END: A SUPPLIER DECLARES, COMPLIANCE DECIDES.
//
// The contract half is `services/data/mock/supplierDocumentCommand.test.ts`
// (the store moved, the dispatcher refused, the session-minted fields cannot be
// forged). This file asserts the half that only a rendered surface can: that the
// declaration a person makes on ONE page becomes the item a DIFFERENT person
// acts on from ANOTHER, in the language they read it in.
//
// ⚠️ **THE TWO SURFACES SHARE ONE STORE AND THAT IS THE ASSERTION, NOT AN
// IMPLEMENTATION DETAIL.** Before §82 the supplier's upload set a local boolean
// and the buyer's page read a different DTO entirely; both halves could have
// been "tested" green while nothing crossed between them. Each walk below
// therefore renders the supplier page, acts, unmounts, renders the buyer page,
// and finds what the supplier did — the crossing is the thing under test.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { NO_PERSON } from '../context/noPerson';
import { supplierDocumentStore } from '../services/data/mock/stores/supplierDocumentStore';
import i18n from '../lib/i18n';
import SupplierDocuments from './SupplierDocuments';
import BuyerCompliance from './BuyerCompliance';

/** The supplier's back office — the lane the operator ruled owns the act. */
const BACK_OFFICE: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: ['back_office'],
  actor: NO_PERSON,
};

/** A supplier lane that does NOT hold the supply verbs — the handoff case. */
const COMMERCIAL: CurrentIdentity = { ...BACK_OFFICE, businessRoles: ['commercial'] };

/** The buyer's compliance officer — holds verify and reject. */
const COMPLIANCE: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/** A buyer lane that holds NEITHER review verb — the handoff case, buyer side. */
const FINANCE: CurrentIdentity = { ...COMPLIANCE, businessRoles: ['finance'] };

const CERT_NUMBER = 'ID-BPJPH-WALK-0042';
const SCOPE_TEXT = 'All PET bottle grades produced at the Tangerang plant';

/** Fill and submit the declaration panel. Returns nothing — the assertion is
 *  always about what the OTHER surface can then see. */
async function declareOnSupplierPage(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /declare a certificate/i }));
  fireEvent.change(screen.getByTestId('declare-certNumber'), {
    target: { value: CERT_NUMBER },
  });
  fireEvent.change(screen.getByTestId('declare-issuer'), { target: { value: 'BPJPH' } });
  fireEvent.change(screen.getByTestId('declare-issuedOn'), {
    target: { value: '2026-02-01' },
  });
  fireEvent.change(screen.getByTestId('declare-scopeText'), {
    target: { value: SCOPE_TEXT },
  });
  fireEvent.click(screen.getByRole('button', { name: /record declaration/i }));
  // The panel confirms only after the dispatch resolves non-failed.
  expect(await screen.findByTestId('declaration-recorded')).toBeInTheDocument();
}

beforeEach(async () => {
  supplierDocumentStore.reset();
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('§82 · CONTROLS — the walk is not vacuous', () => {
  it('CONTROL — the two locales differ, so the ID assertions can see', async () => {
    await i18n.changeLanguage('en');
    const en = i18n.t('compliance.queue.title');
    await i18n.changeLanguage('id');
    const id = i18n.t('compliance.queue.title');
    expect(en).toBe('Declared certificates awaiting review');
    expect(id).toBe('Sertifikat yang dinyatakan, menunggu tinjauan');
    expect(id).not.toBe(en);
  });

  it('CONTROL — the seeded tree contains no document bearing this walk’s number', () => {
    // If a fixture already carried it, every "the buyer can see it" assertion
    // below would pass without anything crossing between the surfaces.
    expect(
      supplierDocumentStore.all().some((d) => d.declaration?.certNumber === CERT_NUMBER),
    ).toBe(false);
  });
});

describe('§82 · the supplier declares — and the surface says what it is', () => {
  it('⚠️ OFFERS NO FILE CONTROL, AND SAYS SO IN WORDS BEFORE THE ACT', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    fireEvent.click(await screen.findByRole('button', { name: /declare a certificate/i }));

    // The sentence, and it is precisely bounded: the platform CANNOT keep or
    // forward a file. It does not claim it cannot read one — `XlsxImportPanel`
    // parses a workbook one lane over, and a supplier could disprove the wider
    // claim in thirty seconds.
    expect(screen.getByTestId('declaration-nofile-notice')).toHaveTextContent(
      /does not receive, store or forward the certificate document itself/i,
    );
    // And the claim is structurally true on this panel: no file input, no
    // drop zone, and none of the size/format promises the old one made.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText(/max 20 mb/i)).toBeNull();
    expect(screen.queryByText(/drop file here/i)).toBeNull();
  });

  it('states whose act it is recorded as, before the act', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    fireEvent.click(await screen.findByRole('button', { name: /declare a certificate/i }));
    expect(screen.getByTestId('declaration-attribution')).toHaveTextContent(
      /against your company rather than against a named person/i,
    );
  });

  it('will not record an incomplete declaration, and says which is missing', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    fireEvent.click(await screen.findByRole('button', { name: /declare a certificate/i }));
    expect(screen.getByTestId('declaration-incomplete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record declaration/i })).toBeDisabled();
    // CONTROL: it un-blocks once the fields are there — a guard that always
    // refuses is not a guard (§39, probe both ways).
    fireEvent.change(screen.getByTestId('declare-certNumber'), { target: { value: 'X' } });
    fireEvent.change(screen.getByTestId('declare-issuer'), { target: { value: 'Y' } });
    fireEvent.change(screen.getByTestId('declare-issuedOn'), {
      target: { value: '2026-02-01' },
    });
    fireEvent.change(screen.getByTestId('declare-scopeText'), { target: { value: 'Z' } });
    expect(screen.getByRole('button', { name: /record declaration/i })).toBeEnabled();
    expect(screen.queryByTestId('declaration-incomplete')).toBeNull();
  });

  it('a supplier lane without the verb sees WHOSE act it is, not an absent button', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: COMMERCIAL });
    fireEvent.click(await screen.findByRole('button', { name: /declare a certificate/i }));
    expect(screen.getByTestId('handoff-supplierdoc-supply')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record declaration/i })).toBeNull();
  });
});

describe('§82 · THE CROSSING — what the supplier states reaches the reviewer', () => {
  it('a declaration made on /supplier/documents appears in compliance’s queue', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    // The certificate number the supplier typed, on the reviewer's screen.
    expect(within(queue).getByText(CERT_NUMBER)).toBeInTheDocument();
    // ⚠️ AND THE SUPPLIER'S OWN WORDS, NOT A MATERIAL CODE. This is the field
    // that exists because a supplier cannot know Paragon's SAP vocabulary.
    expect(within(queue).getByText(SCOPE_TEXT)).toBeInTheDocument();
    // The scheme renders through the shared i18n label rather than a stored
    // English string — which is what lets the ID walk below work at all.
    expect(within(queue).getAllByText('Halal (BPJPH)').length).toBeGreaterThan(0);
  });

  it('⚠️ THE QUEUE IS NOT THE REGISTRY — an unverified claim never joins the table', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    // The number appears EXACTLY once on the page, and inside the queue. If the
    // declaration had been folded into the registry table, a supplier's
    // unverified claim would be rendering as a certificate Paragon holds.
    expect(screen.getAllByText(CERT_NUMBER)).toHaveLength(1);
    expect(within(queue).getByText(CERT_NUMBER)).toBeInTheDocument();
  });

  it('compliance confirms it, and the supplier sees Valid', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    const buyer = renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    fireEvent.click(within(queue).getAllByRole('button', { name: /^confirm$/i })[0]);
    // WAIT ON THE STORE, NOT ON THE TOAST. `renderWithProviders` mounts no
    // toast host, so a toast assertion here would be waiting for something that
    // structurally cannot appear - and would have read as "the verb did not
    // fire". The store IS the crossing under test.
    await waitFor(() =>
      expect(
        supplierDocumentStore.all().find((d) => d.declaration?.certNumber === CERT_NUMBER)
          ?.status,
      ).toBe('Valid'),
    );
    buyer.unmount();

    // The store is the only thing that crossed — assert it, then assert the
    // supplier's own page renders the result.
    const row = supplierDocumentStore
      .all()
      .find((d) => d.declaration?.certNumber === CERT_NUMBER)!;
    expect(row.status).toBe('Valid');

    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    expect(await screen.findByText(CERT_NUMBER)).toBeInTheDocument();
  });

  it('compliance refuses it WITH A REASON, and the supplier reads that reason', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    const buyer = renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    fireEvent.click(within(queue).getAllByRole('button', { name: /^refuse$/i })[0]);

    // The reason is required at the verb, so the surface cannot send without it.
    const confirm = screen.getByRole('button', { name: /record refusal/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('doc-reject-reason'), {
      target: { value: 'The scope does not cover the grades we buy from you.' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(
        supplierDocumentStore.all().find((d) => d.declaration?.certNumber === CERT_NUMBER)
          ?.status,
      ).toBe('Rejected'),
    );
    buyer.unmount();

    // ⚠️ THE STATE IS `Rejected`, WHICH IS THE ONE §80's SURFACE RENDERS. Before
    // §82 this verb pointed at `Awaiting Upload`, so the reason and the date
    // would have been written to a row that never showed them.
    const row = supplierDocumentStore
      .all()
      .find((d) => d.declaration?.certNumber === CERT_NUMBER)!;
    expect(row.status).toBe('Rejected');

    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    expect(await screen.findByTestId('doc-refused-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/the scope does not cover the grades we buy from you/i),
    ).toBeInTheDocument();
    // And the refusal is not a dead end: the row offers the remedy.
    const refusal = screen.getByTestId(`doc-refusal-${row.id}`);
    expect(
      within(refusal.closest('tr')!).getByRole('button', { name: /declare again/i }),
    ).toBeInTheDocument();
  });

  it('a buyer lane without the review verbs sees whose act it is', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: FINANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). Verify and reject
    // are separate atoms and are co-reachable on the same row, so a single
    // group notice would be speaking for two acts at once.
    expect(within(queue).getAllByTestId('handoff-supplierdoc-verify').length).toBeGreaterThan(0);
    expect(within(queue).getAllByTestId('handoff-supplierdoc-reject').length).toBeGreaterThan(0);
    expect(within(queue).queryByRole('button', { name: /^confirm$/i })).toBeNull();
  });
});

describe('§82 · the refusal is history, not a standing accusation', () => {
  // ⚠️ **FOUND BY BROWSER QA ON THE BUILT BUNDLE, NOT BY THIS SUITE**, and the
  // suite could not have found it: the page rendered fine, the store was
  // correct, and every existing assertion passed. What was wrong was that two
  // parts of ONE page disagreed about ONE document — the banner (status-gated)
  // had dropped its count while the per-row block (field-gated) still read
  // "REFUSED" over a document already back under review.
  //
  // The cause is a question that had ONE answer until this batch and now has
  // two: *does this document carry a refusal reason?* and *is this document
  // refused right now?* Nothing could leave `Rejected` before §82, so the field
  // check stood in for the state check and was indistinguishable from it.
  it('a re-declared document stops showing its old refusal', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    await declareOnSupplierPage();
    supplier.unmount();

    const buyer = renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    fireEvent.click(within(queue).getAllByRole('button', { name: /^refuse$/i })[0]);
    fireEvent.change(screen.getByTestId('doc-reject-reason'), {
      target: { value: 'Scope does not cover what we buy.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /record refusal/i }));
    const doc = await waitFor(() => {
      const d = supplierDocumentStore.all().find((x) => x.declaration?.certNumber === CERT_NUMBER);
      expect(d?.status).toBe('Rejected');
      return d!;
    });
    buyer.unmount();

    // CONTROL — while it IS refused, the block renders. Without this, the
    // assertion below would pass on a block that never renders at all.
    const refused = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    expect(await screen.findByTestId(`doc-refusal-${doc.id}`)).toBeInTheDocument();
    expect(screen.getByTestId('doc-refused-banner')).toBeInTheDocument();

    // Re-declare it, correcting the scope.
    const row = screen.getByTestId(`doc-refusal-${doc.id}`).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /declare again/i }));
    // The panel pre-fills from the prior declaration — a correction should not
    // mean retyping five correct fields to fix one wrong one.
    expect((screen.getByTestId('declare-certNumber') as HTMLInputElement).value).toBe(CERT_NUMBER);
    fireEvent.change(screen.getByTestId('declare-scopeText'), {
      target: { value: 'Corrected: PET bottle grades' },
    });
    fireEvent.click(screen.getByRole('button', { name: /record declaration/i }));
    await waitFor(() =>
      expect(supplierDocumentStore.get(doc.id)?.status).toBe('Under Review'),
    );
    refused.unmount();

    // ⚠️ THE STORE STILL HOLDS THE REFUSAL — it was a recorded act and a
    // correction does not un-happen it. Only the RENDER is gated.
    expect(supplierDocumentStore.get(doc.id)!.rejectionReason).toBeTruthy();
    expect(supplierDocumentStore.get(doc.id)!.rejectedAt).toBeTruthy();

    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    // The scope renders inside an interpolated "Linked: {{value}}" line, so
    // match the ROW rather than a bare string.
    const after = (await screen.findByText(CERT_NUMBER)).closest('tr')!;
    expect(after).toHaveTextContent('Corrected: PET bottle grades');
    expect(screen.queryByTestId(`doc-refusal-${doc.id}`)).toBeNull();
    // And the two parts of the page now agree: the seeded refusal (doc-012) is
    // the only one left, so the banner is present but no longer counts this one.
    expect(screen.getByTestId('doc-refused-banner')).not.toHaveTextContent(CERT_NUMBER);
  });
});

describe('§82 · the walk in Indonesian', () => {
  it('declares and reviews in ID, with no English leaking through', async () => {
    await i18n.changeLanguage('id');
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });

    fireEvent.click(await screen.findByRole('button', { name: /nyatakan sertifikat/i }));
    expect(screen.getByTestId('declaration-nofile-notice')).toHaveTextContent(
      /tidak menerima, menyimpan, atau meneruskan/i,
    );
    fireEvent.change(screen.getByTestId('declare-certNumber'), {
      target: { value: CERT_NUMBER },
    });
    fireEvent.change(screen.getByTestId('declare-issuer'), { target: { value: 'BPJPH' } });
    fireEvent.change(screen.getByTestId('declare-issuedOn'), {
      target: { value: '2026-02-01' },
    });
    fireEvent.change(screen.getByTestId('declare-scopeText'), {
      target: { value: SCOPE_TEXT },
    });
    fireEvent.click(screen.getByRole('button', { name: /catat pernyataan/i }));
    expect(await screen.findByTestId('declaration-recorded')).toBeInTheDocument();
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE,
    });
    const queue = await screen.findByTestId('doc-review-queue');
    expect(
      within(queue).getByText('Sertifikat yang dinyatakan, menunggu tinjauan'),
    ).toBeInTheDocument();
    expect(within(queue).getByText(CERT_NUMBER)).toBeInTheDocument();
    // The English titles must be nowhere — a half-translated queue is how a
    // locale assertion passes while the surface is still English.
    expect(screen.queryByText('Declared certificates awaiting review')).toBeNull();
    expect(within(queue).queryByRole('button', { name: /^confirm$/i })).toBeNull();
    expect(within(queue).getAllByRole('button', { name: /^konfirmasi$/i }).length).toBeGreaterThan(0);
  });
});

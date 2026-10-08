// ────────────────────────────────────────────────────────────────────────────
// SUP-1 · A NAMED PERSON DECIDES — on the certificate queue, in both languages.
//
// The service spec (`services/data/mock/sup1NamedSeat.test.ts`) holds the rule.
// This holds what a reader meets: the line before the act, the refusal in their
// own language with the document left where it was, and — once a named person
// confirms — who confirmed and when, on the buyer's page and the supplier's.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED_COMPLIANCE, SUPPLIER } from '../test/test-utils';
import { supplierDocumentStore } from '../services/data/mock/stores/supplierDocumentStore';
import { personLabel } from '../services/identity/personLabel';
import { formatDate } from '../lib/format';
import i18n from '../lib/i18n';
import Toaster from '../components/ui-v2/Toaster';
import BuyerCompliance from './BuyerCompliance';
import SupplierDocuments from './SupplierDocuments';

const DOC = 'doc-010';
const LOCALES = ['en', 'id'] as const;

beforeEach(async () => {
  supplierDocumentStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

const confirmButton = async () => {
  const row = await screen.findByTestId(`doc-review-${DOC}`);
  return within(row).getAllByRole('button')[0];
};

describe('SUP-1 · the certificate queue', () => {
  it('CONTROL — the specimen is under review, and the two sentences differ by language', () => {
    expect(supplierDocumentStore.get(DOC)!.status).toBe('Under Review');
    for (const key of ['identity.preAct.namedRequired', 'identity.refused.namedRequired']) {
      const en = i18n.getFixedT('en')(key);
      const id = i18n.getFixedT('id')(key);
      expect(en).not.toBe(key);
      expect(id).not.toBe(key);
      expect(en).not.toBe(id);
    }
  });

  it.each(LOCALES)('[%s] a seat that names nobody is told before the act', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<BuyerCompliance />, { route: '/buyer/compliance', identity: BUYER });
    const notice = await screen.findByTestId('supplierdoc-review-pre-act');
    expect(notice).toHaveTextContent(i18n.t('identity.preAct.namedRequired'));
    expect(screen.queryByTestId('supplierdoc-review-pre-act-sample')).toBeNull();
  });

  it.each(LOCALES)('[%s] and is refused in that language, the document unmoved', async (lng) => {
    await i18n.changeLanguage(lng);
    const before = supplierDocumentStore.get(DOC);
    // `renderWithProviders` mounts no toast host; the refusal is a toast.
    renderWithProviders(
      <>
        <BuyerCompliance />
        <Toaster />
      </>,
      { route: '/buyer/compliance', identity: BUYER },
    );
    fireEvent.click(await confirmButton());
    expect(await screen.findByText(i18n.t('identity.refused.namedRequired'))).toBeInTheDocument();
    // The hook's own English sentence is not what the reader is shown.
    expect(screen.queryByText(/SUPPLIERDOC_ACTOR_UNATTRIBUTED/)).toBeNull();
    expect(supplierDocumentStore.get(DOC)).toEqual(before);
    expect(screen.queryByTestId('doc-confirmed-list')).toBeNull();
  });

  it.each(LOCALES)('[%s] a named person is told whose name it carries, and it is listed', async (lng) => {
    await i18n.changeLanguage(lng);
    const person = BUYER_NAMED_COMPLIANCE.actor;
    if (person.kind !== 'RESOLVED') throw new Error('the named seat names nobody');
    const label = personLabel(person.person.personId, i18n.t.bind(i18n));

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: BUYER_NAMED_COMPLIANCE,
    });
    expect(await screen.findByTestId('supplierdoc-review-pre-act-sample')).toHaveTextContent(label);
    expect(screen.queryByTestId('supplierdoc-review-pre-act')).toBeNull();

    fireEvent.click(await confirmButton());
    await waitFor(() => expect(supplierDocumentStore.get(DOC)!.status).toBe('Valid'));
    const stored = supplierDocumentStore.get(DOC)!;
    expect(stored.verifiedBy).toEqual(person);

    const listed = await screen.findByTestId(`doc-confirmed-${DOC}`);
    expect(listed).toHaveTextContent(i18n.t('compliance.confirmed.by', { person: label }));
    expect(listed).toHaveTextContent(formatDate(stored.verifiedAt!));
    // It has left the queue it was confirmed from.
    expect(screen.queryByTestId(`doc-review-${DOC}`)).toBeNull();
  });

  it.each(LOCALES)('[%s] the supplier reads when it was confirmed, and not by whom', async (lng) => {
    const person = BUYER_NAMED_COMPLIANCE.actor;
    if (person.kind !== 'RESOLVED') throw new Error('the named seat names nobody');
    // Not the declared present: the session-stamp note beside it prints that
    // day, and the assertion below must be about this line's own date.
    const at = '2026-09-12T03:00:00.000Z';
    supplierDocumentStore.update(DOC, (d) => ({ ...d, status: 'Valid', verifiedAt: at, verifiedBy: person }));
    await i18n.changeLanguage(lng);

    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const line = await screen.findByTestId(`doc-confirmed-on-${DOC}`);
    expect(line).toHaveTextContent(i18n.t('supplierDocuments.confirmedOn'));
    expect(line).toHaveTextContent(formatDate(at));
    expect(line).not.toHaveTextContent(personLabel(person.person.personId, i18n.t.bind(i18n)));
    // A seeded Valid row was confirmed by nobody the store can name: no line.
    expect(screen.queryByTestId('doc-confirmed-on-doc-001')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E2E-1 · A REQUISITION IS DECIDED BY A NAMED PERSON, AND THE PAGE NAMES THEM.
//
// Found on the end-to-end walk: a named sample person approved a requisition,
// the drawer said the decision "is recorded as unattributed", the toast said
// "Recorded … as unattributed", and the approved requisition then showed that
// person under "Approved by". The same walk showed the reverse door was open
// too: a seat naming nobody could approve. By ruling it no longer can
// (`PR_DECIDER_NAMED`, held in `sup1NamedSeat.test.ts` and
// `prApprovalCommand.test.ts`).
//
// Held here, on the page, in EN and ID:
//   1. a NAMED seat reads its own person before the act and in the toast after
//      it — the label the drawer shows under "Approved by" — and never the
//      word "unattributed";
//   2. a seat that names nobody is told before the act, is refused in its own
//      language on approve AND on reject, and the requisition does not move.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED } from '../test/test-utils';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import { personLabel } from '../services/identity/personLabel';
import { useToast } from '../hooks/useToast';
import i18n from '../lib/i18n';
import BuyerRequisitions from './BuyerRequisitions';

const LOCALES = ['en', 'id'] as const;
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;
const PENDING_PR = 'PR-2026-00344';
const UNATTRIBUTED = { en: /unattributed/i, id: /tanpa atribusi/i } as const;

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
const Page = () => (
  <>
    <BuyerRequisitions />
    <ToastSpy />
  </>
);

const openPending = async () => {
  fireEvent.click(await screen.findByText(PENDING_PR));
  await screen.findByTestId('pr-approve');
};
const namedLabel = () => {
  if (BUYER_NAMED.actor.kind !== 'RESOLVED') throw new Error('BUYER_NAMED names nobody');
  return personLabel(BUYER_NAMED.actor.person.personId, i18n.t.bind(i18n));
};

beforeEach(async () => {
  purchaseRequisitionStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  purchaseRequisitionStore.reset();
  await i18n.changeLanguage('en');
});

describe('E2E-1 · the population this file rests on', () => {
  it('the fixture is pending, one seat names a person and the other names nobody', () => {
    expect(purchaseRequisitionStore.get('pr-004')!.status).toBe('Pending Approval');
    expect(BUYER_NAMED.actor.kind).toBe('RESOLVED');
    expect(BUYER.actor.kind).toBe('UNATTRIBUTED');
  });

  it('the three sentences exist in both locales and differ between them', () => {
    for (const key of [
      'requisitions.toast.approved.desc',
      'identity.preAct.namedRequired',
      'identity.refused.namedRequired',
      'identity.preAct.sample',
    ]) {
      const en = i18n.t(key, { lng: 'en', person: 'X', label: 'X' });
      const id = i18n.t(key, { lng: 'id', person: 'X', label: 'X' });
      expect(en, key).not.toBe(key);
      expect(id, key).not.toBe(key);
      expect(en, key).not.toBe(id);
    }
    // The retired sentence is gone, not merely unused.
    for (const lng of LOCALES) {
      expect(i18n.exists('requisitions.panel.attributionNote', { lng })).toBe(false);
      expect(i18n.t('requisitions.toast.approved.desc', { lng, person: 'X' })).not.toMatch(UNATTRIBUTED[lng]);
    }
  });
});

describe.each(LOCALES)('E2E-1 · a named seat reads its own person [%s]', (lng) => {
  it('before the act: whose name the decision carries', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<Page />, { identity: BUYER_NAMED });
    await openPending();
    const note = screen.getByTestId('pr-attribution-note-sample');
    expect(note.textContent).toBe(tr('identity.preAct.sample', { label: namedLabel() }));
    expect(note.textContent).toContain(namedLabel());
    expect(note.textContent).not.toMatch(UNATTRIBUTED[lng]);
    expect(screen.queryByTestId('pr-attribution-note')).toBeNull();
  });

  it('after the act: the toast names the person the store recorded', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<Page />, { identity: BUYER_NAMED });
    await openPending();
    fireEvent.click(screen.getByTestId('pr-approve'));
    await waitFor(() => expect(purchaseRequisitionStore.get('pr-004')!.status).toBe('Approved'));
    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() =>
      expect(spy.textContent).toContain(tr('requisitions.toast.approved.desc', { person: namedLabel() })),
    );
    expect(spy.textContent).toContain(namedLabel());
    expect(spy.textContent).not.toMatch(UNATTRIBUTED[lng]);
    expect(purchaseRequisitionStore.get('pr-004')!.approvedBy).toEqual(BUYER_NAMED.actor);
  });
});

describe.each(LOCALES)('E2E-1 · a seat that names nobody does not decide [%s]', (lng) => {
  it('is told before the act', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<Page />, { identity: BUYER });
    await openPending();
    expect(screen.getByTestId('pr-attribution-note').textContent).toBe(tr('identity.preAct.namedRequired'));
    expect(screen.queryByTestId('pr-attribution-note-sample')).toBeNull();
  });

  it('approve is refused in that language and the requisition does not move', async () => {
    await i18n.changeLanguage(lng);
    const before = purchaseRequisitionStore.get('pr-004');
    renderWithProviders(<Page />, { identity: BUYER });
    await openPending();
    fireEvent.click(screen.getByTestId('pr-approve'));
    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() => expect(spy.textContent).toContain(tr('identity.refused.namedRequired')));
    // The hook's own English sentence is not what the reader is shown.
    expect(spy.textContent).not.toContain('PR_DECIDER_UNATTRIBUTED');
    expect(purchaseRequisitionStore.get('pr-004')).toEqual(before);
  });

  it('reject is refused the same way, the reason typed or not', async () => {
    await i18n.changeLanguage(lng);
    const before = purchaseRequisitionStore.get('pr-004');
    renderWithProviders(<Page />, { identity: BUYER });
    await openPending();
    fireEvent.click(screen.getByTestId('pr-reject-open'));
    fireEvent.change(await screen.findByTestId('pr-reject-reason'), {
      target: { value: 'Budget line is closed for the quarter.' },
    });
    fireEvent.click(screen.getByTestId('pr-reject-confirm'));
    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() => expect(spy.textContent).toContain(tr('identity.refused.namedRequired')));
    expect(spy.textContent).not.toContain('PR_DECIDER_UNATTRIBUTED');
    expect(purchaseRequisitionStore.get('pr-004')).toEqual(before);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// A3 · the revise act on BOTH surfaces (Design 2 §4, batch B3).
//
// The supplier gets a "Revise" on a Disputed / Accepted answer, and the buyer's
// queue says what the revision answers. Every state is reached through the
// REAL machine (dispatch, never a status written into the store), and every
// label is asserted in EN AND ID — a key with no Indonesian behind it falls back
// to English and passes a laxer test.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';

import { renderWithProviders, BUYER as BUYER_IDENTITY } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import BuyerCollaboration from './BuyerCollaboration';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';

const supplierSeat = (supplierId: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const SUP002 = supplierSeat('sup-002');
const SUP005 = supplierSeat('sup-005');
// SDC-3 · operator ruling: accept and dispute require an ATTRIBUTED actor, so the seat that
// accepts here names the planning sample person. The assertions are unchanged.
const BUYER_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'planning' && p.ordinal === 1)!.personId } },
};
const PLANNING: CurrentIdentity = { ...BUYER_IDENTITY, businessRoles: ['planning'] };

const svc = new MockCommandService();
const act = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(scope, { transitionId, entity: 'requirementResponse', entityId, payload });
const scopeOf = (id: CurrentIdentity): QueryScope => ({
  personaType: 'supplier',
  supplierId: id.supplierId,
  businessRoles: id.businessRoles,
});
const revisionOf = (priorId: string) =>
  requirementResponseStore.all().find((r) => r.supersedes === priorId);

beforeEach(() => requirementResponseStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

const openResponses = async (identity: CurrentIdentity) => {
  renderWithProviders(<SupplierForecasts />, { identity, route: '/supplier/forecasts' });
  fireEvent.click(await screen.findByText(/My responses|Respons Saya/i));
  return await screen.findByTestId('sdcsup-responses');
};
const rowFor = (list: HTMLElement, id: string) =>
  within(list).getByText(id).closest('div.bg-bg-surface') as HTMLElement;

describe('A3 · the supplier revises a DISPUTED answer (Probe A, on the surface)', () => {
  it('CONTROL: a Submitted answer offers no Revise — the buyer has not decided', async () => {
    const list = await openResponses(SUP002);
    expect(within(rowFor(list, 'rr-0001')).queryByTestId('sdcsup-response-revise')).toBeNull();
  });

  // ⚠️ RE-PINNED BY SDC-3 (R-SDC P0 #4). This awaited `Superseded` straight after **Save draft** —
  // the defect: an unsent draft retired the dispute. The draft now leaves the dispute standing and
  // says so on its row; **Submit to buyer** retires it. Every assertion the case made is kept, after
  // the send; the draft-time half is new.
  it('Revise → panel names what it replaces → the draft leaves the dispute standing → SENT, it is answered, and both rows say so', async () => {
    const list = await openResponses(SUP005);
    fireEvent.click(within(rowFor(list, 'rr-0002')).getByTestId('sdcsup-response-revise'));

    expect(await screen.findByText(/Revise .* — replaces rr-0002/)).toBeInTheDocument();
    expect(screen.getByTestId('sdcsup-revise-note').textContent).toMatch(/answer to Paragon’s dispute/);

    fireEvent.change(screen.getByLabelText(/Confirmed quantity/), { target: { value: '3500' } });
    fireEvent.click(screen.getByRole('button', { name: /Save draft/ }));

    await waitFor(() => expect(revisionOf('rr-0002')?.status).toBe('Draft'));
    const next = revisionOf('rr-0002')!;
    expect(requirementResponseStore.get('rr-0002')!.status).toBe('Disputed');
    const drafted = await screen.findByTestId('sdcsup-responses');
    expect(within(rowFor(drafted, 'rr-0002')).getByTestId('sdcsup-response-revision-drafted')).toBeInTheDocument();
    fireEvent.click(within(rowFor(drafted, next.id)).getByRole('button', { name: /Submit to buyer/ }));
    await waitFor(() => expect(requirementResponseStore.get('rr-0002')!.status).toBe('Superseded'));
    expect(requirementResponseStore.get(next.id)!.status).toBe('Submitted');

    const after = await screen.findByTestId('sdcsup-responses');
    // The new version names what it revises …
    expect(within(rowFor(after, next.id)).getByTestId('sdcsup-response-revises').textContent).toBe(
      'Revises rr-0002',
    );
    // … and the retired one reads as answered BY THE SUPPLIER, not "resolved".
    const old = rowFor(after, 'rr-0002');
    expect(within(old).getByText('You answered it with a revision')).toBeInTheDocument();
    expect(within(old).queryByText('Paragon resolved the dispute')).toBeNull();
    expect(within(old).getByTestId('sdcsup-response-actor').textContent).toBe(
      'Complete — no further action',
    );
  });

  it('the line card offers Revise, never a second Confirm, while the dispute is open', async () => {
    renderWithProviders(<SupplierForecasts />, { identity: SUP005, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    const card = within(lines).getByText('RM-EMUL-3310').closest('div.bg-bg-surface') as HTMLElement;
    expect(within(card).getByTestId('sdcsup-line-revise')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /^Confirm$/ })).toBeNull();
  });

  it('ID from birth — the button, the panel and the ledger entry are Indonesian', async () => {
    await i18n.changeLanguage('id');
    const list = await openResponses(SUP005);
    const btn = within(rowFor(list, 'rr-0002')).getByTestId('sdcsup-response-revise');
    expect(btn.textContent).toBe('Revisi');
    fireEvent.click(btn);
    expect(await screen.findByText(/Revisi .* — menggantikan rr-0002/)).toBeInTheDocument();
    await act(scopeOf(SUP005), 't_requirementresponse_revise', 'rr-0002', {
      confirmedQty: 3500,
      confirmedQtyRaw: '3500',
    });
  });

  it('ID ledger label differs from EN — the supplier\'s answer is not a buyer resolution in either language', async () => {
    await act(scopeOf(SUP005), 't_requirementresponse_revise', 'rr-0002', {
      confirmedQty: 3500,
      confirmedQtyRaw: '3500',
    });
    // SDC-3 · the answer is recorded when the revision is SENT, not when it is drafted.
    await act(scopeOf(SUP005), 't_requirementresponse_promote', revisionOf('rr-0002')!.id);
    await i18n.changeLanguage('id');
    const list = await openResponses(SUP005);
    expect(within(rowFor(list, 'rr-0002')).getByText('Anda menjawabnya dengan revisi')).toBeInTheDocument();
  });
});

describe('A3 · the supplier revises an ACCEPTED answer (Probe B, on the surface)', () => {
  const accept = async () => {
    await act(BUYER_SCOPE, 't_requirementresponse_review', 'rr-0001');
    await act(BUYER_SCOPE, 't_requirementresponse_accept', 'rr-0001');
  };

  it('the panel says the figure is being planned on, and a cut without a cause is stopped at the form', async () => {
    await accept();
    const list = await openResponses(SUP002);
    fireEvent.click(within(rowFor(list, 'rr-0001')).getByTestId('sdcsup-response-revise'));
    expect((await screen.findByTestId('sdcsup-revise-note')).textContent).toMatch(/accepted 6[.,]000 KG/);

    const before = requirementResponseStore.all().length;
    fireEvent.change(screen.getByLabelText(/Confirmed quantity/), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Save draft/ }));
    // Nothing dispatched: the form owes the root cause first, and says so.
    await screen.findAllByText(/root cause/i);
    expect(requirementResponseStore.all().length).toBe(before);
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Accepted');

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    fireEvent.click(screen.getByRole('button', { name: /Save draft/ }));
    // ⚠️ RE-PINNED BY SDC-3 (R-SDC P0 #4): saved, the cut is a DRAFT and the accepted 6 000 stands;
    // it was awaited as `Superseded` here, which is the defect. Sent, it retires the accepted figure.
    await waitFor(() => expect(revisionOf('rr-0001')?.status).toBe('Draft'));
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Accepted');
    expect(revisionOf('rr-0001')!.forecastConfirmation!.confirmedQty).toBe(100);
    await act(scopeOf(SUP002), 't_requirementresponse_promote', revisionOf('rr-0001')!.id);
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Superseded');
  });

  it('Accepted reads "nothing needed" — an option to revise is not a turn', async () => {
    await accept();
    const list = await openResponses(SUP002);
    expect(within(rowFor(list, 'rr-0001')).getByTestId('sdcsup-response-actor').textContent).toBe(
      'Nothing needed from you — revise it only if your commitment changes',
    );
  });
});

describe('A3 · the buyer reads WHAT a revision answers', () => {
  const openBoard = async () => {
    renderWithProviders(<BuyerCollaboration />, { identity: PLANNING, route: '/buyer/collaboration' });
    return await screen.findByTestId('sdc-awaiting-review');
  };

  it('a revision answering a dispute is queued as such — and a first answer is not (control)', async () => {
    await act(scopeOf(SUP005), 't_requirementresponse_revise', 'rr-0002', {
      confirmedQty: 3500,
      confirmedQtyRaw: '3500',
    });
    const next = revisionOf('rr-0002')!;
    await act(scopeOf(SUP005), 't_requirementresponse_promote', next.id);

    const queue = await openBoard();
    const chips = (await within(queue).findAllByTestId('sdc-review-chip')).map((c) => c.textContent);
    expect(chips).toContain('Revised in answer to your dispute — review v2');
    // rr-0001 is a first answer: it still reads plainly.
    expect(chips).toContain('Submitted');
  });

  it('ID — the queue chip is Indonesian', async () => {
    await act(scopeOf(SUP005), 't_requirementresponse_revise', 'rr-0002', {
      confirmedQty: 3500,
      confirmedQtyRaw: '3500',
    });
    await act(scopeOf(SUP005), 't_requirementresponse_promote', revisionOf('rr-0002')!.id);
    await i18n.changeLanguage('id');
    const queue = await openBoard();
    const chips = (await within(queue).findAllByTestId('sdc-review-chip')).map((c) => c.textContent);
    expect(chips).toContain('Direvisi untuk menjawab sanggahan Anda — telaah v2');
  });

  it('an accepted commitment cut by a revision tops the chase list, named', async () => {
    await act(BUYER_SCOPE, 't_requirementresponse_review', 'rr-0001');
    await act(BUYER_SCOPE, 't_requirementresponse_accept', 'rr-0001');
    await act(scopeOf(SUP002), 't_requirementresponse_revise', 'rr-0001', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      rootCause: { level1: 'capacity' },
    });
    await act(scopeOf(SUP002), 't_requirementresponse_promote', revisionOf('rr-0001')!.id);

    await openBoard();
    const chase = await screen.findByTestId('sdc-chase');
    const first = within(chase).getAllByRole('listitem')[0];
    expect(within(first).getByText('Accepted commitment cut')).toBeInTheDocument();
  });
});

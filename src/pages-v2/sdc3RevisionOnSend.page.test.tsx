// ────────────────────────────────────────────────────────────────────────────
// SDC-3 · the surfaces of a revision that replaces only when sent, of the
// acknowledgment that no longer blocks, and of the operator ruling that a
// person accepts and disputes. The machine half is `sdc3RevisionOnSend.test.ts`.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import BuyerCollaboration from './BuyerCollaboration';
import SupplierForecasts from './SupplierForecasts';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../services/data/mock/stores/forecastPublicationStore';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import type { QueryScope } from '../services/data/types';

const commands = new MockCommandService();
const personOf = (role: SystemRoleId) => ({
  kind: 'RESOLVED' as const,
  person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId },
});
const planningSeat = (named: boolean): CurrentIdentity => ({
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['planning'],
  actor: named ? personOf('planning') : NO_PERSON,
});
const supplierSeat = (supplierId: string, supplierName: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const SUP005 = supplierSeat('sup-005', 'Sample Personal Care Emulsifiers GmbH');
const scopeOf = (id: CurrentIdentity): QueryScope => ({ personaType: id.personaType, supplierId: id.supplierId, businessRoles: id.businessRoles });

beforeEach(() => {
  requirementResponseStore.reset();
  forecastPublicationStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

/** rr-0001 taken under review, so the accept / dispute CTAs render. */
const underReview = async () => {
  const r = await commands.dispatch(
    { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] },
    { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: 'rr-0001' },
  );
  expect(r.status).toBe('done');
};

describe('SDC-3 · the buyer’s page — a person accepts and disputes', () => {
  it('EN — with nobody named, the page says so before the act and holds Accept and Dispute back', async () => {
    await underReview();
    renderWithProviders(<BuyerCollaboration />, { identity: planningSeat(false), route: '/buyer/collaboration' });
    const desk = await screen.findByTestId('sdc-under-review');
    expect(within(desk).getByTestId('sdc-review-needs-person').textContent).toMatch(/^Accepting or disputing commits a supplier/);
    expect(await within(desk).findByTestId('sdc-accept-cta')).toBeDisabled();
    expect(within(desk).getByTestId('sdc-dispute-cta')).toBeDisabled();
  });

  it('KNOWN-GOOD: a seat that names a person sees no note, and both acts are offered', async () => {
    await underReview();
    renderWithProviders(<BuyerCollaboration />, { identity: planningSeat(true), route: '/buyer/collaboration' });
    const desk = await screen.findByTestId('sdc-under-review');
    expect(within(desk).queryByTestId('sdc-review-needs-person')).toBeNull();
    expect(await within(desk).findByTestId('sdc-accept-cta')).toBeEnabled();
    expect(within(desk).getByTestId('sdc-dispute-cta')).toBeEnabled();
  });

  it('ID — the note is Indonesian', async () => {
    await underReview();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCollaboration />, { identity: planningSeat(false), route: '/buyer/collaboration' });
    const desk = await screen.findByTestId('sdc-under-review');
    expect(within(desk).getByTestId('sdc-review-needs-person').textContent).toMatch(/^Menerima atau menyanggah mengikat pemasok/);
  });
});

describe('SDC-3 · the supplier’s page — a revision starts from what was said, and replaces only when sent', () => {
  const openResponses = async () => {
    renderWithProviders(<SupplierForecasts />, { identity: SUP005, route: '/supplier/forecasts' });
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    return screen.findByTestId('sdcsup-responses');
  };

  it('Revise opens on the prior answer — quantity, committed date, capacity constraint and root cause — never empty', async () => {
    const list = await openResponses();
    fireEvent.click(within(list).getByTestId('sdcsup-response-revise'));
    const panel = await screen.findByRole('dialog');
    const texts = within(panel).getAllByRole('textbox') as HTMLInputElement[];
    expect(texts.map((i) => i.value)).toEqual(
      expect.arrayContaining(['3000', 'principal allocation capped this cycle', 'Principal lead time constrains bridgeable volume this period.']),
    );
    expect((panel.querySelector('input[type=date]') as HTMLInputElement).value).toBe('2026-08-22');
    expect((within(panel).getByRole('combobox') as HTMLSelectElement).value).toBe('capacity');
    // saved as it opened, the draft keeps every field — including the level 2 the form cannot show
    fireEvent.click(within(panel).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(requirementResponseStore.all().some((x) => x.supersedes === 'rr-0002')).toBe(true));
    const draft = requirementResponseStore.all().find((x) => x.supersedes === 'rr-0002')!;
    expect(draft.forecastConfirmation).toMatchObject({ confirmedQty: 3000, committedDate: '2026-08-22', capacityConstraint: 'principal allocation capped this cycle' });
    expect(draft.rootCause).toEqual({ level1: 'capacity', level2: 'principal-allocation', note: 'Principal lead time constrains bridgeable volume this period.' });
  });

  it('with a revision drafted, the prior says so in place of Revise — and still reads Disputed', async () => {
    const r = await commands.dispatch(scopeOf(SUP005), {
      transitionId: 't_requirementresponse_revise',
      entity: 'requirementResponse',
      entityId: 'rr-0002',
      payload: { confirmedQty: 3500, confirmedQtyRaw: '3500' },
    });
    expect(r.status, r.reason).toBe('done');
    const draftId = requirementResponseStore.all().find((x) => x.supersedes === 'rr-0002')!.id;
    const list = await openResponses();
    await waitFor(() => expect(within(list).getByTestId('sdcsup-response-revision-drafted')).toBeInTheDocument());
    expect(within(list).getByTestId('sdcsup-response-revision-drafted').textContent).toBe(
      `Revision ${draftId} is drafted — submit it to answer this`,
    );
    expect(within(list).queryByTestId('sdcsup-response-revise')).toBeNull();
    expect(requirementResponseStore.get('rr-0002')!.status).toBe('Disputed');
  });
});

describe('SDC-3 · the supplier’s page — an acknowledged line that became a commitment offers Confirm', () => {
  it('after a fresh plan makes AI-NIAC-6601 · 2026-10 semi-firm, the card offers Confirm, not a pointer to the acknowledgment', async () => {
    const planner: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] };
    const PV = 'PV-2026-08.2';
    const id = (
      await commands.dispatch(planner, {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}` },
      })
    ).entityId!;
    await commands.dispatch(planner, {
      transitionId: 't_publication_allocate',
      entity: 'forecastPublication',
      entityId: id,
      payload: { materialCode: 'AI-NIAC-6601', periodBucket: '2026-10', supplierId: 'sup-007', forecastQty: 800, forecastQtyRaw: '800', basis: 'planner-split' },
    });
    expect((await commands.dispatch(planner, { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: id, payload: {} })).status).toBe('done');
    renderWithProviders(<SupplierForecasts />, { identity: supplierSeat('sup-007', 'PT Sample Packaging Indonesia'), route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    const card = within(lines).getByText('AI-NIAC-6601').closest('div.bg-bg-surface') as HTMLElement;
    expect(within(card).getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(within(card).queryByTestId('sdcsup-line-open-answer')).toBeNull();
  });
});

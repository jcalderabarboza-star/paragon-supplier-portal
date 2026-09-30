// ────────────────────────────────────────────────────────────────────────────
// B4b-2 · what a revision looks like to the SUPPLIER (Design 2 §2.4, §10): the
// version banner, the deadline in the tab header and on every line (overdue
// derived at read), net change per line with a carried line's prior answer
// still counting, the buyer's accept as a dated receipt, and numbers in the
// seat's convention (operator ruling 1). Real service, real store.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../services/data/mock/stores/forecastPublicationStore';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { sdcClock } from '../services/sdc';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import type { QueryScope } from '../services/data/types';

const SUP002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};
const commands = new MockCommandService();
const seat = (roles: readonly SystemRoleId[], role?: SystemRoleId): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(role ? { actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId } } } : {}),
});
const PV = 'PV-2026-08.2';

/** A revision of R2 from the grid: 3310 moved to 5 500, the rest carried, signed, published. */
async function publishRevision() {
  const planner = seat(['planning']);
  const id = (
    await commands.dispatch(planner, {
      transitionId: 't_publication_open',
      entity: 'forecastPublication',
      payload: { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}`, carryForwardFrom: 'PUB-2026-08-RM-R2' },
    })
  ).entityId!;
  await commands.dispatch(planner, {
    transitionId: 't_publication_allocate',
    entity: 'forecastPublication',
    entityId: id,
    payload: { materialCode: 'RM-EMUL-3310', periodBucket: '2026-08', supplierId: 'sup-002', forecastQty: 5500, forecastQtyRaw: '5500', basis: 'planner-split' },
  });
  for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
    await commands.dispatch(seat(['procurement'], 'procurement'), {
      transitionId: 't_publication_approve_firm',
      entity: 'forecastPublication',
      entityId: id,
      payload: { materialCode: l.materialCode, periodBucket: l.periodBucket, supplierId: l.supplierId },
    });
  }
  await commands.dispatch(planner, { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: id, payload: {} });
  return id;
}

const renderPage = () => renderWithProviders(<SupplierForecasts />, { identity: SUP002, route: '/supplier/forecasts' });
const cardFor = async (code: string) => {
  const lines = await screen.findByTestId('sdcsup-lines');
  return within(lines).getByText(code).closest('div.bg-bg-surface') as HTMLElement;
};

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
});
afterEach(async () => {
  sdcClock.reset();
  await i18n.changeLanguage('en');
});

describe('the seeds, as sup-002 reads them (R2 superseded R1)', () => {
  it('EN — the version banner counts the supplier’s OWN lines: 1 changed, 1 carried', async () => {
    renderPage();
    const banner = await screen.findByTestId('sdcsup-version-banner');
    expect(banner.textContent).toBe('Plan PV-2026-08.2 published 15 Aug 2026 — 1 line changed, 1 carried');
  });

  it('the carried line says so, and the answer given to R1 STILL COUNTS — in the seat’s number convention', async () => {
    renderPage();
    const carried = await cardFor('RM-EMUL-3310');
    expect(within(carried).getByTestId('sdcsup-line-net').textContent).toBe('Carried — no re-confirmation needed');
    expect(within(carried).getByTestId('sdcsup-line-carried-answer').textContent).toBe('Your answer to PV-2026-08.1 (v1, 6,000 KG) still counts');
    const changed = await cardFor('RM-EMUL-3320');
    expect(within(changed).getByTestId('sdcsup-line-net').textContent).toBe('Changed — was 2,000 KG');
    // KNOWN-GOOD twin of the carried answer: a changed line carries none
    expect(within(changed).queryByTestId('sdcsup-line-carried-answer')).toBeNull();
  });

  it('a seed publication claims no deadline, and says so in the tab header and on the line', async () => {
    renderPage();
    const carried = await cardFor('RM-EMUL-3310');
    expect(within(carried).getByTestId('sdcsup-line-deadline').textContent).toBe('Respond byNo deadline set');
    expect(screen.getByRole('tab', { name: /Published lines · no deadline set/ })).toBeInTheDocument();
  });

  it('ID — the banner, the net-change copy and the numbers are Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderPage();
    expect((await screen.findByTestId('sdcsup-version-banner')).textContent).toBe(
      'Rencana PV-2026-08.2 terbit 15 Agu 2026 — 1 baris berubah, 1 terbawa',
    );
    const carried = await cardFor('RM-EMUL-3310');
    expect(within(carried).getByTestId('sdcsup-line-carried-answer').textContent).toBe('Jawaban Anda untuk PV-2026-08.1 (v1, 6.000 KG) tetap berlaku');
    expect(within(await cardFor('RM-EMUL-3320')).getByTestId('sdcsup-line-net').textContent).toBe('Berubah — sebelumnya 2.000 KG');
  });
});

describe('a revision published from the grid', () => {
  it('the deadline is on every line and in the tab header; the 3310 move reads changed, the rest carried', async () => {
    await publishRevision();
    renderPage();
    expect((await screen.findByTestId('sdcsup-version-banner')).textContent).toBe(
      'Plan PV-2026-08.2 published 31 Aug 2026 — 1 line changed, 1 carried',
    );
    for (const code of ['RM-EMUL-3310', 'RM-EMUL-3320']) {
      const dl = within(await cardFor(code)).getByTestId('sdcsup-line-deadline');
      expect(dl.textContent).toBe('Respond by07 Sept 2026');
      expect(dl.dataset.overdue).toBe('false');
    }
    expect(screen.getByRole('tab', { name: /Published lines · respond by 07 Sept 2026/ })).toBeInTheDocument();
    expect(within(await cardFor('RM-EMUL-3310')).getByTestId('sdcsup-line-net').textContent).toBe('Changed — was 6,000 KG');
  });

  // Found by the mutation probe: every case above has ONE changed and ONE
  // carried, so a banner that swapped the two counts read the same. Unequal.
  it('a revision that moves BOTH lines reads 2 changed, 0 carried — the counts are not interchangeable', async () => {
    const id = await publishRevision();
    // move the second line too, on a further revision
    const planner = seat(['planning']);
    const next = (
      await commands.dispatch(planner, {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}`, carryForwardFrom: id },
      })
    ).entityId!;
    for (const [code, bucket, qty] of [['RM-EMUL-3310', '2026-08', 5000], ['RM-EMUL-3320', '2026-09', 2500]] as const) {
      await commands.dispatch(planner, {
        transitionId: 't_publication_allocate',
        entity: 'forecastPublication',
        entityId: next,
        payload: { materialCode: code, periodBucket: bucket, supplierId: 'sup-002', forecastQty: qty, forecastQtyRaw: String(qty), basis: 'planner-split' },
      });
    }
    for (const l of forecastPublicationStore.get(next)!.lines.filter((x) => x.commitmentClass === 'firm')) {
      await commands.dispatch(seat(['procurement'], 'procurement'), {
        transitionId: 't_publication_approve_firm',
        entity: 'forecastPublication',
        entityId: next,
        payload: { materialCode: l.materialCode, periodBucket: l.periodBucket, supplierId: l.supplierId },
      });
    }
    await commands.dispatch(planner, { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: next, payload: {} });
    renderPage();
    expect((await screen.findByTestId('sdcsup-version-banner')).textContent).toBe(
      'Plan PV-2026-08.2 published 31 Aug 2026 — 2 lines changed, 0 carried',
    );
  });

  it('OVERDUE is derived at read: past the deadline the same record reads overdue', async () => {
    await publishRevision();
    sdcClock.set('2026-09-08T00:00:00.000Z');
    renderPage();
    const dl = within(await cardFor('RM-EMUL-3320')).getByTestId('sdcsup-line-deadline');
    expect(dl.dataset.overdue).toBe('true');
    expect(dl.textContent).toBe('Respond by07 Sept 2026Overdue');
    expect(screen.getByRole('tab', { name: /Published lines · overdue since 07 Sept 2026/ })).toBeInTheDocument();
  });
});

describe('the receipt — the buyer’s accept, dated, in My responses', () => {
  it('after review → accept, My responses shows "Accepted by the buyer on …"; before, nothing claims it', async () => {
    const buyer = seat(PERSONA_SYSTEM_ROLES.buyer);
    await commands.dispatch(buyer, { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: 'rr-0001', payload: {} });
    sdcClock.set('2026-09-02T09:00:00.000Z');
    await commands.dispatch(buyer, { transitionId: 't_requirementresponse_accept', entity: 'requirementResponse', entityId: 'rr-0001', payload: {} });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const list = await screen.findByTestId('sdcsup-responses');
    await waitFor(() => expect(within(list).getAllByTestId('sdcsup-response-receipt')).toHaveLength(1));
    expect(within(list).getByTestId('sdcsup-response-receipt').textContent).toBe('Accepted by the buyer on 02 Sept 2026');
  });

  it('CONTROL: with nothing accepted, no receipt renders', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    await screen.findByTestId('sdcsup-responses');
    expect(screen.queryByTestId('sdcsup-response-receipt')).toBeNull();
  });
});

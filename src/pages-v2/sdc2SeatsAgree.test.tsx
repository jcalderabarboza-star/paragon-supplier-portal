// ────────────────────────────────────────────────────────────────────────────
// SDC-2 · THE TWO SEATS SAY THE SAME THING ABOUT ONE LINE (R-SDC P0 #2, P0 #3,
// and the P1s on per-line overdue and the Comm Hub label).
//
// Measured in R-SDC browser QA on `main` @ 4f29bf2, as the seeded packaging
// supplier (sup-007): two lines read "Carried — no re-confirmation needed" and
// "No deadline set", while the buyer's chase listed the same supplier
// "Overdue · 2 awaiting line(s) · Due 22 Aug 2026". Every case below was red
// there. Real services, real stores, the shared SDC clock (31 Aug 2026).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { MockCollaborationService } from '../services/data/mock/MockCollaborationService';
import { forecastPublicationStore } from '../services/data/mock/stores/forecastPublicationStore';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import {
  buildRequirementResponsePayload,
  chaseList,
  consolidationRows,
  responseDueAtOf,
  sdcClock,
  type ForecastPublication,
} from '../services/sdc';
import type { QueryScope } from '../services/data/types';

const PACKAGING: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};
const SUP007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null };
const commands = new MockCommandService();
const collab = new MockCollaborationService();
const R2 = () => forecastPublicationStore.publications().find((p) => p.publicationId === 'PUB-2026-08-RM-R2')!;

const renderPage = () => renderWithProviders(<SupplierForecasts />, { identity: PACKAGING, route: '/supplier/forecasts' });
const cardFor = async (code: string) => {
  const lines = await screen.findByTestId('sdcsup-lines');
  return within(lines).getByText(code).closest('div.bg-bg-surface') as HTMLElement;
};
/** The supplier confirms a line IN FULL and submits it — the act that ends the buyer's wait. */
async function answer(code: string) {
  const pub = R2();
  const line = pub.lines.find((l) => l.supplierId === 'sup-007' && l.materialCode === code)!;
  const made = await commands.dispatch(SUP007, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: buildRequirementResponsePayload(pub, line, 'sup-007', {
      confirmedQty: line.forecastQty,
      confirmedQtyRaw: String(line.forecastQty),
    }),
  });
  expect(made.status, made.reason).toBe('done');
  const sent = await commands.dispatch(SUP007, { transitionId: 't_requirementresponse_promote', entity: 'requirementResponse', entityId: made.entityId! });
  expect(sent.status, sent.reason).toBe('done');
}

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
});
afterEach(async () => {
  sdcClock.reset();
  await i18n.changeLanguage('en');
});

describe('SDC-2 · the population, read before any assertion leans on it', () => {
  it('the buyer chases sup-007 as OVERDUE on two awaiting lines, due 22 Aug — and both lines are unchanged from R1', async () => {
    const entry = (await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-007');
    expect(entry).toEqual({ supplierId: 'sup-007', reason: 'overdue', awaitingLines: 2, dueAt: '2026-08-22T00:00:00.000Z' });
    const rows = consolidationRows(forecastPublicationStore.publications(), requirementResponseStore.all()).filter(
      (r) => r.line.supplierId === 'sup-007',
    );
    expect(rows.map((r) => `${r.line.materialCode}:${r.state.kind}`).sort()).toEqual([
      'AI-NIAC-6601:acknowledged',
      'PK-CAPF-8820:awaiting',
      'PK-PETB-8810:awaiting',
    ]);
  });
});

describe('SDC-2 · one deadline, read by both seats', () => {
  it('the deadline the supplier reads is the date the buyer chases against', async () => {
    const entry = (await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-007')!;
    expect(responseDueAtOf(R2())).toBe(entry.dueAt);
    renderPage();
    for (const code of ['PK-PETB-8810', 'PK-CAPF-8820', 'AI-NIAC-6601']) {
      expect(within(await cardFor(code)).getByTestId('sdcsup-line-deadline').textContent).toMatch(/^Respond by22 Aug 2026/);
    }
    expect(screen.queryByText(/no deadline set/i)).not.toBeInTheDocument();
  });

  it('a STAMPED deadline wins over the policy — for the chase and for the supplier alike', () => {
    const stamped: ForecastPublication = { ...R2(), responseDueAt: '2026-09-30T00:00:00.000Z' };
    expect(responseDueAtOf(stamped)).toBe('2026-09-30T00:00:00.000Z');
    const rows = consolidationRows([stamped], requirementResponseStore.all());
    const entries = chaseList(stamped, rows, sdcClock.now());
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) expect(e.dueAt).toBe('2026-09-30T00:00:00.000Z');
    // KNOWN-GOOD twin: before the stamped date nobody is overdue on that plan
    expect(entries.map((e) => e.reason)).not.toContain('overdue');
  });
});

describe('SDC-2 · "no re-confirmation needed" only when an answer counts', () => {
  it('EN — an unchanged line nobody answered says it is awaiting the supplier; the acknowledged one says carried', async () => {
    renderPage();
    for (const code of ['PK-PETB-8810', 'PK-CAPF-8820']) {
      const net = within(await cardFor(code)).getByTestId('sdcsup-line-net');
      expect(net.textContent).toBe('Unchanged — awaiting your confirmation');
      expect(net.dataset).toMatchObject({ net: 'carried', awaiting: 'true' });
    }
    const acked = within(await cardFor('AI-NIAC-6601')).getByTestId('sdcsup-line-net');
    expect(acked.textContent).toBe('Carried — no re-confirmation needed');
    expect(acked.dataset.awaiting).toBe('false');
  });

  it('once the supplier answers, the same line says carried — the pill follows the answer, not the line', async () => {
    await answer('PK-PETB-8810');
    renderPage();
    expect(within(await cardFor('PK-PETB-8810')).getByTestId('sdcsup-line-net').textContent).toBe('Carried — no re-confirmation needed');
    expect(within(await cardFor('PK-CAPF-8820')).getByTestId('sdcsup-line-net').textContent).toBe('Unchanged — awaiting your confirmation');
  });

  it('ID — the awaiting copy is Indonesian, and the English is gone', async () => {
    await i18n.changeLanguage('id');
    renderPage();
    const net = within(await cardFor('PK-PETB-8810')).getByTestId('sdcsup-line-net');
    expect(net.textContent).toBe('Tidak berubah — menunggu konfirmasi Anda');
    expect(screen.queryByText(/awaiting your confirmation/)).not.toBeInTheDocument();
  });
});

describe('SDC-2 · overdue is a line still owed', () => {
  it('past the deadline, only the two unanswered lines are overdue — the acknowledged one is not', async () => {
    renderPage();
    for (const code of ['PK-PETB-8810', 'PK-CAPF-8820'])
      expect(within(await cardFor(code)).getByTestId('sdcsup-line-deadline').dataset.overdue).toBe('true');
    expect(within(await cardFor('AI-NIAC-6601')).getByTestId('sdcsup-line-deadline').dataset.overdue).toBe('false');
    expect(screen.getByRole('tab', { name: /Published lines · overdue since 22 Aug 2026/ })).toBeInTheDocument();
  });

  it('when every line is answered, nothing is overdue and the tab says all are answered — and the buyer stops chasing', async () => {
    await answer('PK-PETB-8810');
    await answer('PK-CAPF-8820');
    expect((await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-007')).toBeUndefined();
    renderPage();
    for (const code of ['PK-PETB-8810', 'PK-CAPF-8820', 'AI-NIAC-6601'])
      expect(within(await cardFor(code)).getByTestId('sdcsup-line-deadline').dataset.overdue).toBe('false');
    expect(screen.getByRole('tab', { name: /Published lines · all answered \(due 22 Aug 2026\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('before the deadline the tab says respond by — the same date, still open', async () => {
    sdcClock.set('2026-08-20T00:00:00.000Z');
    renderPage();
    await screen.findByTestId('sdcsup-lines');
    expect(screen.getByRole('tab', { name: /Published lines · respond by 22 Aug 2026/ })).toBeInTheDocument();
  });
});

describe('SDC-2 · the Comm Hub label for a supplier who replied', () => {
  it('EN and ID say the supplier replied — neither says the buyer is still waiting', async () => {
    expect(i18n.t('buyerCommHub.status.awaiting', { lng: 'en' })).toBe('Replied since the ask');
    expect(i18n.t('buyerCommHub.status.awaiting', { lng: 'id' })).toBe('Sudah dibalas sejak diminta');
    // KNOWN-GOOD twin: the status for a supplier who went quiet still says no reply
    expect(i18n.t('buyerCommHub.status.stale', { lng: 'en' })).toBe('No reply yet');
  });
});

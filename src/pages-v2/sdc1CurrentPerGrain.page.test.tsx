// ────────────────────────────────────────────────────────────────────────────
// SDC-1 · both seats' PAGES after one weekly line is published (R-SDC e13, the
// surface half). The service spec (`sdc1CurrentPerGrain.test.ts`) pins the
// reads; this pins what the buyer and the supplier SEE: the monthly plan, its
// queues and its lines stay, the weekly plan stands beside them, and a supplier
// in both grains is told which plan is which — in English and in Indonesian.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import BuyerCollaboration from './BuyerCollaboration';
import SupplierForecasts from './SupplierForecasts';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../services/data/mock/stores/forecastPublicationStore';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { planVersionOffers } from '../services/data/mock/publicationFeed';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import type { QueryScope } from '../services/data/types';

const commands = new MockCommandService();
const seat = (roles: readonly SystemRoleId[], role?: SystemRoleId): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(role
    ? { actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId } } }
    : {}),
});

/** e13 — one weekly line (SIM-PM-0002 · 2026-W36 → sup-002), signed and published. */
async function publishOneWeeklyLine(): Promise<string> {
  const planner = seat(['planning']);
  const offer = planVersionOffers('week')[0];
  const id = (
    await commands.dispatch(planner, {
      transitionId: 't_publication_open',
      entity: 'forecastPublication',
      payload: { planVersion: offer.planVersion, grain: 'week', horizon: offer.horizon, sourceRef: offer.sourceRef },
    })
  ).entityId!;
  await commands.dispatch(planner, {
    transitionId: 't_publication_allocate',
    entity: 'forecastPublication',
    entityId: id,
    payload: { materialCode: 'SIM-PM-0002', periodBucket: '2026-W36', supplierId: 'sup-002', forecastQty: 5000, forecastQtyRaw: '5000', basis: 'planner-split' },
  });
  for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
    await commands.dispatch(seat(['procurement'], 'procurement'), {
      transitionId: 't_publication_approve_firm',
      entity: 'forecastPublication',
      entityId: id,
      payload: { materialCode: l.materialCode, periodBucket: l.periodBucket, supplierId: l.supplierId },
    });
  }
  const r = await commands.dispatch(planner, { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: id, payload: {} });
  expect(r.status, r.reason).toBe('done');
  return id;
}

const BUYER: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};
const supplierSeat = (supplierId: string, supplierName: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const PACKAGING = supplierSeat('sup-007', 'PT Sample Packaging Indonesia');
const FATS = supplierSeat('sup-002', 'PT Sample Specialty Fats');

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('SDC-1 · the buyer’s page after one weekly line is published', () => {
  it('the header names BOTH plans, the period bar lists months then weeks, and every queue keeps its monthly responses', async () => {
    await publishOneWeeklyLine();
    renderWithProviders(<BuyerCollaboration />, { identity: BUYER, route: '/buyer/collaboration' });
    // sup-002 already answers the monthly plan: eight lines, still three suppliers, two plan versions.
    expect(await screen.findByText(/8 published lines · 3 suppliers · plan PV-2026-08\.2 · PV-SIM-/)).toBeInTheDocument();
    const bar = screen.getByTestId('sdc-period-bar');
    expect(within(bar).getByRole('button', { name: '2026-08' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: '2026-W36' })).toBeInTheDocument();
    const review = screen.getByTestId('sdc-awaiting-review');
    for (const id of ['rr-0001', 'rr-0004', 'rr-0005']) expect(within(review).getByText(id)).toBeInTheDocument();
    expect(within(screen.getByTestId('sdc-disputes')).getByText('rr-0002')).toBeInTheDocument();
  });
});

describe('SDC-1 · the supplier’s page after one weekly line is published', () => {
  it('the packaging supplier still reads its three monthly lines under ONE banner, with no grain named', async () => {
    await publishOneWeeklyLine();
    renderWithProviders(<SupplierForecasts />, { identity: PACKAGING, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    for (const code of ['PK-PETB-8810', 'PK-CAPF-8820', 'AI-NIAC-6601']) expect(within(lines).getByText(code)).toBeInTheDocument();
    const banners = screen.getAllByTestId('sdcsup-version-banner');
    expect(banners.map((b) => b.dataset.grain)).toEqual(['month']);
    expect(banners[0].textContent).toMatch(/^Plan PV-2026-08\.2 published 15 Aug 2026/);
  });

  it('EN — a supplier in both grains sees both plans, each banner naming its grain, and the weekly line beside the monthly ones', async () => {
    await publishOneWeeklyLine();
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(lines).getByText('RM-EMUL-3310')).toBeInTheDocument();
    // a synthetic code has no master label, so the code also stands as the label: at least one.
    expect(within(lines).getAllByText('SIM-PM-0002').length).toBeGreaterThan(0);
    const banners = screen.getAllByTestId('sdcsup-version-banner');
    expect(banners.map((b) => b.dataset.grain)).toEqual(['month', 'week']);
    expect(banners[0].textContent).toMatch(/^Monthly plan · Plan PV-2026-08\.2 published 15 Aug 2026/);
    expect(banners[1].textContent).toMatch(/^Weekly plan · Plan PV-SIM-\S+ published 31 Aug 2026 — 1 lines, the first plan/);
    // each line keeps its OWN plan's deadline: the seed claims none, the weekly plan's is stamped
    const card = (code: string) => within(lines).getAllByText(code)[0].closest('div.bg-bg-surface') as HTMLElement;
    expect(within(card('RM-EMUL-3310')).getByTestId('sdcsup-line-deadline').textContent).toBe('Respond byNo deadline set');
    expect(within(card('SIM-PM-0002')).getByTestId('sdcsup-line-deadline').textContent).toBe('Respond by07 Sept 2026');
    // the tab names the EARLIEST deadline stated — the weekly plan's (the seed has none)
    expect(screen.getByRole('tab', { name: /Published lines · respond by 07 Sept 2026/ })).toBeInTheDocument();
  });

  it('ID — the grain is named in Indonesian, and the English words are gone', async () => {
    await publishOneWeeklyLine();
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    await screen.findByTestId('sdcsup-lines');
    const banners = screen.getAllByTestId('sdcsup-version-banner');
    expect(banners[0].textContent).toMatch(/^Rencana bulanan · Rencana PV-2026-08\.2 terbit 15 Agu 2026/);
    expect(banners[1].textContent).toMatch(/^Rencana mingguan · Rencana PV-SIM-/);
    expect(banners.map((b) => b.textContent).join(' ')).not.toMatch(/Monthly plan|Weekly plan/);
  });
});

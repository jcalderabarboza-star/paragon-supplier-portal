// ────────────────────────────────────────────────────────────────────────────
// SDC-5 · EVERY STATE HAS A WAY OUT — on the page (R-SDC P1). Real service, real
// dispatcher, real stores.
//
// Measured in the browser on `main` @ 8678c4a:
//  · the supplier of a published sample line read "1 lines, the first plan you
//    have been sent", a card titled by its code twice (no label resolved), and a
//    Confirm whose draft was refused as an unknown material;
//  · the publication panel offered a draft nothing but Publish;
//  · a to-paragon leg told its supplier to "mark it shipped there", on an ASN
//    whose departure and arrival no surface dispatches.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { NO_PERSON } from '../context/noPerson';
import SupplierForecasts from './SupplierForecasts';
import PublicationPanel from './plan-grid/PublicationPanel';
import SampleMaterialTag from '../components/ui-v2/SampleMaterialTag';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../services/transitions/businessRoles';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../services/data/mock/stores/forecastPublicationStore';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { incomingShipmentStore } from '../services/data/mock/stores/incomingShipmentStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { planVersionOffers } from '../services/data/mock/publicationFeed';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import type { QueryScope } from '../services/data/types';

const commands = new MockCommandService();
const SIM = 'SIM-PM-0002';
const personOf = (role: SystemRoleId) => SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId;
const seat = (roles: readonly SystemRoleId[], role?: SystemRoleId): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(role ? { actor: { kind: 'RESOLVED', person: { personId: personOf(role) } } } : {}),
});
const PLANNER = seat(['planning'], 'planning');

const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });

async function openWeeklyDraft(): Promise<string> {
  const offer = planVersionOffers('week')[0];
  const r = await commands.dispatch(PLANNER, {
    transitionId: 't_publication_open',
    entity: 'forecastPublication',
    payload: { planVersion: offer.planVersion, grain: 'week', horizon: offer.horizon, sourceRef: offer.sourceRef },
  });
  expect(r.status, r.reason).toBe('done');
  return r.entityId!;
}

/** A weekly plan on the generated material, to sup-002, one line per bucket given. */
async function publishSampleLines(buckets: readonly string[]): Promise<string> {
  const id = await openWeeklyDraft();
  for (const periodBucket of buckets) {
    const split = await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: SIM,
      periodBucket,
      supplierId: 'sup-002',
      forecastQty: 5000,
      forecastQtyRaw: '5000',
      basis: 'planner-split',
    });
    expect(split.status, split.reason).toBe('done');
  }
  for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
    const signed = await fire(seat(['procurement'], 'procurement'), 't_publication_approve_firm', id, {
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      supplierId: l.supplierId,
    });
    expect(signed.status, signed.reason).toBe('done');
  }
  const published = await fire(PLANNER, 't_publication_publish', id);
  expect(published.status, published.reason).toBe('done');
  return id;
}

const FATS: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};
const weeklyBanner = () => screen.getAllByTestId('sdcsup-version-banner').find((b) => b.dataset.grain === 'week')!;
const cardOf = (lines: HTMLElement, text: string) => within(lines).getAllByText(text)[0].closest('div.bg-bg-surface') as HTMLElement;

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
  incomingShipmentStore.reset();
  asnStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · the first-plan line counts its lines', () => {
  it('EN — one line reads "1 line", and two read "2 lines"', async () => {
    await publishSampleLines(['2026-W36']);
    const one = renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    await screen.findByTestId('sdcsup-lines');
    expect(weeklyBanner().textContent).toContain('— 1 line, the first plan you have been sent');
    expect(weeklyBanner().textContent).not.toContain('1 lines');
    one.unmount();

    // KNOWN-GOOD for the other form: the plural is still a plural.
    forecastPublicationStore.reset();
    await publishSampleLines(['2026-W36', '2026-W37']);
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    await screen.findByTestId('sdcsup-lines');
    expect(weeklyBanner().textContent).toContain('— 2 lines, the first plan you have been sent');
  });

  it('ID — the line is counted in Bahasa too, with no English left in it', async () => {
    await i18n.changeLanguage('id');
    await publishSampleLines(['2026-W36']);
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    await screen.findByTestId('sdcsup-lines');
    expect(weeklyBanner().textContent).toContain('— 1 baris, rencana pertama yang dikirim kepada Anda');
    expect(weeklyBanner().textContent).not.toMatch(/lines?\b/);
  });
});

describe('SDC-5 · a sample material is named, marked, and answerable on the supplier’s page', () => {
  it('⚠️ the card carries the sample label and the SAMPLE mark — and a real material carries no mark', async () => {
    await publishSampleLines(['2026-W36']);
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    const sample = cardOf(lines, SIM);
    expect(within(sample).getByText('Sample packaging 0002')).toBeInTheDocument();
    expect(within(sample).getByTestId('sample-material-tag').textContent).toBe('Sample material');
    // CONTROL — the monthly line beside it is a real material: labelled, unmarked.
    const real = cardOf(lines, 'RM-EMUL-3310');
    expect(within(real).getByText('Glycerin USP 99.5%')).toBeInTheDocument();
    expect(within(real).queryByTestId('sample-material-tag')).toBeNull();
  });

  it('ID — the mark is translated', async () => {
    await i18n.changeLanguage('id');
    await publishSampleLines(['2026-W36']);
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(cardOf(lines, SIM)).getByTestId('sample-material-tag').textContent).toBe('Material sampel');
  });

  it('the mark is decided by the generator’s own set — an invented SIM- code is not marked', () => {
    const { container } = renderWithProviders(
      <>
        <SampleMaterialTag materialCode={SIM} />
        <SampleMaterialTag materialCode="SIM-PM-9999" />
        <SampleMaterialTag materialCode="PK-PETB-8810" />
      </>,
      { identity: BUYER, route: '/' },
    );
    expect(container.querySelectorAll('[data-testid=sample-material-tag]')).toHaveLength(1);
  });

  it('⚠️ Confirm → Save draft RECORDS the answer, in PCS — it was refused as an unknown material', async () => {
    await publishSampleLines(['2026-W36']);
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    const lines = await screen.findByTestId('sdcsup-lines');
    fireEvent.click(within(cardOf(lines, SIM)).getByRole('button', { name: 'Confirm' }));
    const panel = await screen.findByRole('dialog');
    // the panel names the material by its label, and asks in the material's own unit
    expect(panel.textContent).toContain('Sample packaging 0002');
    expect(panel.textContent).toContain('(PCS)');
    fireEvent.change(within(panel).getAllByRole('textbox')[0], { target: { value: '5000' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(requirementResponseStore.all().some((r) => r.materialCode === SIM)).toBe(true));
    expect(requirementResponseStore.all().find((r) => r.materialCode === SIM)).toMatchObject({
      supplierId: 'sup-002',
      periodBucket: '2026-W36',
      status: 'Draft',
      forecastConfirmation: { confirmedQty: 5000, uom: 'PCS' },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · the publication panel discards a draft', () => {
  const PLANNING_NAMED: CurrentIdentity = {
    ...BUYER,
    businessRoles: ['planning'],
    actor: { kind: 'RESOLVED', person: { personId: personOf('planning') } },
  };
  const PROCUREMENT_ONLY: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
  const mount = (identity: CurrentIdentity) =>
    renderWithProviders(<PublicationPanel grain="week" />, { identity, route: '/buyer/plan-grid' });

  it('⚠️ asked twice — "Keep the draft" keeps it, "Discard it" ends it and Open draft is offered again', async () => {
    const id = await openWeeklyDraft();
    mount(PLANNING_NAMED);
    await screen.findByTestId('publication-draft');
    // nothing is asked until the planner asks
    expect(screen.queryByTestId('publication-discard-ask')).toBeNull();
    fireEvent.click(screen.getByTestId('publication-discard'));
    expect(screen.getByTestId('publication-discard-ask').textContent).toBe(
      `Discard ${id}? Nothing in it has been sent to a supplier. Its split is not carried to the next draft.`,
    );
    // stepping back dispatches nothing
    fireEvent.click(screen.getByTestId('publication-discard-no'));
    expect(screen.queryByTestId('publication-discard-ask')).toBeNull();
    expect(forecastPublicationStore.get(id)!.state).toBe('Draft');

    fireEvent.click(screen.getByTestId('publication-discard'));
    fireEvent.click(screen.getByTestId('publication-discard-yes'));
    await screen.findByTestId('publication-no-draft');
    expect(forecastPublicationStore.get(id)!.state).toBe('Discarded');
    expect(screen.getByTestId('publication-open')).toBeEnabled();
    expect(screen.queryByTestId('publication-failure')).toBeNull();
    // the history says who ended it, in the role that holds the act
    const history = screen.getByTestId('publication-ledger-grid');
    const row = within(history).getByText('Draft discarded').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('Planning');
    expect(row.textContent).toContain('(SAMPLE)');
  });

  it('ID — the control, the question and the history row are in Bahasa', async () => {
    await i18n.changeLanguage('id');
    const id = await openWeeklyDraft();
    mount(PLANNING_NAMED);
    await screen.findByTestId('publication-draft');
    expect(screen.getByTestId('publication-discard').textContent).toBe('Buang draf');
    fireEvent.click(screen.getByTestId('publication-discard'));
    expect(screen.getByTestId('publication-discard-ask').textContent).toBe(
      `Buang ${id}? Tidak ada isinya yang sudah dikirim ke pemasok. Pembagiannya tidak dibawa ke draf berikutnya.`,
    );
    expect(screen.getByTestId('publication-discard-no').textContent).toBe('Pertahankan draf');
    fireEvent.click(screen.getByTestId('publication-discard-yes'));
    await screen.findByTestId('publication-no-draft');
    expect(within(screen.getByTestId('publication-ledger-grid')).getByText('Draf dibuang')).toBeInTheDocument();
  });

  it('⚠️ a seat that cannot open a draft cannot discard one — it reads who can, in the discard slot', async () => {
    const id = await openWeeklyDraft();
    mount(PROCUREMENT_ONLY);
    await screen.findByTestId('publication-draft');
    expect(screen.queryByTestId('publication-discard')).toBeNull();
    expect(screen.getByTestId('handoff-publication-discard').textContent).toContain('Planning');
    expect(forecastPublicationStore.get(id)!.state).toBe('Draft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · a to-paragon leg no longer sends its supplier to a control that does not exist', () => {
  const openShipments = async () => {
    renderWithProviders(<SupplierForecasts />, { identity: FATS, route: '/supplier/forecasts' });
    fireEvent.click(await screen.findByRole('tab', { name: /Shipments|Pengiriman/i }));
    return screen.findByTestId('sdcsup-shipments');
  };

  it('EN — the arrival line names the ASN and says there is nothing to mark', async () => {
    const tab = await openShipments();
    const line = await within(tab).findByTestId('ship-advance-via-asn-arrive');
    expect(line.textContent).toBe(
      'Arrival is tracked by ASN ASN-2025-00301 — Paragon records it at receipt; there is nothing to mark here.',
    );
    expect(line.textContent).not.toMatch(/mark it (shipped|arrived) there/);
  });

  it('ID — the same line in Bahasa', async () => {
    await i18n.changeLanguage('id');
    const tab = await openShipments();
    const line = await within(tab).findByTestId('ship-advance-via-asn-arrive');
    expect(line.textContent).toBe(
      'Kedatangan dilacak oleh ASN ASN-2025-00301 — Paragon mencatatnya saat penerimaan; tidak ada yang perlu ditandai di sini.',
    );
    expect(line.textContent).not.toContain('di sana');
  });
});

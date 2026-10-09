// ────────────────────────────────────────────────────────────────────────────
// E2E-1 · THE SUPPLIER'S EVENT CARD SHOWS WHAT THE BUYER SET, AND NOTHING ELSE.
//
// Found on the end-to-end walk: every card listed "Price 40% · Quality 25% ·
// Lead Time 15% · Sustainability 10% · Risk 10%" — weights nobody had set, on
// an event whose buyer had set two criteria at 60/40 — and showed the award
// deadline under "Req. Delivery", which on one event was earlier than the
// response deadline beside it.
//
// Held here, in EN and ID:
//   1. an event with no criteria says so, and prints none of the five retired
//      sample weights;
//   2. an event with criteria lists exactly those, with their weights;
//   3. the delivery date is the event's own, or "not stated" — never the award
//      deadline;
//   4. the event's delivery date travels: wizard payload → store → the
//      supplier's read.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { toSupplierRfqView } from '../services/data/rfqSupplierView';
import { buildRfqCreatePayload, type RfqCreateTerms } from './sourcing/rfqCreateModel';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import type { RfpCriterion } from '../data/rfpEvaluation';
import i18n from '../lib/i18n';
import SupplierRFQs from './SupplierRFQs';

const LOCALES = ['en', 'id'] as const;
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

/** An open event one sample supplier is invited to, with no criteria and no delivery date. */
const EVENT = 'rfq-010';
const NUMBER = 'RFQ-2026-010';
const SUPPLIER_ID = 'sup-007';
const DELIVERY = '2027-01-15';
const CRITERIA: RfpCriterion[] = [
  { id: 'c1', name: 'Technical fit', weight: 60, required: true },
  { id: 'c2', name: 'Commercial terms', weight: 40, required: false },
];
/** The five weights the retired sample bar printed, as it printed them. */
const RETIRED = ['40%', '25%', '15%', '10%'];

const seat: CurrentIdentity = { ...SUPPLIER, supplierId: SUPPLIER_ID, supplierName: SUPPLIER_ID };
const card = async (): Promise<HTMLElement> =>
  (await screen.findByText(NUMBER)).closest('.rounded-lg') as HTMLElement;

beforeEach(async () => {
  rfqStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  rfqStore.reset();
  await i18n.changeLanguage('en');
});

describe('E2E-1 · the population this file rests on', () => {
  it('the specimen is open, invites the seat, and states neither criteria nor a delivery date', () => {
    const rfq = rfqStore.get(EVENT)!;
    expect(rfq.rfqNumber).toBe(NUMBER);
    expect(rfq.status).toBe('Open');
    expect(rfq.invitedSupplierIds).toContain(SUPPLIER_ID);
    expect(rfq.criteria).toBeUndefined();
    expect(rfq.requestedDeliveryDate).toBeUndefined();
    // The two dates the card must not confuse are different days.
    expect(rfq.awardDeadline).not.toBe(DELIVERY);
    expect(rfq.awardDeadline).not.toBe(rfq.responseDeadline);
  });

  it('the sentences differ by locale', () => {
    for (const key of ['rfqs.card.evalCriteriaNone', 'rfqs.card.reqDeliveryNone']) {
      expect(i18n.t(key, { lng: 'en' })).not.toBe(key);
      expect(i18n.t(key, { lng: 'en' })).not.toBe(i18n.t(key, { lng: 'id' }));
    }
  });
});

describe.each(LOCALES)('E2E-1 · criteria on the card [%s]', (lng) => {
  it('an event that sets none says so and prints no sample weight', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierRFQs />, { identity: seat });
    const c = await card();
    expect(within(c).getByTestId(`rfq-no-criteria-${EVENT}`).textContent).toBe(tr('rfqs.card.evalCriteriaNone'));
    expect(within(c).queryByTestId(`rfp-own-criteria-${EVENT}`)).toBeNull();
    const section = within(c).getByText(tr('rfqs.card.evalCriteria')).parentElement!;
    for (const w of RETIRED) expect(section.textContent).not.toContain(w);
    for (const key of ['price', 'quality', 'leadTime', 'sustainability', 'risk']) {
      expect(section.textContent).not.toContain(tr(`rfqs.eval.${key}`));
    }
  });

  it('an event that sets criteria lists exactly those, with their weights', async () => {
    rfqStore.update(EVENT, (r) => ({ ...r, stage: 'RFP', criteria: CRITERIA }));
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierRFQs />, { identity: seat });
    const c = await card();
    const own = within(c).getByTestId(`rfp-own-criteria-${EVENT}`);
    const rows = [...own.querySelectorAll('li')].map((li) => li.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Technical fit');
    expect(rows[0]).toContain('60%');
    expect(rows[1]).toContain('Commercial terms');
    expect(rows[1]).toContain('40%');
    expect(within(c).queryByTestId(`rfq-no-criteria-${EVENT}`)).toBeNull();
  });
});

describe.each(LOCALES)('E2E-1 · the delivery date on the card [%s]', (lng) => {
  it('an event that states none reads "not stated", not the award deadline', async () => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierRFQs />, { identity: seat });
    const c = await card();
    const cell = within(c).getByTestId(`rfq-req-delivery-${EVENT}`);
    expect(cell.textContent).toBe(tr('rfqs.card.reqDeliveryNone'));
    expect(cell.textContent).not.toBe(rfqStore.get(EVENT)!.awardDeadline);
  });

  it('an event that states one shows that day', async () => {
    rfqStore.update(EVENT, (r) => ({ ...r, requestedDeliveryDate: DELIVERY }));
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierRFQs />, { identity: seat });
    const c = await card();
    expect(within(c).getByTestId(`rfq-req-delivery-${EVENT}`).textContent).toBe(DELIVERY);
  });
});

describe('E2E-1 · the delivery date travels from the wizard to the supplier', () => {
  const terms = (requestedDeliveryDate: string): RfqCreateTerms => ({
    title: 'Niacinamide USP',
    category: 'Active Ingredients',
    materials: ['AI-NIAC-6601'],
    uom: 'KG',
    responseDeadline: '2026-12-01',
    awardDeadline: '2026-12-10',
    requestedDeliveryDate,
    incoterms: 'FOB',
    paymentTerms: 'Net 30',
    invitedSupplierIds: ['sup-005', 'sup-006'],
  });
  const scope = {
    personaType: 'buyer' as const,
    supplierId: null,
    businessRoles: PERSONA_SYSTEM_ROLES.buyer,
    actor: SAMPLE_ACTORS.procurement1,
  };
  const create = async (payload: Record<string, unknown>) => {
    const res = await new MockCommandService().dispatch(scope, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      entityId: '',
      payload,
    });
    expect(res.status, res.reason).toBe('done');
    return rfqStore.get(res.entityId!)!;
  };

  it('stated: the payload carries it, the store keeps it, the supplier reads it', async () => {
    const payload = buildRfqCreatePayload(terms(DELIVERY), { totalQty: 4500 });
    expect(payload.requestedDeliveryDate).toBe(DELIVERY);
    const stored = await create(payload);
    expect(stored.requestedDeliveryDate).toBe(DELIVERY);
    // And the incoterm chosen is the one stored.
    expect(stored.incoterms).toBe('FOB');
    expect(toSupplierRfqView(stored, 'sup-005').requestedDeliveryDate).toBe(DELIVERY);
  });

  it('not stated: the key is absent at every hop — absence is not a date', async () => {
    const payload = buildRfqCreatePayload(terms(''), { totalQty: 4500 });
    expect('requestedDeliveryDate' in payload).toBe(false);
    const stored = await create(payload);
    expect('requestedDeliveryDate' in stored).toBe(false);
    expect('requestedDeliveryDate' in toSupplierRfqView(stored, 'sup-005')).toBe(false);
  });
});

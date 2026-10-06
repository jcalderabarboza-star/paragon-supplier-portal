// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · P1 (operator) — NO OTHER SUPPLIER'S ID, AND NO COMPETITOR DATA,
// REACHES A SUPPLIER SCOPE THROUGH A SOURCING READ.
//
// The instrument is the READ ITSELF, serialised: every supplier on the roster
// reads its events and its quotations through the real service, the answer is
// turned to text, and every supplier id found in it must be the reader's own.
// It does not ask the projection what it removed — that would be asking the
// code under test for its own population (§86).
//
// ── POPULATIONS, AND WHERE EACH COMES FROM ───────────────────────────────────
//   · the supplier ids  — `mockSuppliers`, the roster. Upstream of the service.
//   · the readers       — the same roster: every supplier, invited or not.
//   · the leak          — the BUYER's read of the same events, which must still
//     carry other suppliers' ids. If it did not, a clean supplier read would
//     prove only that the fixture has nothing to leak.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { mockDataService } from './mockDataService';
import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { mockSuppliers } from '../../../data/mockSuppliers';
import { toSupplierRfqView } from '../rfqSupplierView';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope, RFQ } from '../types';

const svc = new MockCommandService();

const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});

const ROSTER = mockSuppliers.map((s) => s.id);

/** Every roster id that appears anywhere in `value`, once each. */
const supplierIdsIn = (value: unknown): string[] => {
  const text = JSON.stringify(value);
  return ROSTER.filter((id) => text.includes(`"${id}"`));
};

const sourcingReads = async (scope: QueryScope) => ({
  rfqs: (await mockDataService.procurement.getRFQs(scope)).items,
  quotations: (await mockDataService.procurement.getQuotations(scope)).items,
});

/** The fields a supplier's view of an event may carry. The whole list. */
// RFx-1 — four fields joined, each named in `rfqSupplierView.ts` and each
// narrowed to the reader where it could name a supplier (`rfx1Stages.test.ts`
// reads them as every supplier on a staged event).
const SUPPLIER_VIEW_FIELDS = [
  'awardDeadline',
  'awardedAt',
  'awardedQuotationId',
  'awardedSupplierId',
  'buyerId',
  'concludedAt',
  'createdAt',
  'currency',
  'id',
  'incoterms',
  'invitedSupplierIds',
  'materialCategory',
  'materialIds',
  'paymentTerms',
  'respondedSupplierIds',
  'responseDeadline',
  'rfqNumber',
  'stage',
  'stageHistory',
  'stageResponses',
  'status',
  'title',
  'totalQty',
  'uom',
];

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});

describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('the roster is real and holds the three sample seats', () => {
    expect(ROSTER.length).toBeGreaterThan(8);
    for (const id of ['sup-002', 'sup-005', 'sup-007']) expect(ROSTER).toContain(id);
  });

  it('the id finder finds a planted id and ignores a look-alike', () => {
    expect(supplierIdsIn({ a: ['sup-007'], b: { c: 'sup-005' } }).sort()).toEqual(['sup-005', 'sup-007']);
    expect(supplierIdsIn({ note: 'sup-0071 is not on the roster', n: 7 })).toEqual([]);
  });

  it('⚠️ THE LEAK IS THERE TO BE FOUND — the buyer read of the same events names many suppliers', async () => {
    const { rfqs, quotations } = await sourcingReads(buyer);
    expect(supplierIdsIn(rfqs).length).toBeGreaterThan(5);
    expect(supplierIdsIn(quotations).length).toBeGreaterThan(5);
    // and it carries the three things a supplier must not read
    const rfq013 = rfqs.find((r) => r.id === 'rfq-013')!;
    expect(rfq013.fxPins!.length).toBe(2);
    expect(rfq013.estimatedValue).toBe(165_000_000);
    expect(rfqs.find((r) => r.id === 'rfq-006')!.awardedSupplierId).toBe('sup-001');
  });

  it('several suppliers actually read something — the loop below is not over empty answers', async () => {
    const readers: string[] = [];
    for (const id of ROSTER) {
      if ((await sourcingReads(supplier(id))).rfqs.length > 0) readers.push(id);
    }
    expect(readers.length).toBeGreaterThan(5);
    for (const id of ['sup-002', 'sup-005', 'sup-007']) expect(readers).toContain(id);
  });
});

describe('⚠️ NO OTHER SUPPLIER’S ID REACHES A SUPPLIER SCOPE', () => {
  it.each(ROSTER)('%s reads only its own id, in its events and in its quotations', async (id) => {
    const { rfqs, quotations } = await sourcingReads(supplier(id));
    expect(supplierIdsIn(rfqs).filter((found) => found !== id)).toEqual([]);
    expect(supplierIdsIn(quotations).filter((found) => found !== id)).toEqual([]);
  });

  it('it still reads ITSELF — invited, and answered where it has', async () => {
    const { rfqs } = await sourcingReads(supplier('sup-007'));
    const byId = new Map(rfqs.map((r) => [r.id, r]));
    // invited to both; answered rfq-002 (qt-002a), not rfq-011
    expect(byId.get('rfq-002')!.invitedSupplierIds).toEqual(['sup-007']);
    expect(byId.get('rfq-002')!.respondedSupplierIds).toEqual(['sup-007']);
    expect(byId.get('rfq-011')!.invitedSupplierIds).toEqual(['sup-007']);
    expect(byId.get('rfq-011')!.respondedSupplierIds).toEqual([]);
  });

  it('after another supplier quotes, the reader’s view of the event does not move', async () => {
    const before = (await sourcingReads(supplier('sup-005'))).rfqs.find((r) => r.id === 'rfq-011')!;
    const res = await svc.dispatch(supplier('sup-007'), {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: { rfqId: 'rfq-011', supplierId: 'sup-007', unitPrice: 14_200, leadTimeDays: 10, currency: 'IDR', validUntil: '2026-12-31', paymentTermsOffered: '' },
    });
    expect(res.status, res.reason).toBe('done');
    // the buyer sees two answers now
    expect(rfqStore.get('rfq-011')!.respondedSupplierIds.sort()).toEqual(['sup-005', 'sup-007']);
    // sup-005 sees what it saw: itself
    const after = (await sourcingReads(supplier('sup-005'))).rfqs.find((r) => r.id === 'rfq-011')!;
    expect(after).toEqual(before);
    expect(after.respondedSupplierIds).toEqual(['sup-005']);
  });
});

describe('⚠️ NO COMPETITOR DATA EITHER', () => {
  it('the winner is named to the winner, and to nobody else', async () => {
    // rfq-006 was awarded to sup-001; sup-010 and sup-009 quoted and lost.
    const winner = (await sourcingReads(supplier('sup-001'))).rfqs.find((r) => r.id === 'rfq-006')!;
    expect(winner.awardedSupplierId).toBe('sup-001');
    expect(winner.awardedQuotationId).toBe('qt-006a');

    const loser = (await sourcingReads(supplier('sup-010'))).rfqs.find((r) => r.id === 'rfq-006')!;
    expect('awardedSupplierId' in loser).toBe(false);
    expect('awardedQuotationId' in loser).toBe(false);
    // the event's own facts stay: it is Awarded, and on which day
    expect(loser.status).toBe('Awarded');
    expect(loser.awardedAt).toBe('2026-06-24');
  });

  it('the rate ledger and the budget do not cross — rfq-013, read by an invitee', async () => {
    const view = (await sourcingReads(supplier('sup-002'))).rfqs.find((r) => r.id === 'rfq-013')!;
    expect('fxPins' in view).toBe(false);
    expect('estimatedValue' in view).toBe(false);
  });

  it('a rate recorded AFTER the supplier first read still does not cross', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_fx_pin',
      entity: 'rfq',
      entityId: 'rfq-012',
      payload: { quote: 'USD', rate: 17_300, asOf: '2026-08-30', source: 'MANUAL' },
    });
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-012')!.fxPins).toHaveLength(1);
    const view = (await sourcingReads(supplier('sup-002'))).rfqs.find((r) => r.id === 'rfq-012')!;
    expect('fxPins' in view).toBe(false);
  });

  it('a supplier reads only its OWN quotations — never a price beside its own', async () => {
    const { quotations } = await sourcingReads(supplier('sup-007'));
    expect(quotations.length).toBeGreaterThan(0);
    expect(quotations.every((q) => q.supplierId === 'sup-007')).toBe(true);
    // rfq-002 holds two quotations; this seat reads one of them
    expect(quotationStore.forRfq('rfq-002')).toHaveLength(2);
    expect(quotations.filter((q) => q.rfqId === 'rfq-002').map((q) => q.id)).toEqual(['qt-002a']);
  });
});

describe('THE VIEW IS AN ALLOWLIST — a field nobody named does not cross', () => {
  it('every event a supplier reads carries only the named fields', async () => {
    for (const id of ['sup-001', 'sup-002', 'sup-005', 'sup-007']) {
      const { rfqs } = await sourcingReads(supplier(id));
      expect(rfqs.length, id).toBeGreaterThan(0);
      for (const r of rfqs) {
        expect(Object.keys(r).filter((k) => !SUPPLIER_VIEW_FIELDS.includes(k)), `${id} ${r.id}`).toEqual([]);
      }
    }
  });

  it('a field added to the event tomorrow reaches no supplier until it is named', () => {
    const tomorrow = { ...rfqStore.get('rfq-011')!, shortlist: ['sup-005'], internalNote: 'prefer sup-005' };
    const view = toSupplierRfqView(tomorrow as RFQ, 'sup-007');
    expect('shortlist' in view).toBe(false);
    expect('internalNote' in view).toBe(false);
    expect(supplierIdsIn(view)).toEqual(['sup-007']);
  });

  it('KNOWN-GOOD — the buyer’s read is the whole row, untouched', async () => {
    const { rfqs } = await sourcingReads(buyer);
    const rfq = rfqs.find((r) => r.id === 'rfq-011')!;
    expect(rfq.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    expect(rfq.respondedSupplierIds).toEqual(['sup-005']);
    expect(rfq.estimatedValue).toBeDefined();
  });

  it('what decides visibility is unchanged — a Draft is not shown, an uninvited event is not shown', async () => {
    const { rfqs } = await sourcingReads(supplier('sup-005'));
    // rfq-014 is a Draft that invites sup-005; rfq-002 does not invite it
    expect(rfqStore.get('rfq-014')!.invitedSupplierIds).toContain('sup-005');
    expect(rfqs.map((r) => r.id)).not.toContain('rfq-014');
    expect(rfqs.map((r) => r.id)).not.toContain('rfq-002');
    expect(rfqs.map((r) => r.id)).toContain('rfq-011');
  });
});

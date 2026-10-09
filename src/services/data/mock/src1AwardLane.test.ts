// ────────────────────────────────────────────────────────────────────────────
// SRC-1 · THE AWARD LANE — against the real dispatcher and the real stores.
//
// R-SRC measured, in the browser, that no sourcing event the platform made could
// be awarded: the award control asked for a stored response list nothing wrote.
// This file walks the lane the way it is used — raise, publish, quote, award —
// and pins each ruling of the batch at the verb:
//
//   1 · who has answered is DERIVED from the quotations, never stored
//   2 · a person closes bidding; an award commits from Open and from Closed
//   4 · a mixed-currency event with no recorded rate is not awarded
//   8 · a cancel WITHDRAWS the quotations still being weighed
//   9 · the award is dated the day it is made
//  10 · publish, cancel and award need a named person
//
// Every population below is a NAMED member reached through a value, so a
// replaced corpus reddens it rather than walking through.
// ────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { respondedSupplierIdsOf } from '../../../data/rfqResponses';
import { mockRfqs } from '../../../data/mockRfqs';
import { AUTOMATION_ATOMS, rolesHolding } from '../../transitions/businessRoles';
import { getFlow } from '../../transitions';
import { cascadesFor } from '../../transitions/cascades';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
/** The seat as it opens: the procurement lane, and nobody named. */
const nobody: QueryScope = { ...named, actor: NO_PERSON };
const compliance: QueryScope = { ...named, businessRoles: ['compliance'], actor: SAMPLE_ACTORS.compliance1 };
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});

const rfqVerb = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(scope, { transitionId, entity: 'rfq', entityId, payload });

const award = (scope: QueryScope, rfqId: string, quotationId: string, supplierId: string) =>
  rfqVerb(scope, 't_rfq_award', rfqId, { awardedQuotationId: quotationId, awardedSupplierId: supplierId });

const raise = async (scope: QueryScope, invited: string[]) => {
  const res = await svc.dispatch(scope, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'SRC-1 specimen — flip-top cap',
      materialCategory: 'Packaging',
      totalQty: 10_000,
      uom: 'PCS',
      materialIds: [],
      invitedSupplierIds: invited,
      responseDeadline: '2026-12-01',
      awardDeadline: '2026-12-15',
      incoterms: 'CIF Jakarta',
      paymentTerms: 'Net 30',
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

const quote = (supplierId: string, rfqId: string, unitPrice: number, currency = 'IDR') =>
  svc.dispatch(supplier(supplierId), {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: { rfqId, supplierId, unitPrice, leadTimeDays: 10, currency, validUntil: '2026-12-31', paymentTermsOffered: '' },
  });

const today = () => new Date().toISOString().slice(0, 10);
const statuses = (rfqId: string) => quotationStore.forRfq(rfqId).map((q) => q.status);

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('1 · who has answered is derived from the quotations, never stored', () => {
  it('the derivation: once per supplier, in quotation order, for that event only', () => {
    const quotations = [
      { rfqId: 'a', supplierId: 's2' },
      { rfqId: 'b', supplierId: 's9' },
      { rfqId: 'a', supplierId: 's1' },
      { rfqId: 'a', supplierId: 's2' },
    ];
    expect(respondedSupplierIdsOf('a', quotations)).toEqual(['s2', 's1']);
    expect(respondedSupplierIdsOf('b', quotations)).toEqual(['s9']);
    expect(respondedSupplierIdsOf('nobody-quoted', quotations)).toEqual([]);
  });

  it('the fixture AUTHORS no response list — there is no second copy to drift', () => {
    const source = readFileSync(resolve(__dirname, '../../../data/mockRfqs.ts'), 'utf8');
    // Known-good control: the instrument can see an authored array in this file.
    expect(source).toMatch(/\n\s+invitedSupplierIds: \[/);
    expect(source).not.toMatch(/\n\s+respondedSupplierIds: \[/);
  });

  it('the seeded events read what their quotations say — named members', () => {
    expect(rfqStore.get('rfq-001')!.respondedSupplierIds).toEqual(['sup-005', 'sup-009', 'sup-011']);
    expect(rfqStore.get('rfq-011')!.respondedSupplierIds).toEqual(['sup-005']);
    expect(rfqStore.get('rfq-010')!.respondedSupplierIds).toEqual([]);
    // the seed export and the store agree, because both run the one derivation
    expect(mockRfqs.find((r) => r.id === 'rfq-009')!.respondedSupplierIds).toEqual(['sup-006', 'sup-005']);
  });

  it('THE DEFECT, THEN THE FIX — a quotation submitted now is in the very next read', async () => {
    expect(rfqStore.get('rfq-011')!.respondedSupplierIds).toEqual(['sup-005']);
    const res = await quote('sup-007', 'rfq-011', 14_200);
    expect(res.status, res.reason).toBe('done');
    // store order — the newest quotation leads
    expect(rfqStore.get('rfq-011')!.respondedSupplierIds).toEqual(['sup-007', 'sup-005']);
    expect(rfqStore.all().find((r) => r.id === 'rfq-011')!.respondedSupplierIds).toEqual(['sup-007', 'sup-005']);
  });

  it('a write cannot store a list — whatever a caller carries is dropped', () => {
    rfqStore.update('rfq-010', (r) => ({ ...r, respondedSupplierIds: ['sup-999'] }));
    expect(rfqStore.get('rfq-010')!.respondedSupplierIds).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('END TO END — an event the platform made is quoted and awarded', () => {
  it('raise → publish → the supplier quotes → the buyer awards', async () => {
    const id = await raise(named, ['sup-007', 'sup-005']);
    expect(rfqStore.get(id)!.status).toBe('Draft');
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual([]);

    const published = await rfqVerb(named, 't_rfq_publish', id);
    expect(published.status, published.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Open');

    const quoted = await quote('sup-007', id, 1_450);
    expect(quoted.status, quoted.reason).toBe('done');
    const quotationId = quoted.entityId!;
    // One of two invitees has answered, and the board can say so.
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-007']);

    const awarded = await award(named, id, quotationId, 'sup-007');
    expect(awarded.status, awarded.reason).toBe('done');
    const rfq = rfqStore.get(id)!;
    expect(rfq.status).toBe('Awarded');
    expect(rfq.awardedSupplierId).toBe('sup-007');
    expect(rfq.awardedQuotationId).toBe(quotationId);
    expect(quotationStore.get(quotationId)!.status).toBe('Awarded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2 · a person closes bidding; the award commits from Open and from Closed', () => {
  it('the machine: close is a surfaced user act held by procurement, not by automation', () => {
    const close = getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_close')!;
    expect(close.trigger).toBe('user');
    expect(close.surfaceable).toEqual({ surfaced: true });
    expect(close.from).toEqual(['Open']);
    expect(close.to).toBe('Closed');
    expect(rolesHolding('rfq:close')).toEqual(['procurement']);
    expect(AUTOMATION_ATOMS).not.toContain('rfq:close');
    // Known-good control on the same instrument: automation still holds its own.
    expect(AUTOMATION_ATOMS).toContain('quotation:reject');
  });

  it('procurement closes an Open event; another lane is refused at the role gate', async () => {
    const refused = await rfqVerb(compliance, 't_rfq_close', 'rfq-001');
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(rfqStore.get('rfq-001')!.status).toBe('Open');

    const closed = await rfqVerb(named, 't_rfq_close', 'rfq-001');
    expect(closed.status, closed.reason).toBe('done');
    expect(rfqStore.get('rfq-001')!.status).toBe('Closed');
    // closing decides nothing about the quotations
    expect(statuses('rfq-001')).toEqual(['Under Review', 'Under Review', 'Under Review']);
  });

  it('a closed event is not closed twice', async () => {
    const res = await rfqVerb(named, 't_rfq_close', 'rfq-004');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^ILLEGAL_TRANSITION/);
  });

  it('an award commits from CLOSED, as it stands — no reopen first', async () => {
    expect(rfqStore.get('rfq-004')!.status).toBe('Closed');
    const res = await award(named, 'rfq-004', 'qt-004a', 'sup-003');
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-004')!.status).toBe('Awarded');
    expect(statuses('rfq-004')).toEqual(['Awarded', 'Rejected']);
  });

  it('an award commits from OPEN with an invitee who never answered', async () => {
    const rfq = rfqStore.get('rfq-001')!;
    expect(rfq.invitedSupplierIds).toHaveLength(4);
    expect(rfq.respondedSupplierIds).toHaveLength(3);
    const res = await award(named, 'rfq-001', 'qt-001c', 'sup-011');
    expect(res.status, res.reason).toBe('done');
    expect(statuses('rfq-001')).toEqual(['Rejected', 'Rejected', 'Awarded']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('4 · a mixed-currency event without a recorded rate is not awarded', () => {
  it('the specimen: rfq-012 holds an IDR and a USD quotation and no rate', () => {
    expect(quotationStore.forRfq('rfq-012').map((q) => q.currency)).toEqual(['IDR', 'USD']);
    expect(rfqStore.get('rfq-012')!.fxPins ?? []).toEqual([]);
  });

  it('THE REFUSAL — by name, with the currency and the remedy; nothing moves', async () => {
    const res = await award(named, 'rfq-012', 'qt-012b', 'sup-006');
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_AWARD_FX_BASIS)).toBe(true);
    expect(res.reason).toContain('AWARD_FX_UNPINNED');
    expect(res.reason).toContain('priced in USD');
    expect(res.reason).toContain('Record the rate');
    expect(rfqStore.get('rfq-012')!.status).toBe('Open');
    expect(rfqStore.get('rfq-012')!.awardedQuotationId).toBeUndefined();
    expect(statuses('rfq-012')).toEqual(['Under Review', 'Under Review']);
  });

  it('awarding the RUPIAH quotation of that event is refused too — the choice had no basis', async () => {
    const res = await award(named, 'rfq-012', 'qt-012a', 'sup-002');
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_AWARD_FX_BASIS)).toBe(true);
  });

  it('once the rate is recorded, the same award lands', async () => {
    const pin = await rfqVerb(named, 't_rfq_fx_pin', 'rfq-012', {
      quote: 'USD', rate: 16_900, asOf: today(), source: 'MANUAL',
    });
    expect(pin.status, pin.reason).toBe('done');
    const res = await award(named, 'rfq-012', 'qt-012b', 'sup-006');
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-012')!.status).toBe('Awarded');
  });

  it('KNOWN-GOOD — quotations all in ONE foreign currency need no rate (rfq-009)', async () => {
    expect(quotationStore.forRfq('rfq-009').map((q) => q.currency)).toEqual(['USD', 'USD']);
    expect(rfqStore.get('rfq-009')!.fxPins ?? []).toEqual([]);
    const res = await award(named, 'rfq-009', 'qt-009b', 'sup-005');
    expect(res.status, res.reason).toBe('done');
  });

  it('KNOWN-GOOD — a recorded rate that has gone stale is a recorded basis (rfq-013)', async () => {
    // SRC-2 — the rate ledger is re-timed with its event. E2E-1 — authored
    // 05-02 / 05-09, so the rate in force is past the limit at the declared present.
    expect(rfqStore.get('rfq-013')!.fxPins!.map((p) => p.asOf)).toEqual(['2026-08-15', '2026-08-22']);
    const res = await award(named, 'rfq-013', 'qt-013b', 'sup-006');
    expect(res.status, res.reason).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('8 · a cancel withdraws the quotations still being weighed', () => {
  it('the machine: Withdrawn is an ending, reached only by the cancel cascade', () => {
    const flow = getFlow('quotation')!;
    expect(flow.terminals).toEqual(['Awarded', 'Rejected', 'Withdrawn']);
    const withdraw = flow.transitions.find((t) => t.id === 't_quotation_withdraw')!;
    expect(withdraw.trigger).toBe('cascade');
    expect(withdraw.from).toEqual(['Submitted', 'Under Review']);
    expect(withdraw.to).toBe('Withdrawn');
    expect(flow.transitions.filter((t) => t.from.includes('Withdrawn'))).toEqual([]);
    expect(cascadesFor('t_rfq_cancel')).toEqual([
      { targetEntity: 'quotation', targetTransitionId: 't_quotation_withdraw' },
    ]);
    expect(rolesHolding('quotation:withdraw')).toEqual([]);
    expect(AUTOMATION_ATOMS).toContain('quotation:withdraw');
  });

  it('THE DEFECT, THEN THE FIX — the cancelled event leaves no quotation "Under Review"', async () => {
    expect(statuses('rfq-002')).toEqual(['Under Review', 'Under Review']);
    const res = await rfqVerb(named, 't_rfq_cancel', 'rfq-002');
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-002')!.status).toBe('Cancelled');
    expect(statuses('rfq-002')).toEqual(['Withdrawn', 'Withdrawn']);
    // Withdrawn, never Rejected: nobody compared these quotations with anything.
    expect(commandAuditSink.byEvent('t_quotation_reject')).toHaveLength(0);
    const withdrawn = commandAuditSink.byEvent('t_quotation_withdraw');
    expect(withdrawn.map((e) => e.outcome)).toEqual(['done', 'done']);
    const cancelEvent = commandAuditSink.byEvent('t_rfq_cancel')[0];
    expect(withdrawn.every((e) => e.causationId === cancelEvent.correlationId)).toBe(true);
  });

  it('a Submitted quotation is withdrawn as well as one Under Review', async () => {
    expect(statuses('rfq-011')).toEqual(['Submitted']);
    await rfqVerb(named, 't_rfq_cancel', 'rfq-011');
    expect(statuses('rfq-011')).toEqual(['Withdrawn']);
  });

  it('an event with no quotation cancels and fans out onto nothing', async () => {
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
    const res = await rfqVerb(named, 't_rfq_cancel', 'rfq-010');
    expect(res.status, res.reason).toBe('done');
    expect(commandAuditSink.byEvent('t_quotation_withdraw')).toHaveLength(0);
  });

  it('a decided quotation is never withdrawn — the cascade names only the live ones', async () => {
    // rfq-006 is Awarded: its cancel is illegal, and its quotations keep their endings.
    const res = await rfqVerb(named, 't_rfq_cancel', 'rfq-006');
    expect(res.status).toBe('failed');
    expect(statuses('rfq-006')).toEqual(['Awarded', 'Rejected', 'Rejected']);
    expect(commandAuditSink.byEvent('t_quotation_withdraw')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('9 · the award is dated the day it is made', () => {
  it('THE DEFECT, THEN THE FIX — not the deadline the buyer typed weeks earlier', async () => {
    const before = rfqStore.get('rfq-003')!;
    expect(before.awardedAt).toBeUndefined();
    expect(before.awardDeadline).toBe('2026-09-08'); // authored 05-26, re-timed (SRC-2)
    await award(named, 'rfq-003', 'qt-003a', 'sup-001');
    const after = rfqStore.get('rfq-003')!;
    expect(after.awardedAt).toBe(today());
    expect(after.awardedAt).not.toBe(after.awardDeadline);
  });

  it('a caller cannot backdate it — the payload is not where the date comes from', async () => {
    await rfqVerb(named, 't_rfq_award', 'rfq-003', {
      awardedQuotationId: 'qt-003a', awardedSupplierId: 'sup-001', awardedAt: '2020-01-01',
    });
    expect(rfqStore.get('rfq-003')!.awardedAt).toBe(today());
  });

  it('no other verb dates an award — close, reopen and cancel leave it absent', async () => {
    await rfqVerb(named, 't_rfq_close', 'rfq-001');
    await rfqVerb(named, 't_rfq_reopen', 'rfq-001');
    await rfqVerb(named, 't_rfq_cancel', 'rfq-001');
    expect(rfqStore.get('rfq-001')!.awardedAt).toBeUndefined();
  });

  it('the two seeded awards are dated by the fixture, re-timed with their events', () => {
    // SRC-2 — authored 03-11 and 02-23 against the 05-18 anchor; the corpus
    // moves 105 days to the declared present and these two move with it.
    expect(rfqStore.get('rfq-006')!.awardedAt).toBe('2026-06-24');
    expect(rfqStore.get('rfq-007')!.awardedAt).toBe('2026-06-08');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('10 · publish, cancel and award need a named person', () => {
  const draft = () => rfqStore.all().find((r) => r.status === 'Draft' && r.invitedSupplierIds.length > 1)!;

  it('the machine: the attribution hook LEADS all three verbs, and only those', () => {
    const flow = getFlow('rfq')!;
    const hooksOf = (id: string) => [...flow.transitions.find((t) => t.id === id)!.policyHooks];
    for (const id of ['t_rfq_publish', 't_rfq_cancel', 't_rfq_award']) {
      expect(hooksOf(id)[0], id).toBe(POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED);
    }
    for (const id of ['t_rfq_create', 't_rfq_close', 't_rfq_reopen', 't_rfq_fx_pin']) {
      expect(hooksOf(id), id).not.toContain(POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED);
    }
  });

  it.each([
    ['t_rfq_publish', (): string => draft().id, {}, 'Draft'],
    ['t_rfq_cancel', (): string => 'rfq-002', {}, 'Open'],
    ['t_rfq_cancel', (): string => draft().id, {}, 'Draft'],
    ['t_rfq_award', (): string => 'rfq-003', { awardedQuotationId: 'qt-003a', awardedSupplierId: 'sup-001' }, 'Open'],
  ] as const)('%s by a seat with nobody named is refused by name, and nothing moves', async (verb, idOf, payload, state) => {
    const id = idOf();
    const before = statuses(id);
    const res = await rfqVerb(nobody, verb, id, { ...payload });
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED)).toBe(true);
    expect(res.reason).toContain('RFQ_ACTOR_UNATTRIBUTED');
    expect(res.reason).toContain('Adopt a sample user');
    expect(rfqStore.get(id)!.status).toBe(state);
    expect(statuses(id)).toEqual(before);
  });

  it('KNOWN-GOOD — the same three acts land for a named person', async () => {
    const id = draft().id;
    expect((await rfqVerb(named, 't_rfq_publish', id)).status).toBe('done');
    expect((await rfqVerb(named, 't_rfq_cancel', id)).status).toBe('done');
    expect((await award(named, 'rfq-003', 'qt-003a', 'sup-001')).status).toBe('done');
  });

  it('what stays open to the seat as it opens: a draft, close, reopen, a rate', async () => {
    const id = await raise(nobody, ['sup-007', 'sup-005']);
    expect(rfqStore.get(id)!.status).toBe('Draft');
    expect((await rfqVerb(nobody, 't_rfq_close', 'rfq-001')).status).toBe('done');
    expect((await rfqVerb(nobody, 't_rfq_reopen', 'rfq-001')).status).toBe('done');
    const pin = await rfqVerb(nobody, 't_rfq_fx_pin', 'rfq-012', {
      quote: 'USD', rate: 16_900, asOf: today(), source: 'MANUAL',
    });
    expect(pin.status, pin.reason).toBe('done');
  });

  it('the role gate still answers first — a lane without the atom learns nothing about the person rule', async () => {
    const res = await rfqVerb({ ...compliance, actor: NO_PERSON }, 't_rfq_cancel', 'rfq-002');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · THE SUPPLIER SIDE — the machine half, against the real dispatcher and
// the real stores.
//
//   A  the sourcing fixtures are anchored to the declared present, as one pair
//   B  the two day comparisons, at their boundaries, both ways
//   C  a quotation is refused on an event that is not Open, after its response
//      deadline, a second time from the same supplier, and with a validity
//      that has passed — each by name
//   D  the notes, the sample answer, the sample lead time and the attachment's
//      name are kept
//
// The supplier's READ of an event is `src2SupplierScope.test.ts`; what a person
// sees is `src/pages-v2/src2SupplierSide.page.test.tsx`.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { mockRfqs } from '../../../data/mockRfqs';
import { mockQuotations } from '../../../data/mockQuotations';
import {
  DECLARED_PRESENT,
  FAMILY_ANCHORS,
  SOURCING_ANCHOR,
  shiftDays,
} from '../fixturePresent';
import { responseDeadlinePassed, validityAlreadyPast } from '../quotationSubmitGate';
import { getFlow } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { buildQuotationSubmitPayload } from '../../../pages-v2/rfqs/quotationSubmitModel';
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
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});

const DAY = 86_400_000;
const dayBefore = (iso: string): string => new Date(Date.parse(iso) - DAY).toISOString().slice(0, 10);
const dayAfter = (iso: string): string => new Date(Date.parse(iso) + DAY).toISOString().slice(0, 10);

/** A quotation from `supplierId` on `rfqId`; `extra` overrides or adds payload fields. */
const quote = (supplierId: string, rfqId: string, extra: Record<string, unknown> = {}) =>
  svc.dispatch(supplier(supplierId), {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: {
      rfqId,
      supplierId,
      unitPrice: 14_200,
      leadTimeDays: 10,
      currency: 'IDR',
      validUntil: '2026-12-31',
      paymentTermsOffered: '',
      ...extra,
    },
  });

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(named, { transitionId, entity: 'rfq', entityId, payload });

const held = (rfqId: string, supplierId: string) =>
  quotationStore.forRfq(rfqId).filter((q) => q.supplierId === supplierId);

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('A · the sourcing fixtures are anchored to the declared present', () => {
  it('events and quotations hold ONE anchor, so they move by the same days', () => {
    expect(FAMILY_ANCHORS.rfq.anchor).toBe(SOURCING_ANCHOR);
    expect(FAMILY_ANCHORS.quotation.anchor).toBe(SOURCING_ANCHOR);
    expect(shiftDays('rfq')).toBe(shiftDays('quotation'));
    // known-good control: the shift is real, not zero
    expect(shiftDays('rfq')).toBeGreaterThan(0);
  });

  it('THE DEFECT, THEN THE FIX — exactly one Open event is past its deadline, by name', () => {
    const open = mockRfqs.filter((r) => r.status === 'Open');
    // population control: the instrument is looking at the seeded Open events
    expect(open.map((r) => r.id)).toContain('rfq-011');
    // un-anchored, every one of them read past its deadline at the declared present
    const authoredDeadline = (iso: string): string =>
      new Date(Date.parse(iso) - shiftDays('rfq') * DAY).toISOString().slice(0, 10);
    expect(
      open.filter((r) => responseDeadlinePassed(authoredDeadline(r.responseDeadline), DECLARED_PRESENT)),
    ).toHaveLength(open.length);
    // anchored, one does — the event nobody answered in time
    expect(
      open.filter((r) => responseDeadlinePassed(r.responseDeadline, DECLARED_PRESENT)).map((r) => r.id),
    ).toEqual(['rfq-010']);
  });

  it('named values — the dates a reader now sees', () => {
    const rfq = (id: string) => mockRfqs.find((r) => r.id === id)!;
    expect(rfq('rfq-010').responseDeadline).toBe('2026-08-28');
    expect(rfq('rfq-011').responseDeadline).toBe('2026-09-02');
    expect(rfq('rfq-014').createdAt).toBe(DECLARED_PRESENT);
    expect(mockQuotations.find((q) => q.id === 'qt-011a')!.submittedAt).toBe('2026-08-11');
  });

  it('no seeded quotation was submitted after its own event’s response deadline', () => {
    expect(mockQuotations.length).toBeGreaterThan(20);
    const late = mockQuotations.filter((q) => {
      const event = mockRfqs.find((r) => r.id === q.rfqId)!;
      return q.submittedAt > event.responseDeadline;
    });
    expect(late.map((q) => q.id)).toEqual([]);
  });

  it('a recorded rate is not older than the event it was recorded on', () => {
    const pinned = mockRfqs.filter((r) => (r.fxPins ?? []).length > 0);
    expect(pinned.map((r) => r.id)).toEqual(['rfq-013']);
    for (const r of pinned) {
      for (const pin of r.fxPins!) expect(pin.pinnedAt.slice(0, 10) >= r.createdAt, pin.asOf).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B · the two day comparisons', () => {
  it('the deadline day itself is still open; the day after is not', () => {
    expect(responseDeadlinePassed('2026-08-31', '2026-08-31')).toBe(false);
    expect(responseDeadlinePassed('2026-09-01', '2026-08-31')).toBe(false);
    expect(responseDeadlinePassed('2026-08-30', '2026-08-31')).toBe(true);
    // a time on either side does not bend the day
    expect(responseDeadlinePassed('2026-08-31', '2026-08-31T23:59:59.000Z')).toBe(false);
  });

  it('a validity through today is an offer; yesterday, or no date at all, is not', () => {
    expect(validityAlreadyPast('2026-08-31', '2026-08-31')).toBe(false);
    expect(validityAlreadyPast('2026-12-31', '2026-08-31')).toBe(false);
    expect(validityAlreadyPast('2026-08-30', '2026-08-31')).toBe(true);
    expect(validityAlreadyPast('next month', '2026-08-31')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('C · what the submit verb refuses', () => {
  it('the machine: five checks on submit, in this order', () => {
    const submit = getFlow('quotation')!.transitions.find((t) => t.id === 't_quotation_submit')!;
    expect(submit.policyHooks).toEqual([
      POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED,
      POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN,
      POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE,
      POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER,
      POLICY_HOOKS.QUOTATION_SUBMIT_VALIDITY_CURRENT,
    ]);
  });

  it('KNOWN-GOOD — an invited supplier quotes an Open event inside its deadline', async () => {
    const res = await quote('sup-007', 'rfq-011');
    expect(res.status, res.reason).toBe('done');
    expect(held('rfq-011', 'sup-007')).toHaveLength(1);
  });

  describe('an event that is not Open', () => {
    it('THE REFUSAL — by name, and nothing is minted', async () => {
      expect((await rfqVerb('t_rfq_close', 'rfq-011')).status).toBe('done');
      const res = await quote('sup-007', 'rfq-011');
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)).toBe(true);
      expect(res.reason).toContain('QUOTE_EVENT_NOT_OPEN');
      expect(res.reason).toContain('RFQ-2026-011 is Closed');
      expect(held('rfq-011', 'sup-007')).toHaveLength(0);
    });

    it('reopened, the same quotation is taken', async () => {
      await rfqVerb('t_rfq_close', 'rfq-011');
      expect((await rfqVerb('t_rfq_reopen', 'rfq-011')).status).toBe('done');
      expect((await quote('sup-007', 'rfq-011')).status).toBe('done');
    });

    it('a cancelled event takes none either', async () => {
      await rfqVerb('t_rfq_cancel', 'rfq-011');
      const res = await quote('sup-007', 'rfq-011');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)).toBe(true);
      expect(res.reason).toContain('is Cancelled');
    });
  });

  describe('after the response deadline', () => {
    it('THE REFUSAL — the seeded event whose deadline has gone, by name', async () => {
      expect(rfqStore.get('rfq-010')!.status).toBe('Open');
      const res = await quote('sup-007', 'rfq-010');
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE)).toBe(true);
      expect(res.reason).toContain('QUOTE_DEADLINE_PASSED');
      expect(res.reason).toContain('RFQ-2026-010 was 2026-08-28');
      expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
    });

    it('THE BOUNDARY — due today is taken; due yesterday is not', async () => {
      rfqStore.update('rfq-010', (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
      expect((await quote('sup-007', 'rfq-010')).status).toBe('done');

      rfqStore.update('rfq-011', (r) => ({ ...r, responseDeadline: dayBefore(DECLARED_PRESENT) }));
      const res = await quote('sup-007', 'rfq-011');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE)).toBe(true);
    });

    it('the payload cannot say what day it is', async () => {
      const res = await quote('sup-007', 'rfq-010', { today: '2026-01-01', submittedAt: '2026-01-01' });
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE)).toBe(true);
    });
  });

  describe('a second quotation from the same supplier', () => {
    it('THE REFUSAL — by name, naming the quotation already held', async () => {
      const first = await quote('sup-007', 'rfq-011');
      expect(first.status, first.reason).toBe('done');
      const second = await quote('sup-007', 'rfq-011', { unitPrice: 13_900 });
      expect(second.status).toBe('failed');
      expect(refusedByPolicy(second.reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)).toBe(true);
      expect(second.reason).toContain('QUOTE_ALREADY_SUBMITTED');
      expect(second.reason).toContain(first.entityId!);
      // the first stands exactly as it was — it is not revised by the attempt
      expect(held('rfq-011', 'sup-007').map((q) => q.unitPrice)).toEqual([14_200]);
    });

    it('a seeded holder is refused the same way (sup-005 on rfq-011)', async () => {
      expect(held('rfq-011', 'sup-005').map((q) => q.id)).toEqual(['qt-011a']);
      const res = await quote('sup-005', 'rfq-011');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)).toBe(true);
      expect(res.reason).toContain('qt-011a');
    });

    it('KNOWN-GOOD — one each from two suppliers is two quotations', async () => {
      expect((await quote('sup-007', 'rfq-011')).status).toBe('done');
      expect(quotationStore.forRfq('rfq-011').map((q) => q.supplierId).sort()).toEqual(['sup-005', 'sup-007']);
    });

    it('KNOWN-GOOD — the same supplier quotes two DIFFERENT events', async () => {
      rfqStore.update('rfq-010', (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
      expect((await quote('sup-007', 'rfq-010')).status).toBe('done');
      expect((await quote('sup-007', 'rfq-011')).status).toBe('done');
    });

    it('a decided quotation still counts — a rejected supplier does not quote the event again', async () => {
      // rfq-006 is Awarded; the event refusal comes first. So prove the count on
      // the store directly: any quotation, whatever its state, is "already held".
      quotationStore.update('qt-011a', (q) => ({ ...q, status: 'Rejected' }));
      const res = await quote('sup-005', 'rfq-011');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)).toBe(true);
    });
  });

  describe('a validity that has passed', () => {
    it('THE REFUSAL — by name, and nothing is minted', async () => {
      const res = await quote('sup-007', 'rfq-011', { validUntil: dayBefore(DECLARED_PRESENT) });
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_VALIDITY_CURRENT)).toBe(true);
      expect(res.reason).toContain('QUOTE_VALIDITY_PAST');
      expect(res.reason).toContain(dayBefore(DECLARED_PRESENT));
      expect(held('rfq-011', 'sup-007')).toHaveLength(0);
    });

    it('THE BOUNDARY — valid until today, and until tomorrow, are taken', async () => {
      expect((await quote('sup-007', 'rfq-011', { validUntil: DECLARED_PRESENT })).status).toBe('done');
      rfqStore.update('rfq-010', (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
      expect((await quote('sup-007', 'rfq-010', { validUntil: dayAfter(DECLARED_PRESENT) })).status).toBe('done');
    });

    it('a validity that is not a date is refused with the past ones', async () => {
      const res = await quote('sup-007', 'rfq-011', { validUntil: 'end of next month' });
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_VALIDITY_CURRENT)).toBe(true);
    });

    it('KNOWN-GOOD — a quotation stating no validity is not refused for it', async () => {
      const res = await quote('sup-007', 'rfq-011', { validUntil: '' });
      expect(res.status, res.reason).toBe('done');
    });
  });

  describe('which refusal a supplier reads first', () => {
    it('a closed event with a past validity reads the EVENT, not the validity', async () => {
      await rfqVerb('t_rfq_close', 'rfq-011');
      const res = await quote('sup-007', 'rfq-011', { validUntil: '2020-01-01' });
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)).toBe(true);
    });

    it('a second quotation with a past validity reads ALREADY SUBMITTED', async () => {
      // sup-007 holds qt-002a on rfq-002, an Open event inside its deadline.
      expect(held('rfq-002', 'sup-007').map((q) => q.id)).toEqual(['qt-002a']);
      const res = await quote('sup-007', 'rfq-002', { validUntil: '2020-01-01' });
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)).toBe(true);
    });

    it('a supplier never invited is still refused at SCOPE, before any of these', async () => {
      await expect(quote('sup-001', 'rfq-010')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    });
  });

  it('END TO END on an event the platform made — raised, published, quoted once, not twice', async () => {
    const created = await svc.dispatch(named, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      payload: {
        title: 'SRC-2 specimen — pump collar',
        materialCategory: 'Packaging',
        totalQty: 8_000,
        uom: 'PCS',
        materialIds: [],
        invitedSupplierIds: ['sup-002', 'sup-007'],
        responseDeadline: dayAfter(DECLARED_PRESENT),
        awardDeadline: '2026-12-15',
        incoterms: 'CIF Jakarta',
        paymentTerms: 'Net 30',
      },
    });
    expect(created.status, created.reason).toBe('done');
    const rfqId = created.entityId!;
    // a Draft is not Open: the supplier it will be shown to cannot quote it yet
    const early = await quote('sup-007', rfqId);
    expect(refusedByPolicy(early.reason, POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)).toBe(true);

    expect((await rfqVerb('t_rfq_publish', rfqId)).status).toBe('done');
    expect((await quote('sup-007', rfqId)).status).toBe('done');
    const again = await quote('sup-007', rfqId);
    expect(refusedByPolicy(again.reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)).toBe(true);
    expect(rfqStore.get(rfqId)!.respondedSupplierIds).toEqual(['sup-007']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('D · what the supplier said beside the numbers is kept', () => {
  const stored = (rfqId: string, supplierId: string) => held(rfqId, supplierId)[0];

  it('THE DEFECT, THEN THE FIX — sample answer, sample lead time and attachment name are stored', async () => {
    const res = await quote('sup-007', 'rfq-011', {
      notes: 'Tooling is ready; first lot ships from Cikarang.',
      sampleBatch: 'yes',
      sampleLeadTime: '5 working days',
      attachmentName: 'berlina-quotation-011.pdf',
    });
    expect(res.status, res.reason).toBe('done');
    const q = stored('rfq-011', 'sup-007');
    expect(q.notes).toBe('Tooling is ready; first lot ships from Cikarang.');
    expect(q.sampleBatch).toBe('yes');
    expect(q.sampleLeadTime).toBe('5 working days');
    expect(q.attachmentName).toBe('berlina-quotation-011.pdf');
  });

  it('"no" is kept as no, and a sample lead time typed beside it is not', async () => {
    await quote('sup-007', 'rfq-011', { sampleBatch: 'no', sampleLeadTime: '5 working days' });
    const q = stored('rfq-011', 'sup-007');
    expect(q.sampleBatch).toBe('no');
    expect('sampleLeadTime' in q).toBe(false);
  });

  it('an answer nobody gave stays ABSENT — never minted as "no" or as an empty string', async () => {
    await quote('sup-007', 'rfq-011');
    const q = stored('rfq-011', 'sup-007');
    expect('sampleBatch' in q).toBe(false);
    expect('sampleLeadTime' in q).toBe(false);
    expect('attachmentName' in q).toBe(false);
    expect('notes' in q).toBe(false);
  });

  it('an answer outside yes / no is not stored as one', async () => {
    await quote('sup-007', 'rfq-011', { sampleBatch: 'maybe', sampleLeadTime: 'a week' });
    const q = stored('rfq-011', 'sup-007');
    expect('sampleBatch' in q).toBe(false);
    expect('sampleLeadTime' in q).toBe(false);
  });

  it('every seeded quotation is honestly absent on all three', () => {
    expect(mockQuotations.length).toBeGreaterThan(20);
    expect(
      mockQuotations.filter((q) => 'sampleBatch' in q || 'sampleLeadTime' in q || 'attachmentName' in q),
    ).toEqual([]);
  });

  describe('the payload the form builds', () => {
    const draft = {
      rfqId: 'rfq-011',
      supplierId: 'sup-007',
      unitPrice: 14_200,
      currency: 'IDR' as const,
      leadTimeDays: 10,
      moq: null,
      validUntil: '2026-12-31',
    };

    it('carries all three when stated', () => {
      const payload = buildQuotationSubmitPayload({
        ...draft,
        sampleBatch: 'yes',
        sampleLeadTime: ' 5 working days ',
        attachmentName: 'q.pdf',
      });
      expect(payload.sampleBatch).toBe('yes');
      expect(payload.sampleLeadTime).toBe('5 working days');
      expect(payload.attachmentName).toBe('q.pdf');
    });

    it('drops a sample lead time beside "no", and a blank attachment', () => {
      const payload = buildQuotationSubmitPayload({
        ...draft,
        sampleBatch: 'no',
        sampleLeadTime: '5 working days',
        attachmentName: '',
      });
      expect(payload.sampleBatch).toBe('no');
      expect('sampleLeadTime' in payload).toBe(false);
      expect('attachmentName' in payload).toBe(false);
    });

    it('KNOWN-GOOD — a draft that states none of them builds the payload it always did', () => {
      const payload = buildQuotationSubmitPayload(draft);
      expect(Object.keys(payload).sort()).toEqual(
        ['currency', 'leadTimeDays', 'paymentTermsOffered', 'rfqId', 'supplierId', 'unitPrice', 'validUntil'],
      );
    });
  });
});

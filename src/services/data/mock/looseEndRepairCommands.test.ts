// ────────────────────────────────────────────────────────────────────────────
// PF-1a — THE LOOSE-END REPAIRS, DISPATCHED.
//
// Five verbs closed seven census rows. The `flowGraph` gate proves the GRAPH is
// closed; this file proves the verbs actually MOVE AN ENTITY through the real
// MockCommandService and the real stores — because a transition that exists in
// the catalog and fails at dispatch is the shape PF-0 was written to catch, one
// layer down.
//
// ⚠️ EVERY REPAIR IS EXERCISED FROM THE PROBLEM STATE OUTWARD, and each one
// asserts the ROUND TRIP: enter the state that had no exit, leave it, and land
// where the flow says. Asserting only that the dispatch resolved `done` would
// pass on a verb that wrote nothing.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { rfqStore } from './stores/rfqStore';
import type { QueryScope } from '../types';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

beforeEach(() => {
  rfqStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  purchaseRequisitionStore.reset();
  requirementResponseStore.reset();
  commandAuditSink.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. RFQ — THE DRAFT PRODUCT (D-1, operator)
// ─────────────────────────────────────────────────────────────────────────────

const rfqCreate = () =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'PF-1a draft-product probe',
      materialCategory: 'Emulsifiers',
      totalQty: 1000,
      invitedSupplierIds: ['sup-002', 'sup-005'],
    },
  });

describe('PF-1a · RFQ — creation births at Draft and publish comes alive', () => {
  it('⚠️ a raised RFQ lands in Draft, NOT Open (this reverses FORK-2B)', async () => {
    const res = await rfqCreate();
    expect(res.status).toBe('done');
    expect(rfqStore.get(res.entityId!)!.status).toBe('Draft');
  });

  it('⚠️ t_rfq_publish FIRES — the verb was unfireable from the day it was authored', async () => {
    const created = await rfqCreate();
    const published = await svc.dispatch(buyer, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: created.entityId!,
    });
    expect(published.status).toBe('done');
    expect(rfqStore.get(created.entityId!)!.status).toBe('Open');
  });

  it('⚠️ A DRAFT RFQ IS INVISIBLE TO ITS INVITED SUPPLIERS, and publish is what reveals it', async () => {
    // The whole product rests here. If a Draft were visible, publish would be a
    // relabel and the draft state would buy nothing (`PF1A-DRAFT-RFQ-VISIBLE-01`).
    const created = await rfqCreate();
    const id = created.entityId!;

    const before = await reads.getRFQs(sup002);
    expect(before.items.some((r) => r.id === id)).toBe(false);
    // …and the buyer can see it the whole time: it is unpublished, not hidden.
    expect((await reads.getRFQs(buyer)).items.some((r) => r.id === id)).toBe(true);

    await svc.dispatch(buyer, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: id });

    const after = await reads.getRFQs(sup002);
    expect(after.items.some((r) => r.id === id)).toBe(true);
  });

  it('a supplier cannot publish — it is a buyer verb', async () => {
    const created = await rfqCreate();
    const res = await svc.dispatch(sup002, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: created.entityId!,
    });
    expect(res.status).toBe('failed');
    expect(rfqStore.get(created.entityId!)!.status).toBe('Draft');
  });

  it('publish is illegal from anywhere but Draft — an Open RFQ cannot be re-published', async () => {
    const created = await rfqCreate();
    const id = created.entityId!;
    await svc.dispatch(buyer, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: id });
    const again = await svc.dispatch(buyer, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: id,
    });
    expect(again.status).toBe('failed');
    expect(rfqStore.get(id)!.status).toBe('Open');
  });

  it('the Draft branch of t_rfq_cancel is reachable now — it never was before', async () => {
    const created = await rfqCreate();
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_cancel',
      entity: 'rfq',
      entityId: created.entityId!,
    });
    expect(res.status).toBe('done');
    expect(rfqStore.get(created.entityId!)!.status).toBe('Cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE THREE RESOLUTION EDGES (t_invoice_resolve's pattern)
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-1a · ASN — a discrepancy can be resolved', () => {
  const HELD = 'ASN-2025-00201'; // fixture: status 'Discrepancy'

  it('the fixture is in the problem state — the premise, asserted not assumed', () => {
    expect(asnStore.get(HELD)!.status).toBe('Discrepancy');
  });

  it('⚠️ resolve returns it to Delivered — the state had NO exit at all before', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_asn_resolve_discrepancy',
      entity: 'advanceShipNotice',
      entityId: HELD,
    });
    expect(res.status).toBe('done');
    expect(asnStore.get(HELD)!.status).toBe('Delivered');
  });

  it('resolve is illegal from a non-Discrepancy ASN', async () => {
    await svc.dispatch(buyer, {
      transitionId: 't_asn_resolve_discrepancy',
      entity: 'advanceShipNotice',
      entityId: HELD,
    });
    const again = await svc.dispatch(buyer, {
      transitionId: 't_asn_resolve_discrepancy',
      entity: 'advanceShipNotice',
      entityId: HELD,
    });
    expect(again.status).toBe('failed');
  });
});

describe('PF-1a · requirementResponse — a dispute can be resolved', () => {
  const RR = 'rr-0001'; // fixture: status 'Submitted'

  it('⚠️ the full round trip: Submitted → UnderReview → Disputed → UnderReview', async () => {
    const step = (transitionId: string) =>
      svc.dispatch(buyer, { transitionId, entity: 'requirementResponse', entityId: RR });

    expect((await step('t_requirementresponse_review')).status).toBe('done');
    expect(requirementResponseStore.get(RR)!.status).toBe('UnderReview');

    expect((await step('t_requirementresponse_dispute')).status).toBe('done');
    expect(requirementResponseStore.get(RR)!.status).toBe('Disputed');

    // The edge that did not exist. It returns the response to the ONE state a
    // dispute can be raised from, so there is no ambiguity to resolve.
    expect((await step('t_requirementresponse_resolve')).status).toBe('done');
    expect(requirementResponseStore.get(RR)!.status).toBe('UnderReview');
  });
});

describe('PF-1a · purchase requisition — REVISE-AND-RESUBMIT, not a bare reopen', () => {
  const PR = 'pr-004'; // fixture: status 'Pending Approval'

  const dispatch = (transitionId: string, payload?: Record<string, unknown>) =>
    svc.dispatch(buyer, {
      transitionId,
      entity: 'purchaseRequisition',
      entityId: PR,
      ...(payload ? { payload } : {}),
    });

  it('⚠️ a rejected requisition returns to DRAFT — the requester’s hands, not the queue', async () => {
    expect((await dispatch('t_pr_reject')).status).toBe('done');
    expect(purchaseRequisitionStore.get(PR)!.status).toBe('Rejected');

    const revised = await dispatch('t_pr_revise', { revisionNote: 'Split into two smaller lots.' });
    expect(revised.status).toBe('done');
    // NOT 'Pending Approval'. The operator refused a bare reopen: a requisition
    // that lands back in the queue unchanged teaches the requester nothing.
    expect(purchaseRequisitionStore.get(PR)!.status).toBe('Draft');
  });

  it('and the existing submit verb is what returns it to the queue — the two-step IS the revision', async () => {
    await dispatch('t_pr_reject');
    await dispatch('t_pr_revise', { revisionNote: 'Split into two smaller lots.' });
    expect((await dispatch('t_pr_submit')).status).toBe('done');
    expect(purchaseRequisitionStore.get(PR)!.status).toBe('Pending Approval');
  });

  it('⚠️ revising WITHOUT a note is refused — the note is the only thing an approver could not otherwise see', async () => {
    await dispatch('t_pr_reject');
    const res = await dispatch('t_pr_revise');
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
    expect(purchaseRequisitionStore.get(PR)!.status).toBe('Rejected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GR QUALITY HOLD — the resume edge behind an affordance that already shipped
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-1a · goods receipt — a quality hold can be released', () => {
  const HELD = 'gr-007'; // fixture: status 'Quality Hold'

  it('the fixture is genuinely held — reachable and, until now, inescapable', () => {
    expect(goodsReceiptStore.get(HELD)!.status).toBe('Quality Hold');
  });

  it('⚠️ retest releases it to Under Inspection, where a disposition is legal again', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_gr_request_retest',
      entity: 'goodsReceipt',
      entityId: HELD,
    });
    expect(res.status).toBe('done');
    expect(goodsReceiptStore.get(HELD)!.status).toBe('Under Inspection');
  });

  it('a supplier cannot release a hold — and it is refused at SCOPE, before the role gate', async () => {
    // Not a `failed` result: a GR is scope-owned, so a supplier that does not own
    // it is denied by the dispatcher's scope gate and the call REJECTS. The
    // distinction matters — scope denial and role denial answer different
    // questions, and collapsing them would hide which one held.
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_gr_request_retest',
        entity: 'goodsReceipt',
        entityId: HELD,
      }),
    ).rejects.toThrow(/denied for scope/);
    expect(goodsReceiptStore.get(HELD)!.status).toBe('Quality Hold');
  });

  it('every repair emits its DR-10 event — a governed move, not a store poke', async () => {
    await svc.dispatch(buyer, {
      transitionId: 't_gr_request_retest',
      entity: 'goodsReceipt',
      entityId: HELD,
    });
    const events = commandAuditSink.byEvent('t_gr_request_retest');
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe('done');
  });
});

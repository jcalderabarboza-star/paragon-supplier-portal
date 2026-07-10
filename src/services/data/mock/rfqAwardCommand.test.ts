// ────────────────────────────────────────────────────────────────────────────
// RFQ Award cascade integration (v2.2 Step 4 batch iv) — the award verb
// dispatched through the REAL MockCommandService + the real stores. This is the
// honest proof of the CASCADE-CLASS verb (build plan line 91):
//   buyer awards an RFQ → RFQ Awarded (+ award metadata) → the winning quotation
//   Awarded + every OTHER quotation Rejected, as ONE fan-out under one causation
//   group — NOT N ad-hoc hook calls.
//
// Honest-by-construction guard: award records award metadata ONLY — it mints NO
// PO and NO contract (PO issuance is a separate buyer verb, a future batch).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-001' };
const svc = new MockCommandService();

// RFQ-003 (Halal Glycerin, Open) has three quotations, all Under Review:
// qt-003a (sup-001), qt-003b (sup-002), qt-003c (sup-010). Award to qt-003a ⇒
// 1 winner + 2 losers (N = 2). All-Under-Review keeps every cascade legal.
const RFQ = 'rfq-003';
const WINNER = 'qt-003a';
const WINNER_SUPPLIER = 'sup-001';
const LOSERS = ['qt-003b', 'qt-003c'];

const award = (scope: QueryScope, rfqId = RFQ, quotationId = WINNER, supplierId = WINNER_SUPPLIER) =>
  svc.dispatch(scope, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: rfqId,
    payload: { awardedQuotationId: quotationId, awardedSupplierId: supplierId },
  });

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

describe('RFQ award — cascade fan-out (1 winner + N losers)', () => {
  it('awards the RFQ, awards the winner, rejects every other quotation', async () => {
    const res = await award(buyer);
    expect(res.status).toBe('done');

    expect(rfqStore.get(RFQ)!.status).toBe('Awarded');
    expect(quotationStore.get(WINNER)!.status).toBe('Awarded');
    for (const loser of LOSERS) {
      expect(quotationStore.get(loser)!.status).toBe('Rejected');
    }
  });

  it('emits exactly N+2 events (1 RFQ awarded + 1 quotation awarded + N rejected)', async () => {
    await award(buyer);
    const awarded = commandAuditSink.byEvent('t_rfq_award').filter((e) => e.outcome === 'done');
    const qAwarded = commandAuditSink.byEvent('t_quotation_award').filter((e) => e.outcome === 'done');
    const qRejected = commandAuditSink.byEvent('t_quotation_reject').filter((e) => e.outcome === 'done');
    expect(awarded).toHaveLength(1);
    expect(qAwarded).toHaveLength(1);
    expect(qRejected).toHaveLength(LOSERS.length); // N = 2
    // N + 2 total done events for the fan-out.
    const total = awarded.length + qAwarded.length + qRejected.length;
    expect(total).toBe(LOSERS.length + 2);
  });

  it('groups the fan-out under the award correlationId via causationId (DR-10, Option A)', async () => {
    const res = await award(buyer);
    const source = commandAuditSink.byEvent('t_rfq_award')[0];
    // The source award carries no causation; every cascaded event is grouped to it.
    expect(source.causationId).toBeUndefined();
    expect(source.correlationId).toBe(res.correlationId);

    const cascaded = [
      ...commandAuditSink.byEvent('t_quotation_award'),
      ...commandAuditSink.byEvent('t_quotation_reject'),
    ];
    expect(cascaded).toHaveLength(LOSERS.length + 1);
    for (const e of cascaded) {
      expect(e.causationId).toBe(res.correlationId); // grouped to the source award
      expect(e.correlationId).not.toBe(res.correlationId); // yet its own id (1:1 status)
    }
  });

  it('a supplier cannot award — ROLE_NOT_PERMITTED, nothing mutates', async () => {
    const res = await award(supplier);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:rfq:award/);
    // The RFQ and its quotations are untouched.
    expect(rfqStore.get(RFQ)!.status).toBe('Open');
    expect(quotationStore.get(WINNER)!.status).toBe('Under Review');
    expect(commandAuditSink.byEvent('t_quotation_award')).toHaveLength(0);
  });

  it('HONEST-BY-CONSTRUCTION: award records award metadata ONLY — no PO or contract minted', async () => {
    const poCountBefore = purchaseOrderStore.all().length;
    const res = await award(buyer);
    expect(res.status).toBe('done');

    const rfq = rfqStore.get(RFQ)!;
    // Award metadata is set — and nothing else.
    expect(rfq.awardedQuotationId).toBe(WINNER);
    expect(rfq.awardedSupplierId).toBe(WINNER_SUPPLIER);
    // No PO fabricated by the award path (PO issuance is a separate verb).
    expect(purchaseOrderStore.all().length).toBe(poCountBefore);
    // The RFQ carries NO PO/contract reference — the award result exposes only
    // the RFQ entityId, never a fabricated downstream document number.
    expect(res.entityId).toBe(RFQ);
    expect('poNumber' in rfq).toBe(false);
    expect('contractId' in rfq).toBe(false);
  });
});

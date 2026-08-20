// ────────────────────────────────────────────────────────────────────────────
// RFQ lifecycle verbs (F0.3) — the non-award sourcing moves dispatched through
// the REAL MockCommandService + the real store. Cancel and reopen are the honest
// wireable half of the RFQ machine: buyer-only, payload-free, no cascade, no
// downstream artifact. The dispatcher enforces the legal from-states (cancel:
// Draft/Open/Closed; reopen: Closed only) and the buyer role, so an
// illegal-from-here or wrong-persona attempt fails WITHOUT mutating.
//
// (t_rfq_publish stays authored-unwired; t_quotation_submit / t_quotation_review
// are deferred — F0.3-FIND-01, scoring primitive absent. Neither is exercised.)
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-001', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const svc = new MockCommandService();

// Fixture states: rfq-001/002/003 Open · rfq-004/005 Closed · rfq-006/007
// Awarded · rfq-008 Draft (no invited suppliers).
const cancel = (scope: QueryScope, rfqId: string) =>
  svc.dispatch(scope, { transitionId: 't_rfq_cancel', entity: 'rfq', entityId: rfqId });
const reopen = (scope: QueryScope, rfqId: string) =>
  svc.dispatch(scope, { transitionId: 't_rfq_reopen', entity: 'rfq', entityId: rfqId });

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

describe('RFQ cancel — Draft/Open/Closed → Cancelled', () => {
  it('cancels an Open RFQ', async () => {
    const res = await cancel(buyer, 'rfq-001');
    expect(res.status).toBe('done');
    expect(rfqStore.get('rfq-001')!.status).toBe('Cancelled');
  });

  it('cancels a Draft RFQ', async () => {
    const res = await cancel(buyer, 'rfq-008');
    expect(res.status).toBe('done');
    expect(rfqStore.get('rfq-008')!.status).toBe('Cancelled');
  });

  it('cancels a Closed RFQ', async () => {
    const res = await cancel(buyer, 'rfq-004');
    expect(res.status).toBe('done');
    expect(rfqStore.get('rfq-004')!.status).toBe('Cancelled');
  });

  it('cannot cancel an already-Awarded RFQ (illegal from-state, no mutation)', async () => {
    const res = await cancel(buyer, 'rfq-006');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ILLEGAL_TRANSITION:Awarded->Cancelled/);
    expect(rfqStore.get('rfq-006')!.status).toBe('Awarded');
  });

  it('a supplier cannot cancel — ROLE_NOT_PERMITTED, nothing mutates', async () => {
    const res = await cancel(supplier, 'rfq-001');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:rfq:cancel/);
    expect(rfqStore.get('rfq-001')!.status).toBe('Open');
  });
});

describe('RFQ reopen — Closed → Open (Closed only)', () => {
  it('reopens a Closed RFQ', async () => {
    const res = await reopen(buyer, 'rfq-005');
    expect(res.status).toBe('done');
    expect(rfqStore.get('rfq-005')!.status).toBe('Open');
  });

  it('cannot reopen an Open RFQ (illegal from-state, no mutation)', async () => {
    const res = await reopen(buyer, 'rfq-002');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ILLEGAL_TRANSITION:Open->Open/);
    expect(rfqStore.get('rfq-002')!.status).toBe('Open');
  });

  it('a supplier cannot reopen — ROLE_NOT_PERMITTED, nothing mutates', async () => {
    const res = await reopen(supplier, 'rfq-005');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:rfq:reopen/);
    expect(rfqStore.get('rfq-005')!.status).toBe('Closed');
  });
});

describe('RFQ lifecycle — HONEST-BY-CONSTRUCTION: no cascade, no artifact', () => {
  it('cancel touches only the RFQ — no quotation fan-out, no PO minted', async () => {
    const poCountBefore = purchaseOrderStore.all().length;
    // rfq-003 carries three live (Under Review) quotations — a cancel must NOT
    // adjudicate them (no cascade is declared for t_rfq_cancel).
    const quotesBefore = quotationStore
      .forRfq('rfq-003')
      .map((q) => q.status);

    const res = await cancel(buyer, 'rfq-003');
    expect(res.status).toBe('done');
    expect(res.entityId).toBe('rfq-003');

    // Quotations are untouched (no t_quotation_award / t_quotation_reject fired).
    expect(quotationStore.forRfq('rfq-003').map((q) => q.status)).toEqual(
      quotesBefore,
    );
    expect(commandAuditSink.byEvent('t_quotation_award')).toHaveLength(0);
    expect(commandAuditSink.byEvent('t_quotation_reject')).toHaveLength(0);
    // No PO fabricated, and the RFQ carries no award metadata.
    expect(purchaseOrderStore.all().length).toBe(poCountBefore);
    const rfq = rfqStore.get('rfq-003')!;
    expect(rfq.awardedSupplierId).toBeUndefined();
    expect(rfq.awardedQuotationId).toBeUndefined();
  });

  it('reopen emits a single done event and fans out nothing', async () => {
    const res = await reopen(buyer, 'rfq-004');
    expect(res.status).toBe('done');
    const reopened = commandAuditSink
      .byEvent('t_rfq_reopen')
      .filter((e) => e.outcome === 'done');
    expect(reopened).toHaveLength(1);
    expect(reopened[0].correlationId).toBe(res.correlationId);
    expect(reopened[0].causationId).toBeUndefined();
    expect(commandAuditSink.byEvent('t_quotation_award')).toHaveLength(0);
    expect(commandAuditSink.byEvent('t_quotation_reject')).toHaveLength(0);
  });
});

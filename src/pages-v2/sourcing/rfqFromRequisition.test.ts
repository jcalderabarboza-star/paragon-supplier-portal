// ────────────────────────────────────────────────────────────────────────────
// C.2 — THE PRODUCER, END TO END THROUGH THE REAL SEAM.
//
// C.1 shipped the junction machine dormant: a cascade link, a resolver reading
// `sourceRequisitionId`, and a `linkedDoc` write — with NO producer setting the
// key. This is the proof that C.2 is that producer, driven through the SAME
// pure builder the wizard ships (`buildRfqCreatePayload`) rather than a
// hand-written payload, so a builder that stopped emitting the key would fail
// here rather than pass on a literal.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from '../../services/data/mock/MockCommandService';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { buildRfqCreatePayload, normalizeRfqCreateDraft, type RfqCreateDraft } from './rfqCreateModel';
import { prefillFromRequisition } from './requisitionPrefill';
import type { QueryScope } from '../../services/data/types';

const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
const svc = new MockCommandService();

/** The wizard's own draft shape, minimal but complete enough to build. */
const draftFor = (sourceRequisitionId?: string): RfqCreateDraft => ({
  title: 'PET Bottle 100ml Airless Pump',
  category: 'Packaging',
  materials: ['PK-PETB-8810'],
  totalQty: '50000',
  uom: 'PCS',
  budget: '',
  responseDeadline: '2026-09-10',
  awardDeadline: '2026-09-20',
  incoterms: 'CIF Jakarta',
  paymentTerms: 'Net 30',
  invitedSupplierIds: [],
  ...(sourceRequisitionId ? { sourceRequisitionId } : {}),
});

const raise = async (d: RfqCreateDraft) => {
  const numbers = normalizeRfqCreateDraft(d);
  if (!numbers.ok) throw new Error('fixture draft must parse');
  return svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: buildRfqCreatePayload(d, numbers.value),
  });
};

describe('C.2 · the builder emits the key only when there is a source', () => {
  it('absent when the buyer did not start from a requisition', () => {
    const d = draftFor();
    const n = normalizeRfqCreateDraft(d);
    const payload = buildRfqCreatePayload(d, n.ok ? n.value : ({} as never));
    // ABSENT, not present-and-undefined: the resolver checks the value's type,
    // but anything checking presence must also see nothing.
    expect('sourceRequisitionId' in payload).toBe(false);
  });

  it('present when the buyer did', () => {
    const d = draftFor('pr-002');
    const n = normalizeRfqCreateDraft(d);
    const payload = buildRfqCreatePayload(d, n.ok ? n.value : ({} as never));
    expect(payload.sourceRequisitionId).toBe('pr-002');
  });
});

describe('C.2 · the cascade C.1 was built for actually fires', () => {
  beforeEach(() => commandAuditSink.clear());

  it('⚠️ THE WHOLE POINT — an RFQ raised from an approved PR moves it to Sourcing Event', async () => {
    const before = purchaseRequisitionStore.get('pr-002')!;
    expect(before.status).toBe('Approved');
    expect(before.linkedDoc).toBe('');

    const res = await raise(draftFor('pr-002'));
    expect(res.status).toBe('done');

    const after = purchaseRequisitionStore.get('pr-002')!;
    expect(after.status).toBe('Sourcing Event');
    // The RFQ number the store assigned to THIS raise, never a literal.
    expect(after.linkedDoc).toBe(res.entityId);

    const [ev] = commandAuditSink.byEvent('t_pr_source');
    expect(ev.outcome).toBe('done');
    expect(ev.causationId).toBe(res.correlationId);
  });

  it('⚠️ and an RFQ raised WITHOUT one leaves every requisition alone', async () => {
    const before = purchaseRequisitionStore.all().map((p) => ({ ...p }));
    const res = await raise(draftFor());
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.all()).toEqual(before);
    expect(commandAuditSink.byEvent('t_pr_source')).toEqual([]);
  });

  it('the prefill and the payload name the SAME requisition', () => {
    // Ties the two halves together: whatever `prefillFromRequisition` puts in
    // `sourceRequisitionId` is what the payload carries, and therefore what the
    // cascade acts on. A drift between them would move the WRONG requisition,
    // which neither side's own tests would catch.
    //
    // Deliberately NOT a second dispatch: the fixtures hold exactly ONE Approved
    // requisition, and the end-to-end test above consumes it by design (that is
    // what success looks like — the PR is no longer Approved afterwards). A
    // second raise here would refuse as ILLEGAL_TRANSITION and this test would
    // be asserting test-ordering rather than the property it names.
    const pr = purchaseRequisitionStore.all().find((r) => r.prNumber === 'PR-2026-00342')!;
    const prefill = prefillFromRequisition(pr);
    const d = draftFor(prefill.sourceRequisitionId);
    const n = normalizeRfqCreateDraft(d);
    const payload = buildRfqCreatePayload(d, n.ok ? n.value : ({} as never));
    expect(prefill.sourceRequisitionId).toBe(pr.id);
    expect(payload.sourceRequisitionId).toBe(pr.id);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C.3 — the seed is DERIVED, and this is what proves it rather than asserting it.
//
// The claim is not "an Approved requisition exists". It is that the row reached
// `Approved` by dispatching the three real verbs, under scopes that hold the
// atoms for them and no others. A hand-stamped fixture would satisfy the first
// claim and none of the rest, so the tests below check the EVIDENCE a real
// approval leaves, not just the state it lands in.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { seedSourceableRequisition } from './requisitionSeed';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { isRfqCategory } from '../../../pages-v2/sourcing/requisitionPrefill';

const svc = new MockCommandService();

describe('C.3 · the seeded requisition is grown, not stamped', () => {
  beforeEach(() => commandAuditSink.clear());

  it('⚠️ reaches Approved with a category the RFQ wizard can actually carry', async () => {
    const out = await seedSourceableRequisition(svc);
    expect(out.status).toBe('seeded');

    const pr = purchaseRequisitionStore.all().find((r) => r.prNumber === out.prNumber)!;
    expect(pr.status).toBe('Approved');
    // The whole reason the row exists: a NON-member category would leave the
    // wizard's field blank, which is the case `pr-002` already demonstrates.
    expect(isRfqCategory(pr.category)).toBe(true);
    expect(pr.category).toBe('Fragrance');
  });

  it('⚠️ carries the evidence a real approval leaves — a stamped row could not', () => {
    const pr = purchaseRequisitionStore.all().find((r) => r.category === 'Fragrance' && r.status === 'Approved')!;
    // `t_pr_approve` persists the attribution from the SESSION. A hand-authored
    // fixture has no way to acquire this without inventing it.
    expect(pr.approvedBy).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    // And it starts life with no linked document — the cascade sets that later.
    expect(pr.linkedDoc).toBe('');
  });

  it('⚠️ all three verbs are on the DR-10 record, in order', async () => {
    // Re-seeding is a no-op, so the events below are from a fresh run against a
    // clean store — asserted by seeding into a reset store rather than by
    // assuming this test runs first.
    purchaseRequisitionStore.reset();
    commandAuditSink.clear();
    const out = await seedSourceableRequisition(svc);
    expect(out.status).toBe('seeded');

    const fired = commandAuditSink.all().map((e) => e.event);
    expect(fired).toEqual(['t_pr_create', 't_pr_submit', 't_pr_approve']);
    expect(commandAuditSink.all().every((e) => e.outcome === 'done')).toBe(true);
  });

  it('is idempotent — a second call finds the row and does not mint another', async () => {
    const before = purchaseRequisitionStore.all().length;
    const again = await seedSourceableRequisition(svc);
    expect(again.status).toBe('already-seeded');
    expect(purchaseRequisitionStore.all().length).toBe(before);
  });

  it('⚠️ the two scopes are SEGREGATED — the requester cannot approve its own', async () => {
    // The property the split exists for. If this passed, the seed would be
    // modelling §76d's crossed drawer in the demonstration data itself.
    purchaseRequisitionStore.reset();
    const created = await svc.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['requisitioner'] },
      { transitionId: 't_pr_create', entity: 'purchaseRequisition', payload: { material: 'X', quantity: 1 } },
    );
    await svc.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['requisitioner'] },
      { transitionId: 't_pr_submit', entity: 'purchaseRequisition', entityId: created.entityId!, payload: {} },
    );
    const selfApprove = await svc.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['requisitioner'] },
      { transitionId: 't_pr_approve', entity: 'purchaseRequisition', entityId: created.entityId!, payload: {} },
    );
    expect(selfApprove.status).toBe('failed');
    expect(selfApprove.reason).toContain('ROLE_NOT_PERMITTED');
    purchaseRequisitionStore.reset();
  });
});

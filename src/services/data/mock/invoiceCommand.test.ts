// ────────────────────────────────────────────────────────────────────────────
// Invoice command integration (v2.2 Step 4 batch iii, DR-7) — the invoice verbs
// dispatched through the REAL MockCommandService + the real invoiceStore. Honest
// proof of the operator chain:
//   supplier create (own PO, creation-shape) → submit → buyer match (rollup-
//   gated) → approve → release payment (submitted, interim, NO FI doc) → settle
//   (Payment Released + REAL FI doc, Option B) · dispute/resolve pair.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { invoiceStore } from './stores/invoiceStore';
import { isOverdue, daysOutstanding } from '../invoiceProjection';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const svc = new MockCommandService();

// PO-2025-00107 is Confirmed and owned by sup-007 (see mockPurchaseOrders).
const createOwn = () =>
  svc.dispatch(sup007, {
    transitionId: 't_invoice_create',
    entity: 'invoice',
    payload: { poReference: 'PO-2025-00107', amount: 250_000_000, dueDate: '2026-09-01' },
  });

const fire = (
  scope: QueryScope,
  transitionId: string,
  entityId: string,
  payload?: Record<string, unknown>,
) => svc.dispatch(scope, { transitionId, entity: 'invoice', entityId, payload });

beforeEach(() => {
  invoiceStore.reset();
});

describe('Invoice command integration — supplier creation-shape', () => {
  it('drafts an invoice against the supplier’s own confirmed PO', async () => {
    const res = await createOwn();
    expect(res.status).toBe('done');
    const inv = invoiceStore.get(res.entityId!)!;
    expect(inv.status).toBe('Draft');
    expect(inv.supplierId).toBe('sup-007'); // derived from the parent PO
    expect(inv.poNumber).toBe('PO-2025-00107');
    expect(inv.amount).toBe(250_000_000);
  });

  it('denies drafting against another supplier’s PO (SCOPE_DENIED)', async () => {
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_invoice_create',
        entity: 'invoice',
        payload: { poReference: 'PO-2025-00107', amount: 1 },
      }),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('submits a draft (Draft → Submitted)', async () => {
    const id = (await createOwn()).entityId!;
    const res = await fire(sup007, 't_invoice_submit', id, { amount: 250_000_000 });
    expect(res.status).toBe('done');
    expect(invoiceStore.get(id)!.status).toBe('Submitted');
  });

  it('defaults honest dates so a freshly-created invoice is never born overdue (F-2)', async () => {
    // Creation WITHOUT a dueDate — the form only carries PO + amount. The command
    // layer must default the dates (submittedDate today, dueDate = Net-30) so the
    // invoice is not computed Overdue on submit and aging is a real number, not NaN.
    const id = (
      await svc.dispatch(sup007, {
        transitionId: 't_invoice_create',
        entity: 'invoice',
        payload: { poReference: 'PO-2025-00107', amount: 250_000_000 },
      })
    ).entityId!;
    await fire(sup007, 't_invoice_submit', id, { amount: 250_000_000 });

    const inv = invoiceStore.get(id)!;
    const now = new Date().toISOString();
    expect(inv.status).toBe('Submitted'); // overdue-eligible — the failing case
    expect(inv.submittedDate).not.toBe('');
    expect(inv.dueDate).not.toBe('');
    expect(isOverdue(inv, now)).toBe(false);
    const days = daysOutstanding(inv, now);
    expect(Number.isNaN(days)).toBe(false);
    expect(days).toBe(0);
  });
});

describe('Invoice match rollup — header is derived, never asserted', () => {
  it('rejects t_invoice_match when the match axis is not Matched', async () => {
    // inv-mus-0214 is Submitted with matchStatus 'Pending GR'.
    const res = await fire(buyer, 't_invoice_match', 'inv-mus-0214');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:invoice_rollup_matched/);
    expect(invoiceStore.get('inv-mus-0214')!.status).toBe('Submitted');
  });

  it('advances to Matched when the axis has rolled up Matched', async () => {
    // Seed a Submitted invoice whose match axis is clean.
    invoiceStore.update('inv-mus-0214', (i) => ({ ...i, matchStatus: 'Matched' }));
    const res = await fire(buyer, 't_invoice_match', 'inv-mus-0214');
    expect(res.status).toBe('done');
    expect(invoiceStore.get('inv-mus-0214')!.status).toBe('Matched');
  });
});

describe('Invoice release payment — Option B submitted-interim → settle-finalize', () => {
  it('holds submitted at Releasing Payment (no FI doc); settle assigns the real FI doc', async () => {
    // inv-giv-0892 is Approved (matched) — ready to release.
    const post = await fire(buyer, 't_invoice_release_payment', 'inv-giv-0892');
    expect(post.status).toBe('submitted');
    const interim = invoiceStore.get('inv-giv-0892')!;
    expect(interim.status).toBe('Releasing Payment');
    expect(interim.paymentRef).toBeNull(); // pending SAP assignment — no paid claim

    const settled = await svc.settle(buyer, post.correlationId);
    expect(settled?.status).toBe('done');
    const final = invoiceStore.get('inv-giv-0892')!;
    expect(final.status).toBe('Payment Released');
    expect(final.sapFiDoc).toMatch(/^FI-/); // real ref, minted on settle
    expect(final.paymentRef).toMatch(/^PAY-/);
    expect(final.paymentDate).not.toBeNull();
  });
});

describe('Invoice dispute / resolve', () => {
  it('dispute honestly requires a reason, then flips to Disputed; resolve returns to Submitted', async () => {
    // inv-mus-0214 is Submitted.
    const noReason = await fire(buyer, 't_invoice_dispute', 'inv-mus-0214');
    expect(noReason.status).toBe('failed');
    expect(noReason.reason).toMatch(/MISSING_FIELDS:disputeReason/);

    const disputed = await fire(buyer, 't_invoice_dispute', 'inv-mus-0214', {
      disputeReason: 'Qty mismatch vs GR',
    });
    expect(disputed.status).toBe('done');
    expect(invoiceStore.get('inv-mus-0214')!.status).toBe('Disputed');

    const resolved = await fire(buyer, 't_invoice_resolve', 'inv-mus-0214');
    expect(resolved.status).toBe('done');
    expect(invoiceStore.get('inv-mus-0214')!.status).toBe('Submitted');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// OPS-1 · THE DEFECT, REPRODUCED — PO-2025-00105.
//
// ⚠️ **THIS FILE IMPORTS NOTHING THAT OPS-1 ADDED, ON PURPOSE.** It drives the
// shipped dispatcher and reads the shipped stores, and nothing else, so the
// same bytes run on the tree that had the defect. Run there (`26c7fd6`), both
// tests FAIL: every invoice comes back `Matched`, is approved, and its payment
// is released — Rp 4.0B against an order of Rp 2.0B, with half of one line
// received. `ops1Money.test.ts` holds the rule itself; this file holds the
// evidence that the rule was missing.
//
// OPS-2 — `releasable` approves and releases as TWO NAMED PEOPLE, because an
// approval now names a person and the approver may not release. The two actors
// are read off the sample roster, which predates OPS-1, so the claim above
// still holds: on `26c7fd6` a scope's `actor` is carried and ignored by both
// verbs, and both tests still fail there for the reason they always did.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
import { invoiceStore } from './stores/invoiceStore';
import type { QueryScope, InspectionResult, ASN } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';

const svc = new MockCommandService();
const PO = 'PO-2025-00105';
const B = 1_000_000_000;

const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const named = (role: string): QueryScope => ({
  ...buyer,
  actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role)!.personId } },
});
const approver = named('finance');
const releaser = named('buyer_all');

const fire = (scope: QueryScope, entity: string, transitionId: string, entityId?: string, payload?: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId, entity, entityId, payload });

const asn = (asnNumber: string): ASN => ({
  asnNumber,
  supplierId: 'sup-005',
  poReference: PO,
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-REPRO',
  eta: '2026-08-31',
  details: { originCity: 'Hamburg', destinationWarehouse: 'NDC J6, Jakarta', totalCartons: 5, grossWeightKg: 50, temperatureRequirement: 'Ambient' },
  lineItems: [
    { materialCode: 'AI-NIAC-6601', description: 'Niacinamide', orderedQty: 5000, shippedQty: 5000, lotNumber: 'L1' },
    { materialCode: 'AI-HYALU-6610', description: 'Sodium Hyaluronate', orderedQty: 300, shippedQty: 300, lotNumber: 'L2' },
  ],
});

const line = (materialCode: string, accepted: number): InspectionResult => ({
  materialCode,
  description: materialCode,
  qtyExpected: accepted,
  qtyReceived: accepted,
  qtyAccepted: accepted,
  qtyRejected: 0,
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
});

/** Confirm the order in full, submit two invoices for the whole order, then post a receipt. */
const twoInvoicesThenReceipt = async (niacinamideAccepted: number): Promise<[string, string]> => {
  const confirm = await fire(supplier, 'purchaseOrder', 't_po_confirm', 'po-005', { poId: 'po-005', confirmedQuantities: [5000, 300] });
  expect(confirm.status, confirm.reason).toBe('done');
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const created = await fire(supplier, 'invoice', 't_invoice_create', undefined, { poReference: PO, amount: 2 * B });
    expect(created.status, created.reason).toBe('done');
    const submitted = await fire(supplier, 'invoice', 't_invoice_submit', created.entityId, { amount: 2 * B });
    expect(submitted.status, submitted.reason).toBe('done');
    ids.push(created.entityId!);
  }
  asnStore.add(asn('ASN-REPRO-1'));
  const gr = await fire(buyer, 'goodsReceipt', 't_gr_create', undefined, {
    asnReference: 'ASN-REPRO-1',
    receivedDate: '2026-08-31',
    receivedBy: 'QC Inspector',
    inspectionResults: [line('AI-NIAC-6601', niacinamideAccepted), line('AI-HYALU-6610', 300)],
  });
  expect(gr.status, gr.reason).toBe('done');
  for (const verb of ['t_gr_start_inspection', 't_gr_approve', 't_gr_post']) {
    const res = await fire(buyer, 'goodsReceipt', verb, gr.entityId);
    expect(res.status, `${verb}: ${res.reason}`).not.toBe('failed');
  }
  return [ids[0], ids[1]];
};

/** How much money finance can get released across the given invoices. */
const releasable = async (ids: string[]): Promise<number> => {
  let total = 0;
  for (const id of ids) {
    const approve = await fire(approver, 'invoice', 't_invoice_approve', id);
    if (approve.status === 'failed') continue;
    const release = await fire(releaser, 'invoice', 't_invoice_release_payment', id);
    if (release.status !== 'failed') total += invoiceStore.get(id)!.amount;
  }
  return total;
};

beforeEach(() => {
  purchaseOrderStore.reset();
  goodsReceiptStore.reset();
  asnStore.reset();
  invoiceStore.reset();
});

describe('OPS-1 · PO-2025-00105 — two invoices of Rp 2.0B for one order of Rp 2.0B', () => {
  it('half of the niacinamide received: no invoice is matched and no payment can be released', async () => {
    const ids = await twoInvoicesThenReceipt(2500);
    expect(ids.map((id) => invoiceStore.get(id)!.matchStatus)).toEqual(['Qty Mismatch', 'Qty Mismatch']);
    expect(ids.map((id) => invoiceStore.get(id)!.status)).toEqual(['Submitted', 'Submitted']);
    expect(await releasable(ids)).toBe(0);
  });

  it('received in full: one invoice is matched, and no more than the order’s value can be released', async () => {
    const ids = await twoInvoicesThenReceipt(5000);
    expect(ids.map((id) => invoiceStore.get(id)!.status).sort()).toEqual(['Matched', 'Submitted']);
    expect(await releasable(ids)).toBe(2 * B);
  });
});

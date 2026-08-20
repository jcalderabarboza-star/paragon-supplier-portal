// ────────────────────────────────────────────────────────────────────────────
// GR-post → invoice-match cascade (F0.2, census G4 — closes INV-GR-OVERLAY-01).
//
// The honest replacement for the deleted `paragon_gr_posted` localStorage overlay.
// Drives the REAL chain through the MockCommandService + real stores: seat an ASN
// on the invoice's PO, create a GR against it, inspect, dispose, POST — and assert
// the cascade computes the 3-way verdict from real PO×GR×invoice data:
//   • clean GR + amount == Σ(confirmedQty × unitPrice) → 'Matched' → header FIRES
//   • GR with rejects                                   → 'Qty Mismatch' → no-op
//   • clean GR + amount off tolerance                   → 'Price Variance' → no-op
// A variance verdict writes the truthful matchStatus and leaves the invoice
// Submitted (an honest no-op, not a defect to force past). Fires at `submitted`
// (B) via the one dispatch-time cascade path; no new event type.
//
// Natural pair (real fixtures): PO-2025-00102 (po-002) = 8000 × 109,375 =
// 875,000,000 = inv-mus-0214.amount (Submitted, same PO, sup-002).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
import { invoiceStore } from './stores/invoiceStore';
import type { QueryScope, InspectionResult, ASN } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const svc = new MockCommandService();

// A submitted ASN seeded directly so a GR can be created + posted against the
// target PO without threading the whole PO→ASN pipeline through each test.
const asnOn = (asnNumber: string, poReference: string, supplierId = 'sup-002'): ASN => ({
  asnNumber,
  supplierId,
  poReference,
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-X',
  eta: '2026-05-22',
  details: {
    originCity: 'Medan',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  // CP-2 · B1 — the ASN must DECLARE the material its receipt inspects. These
  // fixtures carried `lineItems: []` while filing an inspection line, and the new
  // GR_INSPECTION_MATERIALS_DECLARED gate refused them — correctly: a receipt
  // cannot inspect goods its own parent document never says arrived. The gate
  // found incoherent fixtures, so the fixtures are what changed.
  lineItems: [
    {
      materialCode: 'RM-EMUL-9410',
      description: 'Glyceryl Stearate SE (Halal Emulsifier)',
      orderedQty: 10_000,
      shippedQty: 10_000,
      lotNumber: 'LOT-X',
    },
  ],
});

const line = (acc: number, rej: number): InspectionResult => ({
  materialCode: 'RM-EMUL-9410',
  description: 'Glyceryl Stearate SE (Halal Emulsifier)',
  qtyExpected: acc + rej,
  qtyReceived: acc + rej,
  qtyAccepted: acc,
  qtyRejected: rej,
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
});

const createGr = (asnReference: string, results: InspectionResult[]) =>
  svc.dispatch(buyer, {
    transitionId: 't_gr_create',
    entity: 'goodsReceipt',
    payload: { asnReference, receivedDate: '2026-05-20', receivedBy: 'QC Inspector', inspectionResults: results },
  });

const fireGr = (transitionId: string, entityId: string, payload?: Record<string, unknown>) =>
  svc.dispatch(buyer, { transitionId, entity: 'goodsReceipt', entityId, payload });

// Drive a clean GR to Approved and POST it; returns the post CommandResult.
const receiveApproveAndPost = async (asnReference: string, results: InspectionResult[]) => {
  const grId = (await createGr(asnReference, results)).entityId!;
  await fireGr('t_gr_start_inspection', grId);
  await fireGr('t_gr_approve', grId);
  return fireGr('t_gr_post', grId);
};

beforeEach(() => {
  goodsReceiptStore.reset();
  asnStore.reset();
  invoiceStore.reset();
});

describe('GR-post → invoice-match cascade — the verdict is computed, never forced', () => {
  it('MATCHED: clean GR + amount == PO confirmed value → matchStatus Matched, header advances', async () => {
    // inv-mus-0214: Submitted, PO-2025-00102, amount 875,000,000 == 8000 × 109,375.
    expect(invoiceStore.get('inv-mus-0214')!.matchStatus).toBe('Pending GR');

    asnStore.add(asnOn('ASN-MATCH', 'PO-2025-00102'));
    const post = await receiveApproveAndPost('ASN-MATCH', [line(8000, 0)]);
    expect(post.status).toBe('submitted'); // fired at the submitted moment (B)

    const inv = invoiceStore.get('inv-mus-0214')!;
    expect(inv.matchStatus).toBe('Matched'); // computed from real data
    expect(inv.status).toBe('Matched'); // header t_invoice_match fired

    // DR-10: the cascaded match event groups under the source post's correlationId
    // via causationId (its own correlationId stays 1:1), and resolves cleanly.
    const cascaded = commandAuditSink
      .byEvent('t_invoice_match')
      .find((e) => e.causationId === post.correlationId);
    expect(cascaded).toBeDefined();
    expect(cascaded!.correlationId).not.toBe(post.correlationId);
    expect(cascaded!.outcome).toBe('done');
  });

  it('QTY MISMATCH: GR carries a rejection → matchStatus Qty Mismatch, header does NOT fire', async () => {
    asnStore.add(asnOn('ASN-QTY', 'PO-2025-00102'));
    // Mixed line (accepted + rejected) rolls up Partially Approved — still postable.
    const grId = (await createGr('ASN-QTY', [line(7000, 1000)])).entityId!;
    await fireGr('t_gr_start_inspection', grId);
    await fireGr('t_gr_partial_approve', grId);
    const post = await fireGr('t_gr_post', grId);
    expect(post.status).toBe('submitted');

    const inv = invoiceStore.get('inv-mus-0214')!;
    expect(inv.matchStatus).toBe('Qty Mismatch'); // truthful verdict written
    expect(inv.status).toBe('Submitted'); // honest no-op — header did NOT advance
    // No matched-header event was cascaded from this post.
    expect(
      commandAuditSink.byEvent('t_invoice_match').some((e) => e.causationId === post.correlationId),
    ).toBe(false);
  });

  it('PRICE VARIANCE: clean GR + amount off tolerance → matchStatus Price Variance, header does NOT fire', async () => {
    // Amount 1,000,000,000 vs expected 875,000,000 → ~14% > 1% tolerance.
    invoiceStore.update('inv-mus-0214', (i) => ({ ...i, amount: 1_000_000_000 }));

    asnStore.add(asnOn('ASN-PRICE', 'PO-2025-00102'));
    const post = await receiveApproveAndPost('ASN-PRICE', [line(8000, 0)]);
    expect(post.status).toBe('submitted');

    const inv = invoiceStore.get('inv-mus-0214')!;
    expect(inv.matchStatus).toBe('Price Variance');
    expect(inv.status).toBe('Submitted'); // honest no-op
  });

  it('NO-OP: a non-Submitted invoice on the posted PO is left untouched', async () => {
    // inv-brl-0042: Payment Released / Matched on PO-2025-00107 — not Submitted.
    asnStore.add(asnOn('ASN-NOOP', 'PO-2025-00107', 'sup-007'));
    const post = await receiveApproveAndPost('ASN-NOOP', [line(100, 0)]);
    expect(post.status).toBe('submitted');

    const inv = invoiceStore.get('inv-brl-0042')!;
    expect(inv.status).toBe('Payment Released'); // untouched
    expect(inv.matchStatus).toBe('Matched');
  });
});

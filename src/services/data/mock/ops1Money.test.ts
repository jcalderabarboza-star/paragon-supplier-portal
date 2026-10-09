// ────────────────────────────────────────────────────────────────────────────
// OPS-1 · MONEY — the match, the late invoice, and who decided.
//
// ⚠️ **THE FIRST SPEC BELOW IS THE DEFECT THE TREE REALLY HAD, FIRED THROUGH THE
// SHIPPED DISPATCHER.** R-OPS measured it in the browser at `26c7fd6`:
// PO-2025-00105, 2,500 of 5,000 kg of niacinamide received, two invoices of
// Rp 2.0B each — both read "Matched", both were approved, both were released.
// On that tree this file's first test fails on its first `matchStatus`
// assertion: both invoices come back `Matched`.
//
// Everything is driven through `MockCommandService.dispatch` against the seeded
// stores. Nothing here writes a verdict by hand.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
import { invoiceStore } from './stores/invoiceStore';
import type { QueryScope, InspectionResult, ASN, Invoice } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { getFlow } from '../../transitions';
import { cascadesFor } from '../../transitions/cascades';
import {
  INVOICE_CLAIMING_STATES,
  MATCH_TOLERANCE,
  RECEIPT_MATCHABLE_STATES,
  VERDICT_OF_CAUSE,
  deriveMatchCause,
  matchInvoicesOnPo,
  orderedValueOf,
  poLineTotalOf,
  poTotalDisagrees,
  receivedValueOf,
} from '../../transitions/invoiceRollup';
import { toBuyerInvoice, toSupplierInvoice } from '../invoiceProjection';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { ATTRIBUTION_KEYS } from '../../identity/attributionKeys';
import { NO_PERSON } from '../../../context/noPerson';
import { DECLARED_PRESENT } from '../fixturePresent';
import type { ActorAttribution } from '../../../lib/enforcement';
import { mockPurchaseOrders } from '../../../data/mockPurchaseOrders';
import { mockGoodsReceipts } from '../../../data/mockGoodsReceipts';

const svc = new MockCommandService();

const PO = 'PO-2025-00105';
const PO_ID = 'po-005';
const NIAC = 'AI-NIAC-6601';
const HYAL = 'AI-HYALU-6610';
const B = 1_000_000_000;

/** A roster member holding `role`, as an actor — read off the roster, never spelled. */
const personWith = (role: string): ActorAttribution => {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role);
  if (!p) throw new Error(`no sample person with role ${role}`);
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};
const FINANCE = personWith('finance');
const EVERY_ROLE = personWith('buyer_all');

const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};
const receiving: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  // E2E-1 — a disposition needs a named person (GR_DISPOSER_NAMED).
  actor: personWith('receiving'),
};
const finance = (actor: QueryScope['actor']): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['finance'] as QueryScope['businessRoles'],
  actor,
});

const ok = async (p: Promise<{ status: string; reason?: string; entityId?: string; correlationId: string }>) => {
  const res = await p;
  expect(res.status, res.reason).not.toBe('failed');
  return res;
};

const confirmPo = (qtys: number[] = [5000, 300]) =>
  ok(
    svc.dispatch(supplier, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: PO_ID,
      payload: { poId: PO_ID, confirmedQuantities: qtys },
    }),
  );

const asn = (asnNumber: string): ASN => ({
  asnNumber,
  supplierId: 'sup-005',
  poReference: PO,
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-OPS1',
  eta: '2026-08-31',
  details: {
    originCity: 'Hamburg',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  lineItems: [
    { materialCode: NIAC, description: 'Niacinamide', orderedQty: 5000, shippedQty: 5000, lotNumber: 'L1' },
    { materialCode: HYAL, description: 'Sodium Hyaluronate', orderedQty: 300, shippedQty: 300, lotNumber: 'L2' },
  ],
});

const line = (materialCode: string, acc: number, rej = 0): InspectionResult => ({
  materialCode,
  description: materialCode,
  qtyExpected: acc + rej,
  qtyReceived: acc + rej,
  qtyAccepted: acc,
  qtyRejected: rej,
  ...(rej > 0 ? { rejectionReason: 'damaged' } : {}),
  // OPS-2b — EDITED ON PURPOSE. These lines carried no seal or lot answer and were
  // accepted anyway; the dispatcher now refuses to accept a line whose required
  // regulatory check is unanswered (`gr_receipt_compliant`), so a receipt this
  // spec means to ACCEPT records both, as the receiving form does.
  halalSealCheck: 'Pass',
  bpomLotCheck: 'Pass',
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
});

let asnSeq = 0;
/** Receive, inspect, dispose and post a receipt on the PO. */
const receiveAndPost = async (results: InspectionResult[]) => {
  const asnNumber = `ASN-OPS1-${++asnSeq}`;
  asnStore.add(asn(asnNumber));
  const gr = await ok(
    svc.dispatch(receiving, {
      transitionId: 't_gr_create',
      entity: 'goodsReceipt',
      payload: { asnReference: asnNumber, receivedDate: DECLARED_PRESENT, receivedBy: 'QC Inspector', inspectionResults: results },
    }),
  );
  const grId = gr.entityId!;
  const fire = (transitionId: string) =>
    ok(svc.dispatch(receiving, { transitionId, entity: 'goodsReceipt', entityId: grId }));
  await fire('t_gr_start_inspection');
  await fire(results.some((r) => r.qtyRejected > 0) ? 't_gr_partial_approve' : 't_gr_approve');
  return fire('t_gr_post');
};

/**
 * ADM-1 — an invoice states its lines (operator ruling), so every invoice this
 * file raises does. The lines that come to `amount` at the order's own prices:
 * niacinamide first, hyaluronate for what is left. Fractional quantities are
 * legal and are what a figure like Rp 1.8B needs.
 */
type Line = { materialCode: string; qty: number; unitPrice: number };
const linesFor = (amount: number): Line[] => {
  const niac = Math.min(amount, 5000 * 220_000);
  return [
    { materialCode: NIAC, qty: niac / 220_000, unitPrice: 220_000 },
    { materialCode: HYAL, qty: (amount - niac) / 3_000_000, unitPrice: 3_000_000 },
  ];
};
const createInvoice = (amount: number, lines: Line[] = linesFor(amount)) =>
  svc.dispatch(supplier, {
    transitionId: 't_invoice_create',
    entity: 'invoice',
    payload: { poReference: PO, amount, lines },
  });

/** Draft and submit an invoice on the PO; returns its id. */
const invoice = async (amount: number, lines?: Line[]): Promise<string> => {
  const created = await ok(createInvoice(amount, lines));
  const id = created.entityId!;
  await ok(
    svc.dispatch(supplier, { transitionId: 't_invoice_submit', entity: 'invoice', entityId: id, payload: { amount } }),
  );
  return id;
};

const inv = (id: string): Invoice => invoiceStore.get(id)!;
const act = (scope: QueryScope, transitionId: string, entityId: string, payload?: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId, entity: 'invoice', entityId, payload });

beforeEach(() => {
  purchaseOrderStore.reset();
  goodsReceiptStore.reset();
  asnStore.reset();
  invoiceStore.reset();
});

describe('OPS-1 · the population this file reasons about is the one in the tree', () => {
  it('PO-2025-00105 is two lines that come to Rp 2.0B, under a stated total of Rp 1.8B', () => {
    const po = purchaseOrderStore.all().find((p) => p.poNumber === PO)!;
    expect(po.id).toBe(PO_ID);
    expect(po.lineItems.map((l) => [l.materialCode, l.quantity, l.unitPrice])).toEqual([
      [NIAC, 5000, 220_000],
      [HYAL, 300, 3_000_000],
    ]);
    expect(poLineTotalOf(po.lineItems)).toBe(2 * B);
    expect(po.totalValue).toBe(1.8 * B);
  });

  it('no seeded invoice sits on that PO, so every figure below is this file’s own', () => {
    expect(invoiceStore.all().filter((i) => i.poNumber === PO)).toEqual([]);
  });

  it('the roster yields two different people who may act on finance’s verbs', () => {
    expect(FINANCE.kind === 'RESOLVED' && EVERY_ROLE.kind === 'RESOLVED').toBe(true);
    expect(FINANCE).not.toEqual(EVERY_ROLE);
  });
});

describe('OPS-1 · P0-1 — the match reads what was received and what is already invoiced', () => {
  it('PO-2025-00105, half received, two invoices of Rp 2.0B: NEITHER is matched and neither can be approved', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    await receiveAndPost([line(NIAC, 2500), line(HYAL, 300)]);

    for (const id of [a, b]) {
      expect(inv(id).matchStatus, id).toBe('Qty Mismatch');
      expect(inv(id).status, id).toBe('Submitted');
      expect(inv(id).matchBasis).toEqual({
        orderedValue: 2 * B,
        receivedValue: 2500 * 220_000 + 300 * 3_000_000,
        alreadyInvoiced: 0,
        invoiced: 2 * B,
        cause: 'EXCEEDS_RECEIVED',
        poStatedTotal: 1.8 * B,
        poLineTotal: 2 * B,
      });
      const approve = await act(finance(FINANCE), 't_invoice_approve', id);
      expect(approve.status).toBe('failed');
      expect(inv(id).status).toBe('Submitted');
    }
  });

  it('received in full: the FIRST invoice is matched and the SECOND is held as already invoiced', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    const post = await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);

    expect(inv(a).matchStatus).toBe('Matched');
    expect(inv(a).status).toBe('Matched');
    expect(inv(a).matchBasis!.cause).toBe('WITHIN');

    expect(inv(b).matchStatus).toBe('Qty Mismatch');
    expect(inv(b).status).toBe('Submitted');
    expect(inv(b).matchBasis).toMatchObject({ cause: 'ALREADY_INVOICED', alreadyInvoiced: 2 * B, receivedValue: 2 * B });

    // exactly one header advance was caused by this posting
    const advanced = commandAuditSink.byEvent('t_invoice_match').filter((e) => e.causationId === post.correlationId);
    expect(advanced).toHaveLength(1);

    const approveB = await act(finance(FINANCE), 't_invoice_approve', b);
    expect(approveB.status).toBe('failed');
  });

  it('a second receipt that completes the delivery clears the first invoice and still holds the second', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    await receiveAndPost([line(NIAC, 2500), line(HYAL, 300)]);
    expect(inv(a).matchStatus).toBe('Qty Mismatch');
    await receiveAndPost([line(NIAC, 2500)]);
    expect(inv(a).matchStatus).toBe('Matched');
    expect(inv(a).status).toBe('Matched');
    expect(inv(b).matchBasis!.cause).toBe('ALREADY_INVOICED');
    expect(inv(b).status).toBe('Submitted');
  });

  it('invoices for part of what was received are matched until the received value is used up', async () => {
    await confirmPo();
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const first = await invoice(1.1 * B);
    const second = await invoice(0.9 * B);
    const third = await invoice(0.1 * B);
    expect(inv(first).status).toBe('Matched');
    expect(inv(second).status).toBe('Matched');
    expect(inv(third).status).toBe('Submitted');
    expect(inv(third).matchBasis).toMatchObject({ cause: 'ALREADY_INVOICED', alreadyInvoiced: 2 * B });
  });

  it('rejected quantity is not payable: an invoice for the whole order is held when a line was part-rejected', async () => {
    await confirmPo();
    const a = await invoice(2 * B);
    await receiveAndPost([line(NIAC, 4000, 1000), line(HYAL, 300)]);
    expect(inv(a).matchStatus).toBe('Qty Mismatch');
    expect(inv(a).matchBasis).toMatchObject({ cause: 'EXCEEDS_RECEIVED', receivedValue: 4000 * 220_000 + 900_000_000 });
    // …and an invoice for the accepted part is matched, rejects or not
    const part = await invoice(4000 * 220_000 + 900_000_000, [
      { materialCode: NIAC, qty: 4000, unitPrice: 220_000 },
      { materialCode: HYAL, qty: 300, unitPrice: 3_000_000 },
    ]);
    expect(inv(part).status).toBe('Matched');
  });

  it('an invoice above the whole order cannot be raised any more (ADM-1); the match still names one as a price variance', async () => {
    // It raised an amount-only invoice of Rp 2.5B and read "Price Variance" off
    // it. An invoice states its lines now, and a line above the confirmed
    // quantity is refused at the door — so the variance is unreachable through
    // the dispatcher, and the match's own verdict is asserted where it lives.
    await confirmPo();
    const over = await createInvoice(2.5 * B, [
      { materialCode: NIAC, qty: 5000, unitPrice: 220_000 },
      { materialCode: HYAL, qty: 1.4 * B / 3_000_000, unitPrice: 3_000_000 },
    ]);
    expect(over.status).toBe('failed');
    expect(over.reason).toContain('INVOICE_LINE_EXCEEDS_CONFIRMED:');
    expect(invoiceStore.all().filter((i) => i.poNumber === PO)).toEqual([]);
    // A row that predates the ruling (the seed holds line-less invoices) is
    // still judged, and still as the only "Price Variance".
    const po = purchaseOrderStore.all().find((p) => p.poNumber === PO)!;
    const [verdict] = matchInvoicesOnPo(
      { lines: po.lineItems, statedTotal: po.totalValue },
      [{ materialCode: NIAC, qtyAccepted: 5000 }, { materialCode: HYAL, qtyAccepted: 300 }],
      [{ id: 'legacy', invoiceNumber: 'legacy', status: 'Submitted', amount: 2.5 * B, submittedDate: '2026-01-01' }],
    );
    expect(verdict.verdict).toBe('Price Variance');
    expect(verdict.basis.cause).toBe('EXCEEDS_ORDER');
  });

  it('a short CONFIRMATION lowers the order’s value: the unconfirmed quantity is not invoiced (ADM-1), and not payable', async () => {
    await confirmPo([4000, 300]);
    // ADM-1 — before a receipt the ceiling is the CONFIRMED quantity, so the
    // whole order's 5,000 kg is refused at the door. It was admitted amount-only
    // and held by the match as EXCEEDS_ORDER.
    const whole = await createInvoice(2 * B);
    expect(whole.status).toBe('failed');
    expect(whole.reason).toContain('INVOICE_LINE_EXCEEDS_CONFIRMED:');
    const confirmed = 4000 * 220_000 + 900_000_000;
    const a = await invoice(confirmed, [
      { materialCode: NIAC, qty: 4000, unitPrice: 220_000 },
      { materialCode: HYAL, qty: 300, unitPrice: 3_000_000 },
    ]);
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    // received is capped at the confirmed 4,000 kg — an over-delivery is not an order for more
    expect(inv(a).matchBasis).toMatchObject({ orderedValue: confirmed, receivedValue: confirmed, cause: 'WITHIN' });
    expect(inv(a).status).toBe('Matched');
  });

  it('the stated total that disagrees with the lines is carried so it can be flagged, and is not what the match uses', async () => {
    await confirmPo();
    const stated = await invoice(1.8 * B);
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    // Rp 1.8B is within the lines' Rp 2.0B, so it is matched — on main it read "Price Variance"
    expect(inv(stated).status).toBe('Matched');
    expect(poTotalDisagrees(inv(stated).matchBasis!)).toBe(true);
  });
});

describe('OPS-1 · P0-3 — an invoice that arrives after its receipt is matched', () => {
  it('receipt posted first, invoice submitted afterwards: matched by the invoice’s own submission', async () => {
    await confirmPo();
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const created = await ok(createInvoice(2 * B));
    const id = created.entityId!;
    expect(inv(id).matchStatus).toBe('Pending');
    const submit = await ok(
      svc.dispatch(supplier, { transitionId: 't_invoice_submit', entity: 'invoice', entityId: id, payload: { amount: 2 * B } }),
    );
    expect(inv(id).matchStatus).toBe('Matched');
    expect(inv(id).status).toBe('Matched');
    const caused = commandAuditSink.byEvent('t_invoice_match').filter((e) => e.causationId === submit.correlationId);
    expect(caused).toHaveLength(1);
    expect(caused[0].outcome).toBe('done');
  });

  it('a receipt whose posting SAP has settled is read exactly as one still posting', async () => {
    await confirmPo();
    const post = await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const posting = goodsReceiptStore.all().find((g) => g.poNumber === PO)!;
    expect(posting.status).toBe('Posting to SAP');
    await svc.settle(receiving, post.correlationId);
    expect(goodsReceiptStore.get(posting.id)!.status).toBe('Posted to SAP');
    expect(RECEIPT_MATCHABLE_STATES).toEqual(['Posting to SAP', 'Posted to SAP']);
    const id = await invoice(2 * B);
    expect(inv(id).status).toBe('Matched');
  });

  it('with no posted receipt on the PO nothing is written: the invoice waits as Pending', async () => {
    await confirmPo();
    const id = await invoice(2 * B);
    expect(inv(id).matchStatus).toBe('Pending');
    expect(inv(id).matchBasis).toBeUndefined();
    expect(inv(id).status).toBe('Submitted');
  });

  it('a receipt that is inspected but not posted is not a receipt to match against', async () => {
    await confirmPo();
    asnStore.add(asn('ASN-OPS1-UNPOSTED'));
    const gr = await ok(
      svc.dispatch(receiving, {
        transitionId: 't_gr_create',
        entity: 'goodsReceipt',
        payload: { asnReference: 'ASN-OPS1-UNPOSTED', receivedDate: DECLARED_PRESENT, receivedBy: 'QC Inspector', inspectionResults: [line(NIAC, 5000), line(HYAL, 300)] },
      }),
    );
    await ok(svc.dispatch(receiving, { transitionId: 't_gr_start_inspection', entity: 'goodsReceipt', entityId: gr.entityId! }));
    await ok(svc.dispatch(receiving, { transitionId: 't_gr_approve', entity: 'goodsReceipt', entityId: gr.entityId! }));
    const id = await invoice(2 * B);
    expect(inv(id).matchStatus).toBe('Pending');
  });

  it('the second entrance: a dispute that is resolved is matched again, and a disputed invoice claims nothing meanwhile', async () => {
    await confirmPo();
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    expect(inv(a).status).toBe('Matched');
    expect(inv(b).matchBasis!.cause).toBe('ALREADY_INVOICED');

    // finance disputes the matched one; it stops claiming the order
    await ok(act(finance(FINANCE), 't_invoice_dispute', a, { disputeReason: 'Wrong legal entity on the invoice.' }));
    expect(inv(a).status).toBe('Disputed');
    // …so resolving the held one's own dispute lets it through
    await ok(act(finance(FINANCE), 't_invoice_dispute', b, { disputeReason: 'Held while the first is checked.' }));
    await ok(act(finance(FINANCE), 't_invoice_resolve', b));
    expect(inv(b).status).toBe('Matched');
    expect(inv(b).matchBasis!.cause).toBe('WITHIN');
    // and the first, resolved afterwards, is now the one held
    await ok(act(finance(FINANCE), 't_invoice_resolve', a));
    expect(inv(a).status).toBe('Submitted');
    expect(inv(a).matchBasis).toMatchObject({ cause: 'ALREADY_INVOICED', alreadyInvoiced: 2 * B });
  });

  it('both entrances to Submitted are declared cascade sources onto the header match', () => {
    for (const source of ['t_gr_post', 't_invoice_submit', 't_invoice_resolve']) {
      expect(cascadesFor(source), source).toEqual([{ targetEntity: 'invoice', targetTransitionId: 't_invoice_match' }]);
    }
    const flow = getFlow('invoice')!;
    const intoSubmitted = flow.transitions.filter((t) => t.to === 'Submitted').map((t) => t.id).sort();
    expect(intoSubmitted).toEqual(['t_invoice_resolve', 't_invoice_submit']);
  });
});

describe('OPS-1 · approval and payment release record who decided, and keep the two apart', () => {
  const matched = async (): Promise<string> => {
    await confirmPo();
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const id = await invoice(2 * B);
    expect(inv(id).status).toBe('Matched');
    return id;
  };

  it('the seated person is stamped on approval, by the store', async () => {
    const id = await matched();
    await ok(act(finance(FINANCE), 't_invoice_approve', id));
    expect(inv(id).status).toBe('Approved');
    expect(inv(id).approvedBy).toEqual(FINANCE);
    expect(toBuyerInvoice(inv(id), DECLARED_PRESENT).approvedBy).toEqual(FINANCE);
  });

  it('the person who approved is REFUSED the release, by the hook that says so; the invoice stays Approved', async () => {
    const id = await matched();
    await ok(act(finance(FINANCE), 't_invoice_approve', id));
    const release = await act(finance(FINANCE), 't_invoice_release_payment', id);
    expect(release.status).toBe('failed');
    expect(refusedByPolicy(release.reason, POLICY_HOOKS.INVOICE_RELEASER_NOT_APPROVER), release.reason).toBe(true);
    expect(release.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');
    expect(inv(id).status).toBe('Approved');
    expect(inv(id).releasedBy).toBeUndefined();
  });

  it('a different person releases it, and is stamped as the releaser', async () => {
    const id = await matched();
    await ok(act(finance(FINANCE), 't_invoice_approve', id));
    const release = await ok(act(finance(EVERY_ROLE), 't_invoice_release_payment', id));
    expect(release.status).toBe('submitted');
    expect(inv(id).status).toBe('Releasing Payment');
    expect(inv(id).approvedBy).toEqual(FINANCE);
    expect(inv(id).releasedBy).toEqual(EVERY_ROLE);
  });

  // ⚠️ REVERSED AT OPS-2, BY OPERATOR RULING — THE TWO SPECS THAT STOOD HERE ARE
  // RESTATED RATHER THAN DELETED. They read *"an unattributed seat is admitted
  // on both, and is recorded as nobody — the check can only compare two names"*
  // and *"an unnamed approval followed by a named releaser is admitted — nobody
  // to compare"*, and both asserted `done` / `submitted`. OPS-1 left that open
  // and said so in its PR. The ruling: an approval by a seat that names nobody
  // is refused by name, as the release already was.
  it('an unattributed seat is refused the approval, by name, and nothing is stamped', async () => {
    const id = await matched();
    const approve = await act(finance(NO_PERSON), 't_invoice_approve', id);
    expect(approve.status).toBe('failed');
    expect(refusedByPolicy(approve.reason, POLICY_HOOKS.INVOICE_APPROVER_NAMED), approve.reason).toBe(true);
    expect(approve.reason).toContain('INVOICE_APPROVER_UNATTRIBUTED:');
    expect(inv(id).status).toBe('Matched');
    expect(inv(id).approvedBy).toBeUndefined();
  });

  it('so no approval can name nobody — and one that somehow does is not released on, even by a named person', async () => {
    const id = await matched();
    // The only way an Approved invoice names nobody now is the seed (or a row
    // approved before the rule). Put this one there by hand to probe the release.
    invoiceStore.update(id, (i) => ({ ...i, status: 'Approved', approvedBy: undefined }));
    const release = await act(finance(FINANCE), 't_invoice_release_payment', id);
    expect(release.status).toBe('failed');
    expect(release.reason).toContain('INVOICE_APPROVAL_UNNAMED:');
    expect(inv(id).status).toBe('Approved');
  });

  it('a named approval cannot be released by a seat that names nobody — with no person, or with no actor at all', async () => {
    const id = await matched();
    await ok(act(finance(FINANCE), 't_invoice_approve', id));
    const bare: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['finance'] as QueryScope['businessRoles'] };
    for (const scope of [finance(NO_PERSON), bare]) {
      const release = await act(scope, 't_invoice_release_payment', id);
      expect(release.status).toBe('failed');
      expect(refusedByPolicy(release.reason, POLICY_HOOKS.INVOICE_RELEASER_NOT_APPROVER), release.reason).toBe(true);
      expect(release.reason).toContain('INVOICE_RELEASER_UNNAMED:');
      expect(inv(id).status).toBe('Approved');
    }
    // the refusal names nobody: there is nobody to name
    const release = await act(finance(NO_PERSON), 't_invoice_release_payment', id);
    expect(SAMPLE_PEOPLE.some((p) => release.reason!.includes(p.personId))).toBe(false);
    // …and a named, different person still releases it
    expect((await ok(act(finance(EVERY_ROLE), 't_invoice_release_payment', id))).status).toBe('submitted');
  });

  // ⚠️ REVERSED AT OPS-2 — this read *"a scope that carries no actor at all is
  // still admitted, and stamps nothing"*, and it walked approve and release to
  // `Releasing Payment` with neither stamped.
  it('a scope that carries no actor at all is refused the approval too', async () => {
    const id = await matched();
    const bare: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['finance'] as QueryScope['businessRoles'] };
    const approve = await act(bare, 't_invoice_approve', id);
    expect(approve.status).toBe('failed');
    expect(approve.reason).toContain('INVOICE_APPROVER_UNATTRIBUTED:');
    expect(inv(id).status).toBe('Matched');
    expect(inv(id).approvedBy).toBeUndefined();
  });

  it('a caller cannot name the approver or the releaser in a payload', async () => {
    expect(ATTRIBUTION_KEYS).toEqual(expect.arrayContaining(['approvedBy', 'releasedBy']));
    const id = await matched();
    const approve = await act(finance(FINANCE), 't_invoice_approve', id, { approvedBy: EVERY_ROLE });
    expect(approve.status).toBe('failed');
    expect(approve.reason).toContain('ACTOR_IN_PAYLOAD');
    expect(inv(id).status).toBe('Matched');
  });

  it('the hooks sit on the verbs they guard', () => {
    const flow = getFlow('invoice')!;
    const hooks = (id: string) => flow.transitions.find((t) => t.id === id)!.policyHooks;
    // OPS-2 — approve read `[]` here ("the store records whatever actor the
    // scope carries"); it now requires a named one, and so does approve-again.
    expect(hooks('t_invoice_approve')).toEqual([POLICY_HOOKS.INVOICE_APPROVER_NAMED]);
    expect(hooks('t_invoice_reapprove')).toEqual([
      POLICY_HOOKS.INVOICE_APPROVER_NAMED,
      POLICY_HOOKS.INVOICE_REAPPROVAL_OWED,
    ]);
    expect(hooks('t_invoice_release_payment')).toEqual([POLICY_HOOKS.INVOICE_RELEASER_NOT_APPROVER]);
  });
});

describe('OPS-1 · an amount that is not a positive number is never matched and never counted', () => {
  const mk = (id: string, amount: number, status: Invoice['status'] = 'Submitted') => ({
    id, invoiceNumber: id, status, amount, submittedDate: '2026-01-01',
  });
  const order = { lines: [{ materialCode: 'A', quantity: 10, confirmedQty: 10, unitPrice: 100 }], statedTotal: 1000 };
  const full = [{ materialCode: 'A', qtyAccepted: 10 }];

  it.each([0, -1000, Number.NaN, Number.POSITIVE_INFINITY])('an awaiting invoice of %s gets no verdict', (amount) => {
    expect(matchInvoicesOnPo(order, full, [mk('bad', amount)])).toEqual([]);
  });

  it('a negative invoice does not make room for a second full invoice', () => {
    // matched-or-later with a negative amount: it must not reduce what is already invoiced
    const res = matchInvoicesOnPo(order, full, [mk('paid', 1000, 'Payment Released'), mk('neg', -1000, 'Matched'), mk('again', 1000)]);
    expect(res.map((r) => [r.invoiceId, r.basis.cause, r.basis.alreadyInvoiced])).toEqual([['again', 'ALREADY_INVOICED', 1000]]);
    // and an awaiting negative one is skipped, so the next is judged as if it were not there
    const res2 = matchInvoicesOnPo(order, full, [mk('a-neg', -1000), mk('b-first', 1000), mk('c-second', 1000)]);
    expect(res2.map((r) => [r.invoiceId, r.basis.cause])).toEqual([['b-first', 'WITHIN'], ['c-second', 'ALREADY_INVOICED']]);
  });

  it('through the dispatcher: a negative amount is refused at the door (ADM-1) and frees nothing', async () => {
    // It created an amount-only invoice of −Rp 2.0B and watched the match skip
    // it. An invoice states its lines now, so a negative amount has three ways
    // in and each is refused by name: no lines, a negative quantity, or an
    // amount that is not the lines' total — at create and again at submit.
    await confirmPo();
    await receiveAndPost([line(NIAC, 5000), line(HYAL, 300)]);
    const noLines = await svc.dispatch(supplier, {
      transitionId: 't_invoice_create',
      entity: 'invoice',
      payload: { poReference: PO, amount: -2 * B },
    });
    expect(noLines.reason).toContain('INVOICE_LINES_REQUIRED:');
    const negQty = await createInvoice(-2 * B, [{ materialCode: NIAC, qty: -5000, unitPrice: 220_000 }]);
    expect(negQty.reason).toContain('INVOICE_LINES_MALFORMED:');
    const negAmount = await createInvoice(-2 * B, linesFor(2 * B));
    expect(negAmount.reason).toContain('INVOICE_AMOUNT_NOT_LINES_TOTAL:');
    expect(invoiceStore.all().filter((i) => i.poNumber === PO)).toEqual([]);
    const draft = (await ok(createInvoice(2 * B))).entityId!;
    const bySubmit = await svc.dispatch(supplier, {
      transitionId: 't_invoice_submit',
      entity: 'invoice',
      entityId: draft,
      payload: { amount: -2 * B },
    });
    expect(bySubmit.reason).toContain('INVOICE_AMOUNT_NOT_LINES_TOTAL:');
    expect(inv(draft).status).toBe('Draft');
    const a = await invoice(2 * B);
    const b = await invoice(2 * B);
    expect(inv(a).status).toBe('Matched');
    expect(inv(b).status).toBe('Submitted');
  });
});

describe('OPS-1 · the dispute reason is kept and both sides can read it', () => {
  it('stored on dispute, shown while disputed, to finance and to the supplier', async () => {
    await confirmPo();
    const id = await invoice(2 * B);
    await ok(act(finance(FINANCE), 't_invoice_dispute', id, { disputeReason: '  Third invoice for one purchase order.  ' }));
    expect(inv(id).disputeReason).toBe('Third invoice for one purchase order.');
    expect(toBuyerInvoice(inv(id), DECLARED_PRESENT).disputeReason).toBe('Third invoice for one purchase order.');
    expect(toSupplierInvoice(inv(id), DECLARED_PRESENT).disputeReason).toBe('Third invoice for one purchase order.');
    await ok(act(finance(FINANCE), 't_invoice_resolve', id));
    // no longer disputed: the views stop carrying it
    expect(toBuyerInvoice(inv(id), DECLARED_PRESENT).disputeReason).toBeUndefined();
    expect(toSupplierInvoice(inv(id), DECLARED_PRESENT).disputeReason).toBeUndefined();
  });

  it('a seeded disputed invoice carries no reason, and the views say nothing rather than invent one', () => {
    const seeded = invoiceStore.all().filter((i) => i.status === 'Disputed');
    expect(seeded.map((i) => i.invoiceNumber).sort()).toEqual(['INV-2025-BRL-0043', 'INV-2026-SMPL-1180']);
    for (const i of seeded) expect(toSupplierInvoice(i, DECLARED_PRESENT).disputeReason).toBeUndefined();
  });
});

describe('OPS-1 · the pure match', () => {
  const lines = [
    { materialCode: 'A', quantity: 10, confirmedQty: 10, unitPrice: 100 },
    { materialCode: 'B', quantity: 5, confirmedQty: 4, unitPrice: 1000 },
  ];

  it('ordered value is confirmed quantity at PO price; the line total is ordered quantity at PO price', () => {
    expect(orderedValueOf(lines)).toBe(10 * 100 + 4 * 1000);
    expect(poLineTotalOf(lines)).toBe(10 * 100 + 5 * 1000);
  });

  it('received value pools accepted quantity per material, caps each line at its confirmed quantity, ignores strangers', () => {
    expect(receivedValueOf(lines, [])).toBe(0);
    expect(receivedValueOf(lines, [{ materialCode: 'A', qtyAccepted: 4 }, { materialCode: 'A', qtyAccepted: 3 }])).toBe(700);
    expect(receivedValueOf(lines, [{ materialCode: 'A', qtyAccepted: 99 }])).toBe(1000);
    expect(receivedValueOf(lines, [{ materialCode: 'B', qtyAccepted: 5 }])).toBe(4000);
    expect(receivedValueOf(lines, [{ materialCode: 'Z', qtyAccepted: 50 }])).toBe(0);
    expect(receivedValueOf(lines, [{ materialCode: 'A', qtyAccepted: -3 }])).toBe(0);
  });

  it('two PO lines of one material share the accepted quantity in order', () => {
    const twin = [
      { materialCode: 'A', quantity: 10, confirmedQty: 10, unitPrice: 100 },
      { materialCode: 'A', quantity: 10, confirmedQty: 10, unitPrice: 200 },
    ];
    expect(receivedValueOf(twin, [{ materialCode: 'A', qtyAccepted: 15 }])).toBe(10 * 100 + 5 * 200);
  });

  it('the cause, case by case, with the tolerance on the order’s value', () => {
    const n = (invoiced: number, receivedValue: number, alreadyInvoiced = 0) =>
      deriveMatchCause({ orderedValue: 1000, receivedValue, alreadyInvoiced, invoiced });
    expect(MATCH_TOLERANCE).toBe(0.01);
    expect(n(1000, 1000)).toBe('WITHIN');
    expect(n(1010, 1000)).toBe('WITHIN'); // exactly at tolerance
    expect(n(1011, 1000)).toBe('EXCEEDS_ORDER');
    expect(n(400, 1000)).toBe('WITHIN'); // an invoice for part
    expect(n(600, 500)).toBe('EXCEEDS_RECEIVED');
    expect(n(500, 1000, 600)).toBe('ALREADY_INVOICED');
    expect(n(400, 1000, 600)).toBe('WITHIN');
    expect(n(900, 500, 600)).toBe('EXCEEDS_RECEIVED'); // over the receipt whatever was invoiced before
    expect(n(2000, 500, 600)).toBe('EXCEEDS_ORDER');
    expect(deriveMatchCause({ orderedValue: 0, receivedValue: 0, alreadyInvoiced: 0, invoiced: 0 })).toBe('EXCEEDS_RECEIVED');
  });

  it('each cause is shown as one verdict, and only "above the order" is a price variance', () => {
    expect(VERDICT_OF_CAUSE).toEqual({
      WITHIN: 'Matched',
      EXCEEDS_RECEIVED: 'Qty Mismatch',
      ALREADY_INVOICED: 'Qty Mismatch',
      EXCEEDS_ORDER: 'Price Variance',
    });
  });

  it('awaiting invoices are taken oldest first, whatever order they are given in', () => {
    const mk = (id: string, submittedDate: string, amount: number, status = 'Submitted') => ({
      id, invoiceNumber: id, status: status as Invoice['status'], amount, submittedDate,
    });
    const order = { lines, statedTotal: 5000 };
    const full = [{ materialCode: 'A', qtyAccepted: 10 }, { materialCode: 'B', qtyAccepted: 4 }];
    const res = matchInvoicesOnPo(order, full, [mk('late', '2026-02-01', 5000), mk('early', '2026-01-01', 5000)]);
    expect(res.map((r) => [r.invoiceId, r.basis.cause])).toEqual([
      ['early', 'WITHIN'],
      ['late', 'ALREADY_INVOICED'],
    ]);
    // same day: the invoice number decides, so the answer does not depend on store order
    const tie = matchInvoicesOnPo(order, full, [mk('INV-2', '2026-01-01', 5000), mk('INV-1', '2026-01-01', 5000)]);
    expect(tie.map((r) => [r.invoiceId, r.verdict])).toEqual([
      ['INV-1', 'Matched'],
      ['INV-2', 'Qty Mismatch'],
    ]);
  });

  it('only matched-or-later invoices count as already invoiced; draft and disputed claim nothing', () => {
    expect([...INVOICE_CLAIMING_STATES].sort()).toEqual(
      ['Approved', 'Matched', 'Payment Released', 'Releasing Payment', 'Remittance Received'].sort(),
    );
    const mk = (id: string, status: Invoice['status'], amount: number) => ({
      id, invoiceNumber: id, status, amount, submittedDate: '2026-01-01',
    });
    const order = { lines, statedTotal: 5000 };
    const full = [{ materialCode: 'A', qtyAccepted: 10 }, { materialCode: 'B', qtyAccepted: 4 }];
    const withDisputed = matchInvoicesOnPo(order, full, [mk('d', 'Disputed', 5000), mk('dr', 'Draft', 5000), mk('x', 'Submitted', 5000)]);
    expect(withDisputed).toHaveLength(1);
    expect(withDisputed[0].basis).toMatchObject({ alreadyInvoiced: 0, cause: 'WITHIN' });
    const withPaid = matchInvoicesOnPo(order, full, [mk('p', 'Payment Released', 5000), mk('x', 'Submitted', 5000)]);
    expect(withPaid[0].basis).toMatchObject({ alreadyInvoiced: 5000, cause: 'ALREADY_INVOICED' });
  });

  it('the seeded receipts that carry no material their own purchase order holds are these six, by name', () => {
    // Worth nothing to the match, whatever they accepted. Sample-data
    // incoherence, named so that a seed correction shows up here.
    const stray = mockGoodsReceipts
      .filter((gr) => {
        const po = mockPurchaseOrders.find((p) => p.poNumber === gr.poNumber);
        return !!po && receivedValueOf(
          po.lineItems.map((l) => ({ ...l, confirmedQty: l.quantity })),
          gr.inspectionResults.map((r) => ({ materialCode: r.materialCode, qtyAccepted: Math.max(1, r.qtyReceived) })),
        ) === 0;
      })
      .map((gr) => gr.grNumber)
      .sort();
    expect(stray).toEqual(['GR-2026-004', 'GR-2026-006', 'GR-2026-007', 'GR-2026-009', 'GR-2026-010', 'GR-2026-011']);
    // the control: the receipt whose posting reaches Matched is not among them
    expect(stray).not.toContain('GR-2026-012');
  });

  it('the PO totals that disagree with their own lines are these four, by name', () => {
    const disagreeing = mockPurchaseOrders
      .filter((po) => poTotalDisagrees({ poStatedTotal: po.totalValue, poLineTotal: poLineTotalOf(po.lineItems) }))
      .map((po) => po.poNumber)
      .sort();
    expect(disagreeing).toEqual(['PO-2025-00101', 'PO-2025-00103', 'PO-2025-00105', 'PO-2025-00112']);
    // a PO whose lines agree is not flagged, and one with no lines cannot be
    expect(poTotalDisagrees({ poStatedTotal: 100, poLineTotal: 100 })).toBe(false);
    expect(poTotalDisagrees({ poStatedTotal: 100, poLineTotal: 0 })).toBe(false);
  });
});

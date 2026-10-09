// ────────────────────────────────────────────────────────────────────────────
// E2E-2 · AN INVOICE THAT STATES ITS LINES, AT THE DISPATCHER.
//
// The form opens on the order's lines and the accepted quantity; the supplier
// may lower a quantity and never exceed it. `invoice_lines_within_received` is
// that rule behind the form, on `t_invoice_create`. Held here, through the real
// dispatcher and stores:
//   1. the opening lines and a lowered quantity are admitted, and the invoice
//      carries its lines and their total;
//   2. each refusal, by name, with nothing created;
//   3. an invoice that states NO lines is not examined — the match judges its
//      amount, as before this batch;
//   4. the match still judges: a lines invoice within the receipt comes out
//      Matched when submitted.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { invoiceStore } from './stores/invoiceStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { getKnownFlows } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { invoiceLinesFor } from '../orderReceipt';
import type { QueryScope } from '../types';

/** The seeded order that is Confirmed and fully received (pinned in `orderReceipt.test.ts`). */
const PO = 'PO-2025-00102';
const MATERIAL = 'RM-EMUL-9410';
const PRICE = 109_375;
const ACCEPTED = 8_000;
/** A seeded Confirmed order with nothing received. */
const PO_NOTHING = 'PO-2025-00107';

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
});
const svc = new MockCommandService();
const create = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_invoice_create', entity: 'invoice', entityId: '', payload });
const lines = (qty: number, unitPrice = PRICE, materialCode = MATERIAL) => [{ materialCode, qty, unitPrice }];

beforeEach(() => {
  invoiceStore.reset();
  goodsReceiptStore.reset();
  purchaseOrderStore.reset();
});

describe('E2E-2 · the population and the wiring', () => {
  it('the specimens are what the specs below assume', () => {
    const po = purchaseOrderStore.all().find((p) => p.poNumber === PO)!;
    expect(po.supplierId).toBe('sup-002');
    expect(invoiceLinesFor(po, goodsReceiptStore.all())).toEqual([
      expect.objectContaining({ materialCode: MATERIAL, unitPrice: PRICE, maxQty: ACCEPTED }),
    ]);
    const none = purchaseOrderStore.all().find((p) => p.poNumber === PO_NOTHING)!;
    expect(invoiceLinesFor(none, goodsReceiptStore.all()).every((l) => l.maxQty === 0)).toBe(true);
  });

  it('the amount check stands on the two verbs that land on Submitted, and on no other', () => {
    const all = getKnownFlows().flatMap((f) => f.transitions);
    expect(
      all.filter((t) => t.policyHooks.includes(POLICY_HOOKS.INVOICE_AMOUNT_IS_LINES_TOTAL)).map((t) => t.id).sort(),
    ).toEqual(['t_invoice_resolve', 't_invoice_submit']);
    // DERIVED: every invoice verb that lands on Submitted carries it.
    const invoice = getKnownFlows().find((f) => f.entity === 'invoice')!;
    expect(invoice.transitions.filter((t) => t.to === 'Submitted').map((t) => t.id).sort()).toEqual([
      't_invoice_resolve',
      't_invoice_submit',
    ]);
  });

  it('the hook stands on the create verb, after the order check, and on no other', () => {
    const all = getKnownFlows().flatMap((f) => f.transitions);
    expect(all.filter((t) => t.policyHooks.includes(POLICY_HOOKS.INVOICE_LINES_WITHIN_RECEIVED)).map((t) => t.id)).toEqual([
      't_invoice_create',
    ]);
    expect(all.find((t) => t.id === 't_invoice_create')!.policyHooks).toEqual([
      POLICY_HOOKS.INVOICE_CREATE_PO_CONFIRMED,
      POLICY_HOOKS.INVOICE_LINES_WITHIN_RECEIVED,
    ]);
  });
});

describe('E2E-2 · admitted', () => {
  it('KNOWN-GOOD — the opening lines: the invoice carries them and their total', async () => {
    const res = await create(supplier('sup-002'), { poReference: PO, amount: ACCEPTED * PRICE, lines: lines(ACCEPTED) });
    expect(res.status, res.reason).toBe('done');
    const inv = invoiceStore.get(res.entityId!)!;
    expect(inv.lines).toEqual(lines(ACCEPTED));
    expect(inv.amount).toBe(ACCEPTED * PRICE);
    expect(inv.status).toBe('Draft');
  });

  it('a lowered quantity is admitted', async () => {
    const res = await create(supplier('sup-002'), { poReference: PO, amount: 5_000 * PRICE, lines: lines(5_000) });
    expect(res.status, res.reason).toBe('done');
    expect(invoiceStore.get(res.entityId!)!.lines).toEqual(lines(5_000));
  });

  it('an invoice that states no lines is not examined, and stores none', async () => {
    const res = await create(supplier('sup-002'), { poReference: PO, amount: 999_999_999_999 });
    expect(res.status, res.reason).toBe('done');
    expect('lines' in invoiceStore.get(res.entityId!)!).toBe(false);
  });

  const submitFull = async () => {
    const made = await create(supplier('sup-002'), { poReference: PO, amount: ACCEPTED * PRICE, lines: lines(ACCEPTED) });
    const sub = await svc.dispatch(supplier('sup-002'), {
      transitionId: 't_invoice_submit',
      entity: 'invoice',
      entityId: made.entityId!,
      payload: { amount: ACCEPTED * PRICE },
    });
    expect(sub.status, sub.reason).toBe('done');
    return invoiceStore.get(made.entityId!)!;
  };

  it('the match still judges — within the receipt and alone on the order, it is Matched', async () => {
    // The seeded invoice that already claims this order is moved off it, so the
    // new one is the only claim.
    invoiceStore.update('inv-mus-0214', (i) => ({ ...i, poNumber: 'PO-ELSEWHERE' }));
    const inv = await submitFull();
    expect(inv.matchStatus).toBe('Matched');
    expect(inv.matchBasis).toMatchObject({ cause: 'WITHIN', receivedValue: ACCEPTED * PRICE, invoiced: ACCEPTED * PRICE });
  });

  it('the match still judges — admitted line by line, and refused a match because the order is already claimed', async () => {
    // The seeded corpus carries an earlier invoice for the whole received value
    // on this order. The lines check admits the new invoice (each line is within
    // what was received); the MATCH is what says the order is over-claimed.
    expect(invoiceStore.get('inv-mus-0214')).toMatchObject({ poNumber: PO, amount: ACCEPTED * PRICE });
    const inv = await submitFull();
    expect(inv.matchStatus).not.toBe('Matched');
    expect(inv.matchBasis!.cause).not.toBe('WITHIN');
    expect(inv.matchBasis!.receivedValue).toBe(ACCEPTED * PRICE);
  });
});

describe('E2E-2 · the lines check cannot be undone at submit', () => {
  const draft = async () => {
    const made = await create(supplier('sup-002'), { poReference: PO, amount: 5_000 * PRICE, lines: lines(5_000) });
    expect(made.status, made.reason).toBe('done');
    return made.entityId!;
  };
  const submit = (id: string, amount: number) =>
    svc.dispatch(supplier('sup-002'), { transitionId: 't_invoice_submit', entity: 'invoice', entityId: id, payload: { amount } });

  it('KNOWN-GOOD — submitting for the lines\' total is admitted', async () => {
    const id = await draft();
    const res = await submit(id, 5_000 * PRICE);
    expect(res.status, res.reason).toBe('done');
    expect(invoiceStore.get(id)).toMatchObject({ status: 'Submitted', amount: 5_000 * PRICE });
  });

  it('submitting a DIFFERENT amount is refused by name and the draft is left as it was', async () => {
    const id = await draft();
    const before = invoiceStore.get(id);
    for (const amount of [5_000 * PRICE + 1, 999_999_999_999, 1]) {
      const res = await submit(id, amount);
      expect(res.status).toBe('failed');
      expect(res.reason).toContain('POLICY_REJECTED:invoice_amount_is_lines_total:INVOICE_AMOUNT_NOT_LINES_TOTAL:');
      expect(invoiceStore.get(id)).toEqual(before);
    }
  });

  it('an invoice with no lines still submits the amount it states — that path is unchanged', async () => {
    const made = await create(supplier('sup-002'), { poReference: PO, amount: 100 });
    const res = await submit(made.entityId!, 250);
    expect(res.status, res.reason).toBe('done');
    expect(invoiceStore.get(made.entityId!)!.amount).toBe(250);
  });
});

describe('E2E-2 · refused, by name, with nothing created', () => {
  const refused = async (payload: Record<string, unknown>, head: string, scope = supplier('sup-002')) => {
    const before = invoiceStore.all().length;
    const res = await create(scope, payload);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain(`POLICY_REJECTED:invoice_lines_within_received:${head}:`);
    expect(invoiceStore.all()).toHaveLength(before);
    return res.reason!;
  };

  it('one more than was received and accepted', async () => {
    const reason = await refused(
      { poReference: PO, amount: (ACCEPTED + 1) * PRICE, lines: lines(ACCEPTED + 1) },
      'INVOICE_LINE_EXCEEDS_RECEIVED',
    );
    expect(reason).toContain(String(ACCEPTED));
    expect(reason).toContain(MATERIAL);
  });

  it('anything at all on an order with nothing received', async () => {
    await refused(
      { poReference: PO_NOTHING, amount: 1_600, lines: lines(1, 1_600, 'PK-PETB-8801') },
      'INVOICE_LINE_EXCEEDS_RECEIVED',
      supplier('sup-007'),
    );
  });

  it('a price other than the order\'s', async () => {
    await refused({ poReference: PO, amount: 100 * (PRICE + 1), lines: lines(100, PRICE + 1) }, 'INVOICE_LINE_PRICE_NOT_ORDER_PRICE');
  });

  it('a material the order does not carry', async () => {
    await refused({ poReference: PO, amount: 100 * PRICE, lines: lines(100, PRICE, 'RM-STEAR-7300') }, 'INVOICE_LINE_NOT_ON_ORDER');
  });

  it('an amount that is not the lines\' total', async () => {
    await refused({ poReference: PO, amount: ACCEPTED * PRICE + 1, lines: lines(ACCEPTED) }, 'INVOICE_AMOUNT_NOT_LINES_TOTAL');
  });

  it('lines that invoice nothing', async () => {
    await refused({ poReference: PO, amount: 0, lines: lines(0) }, 'INVOICE_NOTHING_INVOICED');
  });

  it('lines that are not lines', async () => {
    await refused({ poReference: PO, amount: 1, lines: 'RM-EMUL-9410 x 1' }, 'INVOICE_LINES_MALFORMED');
    await refused({ poReference: PO, amount: 1, lines: [{ materialCode: MATERIAL, qty: '1', unitPrice: PRICE }] }, 'INVOICE_LINES_MALFORMED');
  });

  it('another supplier\'s order is still denied at scope, before any of this', async () => {
    const before = invoiceStore.all().length;
    await expect(
      create(supplier('sup-007'), { poReference: PO, amount: ACCEPTED * PRICE, lines: lines(ACCEPTED) }),
    ).rejects.toThrow(/denied for scope/);
    expect(invoiceStore.all()).toHaveLength(before);
  });
});

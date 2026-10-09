// ────────────────────────────────────────────────────────────────────────────
// E2E-2 · WHAT WAS RECEIVED ON AN ORDER, AND WHAT AN INVOICE MAY STATE.
//
// `orderReceipt.ts` is a read over the receipts: nothing is written to an order
// or a ship notice. Held here:
//   1. which receipts count (posting or posted to SAP — the match's own set),
//      and that an inspected-only receipt does not;
//   2. the per-line accepted quantity is the match's allocation — pooled per
//      material, capped at the confirmed quantity — and agrees with
//      `receivedValueOf` to the rupiah;
//   3. "fully received", both ways, and never on an order that confirmed nothing;
//   4. the invoice's lines: opened on the accepted quantity, lower admitted,
//      higher refused, each refusal by its own code;
//   5. the seeded corpus: the order that is fully received is NAMED.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type { GoodsReceipt, GRStatus } from '../../data/mockGoodsReceipts';
import type { POLineItem } from './types';
import {
  asInvoiceLines,
  invoiceLinesFor,
  invoiceLinesRefusal,
  invoiceLinesTotal,
  receiptsOfNotice,
  receiptsOnOrder,
  receivedOnOrder,
} from './orderReceipt';
import { receivedValueOf, RECEIPT_MATCHABLE_STATES } from '../transitions/invoiceRollup';
import { purchaseOrderStore } from './mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from './mock/stores/goodsReceiptStore';

const line = (materialCode: string, confirmedQty: number, unitPrice: number, quantity = confirmedQty): POLineItem => ({
  id: `l-${materialCode}`,
  materialCode,
  description: `${materialCode} description`,
  quantity,
  uom: 'KG',
  unitPrice,
  confirmedQty,
});
const PO = { poNumber: 'PO-T-1', lineItems: [line('A', 100, 10), line('B', 50, 20)] };

let seq = 0;
const gr = (
  status: GRStatus,
  lines: ReadonlyArray<readonly [string, number, number]>,
  over: Partial<GoodsReceipt> = {},
): GoodsReceipt => {
  seq += 1;
  return {
    id: `gr-t-${seq}`,
    grNumber: `GR-T-${String(seq).padStart(3, '0')}`,
    asnId: 'asn-t',
    asnNumber: 'ASN-T-1',
    poNumber: 'PO-T-1',
    supplierId: 'sup-t',
    supplierName: 'Supplier T',
    receivedDate: '2026-08-20',
    receivedBy: 'Warehouse',
    status,
    inspectionResults: lines.map(([materialCode, qtyAccepted, qtyRejected]) => ({
      materialCode,
      description: materialCode,
      qtyExpected: qtyAccepted + qtyRejected,
      qtyReceived: qtyAccepted + qtyRejected,
      qtyAccepted,
      qtyRejected,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
    })),
    disposition: 'Accept',
    ...over,
  };
};

describe('E2E-2 · which receipts count as received', () => {
  it('posting and posted count; inspected, held and rejected do not', () => {
    const all: GRStatus[] = [
      'Pending Inspection', 'Under Inspection', 'Quality Hold', 'Approved',
      'Partially Approved', 'Rejected', 'Posting to SAP', 'Posted to SAP',
    ];
    const receipts = all.map((s) => gr(s, [['A', 10, 0]]));
    expect(receiptsOnOrder('PO-T-1', receipts).map((g) => g.status).sort()).toEqual(
      [...RECEIPT_MATCHABLE_STATES].sort(),
    );
    expect([...RECEIPT_MATCHABLE_STATES].sort()).toEqual(['Posted to SAP', 'Posting to SAP']);
  });

  it('a receipt of several of the order\'s materials says how many, so a surface does not add their quantities', () => {
    const two = gr('Posted to SAP', [['A', 10, 0], ['B', 5, 1]]);
    expect(receivedOnOrder(PO, [two]).receipts[0]).toMatchObject({ materials: 2, accepted: 15, rejected: 1 });
  });

  it('on an order, a receipt row counts only that order\'s materials', () => {
    // 'Z' is on the receipt and not on the order: its 999 is not this order's.
    const mixed = gr('Posted to SAP', [['A', 10, 2], ['Z', 999, 7]]);
    expect(receivedOnOrder(PO, [mixed]).receipts[0]).toMatchObject({ materials: 1, accepted: 10, rejected: 2 });
    const foreign = gr('Posted to SAP', [['Z', 999, 7]]);
    expect(receivedOnOrder(PO, [foreign]).receipts[0]).toMatchObject({ materials: 0, accepted: 0, rejected: 0 });
    // On a ship notice there is no order to narrow to: every line is read.
    expect(receiptsOfNotice('ASN-T-1', [mixed])[0]).toMatchObject({ materials: 2, accepted: 1009, rejected: 9 });
  });

  it('another order\'s receipt is not this order\'s', () => {
    const other = gr('Posted to SAP', [['A', 10, 0]], { poNumber: 'PO-T-2' });
    expect(receiptsOnOrder('PO-T-1', [other])).toEqual([]);
    expect(receivedOnOrder(PO, [other]).receipts).toEqual([]);
  });

  it('receipts read oldest first, and say whether SAP has settled them', () => {
    const late = gr('Posting to SAP', [['A', 10, 0]], { receivedDate: '2026-08-25' });
    const early = gr('Posted to SAP', [['A', 20, 5]], { receivedDate: '2026-08-21', sapMaterialDoc: 'MAT-1' });
    const r = receivedOnOrder(PO, [late, early]).receipts;
    expect(r.map((x) => x.grNumber)).toEqual([early.grNumber, late.grNumber]);
    expect(r[0]).toMatchObject({ accepted: 20, rejected: 5, materials: 1, settled: true, sapMaterialDoc: 'MAT-1', receivedDate: '2026-08-21' });
    expect(r[1]).toMatchObject({ accepted: 10, rejected: 0, settled: false });
    expect('sapMaterialDoc' in r[1]).toBe(false);
  });
});

describe('E2E-2 · accepted per line is the match\'s own allocation', () => {
  it('pools a material across receipts and caps each line at its confirmed quantity', () => {
    const receipts = [gr('Posted to SAP', [['A', 70, 0]]), gr('Posted to SAP', [['A', 60, 0], ['B', 20, 3]])];
    const got = receivedOnOrder(PO, receipts);
    expect(got.lines.map((l) => [l.materialCode, l.accepted, l.confirmedQty])).toEqual([
      ['A', 100, 100],
      ['B', 20, 50],
    ]);
  });

  it('two lines of ONE material share the pool — the second takes only what the first left', () => {
    const twoLines = { poNumber: 'PO-T-1', lineItems: [line('A', 60, 10), { ...line('A', 60, 12), id: 'l-A-2' }] };
    const got = receivedOnOrder(twoLines, [gr('Posted to SAP', [['A', 100, 0]])]);
    expect(got.lines.map((l) => l.accepted)).toEqual([60, 40]);
    expect(got.fullyReceived).toBe(false);
  });

  it('a material the order does not carry is handed to no line', () => {
    const got = receivedOnOrder(PO, [gr('Posted to SAP', [['Z', 999, 0]])]);
    expect(got.lines.map((l) => l.accepted)).toEqual([0, 0]);
    expect(got.receipts).toHaveLength(1);
  });

  it.each([
    [[['A', 70, 0], ['B', 50, 0]]],
    [[['A', 130, 0]]],
    [[['B', 10, 40]]],
    [[]],
  ] as const)('agrees with receivedValueOf to the rupiah — %j', (lines) => {
    const receipts = [gr('Posted to SAP', lines as never)];
    const got = receivedOnOrder(PO, receipts);
    const value = got.lines.reduce((s, l) => s + l.accepted * l.unitPrice, 0);
    expect(value).toBe(receivedValueOf(PO.lineItems, receipts.flatMap((g) => g.inspectionResults)));
  });
});

describe('E2E-2 · fully received', () => {
  it('KNOWN-GOOD — every confirmed line accepted in full', () => {
    expect(receivedOnOrder(PO, [gr('Posted to SAP', [['A', 100, 0], ['B', 50, 0]])]).fullyReceived).toBe(true);
  });

  it('one line short is not fully received', () => {
    expect(receivedOnOrder(PO, [gr('Posted to SAP', [['A', 100, 0], ['B', 49, 1]])]).fullyReceived).toBe(false);
  });

  it('accepted but only inspected is not received', () => {
    expect(receivedOnOrder(PO, [gr('Approved', [['A', 100, 0], ['B', 50, 0]])]).fullyReceived).toBe(false);
  });

  it('no receipt is not fully received', () => {
    expect(receivedOnOrder(PO, []).fullyReceived).toBe(false);
  });

  it('an order that confirmed nothing is never fully received', () => {
    const none = { poNumber: 'PO-T-1', lineItems: [line('A', 0, 10, 100)] };
    expect(receivedOnOrder(none, [gr('Posted to SAP', [['A', 100, 0]])]).fullyReceived).toBe(false);
    expect(receivedOnOrder({ poNumber: 'PO-T-1', lineItems: [] }, []).fullyReceived).toBe(false);
  });

  it('a line that confirmed nothing does not hold the others back', () => {
    const mixed = { poNumber: 'PO-T-1', lineItems: [line('A', 100, 10), line('B', 0, 20, 50)] };
    expect(receivedOnOrder(mixed, [gr('Posted to SAP', [['A', 100, 0]])]).fullyReceived).toBe(true);
  });
});

describe('E2E-2 · the receipt on a ship notice', () => {
  it('is the posted receipt naming that notice, and no other notice\'s', () => {
    const mine = gr('Posted to SAP', [['A', 10, 0]], { asnNumber: 'ASN-T-1' });
    const other = gr('Posted to SAP', [['A', 10, 0]], { asnNumber: 'ASN-T-2' });
    const inspected = gr('Approved', [['A', 10, 0]], { asnNumber: 'ASN-T-1' });
    expect(receiptsOfNotice('ASN-T-1', [mine, other, inspected]).map((r) => r.grNumber)).toEqual([mine.grNumber]);
    expect(receiptsOfNotice('ASN-T-9', [mine, other, inspected])).toEqual([]);
  });
});

describe('E2E-2 · the lines an invoice may state', () => {
  const receipts = [gr('Posted to SAP', [['A', 80, 0], ['B', 0, 50]])];
  const open = invoiceLinesFor(PO, receipts);
  const full = [{ materialCode: 'A', qty: 80, unitPrice: 10 }, { materialCode: 'B', qty: 0, unitPrice: 20 }];

  it('open on the order\'s price and the accepted quantity, a zero line kept', () => {
    expect(open.map((l) => [l.materialCode, l.unitPrice, l.maxQty])).toEqual([
      ['A', 10, 80],
      ['B', 20, 0],
    ]);
  });

  it('KNOWN-GOOD — the opening lines are admitted, and so is a lower quantity', () => {
    expect(invoiceLinesRefusal(PO, receipts, full, 800)).toBeNull();
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'A', qty: 30, unitPrice: 10 }], 300)).toBeNull();
    expect(invoiceLinesTotal(full)).toBe(800);
  });

  it('one more than was accepted is refused, naming the line and the ceiling', () => {
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'A', qty: 81, unitPrice: 10 }], 810)).toEqual({
      code: 'INVOICE_LINE_EXCEEDS_RECEIVED',
      materialCode: 'A',
      qty: 81,
      maxQty: 80,
    });
    // A line with nothing accepted may not be invoiced at all.
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'B', qty: 1, unitPrice: 20 }], 20)).toMatchObject({
      code: 'INVOICE_LINE_EXCEEDS_RECEIVED',
      materialCode: 'B',
      maxQty: 0,
    });
  });

  it('a price other than the order\'s is refused', () => {
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'A', qty: 80, unitPrice: 11 }], 880)).toEqual({
      code: 'INVOICE_LINE_PRICE_NOT_ORDER_PRICE',
      materialCode: 'A',
      orderPrice: 10,
    });
  });

  it('a material the order does not carry is refused', () => {
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'Z', qty: 1, unitPrice: 10 }], 10)).toEqual({
      code: 'INVOICE_LINE_NOT_ON_ORDER',
      materialCode: 'Z',
    });
  });

  it('a material stated twice is refused — two lines could each claim the ceiling', () => {
    const twice = [{ materialCode: 'A', qty: 80, unitPrice: 10 }, { materialCode: 'A', qty: 80, unitPrice: 10 }];
    expect(invoiceLinesRefusal(PO, receipts, twice, 1600)).toEqual({ code: 'INVOICE_LINES_MALFORMED' });
  });

  it('lines that invoice nothing are refused', () => {
    expect(invoiceLinesRefusal(PO, receipts, [{ materialCode: 'A', qty: 0, unitPrice: 10 }], 0)).toEqual({
      code: 'INVOICE_NOTHING_INVOICED',
    });
    expect(invoiceLinesRefusal(PO, receipts, [], 0)).toEqual({ code: 'INVOICE_NOTHING_INVOICED' });
  });

  it('an amount that is not the lines\' total is refused', () => {
    expect(invoiceLinesRefusal(PO, receipts, full, 801)).toEqual({
      code: 'INVOICE_AMOUNT_NOT_LINES_TOTAL',
      amount: 801,
      linesTotal: 800,
    });
  });

  it('with no receipt nothing may be invoiced', () => {
    expect(invoiceLinesFor(PO, []).map((l) => l.maxQty)).toEqual([0, 0]);
    expect(invoiceLinesRefusal(PO, [], [{ materialCode: 'A', qty: 1, unitPrice: 10 }], 10)).toMatchObject({
      code: 'INVOICE_LINE_EXCEEDS_RECEIVED',
    });
  });

  it('asInvoiceLines reads a list of lines and nothing else', () => {
    expect(asInvoiceLines(full)).toEqual(full);
    expect(asInvoiceLines('A')).toBeNull();
    expect(asInvoiceLines([{ materialCode: 'A', qty: '80', unitPrice: 10 }])).toBeNull();
    expect(asInvoiceLines([{ materialCode: 'A', qty: -1, unitPrice: 10 }])).toBeNull();
    expect(asInvoiceLines([{ materialCode: '', qty: 1, unitPrice: 10 }])).toBeNull();
    expect(asInvoiceLines([null])).toBeNull();
  });
});

describe('E2E-2 · the seeded corpus, by name', () => {
  const receipts = () => goodsReceiptStore.all();
  it('exactly one seeded order is fully received, and it is still Confirmed', () => {
    const full = purchaseOrderStore.all().filter((po) => receivedOnOrder(po, receipts()).fullyReceived);
    expect(full.map((po) => [po.poNumber, po.supplierId, po.status])).toEqual([
      ['PO-2025-00102', 'sup-002', 'Confirmed'],
    ]);
    const got = receivedOnOrder(full[0], receipts());
    // The seeded receipt also carries a material this order does not; the row
    // counts the order's own material only.
    expect(got.receipts.map((r) => [r.grNumber, r.settled, r.materials, r.accepted])).toEqual([
      ['GR-2026-014', true, 1, 8000],
    ]);
    expect(got.lines.map((l) => [l.materialCode, l.accepted, l.confirmedQty, l.unitPrice])).toEqual([
      ['RM-EMUL-9410', 8000, 8000, 109375],
    ]);
  });

  it('a seeded Confirmed order with nothing received is the other specimen', () => {
    const po = purchaseOrderStore.all().find((p) => p.poNumber === 'PO-2025-00107')!;
    expect(po.status).toBe('Confirmed');
    const got = receivedOnOrder(po, receipts());
    expect(got.receipts).toEqual([]);
    expect(got.fullyReceived).toBe(false);
  });

  it('no seeded order carries one material on two lines — the invoice keys a line by material', () => {
    const dup = purchaseOrderStore
      .all()
      .filter((po) => new Set(po.lineItems.map((l) => l.materialCode)).size !== po.lineItems.length)
      .map((po) => po.poNumber);
    expect(dup).toEqual([]);
    expect(purchaseOrderStore.all().length).toBeGreaterThan(10);
  });
});

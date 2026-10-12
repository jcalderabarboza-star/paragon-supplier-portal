// ─────────────────────────────────────────────────────────────────────────────
// PG-3 · the purchase orders are anchored to the declared present, so the
// dashboard's Procurement row counts for real (operator ruling, 12 October 2026).
//
// Before: the orders were authored a year behind the present, so "still Sent 48
// hours after the order" was true of every Sent order at any instant, and the
// row stated no count. This file pins what the anchor PRODUCES, by name.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { DECLARED_PRESENT, FAMILY_ANCHORS, SOURCING_ANCHOR, shiftDays } from '../../services/data/fixturePresent';
import { POStatus } from '../../services/data/types';
import { unacknowledgedOver48h, unacknowledgedOver48hAt } from '../widgets/buyerDerivations';
import { PRESENT_ISO } from './buyerDashboardDerivations';

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`);
const RAW = readFileSync(resolve(__dirname, '../../data/mockPurchaseOrders.ts'), 'utf8');
const rawOrderDate = (id: string): string => {
  const at = RAW.indexOf(`id: '${id}'`);
  return /orderDate: '(\d{4}-\d{2}-\d{2})'/.exec(RAW.slice(at))![1];
};

describe('PG-3 · the purchase orders read as though today were their anchor', () => {
  it('⚠ POPULATION CONTROL — the corpus holds Sent orders, and the raw literals are still in the source', () => {
    expect(mockPurchaseOrders.length).toBeGreaterThan(15);
    expect(mockPurchaseOrders.filter((p) => p.status === POStatus.SENT).map((p) => p.id)).toEqual(['po-005', 'po-008', 'po-012', 'po-019']);
    expect(rawOrderDate('po-012')).toBe('2025-04-04');
    expect(rawOrderDate('po-019')).toBe('2025-04-01');
  });

  it('every order moved by the SAME whole number of days — the family’s own shift', () => {
    const shift = shiftDays('purchaseOrder');
    expect(shift).toBe(Math.round((day(DECLARED_PRESENT) - day(FAMILY_ANCHORS.purchaseOrder.anchor)) / DAY));
    expect(shift).toBeGreaterThan(400); // more than a year: the raw literals are NOT what is exported
    for (const p of mockPurchaseOrders) {
      expect((day(p.orderDate) - day(rawOrderDate(p.id))) / DAY, p.id).toBe(shift);
    }
    // spacing inside an order is preserved: po-001 asked for delivery 19 days after it was placed
    const first = mockPurchaseOrders.find((p) => p.id === 'po-001')!;
    expect((day(first.requestedDeliveryDate) - day(first.orderDate)) / DAY).toBe(19);
    // an order never confirmed has no confirmed date, and a shift does not invent one
    expect(mockPurchaseOrders.find((p) => p.id === 'po-005')!.confirmedDeliveryDate).toBe('');
  });

  it('the anchor sits where the corpus says it was authored: no order is placed after the present', () => {
    const latest = mockPurchaseOrders.reduce((m, p) => (p.orderDate > m ? p.orderDate : m), '');
    expect(latest <= DECLARED_PRESENT).toBe(true);
    expect((day(DECLARED_PRESENT) - day(latest)) / DAY).toBe(2); // po-012, placed two days before the anchor
    // a family of its own: the orders are not bent to the sourcing events' anchor
    expect(FAMILY_ANCHORS.purchaseOrder.anchor).not.toBe(SOURCING_ANCHOR);
  });

  it('⚠️ at the declared present THREE of the four Sent orders are past 48 hours — named — and po-012 is not', () => {
    const late = unacknowledgedOver48hAt(mockPurchaseOrders, PRESENT_ISO).map((p) => p.id);
    expect(late).toEqual(['po-005', 'po-008', 'po-019']);
    expect(late).not.toContain('po-012'); // placed exactly 48 hours before: not OVER
    // the two entries agree — one takes a Date, one an ISO instant
    expect(unacknowledgedOver48h(mockPurchaseOrders, new Date(PRESENT_ISO)).map((p) => p.id)).toEqual(late);
  });

  it('⚠️ THE COUNT DISCRIMINATES — one day earlier it is two, three days later it is all four', () => {
    const at = (offsetDays: number) =>
      unacknowledgedOver48hAt(mockPurchaseOrders, new Date(Date.parse(PRESENT_ISO) + offsetDays * DAY).toISOString()).map((p) => p.id);
    expect(at(-1)).toEqual(['po-005', 'po-019']);
    expect(at(3)).toEqual(['po-005', 'po-008', 'po-012', 'po-019']);
    // unanchored — read a year on, as the raw literals were — every Sent order is "late": the saturated count
    const raw = mockPurchaseOrders.map((p) => ({ ...p, orderDate: rawOrderDate(p.id) }));
    expect(unacknowledgedOver48hAt(raw, PRESENT_ISO)).toHaveLength(4);
  });
});

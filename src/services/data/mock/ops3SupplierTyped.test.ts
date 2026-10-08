// ─────────────────────────────────────────────────────────────────────────────
// OPS-3 — WHAT THE SUPPLIER TYPED ARRIVES. The dispatcher's half.
//
// Two forms asked a supplier for more than they sent:
//   · the order confirmation asked for a delivery date and a note, and sent
//     only the quantities;
//   · the ship-notice form asked for a ship date, packages, weight, a batch, a
//     lot, notes and a packing list, sent only carrier, tracking and ETA —
//     under a review step that read "all values shown will be transmitted" —
//     and shipped the ORDERED quantity whatever had been confirmed.
//
// Every spec here dispatches by hand through the shipped dispatcher, with no
// form in front of it, and reads the result back from the STORE.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import type { QueryScope } from '../types';
import { POStatus } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { getFlow } from '../../transitions';
import {
  PO_CONFIRM_NOTE_MAX,
  isCalendarDay,
  readAsnTypedDetails,
} from '../../transitions/policies';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});

/** PO-2025-00105 — sup-005, Sent, TWO lines (5,000 KG and 300 KG). */
const PO = 'po-005';
const PO_NUMBER = 'PO-2025-00105';
const SUP = 'sup-005';

const confirm = (payload: Record<string, unknown>, entityId = PO, sup = SUP) =>
  svc.dispatch(supplier(sup), {
    transitionId: 't_po_confirm',
    entity: 'purchaseOrder',
    entityId,
    payload,
  });
const createAsn = (payload: Record<string, unknown>, sup = SUP) =>
  svc.dispatch(supplier(sup), {
    transitionId: 't_asn_create',
    entity: 'advanceShipNotice',
    payload,
  });

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('OPS-3 · the population is the one this file means', () => {
  it('PO-2025-00105 is Sent, two lines, nothing confirmed on it yet', () => {
    const po = purchaseOrderStore.get(PO)!;
    expect(po.poNumber).toBe(PO_NUMBER);
    expect(po.supplierId).toBe(SUP);
    expect(po.status).toBe(POStatus.SENT);
    expect(po.lineItems.map((l) => [l.materialCode, l.quantity])).toEqual([
      ['AI-NIAC-6601', 5000],
      ['AI-HYALU-6610', 300],
    ]);
    expect(po.confirmedDeliveryDate).toBe('');
    expect(po.confirmedAt).toBeUndefined();
    expect(po.confirmationNote).toBeUndefined();
  });

  it('the two new hooks sit on the verbs they judge, and on no other', () => {
    const holders = (hook: string) =>
      [getFlow('purchaseOrder')!, getFlow('advanceShipNotice')!]
        .flatMap((f) => f.transitions)
        .filter((t) => (t.policyHooks as readonly string[]).includes(hook))
        .map((t) => t.id);
    expect(holders(POLICY_HOOKS.PO_CONFIRM_TERMS_WELL_FORMED)).toEqual(['t_po_confirm']);
    expect(holders(POLICY_HOOKS.ASN_DETAILS_WELL_FORMED)).toEqual(['t_asn_create']);
  });
});

describe('OPS-3 · order confirmation — the date, the note and the quantity are stored', () => {
  it('a confirmation stores all three, and stamps the time of the act itself', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T05:37:00.000Z'));
    const res = await confirm({
      confirmedQuantities: [4500, 300],
      confirmedDeliveryDate: '2025-05-20',
      confirmationNote: '  500 KG short on niacinamide; balance in June.  ',
    });
    expect(res.status, res.reason).toBe('done');
    const po = purchaseOrderStore.get(PO)!;
    expect(po.status).toBe(POStatus.CONFIRMED);
    expect(po.lineItems.map((l) => l.confirmedQty)).toEqual([4500, 300]);
    expect(po.confirmedDeliveryDate).toBe('2025-05-20');
    expect(po.confirmationNote).toBe('500 KG short on niacinamide; balance in June.');
    expect(po.confirmedAt).toBe('2026-10-08T05:37:00.000Z');
  });

  it('⚠️ the time of the act is the store’s — a payload cannot set it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T05:37:00.000Z'));
    const res = await confirm({
      confirmedQuantities: [5000, 300],
      confirmedAt: '2020-01-01T00:00:00.000Z',
    });
    expect(res.status, res.reason).toBe('done');
    expect(purchaseOrderStore.get(PO)!.confirmedAt).toBe('2026-10-08T05:37:00.000Z');
  });

  it('a confirmation that names no date commits to none — nothing is invented', async () => {
    const res = await confirm({ confirmedQuantities: [5000, 300] });
    expect(res.status, res.reason).toBe('done');
    const po = purchaseOrderStore.get(PO)!;
    expect(po.confirmedDeliveryDate).toBe('');
    expect(po.confirmationNote).toBeUndefined();
    expect(po.confirmedAt).toBeDefined();
  });

  it('an acknowledgement is not a confirmation: no time, date or note is stamped', async () => {
    const res = await svc.dispatch(supplier(SUP), {
      transitionId: 't_po_acknowledge',
      entity: 'purchaseOrder',
      entityId: PO,
    });
    expect(res.status, res.reason).toBe('done');
    const po = purchaseOrderStore.get(PO)!;
    expect(po.status).toBe(POStatus.ACKNOWLEDGED);
    expect(po.confirmedAt).toBeUndefined();
    expect(po.confirmedDeliveryDate).toBe('');
  });

  describe('a hand-made dispatch is refused by name', () => {
    const refused = async (payload: Record<string, unknown>, head: string) => {
      const res = await confirm({ confirmedQuantities: [5000, 300], ...payload });
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.PO_CONFIRM_TERMS_WELL_FORMED)).toBe(true);
      expect(res.reason).toContain(`${head}:`);
      // Refused means nothing moved.
      const po = purchaseOrderStore.get(PO)!;
      expect(po.status).toBe(POStatus.SENT);
      expect(po.confirmedAt).toBeUndefined();
      expect(po.lineItems.map((l) => l.confirmedQty)).toEqual([0, 0]);
    };

    it('PO_CONFIRM_DATE_INVALID — a date no calendar holds', async () => {
      await refused({ confirmedDeliveryDate: '2025-02-30' }, 'PO_CONFIRM_DATE_INVALID');
    });
    it('PO_CONFIRM_DATE_INVALID — a date that is not written YYYY-MM-DD', async () => {
      await refused({ confirmedDeliveryDate: '20 May 2025' }, 'PO_CONFIRM_DATE_INVALID');
    });
    it('PO_CONFIRM_DATE_INVALID — a date that is not text', async () => {
      await refused({ confirmedDeliveryDate: 20250520 }, 'PO_CONFIRM_DATE_INVALID');
    });
    it('PO_CONFIRM_DATE_BEFORE_ORDER — a delivery before the order was placed', async () => {
      // The order date is 2025-04-02.
      await refused({ confirmedDeliveryDate: '2025-04-01' }, 'PO_CONFIRM_DATE_BEFORE_ORDER');
    });
    it('PO_CONFIRM_NOTE_INVALID — a note longer than the form carries', async () => {
      await refused({ confirmationNote: 'x'.repeat(PO_CONFIRM_NOTE_MAX + 1) }, 'PO_CONFIRM_NOTE_INVALID');
    });
    it('PO_CONFIRM_NOTE_INVALID — a note that is not text', async () => {
      await refused({ confirmationNote: 42 }, 'PO_CONFIRM_NOTE_INVALID');
    });
  });

  it('the bounds are exact: the order date itself and a note of the maximum length pass', async () => {
    const res = await confirm({
      confirmedQuantities: [5000, 300],
      confirmedDeliveryDate: '2025-04-02',
      confirmationNote: 'x'.repeat(PO_CONFIRM_NOTE_MAX),
    });
    expect(res.status, res.reason).toBe('done');
    expect(purchaseOrderStore.get(PO)!.confirmedDeliveryDate).toBe('2025-04-02');
  });

  it('the quantity rule is still read first, and still refuses in its own voice', async () => {
    const res = await confirm({ confirmedQuantities: [5001, 300], confirmedDeliveryDate: 'nonsense' });
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED)).toBe(true);
  });
});

describe('OPS-3 · isCalendarDay — the one reader of a typed day', () => {
  it('accepts a real day and refuses everything else', () => {
    expect(isCalendarDay('2026-02-28')).toBe(true);
    expect(isCalendarDay('2024-02-29')).toBe(true);
    expect(isCalendarDay('2026-02-29')).toBe(false);
    expect(isCalendarDay('2026-13-01')).toBe(false);
    expect(isCalendarDay('2026-2-1')).toBe(false);
    expect(isCalendarDay('2026-02-28T00:00:00.000Z')).toBe(false);
    expect(isCalendarDay('')).toBe(false);
    expect(isCalendarDay(undefined)).toBe(false);
    expect(isCalendarDay(20260228)).toBe(false);
  });
});

describe('OPS-3 · ship notice — every line, the confirmed quantity, and what was typed', () => {
  const confirmShort = () =>
    confirm({ confirmedQuantities: [4500, 300], confirmedDeliveryDate: '2025-05-20' });

  it('⚠️ it ships the CONFIRMED quantity on EVERY order line', async () => {
    expect((await confirmShort()).status).toBe('done');
    const res = await createAsn({ poReference: PO_NUMBER });
    expect(res.status, res.reason).toBe('done');
    const asn = asnStore.get(res.entityId!)!;
    expect(
      asn.lineItems.map((l) => [l.materialCode, l.orderedQty, l.shippedQty]),
    ).toEqual([
      ['AI-NIAC-6601', 5000, 4500],
      ['AI-HYALU-6610', 300, 300],
    ]);
  });

  it('packages, weight, ship date, batch, lots, notes and the packing-list name are stored', async () => {
    expect((await confirmShort()).status).toBe('done');
    const res = await createAsn({
      poReference: PO_NUMBER,
      carrier: 'Sample Courier (illustrative)',
      trackingNumber: 'TRK-OPS3',
      eta: '2026-09-04',
      shipDate: '2026-09-01',
      packages: 42,
      grossWeightKg: 5120.5,
      batchNumber: '  B-2026-0901 ',
      lotNumbers: ['LOT-NIAC-77', ' LOT-HYA-12 '],
      notes: ' Keep below 25 °C. ',
      packingListName: 'packing-list-0901.pdf',
    });
    expect(res.status, res.reason).toBe('done');
    const asn = asnStore.get(res.entityId!)!;
    expect(asn.carrier).toBe('Sample Courier (illustrative)');
    expect(asn.trackingNumber).toBe('TRK-OPS3');
    expect(asn.eta).toBe('2026-09-04');
    expect(asn.details.totalCartons).toBe(42);
    expect(asn.details.grossWeightKg).toBe(5120.5);
    expect(asn.details.shipDate).toBe('2026-09-01');
    expect(asn.details.batchNumber).toBe('B-2026-0901');
    expect(asn.details.notes).toBe('Keep below 25 °C.');
    expect(asn.details.packingListName).toBe('packing-list-0901.pdf');
    expect(asn.lineItems.map((l) => l.lotNumber)).toEqual(['LOT-NIAC-77', 'LOT-HYA-12']);
  });

  it('a notice that gives none of them stores none — zero and absent, never a default', async () => {
    expect((await confirmShort()).status).toBe('done');
    const res = await createAsn({ poReference: PO_NUMBER });
    const asn = asnStore.get(res.entityId!)!;
    expect(asn.details.totalCartons).toBe(0);
    expect(asn.details.grossWeightKg).toBe(0);
    expect(asn.details.shipDate).toBeUndefined();
    expect(asn.details.batchNumber).toBeUndefined();
    expect(asn.details.notes).toBeUndefined();
    expect(asn.details.packingListName).toBeUndefined();
    expect(asn.lineItems.map((l) => l.lotNumber)).toEqual(['', '']);
  });

  it('a lot given for the first line only leaves the second without one', async () => {
    expect((await confirmShort()).status).toBe('done');
    const res = await createAsn({ poReference: PO_NUMBER, lotNumbers: ['LOT-ONLY-1'] });
    expect(asnStore.get(res.entityId!)!.lineItems.map((l) => l.lotNumber)).toEqual(['LOT-ONLY-1', '']);
  });

  describe('a hand-made dispatch is refused by name — ASN_DETAILS_INVALID', () => {
    const cases: readonly [string, Record<string, unknown>][] = [
      ['packages', { packages: 0 }],
      ['packages', { packages: 2.5 }],
      ['packages', { packages: '42' }],
      ['grossWeightKg', { grossWeightKg: -1 }],
      ['grossWeightKg', { grossWeightKg: Number.NaN }],
      ['shipDate', { shipDate: '2026-02-30' }],
      ['batchNumber', { batchNumber: 7 }],
      ['notes', { notes: { text: 'x' } }],
      ['packingListName', { packingListName: 1 }],
      ['lotNumbers', { lotNumbers: 'LOT-1' }],
      ['lotNumbers', { lotNumbers: ['LOT-1', 2] }],
    ];
    it.each(cases)('%s — %j', async (field, extra) => {
      expect((await confirmShort()).status).toBe('done');
      const before = asnStore.all().length;
      const res = await createAsn({ poReference: PO_NUMBER, ...extra });
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.ASN_DETAILS_WELL_FORMED)).toBe(true);
      expect(res.reason).toContain(`ASN_DETAILS_INVALID: ${field} `);
      // Refused means no notice was made.
      expect(asnStore.all().length).toBe(before);
    });
  });

  it('the parent-order rule is still read first: an unconfirmed order takes no notice', async () => {
    const res = await createAsn({ poReference: PO_NUMBER, packages: 0 });
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.ASN_CREATE_PO_CONFIRMED)).toBe(true);
  });

  it('another supplier cannot draft a notice on this order, whatever it types', async () => {
    expect((await confirmShort()).status).toBe('done');
    const before = asnStore.all().length;
    await expect(createAsn({ poReference: PO_NUMBER, packages: 3 }, 'sup-007')).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
    expect(asnStore.all().length).toBe(before);
  });
});

describe('OPS-3 · readAsnTypedDetails — judged and stored by one reader', () => {
  it('absent everywhere reads as an empty set of details', () => {
    expect(readAsnTypedDetails({ poReference: 'X' })).toEqual({ ok: true, details: {} });
  });
  it('blank text is "not given", not a stored blank', () => {
    expect(readAsnTypedDetails({ batchNumber: '   ', notes: '', shipDate: '' })).toEqual({
      ok: true,
      details: {},
    });
  });
  it('names the FIRST field it cannot store', () => {
    expect(readAsnTypedDetails({ packages: -1, grossWeightKg: -1 })).toEqual({
      ok: false,
      field: 'packages',
    });
  });
});

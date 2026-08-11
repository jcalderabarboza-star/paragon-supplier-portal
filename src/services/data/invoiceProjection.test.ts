// ────────────────────────────────────────────────────────────────────────────
// DR-7 projection proof (v2.2 Step 4 batch iii).
//
// One canonical invoice, two persona projections. These tests pin the payoff:
// the SAME document is labelled truthfully-but-differently on each surface, the
// two can never contradict (they derive from one source), Overdue is computed
// from the clock (never stored), and the SAP interim makes no "paid" claim to
// the supplier before settlement.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { Invoice } from './types';
import {
  toSupplierLabel,
  toBuyerLabel,
  toSupplierInvoice,
  toBuyerInvoice,
  isOverdue,
  daysOutstanding,
} from './invoiceProjection';

const NOW = '2026-07-06T00:00:00.000Z';

function inv(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv-x', invoiceNumber: 'INV-X', supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia', poNumber: 'PO-1', poId: 'po-1',
    amount: 100_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-01', dueDate: '2026-08-01', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null, bankAccount: 'BCA 1',
    channel: 'Web', approver: 'Procurement Officer', paymentTerms: 'Net 30',
    buyerContact: 'Procurement Officer', remittanceNote: null,
    ...overrides,
  };
}

describe('invoice projection — one document, two truthful views', () => {
  it('Submitted → supplier "Pending Approval" AND buyer "Pending Match"', () => {
    const i = inv({ status: 'Submitted' });
    expect(toSupplierLabel(i, NOW)).toBe('Pending Approval');
    expect(toBuyerLabel(i, NOW)).toBe('Pending Match');
  });

  it('advances coherently on both surfaces — no drift possible', () => {
    expect(toSupplierLabel(inv({ status: 'Approved' }), NOW)).toBe('Approved');
    expect(toBuyerLabel(inv({ status: 'Approved' }), NOW)).toBe('Approved');

    // Releasing Payment: buyer sees "Payment Released" (they released it) but the
    // supplier still sees "Approved" — NO paid claim before settlement.
    const releasing = inv({ status: 'Releasing Payment' });
    expect(toSupplierLabel(releasing, NOW)).toBe('Approved');
    expect(toBuyerLabel(releasing, NOW)).toBe('Payment Released');

    // Settled: both agree on Payment Released.
    const paid = inv({ status: 'Payment Released', paymentDate: '2026-05-01' });
    expect(toSupplierLabel(paid, NOW)).toBe('Payment Released');
    expect(toBuyerLabel(paid, NOW)).toBe('Payment Released');
  });

  it('Disputed shows on both surfaces regardless of the clock', () => {
    const d = inv({ status: 'Disputed', dueDate: '2026-01-01' });
    expect(toSupplierLabel(d, NOW)).toBe('Disputed');
    expect(toBuyerLabel(d, NOW)).toBe('Disputed');
  });

  it('Overdue is computed from the clock — never stored — for open invoices', () => {
    const past = inv({ status: 'Approved', dueDate: '2026-06-04' });
    expect(isOverdue(past, NOW)).toBe(true);
    expect(daysOutstanding(past, NOW)).toBe(32);
    expect(toSupplierLabel(past, NOW)).toBe('Overdue');
    expect(toBuyerLabel(past, NOW)).toBe('Overdue');

    // A paid invoice past its due date is NOT overdue (settled, not open).
    const paidPast = inv({ status: 'Payment Released', dueDate: '2026-01-01' });
    expect(isOverdue(paidPast, NOW)).toBe(false);
    expect(toBuyerLabel(paidPast, NOW)).toBe('Payment Released');
  });

  it('projects the full persona view shapes off one canonical row', () => {
    const i = inv({ status: 'Approved', dueDate: '2026-06-04', matchStatus: 'Matched' });
    const s = toSupplierInvoice(i, NOW);
    const b = toBuyerInvoice(i, NOW);
    expect(s.invoiceNumber).toBe(b.invoiceNumber); // same document
    expect(s.status).toBe('Overdue');
    expect(b.status).toBe('Overdue');
    expect(b.matchStatus).toBe('Matched'); // buyer-only match axis surfaced
    expect(b.daysOutstanding).toBe(32);
    expect(b.receivedDate).toBe(i.submittedDate); // buyer label for the submit event
  });
});

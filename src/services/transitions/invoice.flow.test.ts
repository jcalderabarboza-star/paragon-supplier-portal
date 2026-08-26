import { describe, it, expect } from 'vitest';

import { getFlow, getTransition } from './index';
import { rolesForPersona, personaCan } from './roles';
import { SYSTEM_ROLES } from './businessRoles';
import { isMatched } from './invoiceRollup';
import type { Invoice } from '../data/types';

const baseInvoice = (matchStatus: Invoice['matchStatus']): Invoice => ({
  id: 'inv-x', invoiceNumber: 'INV-X', supplierId: 'sup-007',
  supplierName: 'S', poNumber: 'PO-1', poId: 'po-1', amount: 1, currency: 'IDR',
  status: 'Submitted', matchStatus, submittedDate: '2026-06-01', dueDate: '2026-08-01',
  paymentDate: null, paymentRef: null, sapFiDoc: null, sapGrDoc: null,
  bankAccount: 'b', channel: 'Web', approver: 'a', paymentTerms: 'Net 30',
  buyerContact: 'c', remittanceNote: null,
});

describe('Invoice flows — registration + shape (Step 4 batch iii, DR-7)', () => {
  it('registers ONE canonical invoice machine (Draft → … → Remittance Received)', () => {
    const inv = getFlow('invoice');
    expect(inv?.initial).toBe('Draft');
    expect(inv?.states).toEqual([
      'Draft', 'Submitted', 'Matched', 'Approved',
      'Releasing Payment', 'Payment Released', 'Remittance Received', 'Disputed',
    ]);
    // Overdue is a projection, never a state (DR-8 / law 0.5).
    expect(inv?.states).not.toContain('Overdue');
    expect(inv?.states).not.toContain('Pending Match');
  });

  it('t_invoice_create is the canonical creation verb (parent-PO scoped)', () => {
    const t = getTransition('t_invoice_create')!;
    expect(t.trigger).toBe('creation');
    expect(t.from).toEqual([]);
    expect(t.requiredFields).toEqual(['poReference']);
    expect(t.policyHooks).toContain('invoice_create_po_confirmed');
  });

  it('t_invoice_match carries the rollup hook (header derived, not asserted)', () => {
    const t = getTransition('t_invoice_match')!;
    expect(t.from).toEqual(['Submitted']);
    expect(t.to).toBe('Matched');
    expect(t.policyHooks).toContain('invoice_rollup_matched');
  });

  it('t_invoice_release_payment is the sapBoundary verb → interim Releasing Payment', () => {
    const t = getTransition('t_invoice_release_payment')!;
    expect(t.sapBoundary).toBe(true);
    expect(t.from).toEqual(['Approved']);
    expect(t.to).toBe('Releasing Payment');
  });

  it('dispute/resolve pair is wired', () => {
    expect(getTransition('t_invoice_dispute')?.to).toBe('Disputed');
    expect(getTransition('t_invoice_dispute')?.requiredFields).toEqual(['disputeReason']);
    expect(getTransition('t_invoice_resolve')?.from).toEqual(['Disputed']);
  });

  it('registers the match sub-flow (census G2) orthogonal to the lifecycle', () => {
    const m = getFlow('invoiceMatch');
    expect(m?.initial).toBe('Pending');
    expect(m?.states).toContain('Qty Mismatch');
    expect(m?.states).toContain('Price Variance');
  });

  it('personas map to their verbs: supplier submits, buyer approves/pays', () => {
    expect(personaCan('supplier', 'invoice:submit')).toBe(true);
    expect(personaCan('supplier', 'invoice:pay')).toBe(false);
    // ⚠️ `invoice:match` LEFT THE PERSONA AT THE ROLE SPLIT. The three-way match
    // is `system` + `surfaced: false / computed` — the platform derives the
    // verdict, nobody clicks it — so it belongs to the automation grant, not to
    // finance. The three a person actually holds stay, and they are FINANCE's:
    // procurement does not release payment (operator ruling).
    expect(rolesForPersona('buyer')).toEqual(
      expect.arrayContaining(['invoice:approve', 'invoice:pay', 'invoice:dispute']),
    );
    expect(rolesForPersona('buyer')).not.toContain('invoice:match');
    expect(SYSTEM_ROLES.finance).toEqual(
      expect.arrayContaining(['invoice:pay', 'invoice:approve', 'invoice:dispute']),
    );
    expect(SYSTEM_ROLES.procurement).not.toContain('invoice:pay');
  });

  it('the match rollup predicate gates on a clean Matched', () => {
    expect(isMatched(baseInvoice('Matched'))).toBe(true);
    expect(isMatched(baseInvoice('Qty Mismatch'))).toBe(false);
    expect(isMatched(baseInvoice('Pending GR'))).toBe(false);
  });
});

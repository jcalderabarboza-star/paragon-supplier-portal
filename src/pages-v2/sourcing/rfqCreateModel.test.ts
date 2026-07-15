import { describe, it, expect } from 'vitest';
import { buildRfqCreatePayload, type RfqCreateDraft } from './rfqCreateModel';

// ────────────────────────────────────────────────────────────────────────────
// rfqCreateModel (Phase A/2 · sourcing spine) — the PURE draft→payload mapping
// behind the RFQ-create dispatch that RETIRES the `extraRfqs` client-fabrication.
// The wizard collects strings; the t_rfq_create payload carries the coerced
// values the dispatcher validates + the store mints. This is the ONE place the
// trim + Number coercions live, so they are tested here rather than inline.
// ────────────────────────────────────────────────────────────────────────────

const draft: RfqCreateDraft = {
  title: '  Q3 Emulsifier Sourcing  ',
  category: 'Emulsifiers',
  materials: ['EM-CETE-2201'],
  totalQty: '3000',
  uom: 'KG',
  budget: '850000000',
  responseDeadline: '2026-09-10',
  awardDeadline: '2026-09-20',
  incoterms: 'CIF Jakarta',
  paymentTerms: 'Net 45',
  invitedSupplierIds: ['sup-002', 'sup-005'],
};

describe('buildRfqCreatePayload — the draft becomes a t_rfq_create payload', () => {
  it('maps the required fields the dispatcher validates (title trimmed, materialCategory)', () => {
    const payload = buildRfqCreatePayload(draft);
    expect(payload.title).toBe('Q3 Emulsifier Sourcing'); // trimmed
    expect(payload.materialCategory).toBe('Emulsifiers');
  });

  it('coerces the string number fields the wizard collects', () => {
    const payload = buildRfqCreatePayload(draft);
    expect(payload.totalQty).toBe(3000); // number, not "3000"
    expect(payload.estimatedValue).toBe(850_000_000);
  });

  it('defaults an empty budget to 0 (honest, never NaN)', () => {
    const payload = buildRfqCreatePayload({ ...draft, budget: '' });
    expect(payload.estimatedValue).toBe(0);
    expect(Number.isNaN(payload.estimatedValue)).toBe(false);
  });

  it('carries the arrays + terms through verbatim', () => {
    const payload = buildRfqCreatePayload(draft);
    expect(payload.materialIds).toEqual(['EM-CETE-2201']);
    expect(payload.invitedSupplierIds).toEqual(['sup-002', 'sup-005']);
    expect(payload.uom).toBe('KG');
    expect(payload.incoterms).toBe('CIF Jakarta');
    expect(payload.paymentTerms).toBe('Net 45');
    expect(payload.responseDeadline).toBe('2026-09-10');
    expect(payload.awardDeadline).toBe('2026-09-20');
  });

  it('never carries a client-fabricated id or number (the retired extraRfqs anti-pattern)', () => {
    const payload = buildRfqCreatePayload(draft);
    // The number + id are STORE-assigned on create — the payload must not smuggle
    // a fabricated `rfq-new-…` id or an `RFQ-…` number the way submitWizard did.
    expect('id' in payload).toBe(false);
    expect('rfqNumber' in payload).toBe(false);
    expect('status' in payload).toBe(false);
  });
});

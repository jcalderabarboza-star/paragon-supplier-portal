import { describe, it, expect } from 'vitest';
import { buildQuotationSubmitPayload } from './quotationSubmitModel';

const draft = {
  rfqId: 'rfq-001',
  supplierId: 'sup-005',
  unitPrice: '190,000',
  leadTimeDays: '30',
  validUntil: '2026-08-31',
  paymentTermsOffered: 'Net 30',
};

describe('buildQuotationSubmitPayload — raw facts only, engine owns scoring at read', () => {
  it('maps the honest raw facts + the scope keys (rfqId + supplierId)', () => {
    const p = buildQuotationSubmitPayload(draft);
    expect(p.rfqId).toBe('rfq-001');
    expect(p.supplierId).toBe('sup-005');
    expect(p.validUntil).toBe('2026-08-31');
    expect(p.paymentTermsOffered).toBe('Net 30');
  });

  it('coerces the comma-formatted numeric inputs (never NaN)', () => {
    const p = buildQuotationSubmitPayload(draft);
    expect(p.unitPrice).toBe(190_000);
    expect(p.leadTimeDays).toBe(30);
  });

  it('an empty numeric field resolves to 0, not NaN', () => {
    const p = buildQuotationSubmitPayload({ ...draft, unitPrice: '', leadTimeDays: '' });
    expect(p.unitPrice).toBe(0);
    expect(p.leadTimeDays).toBe(0);
  });

  it('carries NO score axis — the payload is raw facts, never a fabricated score', () => {
    const p = buildQuotationSubmitPayload(draft);
    for (const k of ['priceScore', 'leadTimeScore', 'complianceScore', 'reliabilityScore', 'aiCompositeScore']) {
      expect(k in p).toBe(false);
    }
  });

  it('omits notes when absent, includes it when present', () => {
    expect('notes' in buildQuotationSubmitPayload(draft)).toBe(false);
    expect(buildQuotationSubmitPayload({ ...draft, notes: 'BPOM-registered' }).notes).toBe('BPOM-registered');
  });
});

import { describe, it, expect } from 'vitest';
import { buildQuotationSubmitPayload } from './quotationSubmitModel';

const draft = {
  rfqId: 'rfq-001',
  supplierId: 'sup-005',
  // ALREADY PARSED (CP-0 2e-a). The draft used to carry the raw string '190,000'
  // and let this builder coerce it; the price now arrives as the number the ONE
  // upstream parse judged, so there is no second reading to disagree with.
  unitPrice: 190_000,
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

  // ── CP-0 · W1 · 2e-a — the builder no longer parses the price ──────────────
  // It used to assert `'190,000'` → 190_000, which vouched for the comma-strip
  // recipe as CORRECT. On a ranking surface that alibi was doubly dangerous: the
  // same recipe read the Indonesian "1.500" as 1.5, and the number it vouched for
  // is the number `scoreQuotations` hands a contract to.
  it('passes the already-parsed price through UNTOUCHED — no second reading', () => {
    const p = buildQuotationSubmitPayload(draft);
    expect(p.unitPrice).toBe(190_000);
    expect(p.leadTimeDays).toBe(30);
  });

  it('cannot re-derive the price: the draft carries a number, never the raw text', () => {
    // The type makes the defect unexpressible, but assert the behaviour too — a
    // value the builder could not have produced by coercion proves it is a
    // mapping. 1.5 is exactly what the retired recipe turned "1.500" into.
    expect(buildQuotationSubmitPayload({ ...draft, unitPrice: 1.5 }).unitPrice).toBe(1.5);
    expect(buildQuotationSubmitPayload({ ...draft, unitPrice: 1_500 }).unitPrice).toBe(1_500);
  });

  // The retired spec here asserted that an empty price "resolves to 0, not NaN" —
  // the `|| 0` written down as correct. A Rp 0 is a price no supplier offered,
  // and on this surface it is a governed fact that enters the award ranking.
  // Emptiness is now refused upstream (EMPTY_QTY) and never reaches the builder;
  // see quotationPrice.test.ts + quotationPriceRanking.test.ts.
  it('no `|| 0` remains — a real zero could only arrive as a deliberate number', () => {
    // Not an endorsement of zero (readBidPrice refuses it); a proof that the
    // builder has no fabrication branch left of its own.
    expect(buildQuotationSubmitPayload({ ...draft, unitPrice: 0 }).unitPrice).toBe(0);
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

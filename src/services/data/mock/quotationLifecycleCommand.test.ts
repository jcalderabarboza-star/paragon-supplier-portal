// ────────────────────────────────────────────────────────────────────────────
// Quotation lifecycle command integration (Task 3b — the last sourcing-spine
// piece). t_quotation_submit (supplier creation) + t_quotation_review (buyer)
// dispatched through the REAL MockCommandService + real quotationStore/rfqStore,
// scored back through the REAL engine (scoreQuotations). Honest proof that:
//   • submit is the ONE supplier-owned creation verb — creationOwner folds
//     invited-membership + scope into one ASN-faithful statement (payload
//     supplier valid only if ∈ the RFQ's invitedSupplierIds); non-invited →
//     SCOPE_DENIED, buyer → ROLE_NOT_PERMITTED, hollow → MISSING_FIELDS;
//   • submit persists RAW FACTS only (no stored/fabricated derived scores) —
//     the engine owns scoring AT READ (F0.3-FIND-01 / #78);
//   • compliance + reliability seed from a documented SIMULATED baseline, never
//     a lying zero;
//   • review advances a freshly-submitted quote Submitted → Under Review (the
//     from:['Submitted'] target now has a legal source — the old block is gone).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { quotationStore } from './stores/quotationStore';
import { rfqStore } from './stores/rfqStore';
import { scoreQuotations } from '../../../lib/quoteScore';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
// rfq-001 invited sup-005/006/009/011; sup-001 is invited to rfq-003, NOT rfq-001.
const invited: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };
const notInvited: QueryScope = { personaType: 'supplier', supplierId: 'sup-001' };

const svc = new MockCommandService();

const submit = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_quotation_submit',
  entity: 'quotation',
  payload: {
    rfqId: 'rfq-001',
    supplierId: 'sup-005',
    unitPrice: 190_000,
    leadTimeDays: 30,
    paymentTermsOffered: 'Net 30',
    validUntil: '2026-08-31',
    ...overrides,
  },
});

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});

describe('t_quotation_submit — supplier-owned creation (ASN-faithful scope)', () => {
  it('an invited supplier submits → Submitted, store-assigned number, raw facts persisted', async () => {
    const res = await svc.dispatch(invited, submit());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^QUO-2026-9\d+$/);
    const q = quotationStore.get(res.entityId!)!;
    expect(q.status).toBe('Submitted');
    expect(q.rfqId).toBe('rfq-001');
    expect(q.supplierId).toBe('sup-005');
    expect(q.unitPrice).toBe(190_000);
    expect(q.leadTimeDays).toBe(30);
    expect(q.paymentTermsOffered).toBe('Net 30');
    expect(q.validUntil).toBe('2026-08-31');
    // The number doubles as the id (the GR/invoice/PR/RFQ convention).
    expect(q.id).toBe(res.entityId);
  });

  it('a NON-invited supplier is denied (SCOPE_DENIED) — membership folds into creationOwner', async () => {
    const before = quotationStore.all().length;
    // sup-001 is a real supplier, invited to rfq-003 but NOT rfq-001.
    await expect(
      svc.dispatch(notInvited, submit({ supplierId: 'sup-001' })),
    ).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(notInvited, submit({ supplierId: 'sup-001' }));
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
    expect(quotationStore.all().length).toBe(before); // nothing minted
  });

  it('a supplier cannot submit AS another supplier (owner ≠ scope → SCOPE_DENIED)', async () => {
    // sup-006 IS invited to rfq-001, but the caller is sup-005 — spoof rejected.
    await expect(
      svc.dispatch(invited, submit({ supplierId: 'sup-006' })),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a buyer is denied — submit is a supplier verb (ROLE_NOT_PERMITTED, past scope)', async () => {
    const res = await svc.dispatch(buyer, submit());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:quotation:submit/);
  });

  // ── CP-0 · W1 · 2e-b-1 — leadTimeDays LEFT the required floor ──────────────
  // This spec looped over ['unitPrice', 'leadTimeDays'] and asserted BOTH were
  // mandatory. That was the contract-level half of the defect: requiring a lead
  // time meant a supplier who did not have one had to put *something* in the
  // box, and the input path turned anything unreadable into `|| 0` — which, on
  // the absolute axis, is the best possible lead-time score. The floor is now
  // the one fact without which there is no offer.
  it('unitPrice is the required floor — a hollow quote fails, mints nothing', async () => {
    const before = quotationStore.all().length;
    const payload = { ...submit().payload };
    delete (payload as Record<string, unknown>).unitPrice;
    const res = await svc.dispatch(invited, { ...submit(), payload });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:.*unitPrice/);
    expect(quotationStore.all().length).toBe(before);
  });

  it('POSITIVE TWIN — a quote with NO lead time is legal, and stores an absence', async () => {
    const payload = { ...submit().payload };
    delete (payload as Record<string, unknown>).leadTimeDays;
    const res = await svc.dispatch(invited, { ...submit(), payload });
    expect(res.status).toBe('done');
    const q = quotationStore.get(res.entityId!)!;
    // THE LOCK: absence, not a 0 — `num()` would have minted a same-day promise.
    expect(q.leadTimeDays).toBeUndefined();
    expect('leadTimeDays' in q).toBe(false);
  });

  it('a missing rfqId cannot establish invited-membership → SCOPE_DENIED (scope gate precedes fields)', async () => {
    const before = quotationStore.all().length;
    const payload = { ...submit().payload };
    delete (payload as Record<string, unknown>).rfqId;
    // Without an RFQ there is no roster to prove membership against; the scope
    // gate (first, by design) denies before field-validation is even reached.
    await expect(
      svc.dispatch(invited, { ...submit(), payload }),
    ).rejects.toBeInstanceOf(DataError);
    expect(quotationStore.all().length).toBe(before);
  });
});

describe('t_quotation_submit — honest-by-construction scores (score-at-READ)', () => {
  it('persists NO fabricated derived scores — derived fields are sentinel', async () => {
    const res = await svc.dispatch(invited, submit());
    const q = quotationStore.get(res.entityId!)!;
    // Derived axes are engine-owned at READ; storing them would re-fabricate.
    expect(q.priceScore).toBe(0);
    expect(q.leadTimeScore).toBe(0);
    expect(q.aiCompositeScore).toBe(0);
    expect(q.aiRecommended).toBe(false);
  });

  it('seeds compliance + reliability from a SIMULATED baseline — never a lying zero', async () => {
    const res = await svc.dispatch(invited, submit());
    const q = quotationStore.get(res.entityId!)!;
    expect(q.complianceScore).toBeGreaterThan(0);
    expect(q.reliabilityScore).toBeGreaterThan(0);
  });

  it('the submitted quote scores LIVE via the real engine at read (price computed, not stored)', async () => {
    const res = await svc.dispatch(invited, submit({ unitPrice: 150_000 })); // cheapest on rfq-001
    const set = quotationStore
      .forRfq('rfq-001')
      .map((q) => ({
        id: q.id,
        unitPrice: q.unitPrice,
        leadTimeDays: q.leadTimeDays,
        complianceScore: q.complianceScore,
        reliabilityScore: q.reliabilityScore,
      }));
    const scored = scoreQuotations(set);
    const mine = scored.find((s) => s.quoteId === res.entityId)!;
    // Cheapest → priceScore anchors 100 (LIVE ratio-to-best), computed at read
    // even though the STORED priceScore is the 0 sentinel.
    expect(mine.priceScore).toBe(100);
    expect(mine.compositeLiveness).toBe('simulated'); // weakest-link honest marker
  });
});

describe('t_quotation_review — buyer moves a submitted quote into evaluation', () => {
  it('a freshly-submitted quote advances Submitted → Under Review (the block is gone)', async () => {
    const created = await svc.dispatch(invited, submit());
    const id = created.entityId!;
    expect(quotationStore.get(id)!.status).toBe('Submitted');
    const res = await svc.dispatch(buyer, {
      transitionId: 't_quotation_review',
      entity: 'quotation',
      entityId: id,
    });
    expect(res.status).toBe('done');
    expect(quotationStore.get(id)!.status).toBe('Under Review');
  });

  it('a supplier cannot review its own quote — review is a buyer verb (ROLE_NOT_PERMITTED)', async () => {
    const created = await svc.dispatch(invited, submit());
    const res = await svc.dispatch(invited, {
      transitionId: 't_quotation_review',
      entity: 'quotation',
      entityId: created.entityId!,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:quotation:review/);
  });

  it('rejects review from an illegal state (an Awarded quote) — ILLEGAL_TRANSITION', async () => {
    // qt-006a is Awarded in the fixture.
    const res = await svc.dispatch(buyer, {
      transitionId: 't_quotation_review',
      entity: 'quotation',
      entityId: 'qt-006a',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ILLEGAL_TRANSITION/);
  });
});

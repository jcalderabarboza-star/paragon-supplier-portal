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
import { BASE_CURRENCY, BID_CURRENCIES } from '../../../lib/currencyPolicy';
import { rfqStore } from './stores/rfqStore';
import { scoreQuotations } from '../../../lib/quoteScore';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
// rfq-001 invited sup-005/006/009/011; sup-001 is invited to rfq-003, NOT rfq-001.
const invited: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const notInvited: QueryScope = { personaType: 'supplier', supplierId: 'sup-001', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const svc = new MockCommandService();

const submit = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_quotation_submit',
  entity: 'quotation',
  payload: {
    rfqId: 'rfq-001',
    supplierId: 'sup-005',
    unitPrice: 190_000,
    // REQUIRED since 2e-c-2 — a price without a currency no longer mints.
    // Overridable, so the refusal cases below can hand it a bad one.
    currency: 'IDR',
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

  // ── CP-0 · W1 · 2e-b-1a — leadTimeDays is BACK on the required floor ───────
  // 2e-b-1 briefly narrowed this spec to unitPrice alone and added a positive
  // twin asserting that "a quote with NO lead time is legal, and stores an
  // absence". Both are reversed here, DELIBERATELY and not as a bug fix: JJ
  // ruled that a price with no delivery promise is an INCOMPLETE bid, so the
  // floor is the two facts that make an offer comparable. The concern that
  // originally motivated the removal — that requiring it pushed suppliers to
  // put *something* in the box, which `|| 0` turned into a same-day promise —
  // is answered at the input gate instead, which now refuses rather than
  // defaults.
  it('unitPrice / leadTimeDays are the required LIVE-scored floor — a hollow quote fails, mints nothing', async () => {
    for (const field of ['unitPrice', 'leadTimeDays']) {
      const before = quotationStore.all().length;
      const payload = { ...submit().payload };
      delete (payload as Record<string, unknown>)[field];
      const res = await svc.dispatch(invited, { ...submit(), payload });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(new RegExp(`MISSING_FIELDS:.*${field}`));
      expect(quotationStore.all().length).toBe(before);
    }
  });

  it('THE LOCK — a lead-time-less quote is refused, NOT minted with a fabricated 0', async () => {
    // The distinction that matters on an absolute axis: 0 days is the BEST
    // score. "Rejected for an incomplete bid" and "minted as a same-day
    // promise" are opposite outcomes, and `num()`'s fallback would produce the
    // second if the field gate ever stopped producing the first.
    const payload = { ...submit().payload };
    delete (payload as Record<string, unknown>).leadTimeDays;
    const res = await svc.dispatch(invited, { ...submit(), payload });
    expect(res.status).toBe('failed');
    expect(quotationStore.all().every((q) => q.leadTimeDays > 0 || q.leadTimeDays === 0)).toBe(true);
    expect(quotationStore.all().some((q) => q.leadTimeDays === undefined)).toBe(false);
  });

  it('POSITIVE TWIN — the same quote WITH a lead time mints, and stores it', async () => {
    const res = await svc.dispatch(invited, submit({ leadTimeDays: 12 }));
    expect(res.status).toBe('done');
    expect(quotationStore.get(res.entityId!)!.leadTimeDays).toBe(12);
  });

  // ── CP-0 · W1 · 2e-b-2 — the minimum order quantity survives the spine ─────
  // The read-side proof that FIND-02 is closed END TO END: `readMoq` →
  // `buildQuotationSubmitPayload` → the REAL dispatcher → the REAL store. A
  // value that is preserved by the builder but dropped by `create` is still
  // dropped, and the create path is exactly where a `num()` fallback would have
  // reintroduced a fabricated zero.
  it('THE LOCK — a stated minimum order quantity is persisted on the minted quote', async () => {
    const res = await svc.dispatch(invited, submit({ moq: 100_000 }));
    expect(res.status).toBe('done');
    expect(quotationStore.get(res.entityId!)!.moq).toBe(100_000);
  });

  it('an omitted minimum stays ABSENT on the entity — never minted as a 0', async () => {
    // `create` reads this field with a `typeof === 'number'` test rather than
    // the `num()` helper, whose 0 fallback would turn "the supplier stated no
    // minimum" into "the supplier's minimum is zero" — a commercial term
    // attributed to someone who never offered it.
    const res = await svc.dispatch(invited, submit());
    const q = quotationStore.get(res.entityId!)!;
    expect(q.moq).toBeUndefined();
    expect(q.moq === 0).toBe(false);
  });

  it('the minimum is NOT a required field — a quote without one still mints', async () => {
    // Blank is the field's documented default ("same as the RFQ qty"), so it
    // must never join the required floor the way `leadTimeDays` did.
    const res = await svc.dispatch(invited, submit());
    expect(res.status).toBe('done');
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
        // The boundary resolves "absent means rupiah" (2e-c-3).
        currency: q.currency ?? BASE_CURRENCY,
        leadTimeDays: q.leadTimeDays,
        complianceScore: q.complianceScore,
        reliabilityScore: q.reliabilityScore,
      }));
    const outcome = scoreQuotations(set);
    // A single-currency set is ranked without any pin (the homogeneous-set
    // exemption) — if this ever refuses, the fixture stopped being homogeneous.
    if (outcome.kind !== 'scored') throw new Error(`expected scored, got ${outcome.reason}`);
    const mine = outcome.scores.find((s) => s.quoteId === res.entityId)!;
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

// ── CP-0 · 2e-c-2 — the currency SURVIVES SUBMIT ─────────────────────────────
//
// The form has offered a currency selector since before the command spine
// existed, and the builder was never given it. So a supplier who chose EUR and
// typed 3.00 had a quotation minted at 3 — with no currency at all, which every
// reader then resolves as rupiah. The bid was not merely dropped: it was
// RESTATED as a different amount of money, and then scored, ranked and awarded
// against rivals in that false denomination.
//
// Two guards, deliberately distinct. `requiredFields` proves the field is THERE.
// The policy hook proves what is IN it. Neither substitutes for the other: a
// present-but-arbitrary token clears the first and is caught by the second.
describe('t_quotation_submit — the bid currency is a fact, not a decoration', () => {
  it('THE LOCK — an EUR submit mints an EUR quotation', async () => {
    const res = await svc.dispatch(invited, submit({ currency: 'EUR', unitPrice: 3 }));
    expect(res.status).not.toBe('failed');
    const minted = quotationStore.get(res.entityId!)!;
    // The whole batch in one assertion: 3 EUR in, 3 EUR stored.
    expect(minted.currency).toBe('EUR');
    expect(minted.unitPrice).toBe(3);
  });

  it('the currency the supplier chose is the currency stored — for each permitted one', async () => {
    for (const currency of BID_CURRENCIES) {
      const res = await svc.dispatch(invited, submit({ currency }));
      expect(quotationStore.get(res.entityId!)!.currency).toBe(currency);
    }
  });

  it('a submit with NO currency is REFUSED — never defaulted to rupiah', async () => {
    // The precise regression: defaulting is what made every foreign bid domestic.
    // A missing currency must fail loudly rather than resolve to the base one.
    const { currency: _dropped, ...noCurrency } = submit().payload;
    const res = await svc.dispatch(invited, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: noCurrency,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
    expect(res.reason).toContain('currency');
  });

  it('an empty-string currency is refused by the FIELD gate, not smuggled to the policy', async () => {
    const res = await svc.dispatch(invited, submit({ currency: '' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
  });

  it.each([
    ['CNY', 'a real currency that is simply not permitted'],
    ['usd', 'the right currency in the wrong case'],
    ['Rp', 'a symbol rather than an ISO code'],
    ['GOLD', 'not a currency at all'],
  ])('REFUSES an off-list token BY NAME: %s (%s)', async (currency) => {
    const res = await svc.dispatch(invited, submit({ currency }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('POLICY_REJECTED:quotation_submit_currency_permitted');
    // BY NAME, both halves: the token that was rejected...
    expect(res.reason).toContain(`'${currency}'`);
    // ...and the set that would have been accepted. A refusal that names
    // neither leaves a supplier guessing at what to type next.
    expect(res.reason).toContain('IDR, USD, EUR');
  });

  it('a refused currency mints NOTHING — the refusal is not a partial write', async () => {
    const before = quotationStore.all().length;
    const res = await svc.dispatch(invited, submit({ currency: 'CNY' }));
    expect(res.status).toBe('failed');
    expect(res.entityId).toBeUndefined();
    expect(quotationStore.all()).toHaveLength(before);
  });

  it('NOT COERCED — an off-list currency never quietly becomes the base currency', async () => {
    // The tempting "helpful" behaviour, refused explicitly: coercing CNY to IDR
    // would store a bid the supplier never made, which is the exact class of
    // defect this batch closes. Nothing may exist afterwards carrying IDR.
    const res = await svc.dispatch(invited, submit({ currency: 'CNY' }));
    expect(res.status).toBe('failed');
    expect(quotationStore.all().some((q) => q.id === res.entityId)).toBe(false);
  });
});

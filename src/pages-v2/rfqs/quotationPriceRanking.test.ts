// ════════════════════════════════════════════════════════════════════════════
// CP-0 · W1 · 2e-a — BLAST-RADIUS LOCK: a refused price never reaches the
// award ranking.
//
// This is the sharpest path in the series. A quotation's `unitPrice` is not
// merely recorded — `scoreQuotations` (lib/quoteScore.ts) anchors `minPrice`
// across the WHOLE RFQ set, so one misread price does not mis-score itself, it
// re-scores every rival against a price nobody offered. The false-deficit chain
// accuses a supplier; this one hands a contract to the wrong one.
//
// So the lock runs the REAL governed path end to end — readBidPrice →
// buildQuotationSubmitPayload → the real dispatcher → the real quotation store →
// the real scoring engine — and asserts BOTH directions:
//
//   · a refused price mints NO quotation and leaves every rival's score
//     byte-identical (the negation), and
//   · a clean price still mints, still ranks, and still wins when it deserves to
//     (the positive twin — the fix must not have simply disabled ranking).
//
// Plus the counterfactual that makes the lock load-bearing rather than
// decorative: the value the RETIRED parser produced, submitted, DOES hijack the
// award. If that ever stops being true, this lock is guarding nothing and should
// be re-read, not deleted.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { scoreQuotations, type ScorableQuote } from '../../lib/quoteScore';
import { BASE_CURRENCY } from '../../lib/currencyPolicy';

/** Unwrap a scored outcome (2e-c-3). These specs all concern a single-currency
 *  set, which the engine ranks without any pin — so a refusal here means the
 *  spec's premise broke, and it says so by name rather than reading `undefined`
 *  off something that is no longer an array. */
const scoredSet = (quotes: readonly ScorableQuote[]) => {
  const out = scoreQuotations(quotes);
  if (out.kind !== 'scored') throw new Error(`expected scored, got ${out.reason}`);
  return out.scores;
};

import type { QueryScope } from '../../services/data/types';
import { readBidPrice } from './quotationPrice';
import { buildQuotationSubmitPayload } from './quotationSubmitModel';

// rfq-002 — PET bottles. Real fixture bids: sup-007 @ 1,280 and sup-008 @ 1,220.
// A supplier typing the ordinary Indonesian "1.500" means Rp 1.500 — mid-market,
// and it should LOSE on price to the 1,220 incumbent.
const RFQ_ID = 'rfq-002';
const invited: QueryScope = { personaType: 'supplier', supplierId: 'sup-012' };

const svc = new MockCommandService();

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});

/** The RFQ's quote set exactly as the buyer's comparison drawer reads it. */
const scorableSet = (): ScorableQuote[] =>
  quotationStore.forRfq(RFQ_ID).map((q) => ({
    id: q.id,
    unitPrice: q.unitPrice,
    // The comparison drawer resolves "absent means rupiah" at the boundary
    // (2e-c-3); the engine requires an explicit currency and never assumes one.
    currency: q.currency ?? BASE_CURRENCY,
    leadTimeDays: q.leadTimeDays,
    complianceScore: q.complianceScore,
    reliabilityScore: q.reliabilityScore,
  }));

const rank = () => scoredSet(scorableSet());

/**
 * The supplier's whole submit path for a TYPED price, as the page runs it: one
 * parse, and a dispatch that only happens if that parse succeeded. Returns null
 * when the price was refused — the refusal IS the absence of a command.
 */
const submitTypedPrice = async (typed: string) => {
  const price = readBidPrice(typed);
  if (!price.ok) return null; // gate blocks — no payload, no dispatch, no fact
  return svc.dispatch(invited, {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: buildQuotationSubmitPayload({
      rfqId: RFQ_ID,
      supplierId: 'sup-012',
      unitPrice: price.value,
      currency: 'IDR', // required since 2e-c-2; the whole set shares it, so ranking stays comparable
      leadTimeDays: '18',
      validUntil: '2026-06-30',
    }),
  });
};

describe('BLAST RADIUS — a refused bid price never enters the award ranking', () => {
  it('the baseline ranking is a real, computed thing (so "unchanged" means something)', () => {
    const scored = rank();
    expect(scored).toHaveLength(2);
    // sup-008 @ 1,220 is the cheapest of the two → anchors priceScore 100.
    const cheapest = scored.find((s) => s.quoteId === 'qt-002b')!;
    expect(cheapest.priceScore).toBe(100);
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.priceScore).toBeGreaterThan(0);
  });

  it('NEGATION — an AMBIGUOUS price mints no quotation and moves no score', async () => {
    const before = rank();
    const beforeCount = quotationStore.forRfq(RFQ_ID).length;

    const res = await submitTypedPrice('1.500');

    expect(res).toBeNull(); // never dispatched
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(beforeCount); // nothing minted
    expect(rank()).toEqual(before); // every rival's score byte-identical
  });

  it('NEGATION — a ZERO price mints no quotation and moves no score', async () => {
    const before = rank();
    const beforeCount = quotationStore.forRfq(RFQ_ID).length;

    const res = await submitTypedPrice('0');

    expect(res).toBeNull();
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(beforeCount);
    expect(rank()).toEqual(before);
    // And no Rp 0 exists anywhere in the set to be ranked against.
    expect(quotationStore.forRfq(RFQ_ID).every((q) => q.unitPrice > 0)).toBe(true);
  });

  it('NEGATION — an unreadable price mints no quotation and moves no score', async () => {
    const before = rank();
    const res = await submitTypedPrice('Rp 1.500');
    expect(res).toBeNull();
    expect(rank()).toEqual(before);
  });

  it('POSITIVE TWIN — a clean price still mints, still ranks, and loses honestly', async () => {
    const res = await submitTypedPrice('1500');

    expect(res).not.toBeNull();
    expect(res!.status).toBe('done');
    const minted = quotationStore.get(res!.entityId!)!;
    expect(minted.unitPrice).toBe(1_500); // the number the supplier meant
    expect(minted.totalPrice).toBe(1_500 * 200_000); // honest arithmetic from it

    const scored = rank();
    expect(scored).toHaveLength(3); // it IS in the ranking — nothing was disabled
    const mine = scored.find((s) => s.quoteId === res!.entityId)!;
    // 1,500 is dearer than the 1,220 incumbent, so it scores BELOW 100 and does
    // not take the award. Ranking still works; it just works on a true price.
    expect(mine.priceScore).toBeLessThan(100);
    expect(scored.find((s) => s.quoteId === 'qt-002b')!.priceScore).toBe(100);
    expect(mine.topRanked).toBe(false);
  });

  it('POSITIVE TWIN — a genuinely cheapest clean price DOES win on price', async () => {
    const res = await submitTypedPrice('1100');
    const scored = rank();
    const mine = scored.find((s) => s.quoteId === res!.entityId)!;
    expect(mine.priceScore).toBe(100); // undercuts 1,220 → anchors, correctly
  });

  it('COUNTERFACTUAL — the retired parser\'s value WOULD have hijacked the award', async () => {
    // What `parseFloat("1.500")` produced, submitted as if it had been gated.
    // This is the bug, reproduced: it is not that 1.5 scores badly, it is that
    // 1.5 becomes the set's `minPrice` and collapses both real bids to ZERO.
    await svc.dispatch(invited, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-012',
        unitPrice: 1.5, // ← the misparse
        currency: 'IDR',
        leadTimeDays: '18',
        validUntil: '2026-06-30',
      }),
    });

    const scored = rank();
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.priceScore).toBe(0);
    expect(scored.find((s) => s.quoteId === 'qt-002b')!.priceScore).toBe(0);
    const hijacker = scored.find((s) => s.priceScore === 100)!;
    expect(hijacker.topRanked).toBe(true); // the wrong supplier wins
    // The gate above is the ONLY thing standing between a typed "1.500" and this.
    expect(readBidPrice('1.500').ok).toBe(false);
  });
});

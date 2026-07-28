// ════════════════════════════════════════════════════════════════════════════
// CP-0 · W1 · 2e-b — BLAST-RADIUS LOCK: an unreadable lead time never becomes a
// scored zero, and a stated MOQ never disappears.
//
// Sibling of quotationPriceRanking.test.ts, on the quote form's other two typed
// numbers. It runs the REAL governed path end to end — readLeadTimeDays/readMoq
// → buildQuotationSubmitPayload → the real dispatcher → the real quotation store
// → the real scoring engine — because the claim under test is about a GOVERNED
// FACT, not about a form.
//
// The lead-time harm is NOT the price harm, and the difference is worth writing
// down. `quoteScore.ts:117` filters non-positive lead times out of `minLead`, and
// `ratioToBest` (`:101`) returns 0 for `value <= 0` — so a fabricated `|| 0` lead
// time cannot pose as instant delivery and steal the award. It does something
// quieter: it scores 0 on a 20%-weighted axis and forfeits a fifth of the
// supplier's composite, for a promise they never made. A bid destroyed by a
// parser, exactly like the zero price.
//
// The rival-harming shape exists too, and it comes from the OTHER half of the
// retired recipe: `Number("1.500")` → 1.5, a lead time that IS positive, becomes
// the set's `minLead` and collapses every honest rival's lead-time score. Both
// counterfactuals are asserted below; if either stops reproducing, this lock is
// guarding nothing and should be re-read, not deleted.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { scoreQuotations, type ScorableQuote } from '../../lib/quoteScore';
import type { QueryScope } from '../../services/data/types';
import { readLeadTimeDays, readMoq } from './quotationCounts';
import { buildQuotationSubmitPayload } from './quotationSubmitModel';

// rfq-002 — PET bottles. Real fixture bids: sup-007 @ 1,280 / 14 days and
// sup-008 @ 1,220 / 21 days. 14 anchors the lead-time axis.
const RFQ_ID = 'rfq-002';
const invited: QueryScope = { personaType: 'supplier', supplierId: 'sup-012' };

const svc = new MockCommandService();

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});

const scorableSet = (): ScorableQuote[] =>
  quotationStore.forRfq(RFQ_ID).map((q) => ({
    id: q.id,
    unitPrice: q.unitPrice,
    leadTimeDays: q.leadTimeDays,
    complianceScore: q.complianceScore,
    reliabilityScore: q.reliabilityScore,
  }));

const rank = () => scoreQuotations(scorableSet());

/**
 * The supplier's whole submit path for a TYPED lead time, as the page runs it:
 * one parse, and a dispatch that only happens if that parse succeeded. Returns
 * null when the lead time was refused — the refusal IS the absence of a command.
 */
const submitTypedLeadTime = async (typed: string, unit: 'days' | 'weeks' = 'days') => {
  const lead = readLeadTimeDays(typed, unit);
  if (!lead.ok) return null; // gate blocks — no payload, no dispatch, no fact
  return svc.dispatch(invited, {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: buildQuotationSubmitPayload({
      rfqId: RFQ_ID,
      supplierId: 'sup-012',
      unitPrice: 1_250,
      leadTimeDays: lead.days,
      validUntil: '2026-06-30',
    }),
  });
};

describe('BLAST RADIUS — an unreadable lead time never enters the scored set', () => {
  it('the baseline lead-time ranking is a real, computed thing', () => {
    const scored = rank();
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.leadTimeScore).toBe(100); // 14 days
    expect(scored.find((s) => s.quoteId === 'qt-002b')!.leadTimeScore).toBe(67); // 14/21
  });

  it('NEGATION — an AMBIGUOUS lead time mints no quotation and moves no score', async () => {
    const before = rank();
    const beforeCount = quotationStore.forRfq(RFQ_ID).length;

    const res = await submitTypedLeadTime('1.500');

    expect(res).toBeNull();
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(beforeCount);
    expect(rank()).toEqual(before);
  });

  it('NEGATION — a FRACTIONAL lead time mints no quotation and moves no score', async () => {
    const before = rank();
    expect(await submitTypedLeadTime('2,5', 'weeks')).toBeNull();
    expect(rank()).toEqual(before);
  });

  it('NEGATION — a ZERO lead time mints no quotation and moves no score', async () => {
    const before = rank();
    expect(await submitTypedLeadTime('0')).toBeNull();
    expect(rank()).toEqual(before);
    // And no unscoreable zero exists anywhere in the set.
    expect(quotationStore.forRfq(RFQ_ID).every((q) => q.leadTimeDays > 0)).toBe(true);
  });

  it('THE LOCK — an unreadable lead time does NOT score 0; it scores nothing at all', async () => {
    // The distinction the `|| 0` erased. "Refused" and "scored zero" are not the
    // same outcome: one leaves the supplier able to fix a typo, the other files
    // a promise they never made and marks it worst-in-set.
    const before = quotationStore.forRfq(RFQ_ID).length;
    for (const typed of ['abc', '', '1.500', '0', '2,5']) {
      expect(await submitTypedLeadTime(typed)).toBeNull();
    }
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(before);
    expect(rank().some((s) => s.leadTimeScore === 0)).toBe(false);
  });

  it('POSITIVE TWIN — a clean lead time still mints, still ranks, and loses honestly', async () => {
    const res = await submitTypedLeadTime('18');

    expect(res).not.toBeNull();
    expect(res!.status).toBe('done');
    expect(quotationStore.get(res!.entityId!)!.leadTimeDays).toBe(18);

    const scored = rank();
    expect(scored).toHaveLength(3); // it IS in the ranking — nothing was disabled
    const mine = scored.find((s) => s.quoteId === res!.entityId)!;
    // 18 days is slower than the 14-day incumbent → below 100, and it does not
    // re-anchor the axis. Scoring still works; it works on a true promise.
    expect(mine.leadTimeScore).toBe(78); // 14/18
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.leadTimeScore).toBe(100);
  });

  it('POSITIVE TWIN — a genuinely fastest lead time DOES anchor the axis (weeks convert)', async () => {
    const res = await submitTypedLeadTime('1', 'weeks'); // 7 days, beats 14
    expect(quotationStore.get(res!.entityId!)!.leadTimeDays).toBe(7);
    const scored = rank();
    expect(scored.find((s) => s.quoteId === res!.entityId)!.leadTimeScore).toBe(100);
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.leadTimeScore).toBe(50); // 7/14
  });

  it('COUNTERFACTUAL A — the retired `|| 0` FORFEITS the axis for the supplier', async () => {
    // What `Number("2,5") || 0` produced, submitted as if it had been gated.
    await svc.dispatch(invited, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-012',
        unitPrice: 1_250,
        leadTimeDays: 0, // ← the fabrication
        validUntil: '2026-06-30',
      }),
    });

    const scored = rank();
    const ghost = scored.find((s) => s.leadTimeScore === 0)!;
    expect(ghost).toBeDefined();
    // The rivals are untouched — a zero cannot anchor `minLead`, so this is
    // self-harm, not theft. That is precisely why it went unnoticed.
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.leadTimeScore).toBe(100);
    // 20 points of composite, silently forfeited on a promise nobody made.
    expect(ghost.composite).toBe(
      scored.find((s) => s.quoteId === ghost.quoteId)!.composite,
    );
    expect(ghost.topRanked).toBe(false);
    // The gate is the only thing standing between a typed "2,5" and this.
    expect(readLeadTimeDays('2,5', 'days').ok).toBe(false);
  });

  it('COUNTERFACTUAL B — the retired `Number` misread DOES collapse every rival', async () => {
    // `Number("1.500")` → 1.5. Positive, so it survives the engine's guard and
    // becomes `minLead` for the whole set.
    await svc.dispatch(invited, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-012',
        unitPrice: 1_250,
        leadTimeDays: 1.5, // ← the misparse
        validUntil: '2026-06-30',
      }),
    });

    const scored = rank();
    // The 14-day incumbent, previously the fastest in the set, is now scored
    // against a day and a half nobody offered.
    expect(scored.find((s) => s.quoteId === 'qt-002a')!.leadTimeScore).toBe(11);
    expect(scored.find((s) => s.quoteId === 'qt-002b')!.leadTimeScore).toBe(7);
    expect(readLeadTimeDays('1.500', 'days').ok).toBe(false);
  });
});

// ── 2e-FIND-02 — the constraint that used to be collected and then dropped ───
describe('BLAST RADIUS — a stated MOQ survives all the way to the governed fact', () => {
  const submitTypedMoq = async (typed: string) => {
    const stated = readMoq(typed);
    if (!stated.ok) return null;
    return svc.dispatch(invited, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-012',
        unitPrice: 1_250,
        leadTimeDays: 18,
        moq: stated.units,
        validUntil: '2026-06-30',
      }),
    });
  };

  it('THE LOCK — a minimum the supplier stated is on the stored quotation', async () => {
    // rfq-002 is for 200,000 PCS. A 250,000 minimum is the case JJ named: the
    // supplier cannot actually fill this order as scoped, and before 2e-b the
    // buyer had no way to know — the number was read off the form and discarded.
    const res = await submitTypedMoq('250000');
    expect(quotationStore.get(res!.entityId!)!.moq).toBe(250_000);
  });

  it('a stated ZERO minimum survives too — it is a claim, not an absence', async () => {
    const res = await submitTypedMoq('0');
    const q = quotationStore.get(res!.entityId!)!;
    expect(q.moq).toBe(0);
    expect('moq' in q).toBe(true);
  });

  it('NEGATION — an unreadable minimum is refused, not silently dropped', async () => {
    // The old behaviour dropped EVERY MOQ, readable or not. The fix is not
    // "drop fewer": a minimum that cannot be read must stop the submit, because
    // a quotation that silently loses its constraint is worse than no quotation.
    const before = quotationStore.forRfq(RFQ_ID).length;
    expect(await submitTypedMoq('10.000')).toBeNull();
    expect(await submitTypedMoq('lots')).toBeNull();
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(before);
  });

  it('POSITIVE TWIN — a blank minimum still submits, and stores no fabricated 0', async () => {
    const res = await submitTypedMoq('');
    expect(res!.status).toBe('done');
    const q = quotationStore.get(res!.entityId!)!;
    // Absence, honestly: the supplier stated no minimum of their own. A stored 0
    // would be a different claim, and `num()` in the target would have made one.
    expect('moq' in q).toBe(false);
    expect(q.moq).toBeUndefined();
  });
});

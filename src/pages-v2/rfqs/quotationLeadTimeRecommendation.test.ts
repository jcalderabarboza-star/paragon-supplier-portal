// ════════════════════════════════════════════════════════════════════════════
// CP-0 · W1 · 2e-b-1 — FIND-05: the award RECOMMENDATION lock.
//
// This is the sharpest test in the batch, because it is the only one that
// asserts on the thing the buyer actually acts on: which supplier the engine
// recommends.
//
// The setup is deliberately NEUTRAL. rfq-011 exists so that its quotes differ on
// ONE axis and one only — qt-011a (sup-005) carries the exact unit price and the
// exact SIMULATED 50/50 compliance/reliability baseline that a fresh submit
// mints, so a quotation submitted against it by sup-007 is identical everywhere
// except the lead time. Whatever the engine recommends here, it recommends on
// lead time and nothing else. That is what makes a lead-time parse artifact
// visible as a wrong recommendation rather than as a rounding curiosity.
//
// It runs the REAL governed path end to end — readLeadTimeDays →
// buildQuotationSubmitPayload → the real dispatcher → the real quotation store →
// the real scoring engine — and asserts BOTH directions:
//
//   · the POSITIVE TWIN FIRST (Correction-2): with honest input, the correct
//     supplier is recommended; and
//   · the counterfactual that makes the lock load-bearing: the value the RETIRED
//     path produced, submitted, DOES take the recommendation from them.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { scoreQuotations, type ScorableQuote } from '../../lib/quoteScore';
import type { QueryScope } from '../../services/data/types';
import { readLeadTimeDays } from './quotationLeadTime';
import { buildQuotationSubmitPayload } from './quotationSubmitModel';

const RFQ_ID = 'rfq-011';
/** The incumbent: an HONEST 4-day promise. The supplier who should win. */
const INCUMBENT = 'qt-011a';
const challenger: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };

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

/** Who the buyer is told to award — the fact this whole batch protects. */
const recommended = () => scoreQuotations(scorableSet()).find((s) => s.topRanked)!.quoteId;

/** Submit the challenger's quote for a TYPED lead time, as the page runs it. */
const submitTypedLeadTime = async (typed: string, unit: 'days' | 'weeks' = 'days') => {
  const lead = readLeadTimeDays(typed, unit);
  if (!lead.ok) return null; // gate blocks — no payload, no dispatch, no fact
  return svc.dispatch(challenger, {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: buildQuotationSubmitPayload({
      rfqId: RFQ_ID,
      supplierId: 'sup-007',
      unitPrice: 15_000, // identical to the incumbent — neutral on price
      leadTimeDays: lead.days,
      validUntil: '2026-06-30',
    }),
  });
};

describe('FIND-05 — the award recommendation is decided by lead time, honestly', () => {
  it('the fixture really is neutral — one axis, and one only, can separate these quotes', () => {
    // If this ever stops being true the rest of the file proves nothing, so it
    // is asserted rather than assumed.
    const incumbent = quotationStore.get(INCUMBENT)!;
    expect(incumbent.unitPrice).toBe(15_000);
    expect(incumbent.complianceScore).toBe(50);
    expect(incumbent.reliabilityScore).toBe(50);
    expect(incumbent.leadTimeDays).toBe(4);
    expect(recommended()).toBe(INCUMBENT); // alone in the set, trivially
  });

  // ── POSITIVE TWIN FIRST (Correction-2) ────────────────────────────────────
  it('POSITIVE TWIN — a SLOWER honest promise leaves the recommendation where it belongs', async () => {
    const res = await submitTypedLeadTime('14');
    expect(res!.status).toBe('done');
    expect(quotationStore.get(res!.entityId!)!.leadTimeDays).toBe(14);
    // 4 days beats 14 days, every other axis tied. The incumbent keeps it.
    expect(recommended()).toBe(INCUMBENT);
  });

  it('THE LOCK — a ONE-DAY difference still decides it; rounding cannot erase it', async () => {
    // Found in live QA. At weight 0.2 on a 2-points-per-day scale one day is 0.4
    // of a composite point, so 4 days and 5 days BOTH display 73. Ranking on the
    // rounded value handed the tie to the tie-break — insertion order, and the
    // store fills newest-first, so the recommendation went to whoever submitted
    // LAST. `topRanked` now reads the un-rounded composite.
    const res = await submitTypedLeadTime('5');
    const scored = scoreQuotations(scorableSet());
    const mine = scored.find((s) => s.quoteId === res!.entityId)!;
    const incumbent = scored.find((s) => s.quoteId === INCUMBENT)!;
    expect(mine.composite).toBe(incumbent.composite); // identical on the display
    expect(mine.leadTimeScore).toBe(90);
    expect(incumbent.leadTimeScore).toBe(92);
    expect(recommended()).toBe(INCUMBENT); // and still decided correctly
  });

  it('POSITIVE TWIN — a genuinely FASTER honest promise DOES win it', async () => {
    // The fix must not have simply frozen the recommendation. A real 3-day
    // supplier deserves to take it from a 4-day one.
    const res = await submitTypedLeadTime('3');
    expect(recommended()).toBe(res!.entityId);
  });

  it('POSITIVE TWIN — a same-day (0) promise wins it, and does not zero the incumbent', async () => {
    const res = await submitTypedLeadTime('0');
    const scored = scoreQuotations(scorableSet());
    expect(scored.find((s) => s.quoteId === res!.entityId)!.leadTimeScore).toBe(100);
    // Under the retired ratio-to-best axis a `best` of 0 scored EVERY rival 0.
    // The incumbent keeps the 92 its own 4-day promise earns.
    expect(scored.find((s) => s.quoteId === INCUMBENT)!.leadTimeScore).toBe(92);
    expect(recommended()).toBe(res!.entityId);
  });

  // ── THE NEGATIONS ─────────────────────────────────────────────────────────
  it('THE LOCK — a fractional lead time is refused, and the recommendation does NOT move', async () => {
    const before = recommended();
    const res = await submitTypedLeadTime('3.5');

    expect(res).toBeNull(); // never dispatched
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(1); // nothing minted
    expect(recommended()).toBe(before);
    expect(recommended()).toBe(INCUMBENT); // and it is the RIGHT supplier
  });

  it('THE LOCK — an unreadable lead time is refused, and the recommendation does NOT move', async () => {
    for (const raw of ['abc', '1.500', '-5']) {
      const res = await submitTypedLeadTime(raw);
      expect(res).toBeNull();
    }
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(1);
    expect(recommended()).toBe(INCUMBENT);
  });

  // ── 2e-b-1a — a DELIBERATE POLICY REVERSAL, not a bug correction ───────────
  // This spec asserted that a BLANK lead time SUBMITS (storing an absence,
  // scoring `null`, and not taking the recommendation). Under JJ's commercial
  // ruling a blank no longer submits at all: an incomplete bid does not enter
  // the comparison. The guarantee it protected — that silence never wins — is
  // strictly stronger now, because silence never gets a row.
  it('THE LOCK — a BLANK lead time is REFUSED; an incomplete bid never enters the comparison', async () => {
    const before = recommended();
    const res = await submitTypedLeadTime('');

    expect(res).toBeNull(); // never dispatched
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(1); // nothing minted
    expect(recommended()).toBe(before);
    expect(recommended()).toBe(INCUMBENT); // and it is the RIGHT supplier
  });

  it('POSITIVE TWIN — the same bid WITH a lead time is compared normally', async () => {
    // The refusal is about completeness, not about disliking the supplier.
    const res = await submitTypedLeadTime('3');
    expect(res!.status).toBe('done');
    expect(quotationStore.forRfq(RFQ_ID)).toHaveLength(2);
    expect(recommended()).toBe(res!.entityId);
  });

  it('COUNTERFACTUAL — the retired truncation WOULD have taken the recommendation', async () => {
    // `parseInt("3.5")` / `"3.5".split(".")[0]` → 3: a day earlier than the
    // supplier promised, and enough to beat an honest 4. Submitted as if it had
    // been gated. This is FIND-05, reproduced.
    const res = await svc.dispatch(challenger, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-007',
        unitPrice: 15_000,
        leadTimeDays: 3, // ← the truncation artifact
        validUntil: '2026-06-30',
      }),
    });

    expect(recommended()).toBe(res.entityId); // the WRONG supplier is recommended
    expect(recommended()).not.toBe(INCUMBENT);
    // The gate is the only thing standing between a typed "3.5" and this.
    expect(readLeadTimeDays('3.5', 'days').ok).toBe(false);
  });

  it('COUNTERFACTUAL — the retired `|| 0` WOULD have taken it outright', async () => {
    // Anything unreadable became 0, and on the absolute axis 0 is the maximum.
    // Not a bad score for the supplier — the BEST one, for a promise that was
    // never made and could never be kept.
    const res = await svc.dispatch(challenger, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: buildQuotationSubmitPayload({
        rfqId: RFQ_ID,
        supplierId: 'sup-007',
        unitPrice: 15_000,
        leadTimeDays: 0, // ← what `Number("abc") || 0` produced
        validUntil: '2026-06-30',
      }),
    });

    const scored = scoreQuotations(scorableSet());
    expect(scored.find((s) => s.quoteId === res.entityId)!.leadTimeScore).toBe(100);
    expect(recommended()).toBe(res.entityId);
    expect(readLeadTimeDays('abc', 'days').ok).toBe(false);
  });
});

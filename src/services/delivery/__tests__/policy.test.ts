import { describe, expect, it } from 'vitest';
import { setActivePolicy } from '../policy';
import { releaseScheduleLines } from '../release';
import { DRAWDOWN_PRESET_CASE_B, DRAWDOWN_PRESET_CASE_C, deriveDrawdownLedger } from '../ledger';
import type { ScheduleLine, SchedulingAgreementItem, TolerancePolicy } from '../types';

// The delivery lane's THIRD write (the governance write), pure layer. A synthetic
// single-item fixture is enough — `setActivePolicy` only ever touches the policy,
// never the schedule lines.
const NOW = '2026-08-25T00:00:00.000Z';

/** A Case-B-governed item (contractDefault === active === Case B). */
function itemWith(active: TolerancePolicy, contractDefault = DRAWDOWN_PRESET_CASE_B): SchedulingAgreementItem {
  return {
    lineSeq: 10,
    sapItemNumber: '10',
    materialCode: 'AI-NIAC-6601',
    uom: 'KG',
    agreedTotalQty: 80_000,
    cadence: 'monthly',
    qtyPerRelease: 20_000,
    releaseType: 'FRC',
    drawdownPolicy: { contractDefault, active },
    scheduleLines: [],
  };
}

describe('setActivePolicy — the policy-edit write (pure)', () => {
  it('writes active + activeChangedAt + activeChangeReason immutably (input untouched)', () => {
    const item = itemWith(DRAWDOWN_PRESET_CASE_B);
    const result = setActivePolicy(item, {
      tolerancePct: null,
      enforcement: 'ignore',
      reason: 'switch to reference-only for Q3',
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The NEW item carries the re-pointed active + the who/when/why (who deferred).
    expect(result.item.drawdownPolicy.active).toEqual({ tolerancePct: null, enforcement: 'ignore' });
    expect(result.item.drawdownPolicy.activeChangedAt).toBe(NOW);
    expect(result.item.drawdownPolicy.activeChangeReason).toBe('switch to reference-only for Q3');
    // activeChangedBy is NEVER written (deferred to the Stage-F dispatcher).
    expect(result.item.drawdownPolicy.activeChangedBy).toBeUndefined();
    // The input is never mutated.
    expect(item.drawdownPolicy.active).toBe(DRAWDOWN_PRESET_CASE_B);
    expect(item.drawdownPolicy.activeChangedAt).toBeUndefined();
    expect(result.item).not.toBe(item);
  });

  it('contractDefault is REFERENTIALLY IDENTICAL before/after (the immutability law)', () => {
    const item = itemWith(DRAWDOWN_PRESET_CASE_B);
    const before = item.drawdownPolicy.contractDefault;
    const result = setActivePolicy(item, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'widen tolerance after amendment',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Not merely equal — the SAME object reference. A deviation is always measured
    // against the original contract value, never a moved goalpost.
    expect(result.item.drawdownPolicy.contractDefault).toBe(before);
    expect(result.item.drawdownPolicy.contractDefault).toBe(DRAWDOWN_PRESET_CASE_B);
  });

  it('refuses a blank / whitespace reason (REASON_REQUIRED)', () => {
    const item = itemWith(DRAWDOWN_PRESET_CASE_B);
    const blank = setActivePolicy(item, { tolerancePct: null, enforcement: 'ignore', reason: '', now: NOW });
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.reason).toBe('REASON_REQUIRED');

    const ws = setActivePolicy(item, { tolerancePct: null, enforcement: 'ignore', reason: '   ', now: NOW });
    expect(ws.ok).toBe(false);
    if (!ws.ok) expect(ws.reason).toBe('REASON_REQUIRED');
  });

  it('refuses a no-op (both knobs already equal active) — NO_CHANGE', () => {
    const item = itemWith(DRAWDOWN_PRESET_CASE_B);
    const result = setActivePolicy(item, {
      tolerancePct: DRAWDOWN_PRESET_CASE_B.tolerancePct,
      enforcement: DRAWDOWN_PRESET_CASE_B.enforcement,
      reason: 'no real change',
      now: NOW,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NO_CHANGE');
  });

  it("stores the 'block' enforcement arm (recorded intent — the ledger flags it today)", () => {
    const item = itemWith(DRAWDOWN_PRESET_CASE_B);
    const result = setActivePolicy(item, {
      tolerancePct: 0.05,
      enforcement: 'block',
      reason: 'tighten and record block intent',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.drawdownPolicy.active).toEqual({ tolerancePct: 0.05, enforcement: 'block' });
  });

  it('re-derives HONESTLY: tightening an over-released item surfaces the over-envelope exception', () => {
    // A genuinely over-committed item (Σ plannedQty 40,000 > agreed 30,000) — the
    // only way a breach can honestly arise (not from generator-invariant data).
    const draftLines: readonly ScheduleLine[] = [
      { releaseRef: 'r1', releaseSeq: 1, releaseType: 'FRC', releaseDate: '2026-06-01', plannedQty: 20_000, state: 'draft' },
      { releaseRef: 'r2', releaseSeq: 2, releaseType: 'FRC', releaseDate: '2026-07-01', plannedQty: 20_000, state: 'draft' },
    ];
    const base: SchedulingAgreementItem = {
      ...itemWith(DRAWDOWN_PRESET_CASE_C, DRAWDOWN_PRESET_CASE_C),
      agreedTotalQty: 30_000,
      scheduleLines: draftLines,
    };
    const released = releaseScheduleLines(base, { releaseSeqs: [1, 2] }, NOW);
    expect(released.ok).toBe(true);
    if (!released.ok) return;

    // Case C (unlimited/ignore) never breaches — the over-release is unenforced.
    const before = deriveDrawdownLedger(released.item);
    expect(before.enforced).toBe(false);
    expect(before.exceptions.length).toBe(0);

    // Tighten to a governed 10% → ceiling 33,000 < released 40,000 → a REAL breach.
    const tightened = setActivePolicy(released.item, {
      tolerancePct: 0.1,
      enforcement: 'flag',
      reason: 'tighten the envelope',
      now: NOW,
    });
    expect(tightened.ok).toBe(true);
    if (!tightened.ok) return;

    const after = deriveDrawdownLedger(tightened.item);
    expect(after.enforced).toBe(true);
    expect(after.policyDeviation).toBe(true);
    expect(after.exceptions.length).toBe(1);
    expect(after.exceptions[0].kind).toBe('over-envelope');
  });

  it('reset writes contractDefault back into active (deviation would clear)', () => {
    // Start deviated: active is Case C, contractDefault is Case B.
    const item = itemWith(DRAWDOWN_PRESET_CASE_C, DRAWDOWN_PRESET_CASE_B);
    const result = setActivePolicy(item, {
      tolerancePct: DRAWDOWN_PRESET_CASE_B.tolerancePct,
      enforcement: DRAWDOWN_PRESET_CASE_B.enforcement,
      reason: 'reset to contract default',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // active now equals contractDefault (by value) — policiesDiffer would be false.
    expect(result.item.drawdownPolicy.active).toEqual(DRAWDOWN_PRESET_CASE_B);
    expect(result.item.drawdownPolicy.contractDefault).toBe(DRAWDOWN_PRESET_CASE_B);
    expect(result.item.drawdownPolicy.activeChangeReason).toBe('reset to contract default');
  });
});

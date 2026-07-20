import { describe, it, expect } from 'vitest';
import {
  deriveDrawdownLedger,
  DRAWDOWN_PRESET_CASE_B,
  DRAWDOWN_PRESET_CASE_C,
} from '../ledger';
import { generateSchedule } from '../generator';
import type { ScheduleLine, SchedulingAgreementItem, TolerancePolicy } from '../types';

// Batch-1 ledger: the DERIVED drawdown view. Nothing stored — data in, ledger out.
// These lock: honest zeros over the all-draft seed, released accumulation proven
// by an in-test released-subset (fixtures untouched), the enforced flag (Case B
// true / Case C false), policyDeviation, and empty exceptions over all-draft.

const DRAFT_LINES: readonly ScheduleLine[] = generateSchedule({
  contractId: 'ctr-003',
  agreementId: 'sa-0001',
  lineSeq: 10,
  startDate: '2025-10-01',
  cadence: 'monthly',
  qtyPerRelease: 180_000,
  agreedTotalQty: 2_000_000,
  releaseType: 'FRC',
});

function item(
  lines: readonly ScheduleLine[],
  active: TolerancePolicy = DRAWDOWN_PRESET_CASE_B,
  contractDefault: TolerancePolicy = DRAWDOWN_PRESET_CASE_B,
): SchedulingAgreementItem {
  return {
    lineSeq: 10,
    materialCode: 'PK-PETB-8810',
    uom: 'PCS',
    agreedTotalQty: 2_000_000,
    cadence: 'monthly',
    qtyPerRelease: 180_000,
    releaseType: 'FRC',
    drawdownPolicy: { contractDefault, active },
    scheduleLines: lines,
  };
}

describe('deriveDrawdownLedger — honest zeros over the all-draft seed', () => {
  it('releasedQty 0, deliveredQty 0, remainingQty = full envelope', () => {
    const led = deriveDrawdownLedger(item(DRAFT_LINES));
    expect(led.releasedQty).toBe(0);
    expect(led.deliveredQty).toBe(0);
    expect(led.remainingQty).toBe(2_000_000);
    expect(led.agreedTotalQty).toBe(2_000_000);
    expect(led.exceptions).toEqual([]);
  });
});

describe('deriveDrawdownLedger — released accumulation (fixtures untouched)', () => {
  it('an in-test released subset accumulates into releasedQty + drops remaining', () => {
    // Flip the first three lines to 'released' WITHOUT mutating the seed array.
    const released = DRAFT_LINES.map((l, i) =>
      i < 3 ? ({ ...l, state: 'released' } as ScheduleLine) : l,
    );
    const led = deriveDrawdownLedger(item(released));
    expect(led.releasedQty).toBe(540_000); // 3 × 180,000
    expect(led.remainingQty).toBe(1_460_000); // 2,000,000 − 540,000
    expect(led.deliveredQty).toBe(0); // released ≠ delivered — no fulfillment
  });

  it('deliveredQty sums only real actualQty (still never seeded)', () => {
    const withActual = DRAFT_LINES.map((l, i) =>
      i === 0 ? ({ ...l, state: 'released', actualQty: 150_000 } as ScheduleLine) : l,
    );
    const led = deriveDrawdownLedger(item(withActual));
    expect(led.releasedQty).toBe(180_000);
    expect(led.deliveredQty).toBe(150_000);
  });
});

describe('deriveDrawdownLedger — policy mode visibility (honesty guards 3 + 4)', () => {
  it('Case B is enforced (flag); the active policy is surfaced', () => {
    const led = deriveDrawdownLedger(item(DRAFT_LINES, DRAWDOWN_PRESET_CASE_B));
    expect(led.enforced).toBe(true);
    expect(led.activePolicy).toEqual(DRAWDOWN_PRESET_CASE_B);
  });

  it('Case C reads unenforced — "reference envelope, not enforced"', () => {
    const led = deriveDrawdownLedger(
      item(DRAFT_LINES, DRAWDOWN_PRESET_CASE_C, DRAWDOWN_PRESET_CASE_C),
    );
    expect(led.enforced).toBe(false);
    expect(led.activePolicy.tolerancePct).toBeNull();
  });

  it('policyDeviation false when active === contractDefault, true when it drifts', () => {
    expect(
      deriveDrawdownLedger(item(DRAFT_LINES, DRAWDOWN_PRESET_CASE_B, DRAWDOWN_PRESET_CASE_B))
        .policyDeviation,
    ).toBe(false);
    expect(
      deriveDrawdownLedger(item(DRAFT_LINES, DRAWDOWN_PRESET_CASE_C, DRAWDOWN_PRESET_CASE_B))
        .policyDeviation,
    ).toBe(true);
  });
});

describe('deriveDrawdownLedger — exceptions', () => {
  it('an over-envelope breach fires only when enforced with finite tolerance', () => {
    // All lines released → 2,000,000 released, exactly the envelope: within 10%.
    const allReleased = DRAFT_LINES.map((l) => ({ ...l, state: 'released' } as ScheduleLine));
    expect(deriveDrawdownLedger(item(allReleased)).exceptions).toEqual([]);
    // Push a line's planned qty so released exceeds envelope + 10% tolerance.
    const over = allReleased.map((l, i) =>
      i === 0 ? ({ ...l, plannedQty: 500_000 } as ScheduleLine) : l,
    );
    const exc = deriveDrawdownLedger(item(over)).exceptions;
    expect(exc).toHaveLength(1);
    expect(exc[0].kind).toBe('over-envelope');

    // Case C (ignore) never breaches even at the same overage.
    expect(
      deriveDrawdownLedger(item(over, DRAWDOWN_PRESET_CASE_C, DRAWDOWN_PRESET_CASE_C)).exceptions,
    ).toEqual([]);
  });
});

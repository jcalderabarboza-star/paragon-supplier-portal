import { describe, expect, it } from 'vitest';
import { confirmFulfillment } from '../confirm';
import type { ScheduleLine, SchedulingAgreementItem } from '../types';

// A minimal item with one released + one draft line — enough to exercise every
// guard and the immutable write, with no dependency on the generator/fixtures.
const NOW = '2026-08-25T12:00:00.000Z';

function line(overrides: Partial<ScheduleLine>): ScheduleLine {
  return {
    releaseRef: `rr-${overrides.releaseSeq ?? 1}`,
    releaseSeq: 1,
    releaseType: 'FRC',
    releaseDate: '2026-06-01',
    plannedQty: 100,
    state: 'released',
    ...overrides,
  };
}

function itemWith(lines: ScheduleLine[]): SchedulingAgreementItem {
  return {
    lineSeq: 10,
    materialCode: 'RM-EMUL-3310',
    uom: 'KG',
    agreedTotalQty: 1000,
    cadence: 'monthly',
    qtyPerRelease: 100,
    releaseType: 'FRC',
    drawdownPolicy: {
      contractDefault: { tolerancePct: 0.1, enforcement: 'flag' },
      active: { tolerancePct: 0.1, enforcement: 'flag' },
    },
    scheduleLines: lines,
  };
}

const INPUT = { fulfilledBy: 'ASN-778', actualQty: 95, now: NOW };

describe('confirmFulfillment — the second write (accept-as-observed)', () => {
  it('writes fulfilledBy + actualQty + confirmedAt on a released line, immutably', () => {
    const item = itemWith([line({ releaseSeq: 1, state: 'released' })]);
    const result = confirmFulfillment(item, 1, INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const written = result.item.scheduleLines.find((l) => l.releaseSeq === 1)!;
    expect(written.fulfilledBy).toBe('ASN-778');
    expect(written.actualQty).toBe(95);
    expect(written.confirmedAt).toBe(NOW);
    expect(result.confirmedSeq).toBe(1);

    // Input is never mutated (a NEW item + NEW line object).
    expect(item.scheduleLines[0].fulfilledBy).toBeUndefined();
    expect(item.scheduleLines[0].actualQty).toBeUndefined();
    expect(result.item).not.toBe(item);
    expect(written).not.toBe(item.scheduleLines[0]);
  });

  it('preserves the freeze law — state / plannedQty / releaseDate untouched, no fulfilledDate', () => {
    const item = itemWith([line({ releaseSeq: 1, state: 'released', plannedQty: 100 })]);
    const result = confirmFulfillment(item, 1, INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const written = result.item.scheduleLines[0];
    expect(written.state).toBe('released');
    expect(written.plannedQty).toBe(100);
    expect(written.releaseDate).toBe('2026-06-01');
    // fulfilledDate (the SAP GR posting date) is NEVER portal-written.
    expect(written.fulfilledDate).toBeUndefined();
    expect(written.sapReleaseNumber).toBeUndefined();
  });

  it('refuses a DRAFT line — nothing fulfills an untransmitted plan (NOT_RELEASED)', () => {
    const item = itemWith([line({ releaseSeq: 1, state: 'draft' })]);
    const result = confirmFulfillment(item, 1, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOT_RELEASED');
    // The refusal never wrote anything.
    expect(item.scheduleLines[0].actualQty).toBeUndefined();
  });

  it('refuses an already-bound line (ALREADY_CONFIRMED), whether by ref or qty', () => {
    const byRef = itemWith([line({ releaseSeq: 1, state: 'released', fulfilledBy: 'ASN-1' })]);
    const r1 = confirmFulfillment(byRef, 1, INPUT);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toBe('ALREADY_CONFIRMED');

    const byQty = itemWith([line({ releaseSeq: 1, state: 'released', actualQty: 90 })]);
    const r2 = confirmFulfillment(byQty, 1, INPUT);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('ALREADY_CONFIRMED');
  });

  it('refuses an unknown release seq (UNKNOWN_RELEASE_SEQ)', () => {
    const item = itemWith([line({ releaseSeq: 1, state: 'released' })]);
    const result = confirmFulfillment(item, 99, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('confirms exactly the named line, leaving sibling lines untouched', () => {
    const item = itemWith([
      line({ releaseSeq: 1, state: 'released' }),
      line({ releaseSeq: 2, releaseRef: 'rr-2', state: 'released' }),
    ]);
    const result = confirmFulfillment(item, 2, INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.scheduleLines.find((l) => l.releaseSeq === 1)!.actualQty).toBeUndefined();
    expect(result.item.scheduleLines.find((l) => l.releaseSeq === 2)!.actualQty).toBe(95);
  });
});

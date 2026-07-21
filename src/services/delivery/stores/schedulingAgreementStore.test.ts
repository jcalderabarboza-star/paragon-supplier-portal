import { afterEach, describe, expect, it } from 'vitest';
import { schedulingAgreementStore } from './schedulingAgreementStore';
import { releaseScheduleLines } from '../release';
import type { SchedulingAgreement } from '../types';

const RELEASE_STAMP = '2026-08-01T00:00:00.000Z';

/** Immutably release seqs on one item of an agreement (the shape the service uses). */
function releaseOn(agreement: SchedulingAgreement, itemSeq: number, seqs: number[]): SchedulingAgreement {
  return {
    ...agreement,
    items: agreement.items.map((item) => {
      if (item.lineSeq !== itemSeq) return item;
      const r = releaseScheduleLines(item, { releaseSeqs: seqs }, RELEASE_STAMP);
      if (!r.ok) throw new Error(`release failed: ${r.reason}`);
      return r.item;
    }),
  };
}

describe('schedulingAgreementStore', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('seeds the ctr-003 anchor all-draft (nothing released)', () => {
    const anchor = schedulingAgreementStore.get('sa-0001');
    expect(anchor).toBeDefined();
    const states = anchor!.items.flatMap((i) => i.scheduleLines.map((l) => l.state));
    expect(states.every((s) => s === 'draft')).toBe(true);
  });

  it('seeds the demo (sa-0002) with its build-time releases intact', () => {
    const demo = schedulingAgreementStore.get('sa-0002');
    expect(demo).toBeDefined();
    // Item A (lineSeq 10) has draft seqs 1–2 and released seqs 3–6.
    const itemA = demo!.items.find((i) => i.lineSeq === 10)!;
    const released = itemA.scheduleLines.filter((l) => l.state === 'released').map((l) => l.releaseSeq);
    expect(released).toEqual([3, 4, 5, 6]);
  });

  it('a release flips exactly the named seqs and leaves the rest draft', () => {
    schedulingAgreementStore.update('sa-0001', (a) => releaseOn(a, 10, [1, 2]));
    const item = schedulingAgreementStore.get('sa-0001')!.items.find((i) => i.lineSeq === 10)!;
    const released = item.scheduleLines.filter((l) => l.state === 'released').map((l) => l.releaseSeq);
    expect(released).toEqual([1, 2]);
    // Every flipped line stamped releasedAt; the untouched lines carry none.
    for (const line of item.scheduleLines) {
      if (line.releaseSeq <= 2) expect(line.releasedAt).toBe(RELEASE_STAMP);
      else expect(line.releasedAt).toBeUndefined();
    }
  });

  it('reset() restores the pristine all-draft seed after a release', () => {
    schedulingAgreementStore.update('sa-0001', (a) => releaseOn(a, 10, [1, 2]));
    schedulingAgreementStore.reset();
    const item = schedulingAgreementStore.get('sa-0001')!.items.find((i) => i.lineSeq === 10)!;
    expect(item.scheduleLines.every((l) => l.state === 'draft')).toBe(true);
  });

  it('does not mutate the frozen seed fixtures in place', () => {
    schedulingAgreementStore.update('sa-0001', (a) => releaseOn(a, 10, [1]));
    schedulingAgreementStore.reset();
    // The restored seed is still all-draft — proof the update swapped references
    // rather than mutating the frozen originals.
    const anchor = schedulingAgreementStore.get('sa-0001')!;
    expect(anchor.items.flatMap((i) => i.scheduleLines).every((l) => l.state === 'draft')).toBe(true);
  });
});

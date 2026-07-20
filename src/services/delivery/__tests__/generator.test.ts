import { describe, it, expect } from 'vitest';
import { generateSchedule, commitmentClassOf } from '../generator';
import type { GenerateScheduleInput } from '../generator';

// Batch-1 generator: the release-calendar materialization. Pure, deterministic,
// UTC. These lock: count, cadence date-stepping, the remainder + even paths, the
// Σ-invariant, all-draft emission, the non-positive guard, and determinism.

const base: GenerateScheduleInput = {
  contractId: 'ctr-003',
  agreementId: 'sa-0001',
  lineSeq: 10,
  startDate: '2025-10-01',
  cadence: 'monthly',
  qtyPerRelease: 180_000,
  agreedTotalQty: 2_000_000,
  releaseType: 'FRC',
};

const sum = (xs: readonly { plannedQty: number }[]) =>
  xs.reduce((s, l) => s + l.plannedQty, 0);

describe('commitmentClassOf (Decision B — derived, never stored)', () => {
  it('JIT → firm, FRC → semi-firm', () => {
    expect(commitmentClassOf('JIT')).toBe('firm');
    expect(commitmentClassOf('FRC')).toBe('semi-firm');
  });
});

describe('generateSchedule — count + remainder path', () => {
  it('ceil(total/perRelease) releases; the last carries the remainder', () => {
    const lines = generateSchedule(base); // 2,000,000 / 180,000 → 12
    expect(lines).toHaveLength(12);
    expect(lines.slice(0, 11).every((l) => l.plannedQty === 180_000)).toBe(true);
    expect(lines[11].plannedQty).toBe(20_000); // 2,000,000 − 180,000·11
  });

  it('Σ plannedQty === agreedTotalQty (the invariant) on the remainder path', () => {
    expect(sum(generateSchedule(base))).toBe(2_000_000);
  });
});

describe('generateSchedule — even path', () => {
  it('an evenly-divisible envelope yields uniform releases, last === perRelease', () => {
    const lines = generateSchedule({ ...base, qtyPerRelease: 200_000 }); // → 10 even
    expect(lines).toHaveLength(10);
    expect(lines.every((l) => l.plannedQty === 200_000)).toBe(true);
    expect(sum(lines)).toBe(2_000_000);
  });
});

describe('generateSchedule — UTC cadence stepping', () => {
  it('monthly steps one calendar month per release', () => {
    const lines = generateSchedule(base);
    expect(lines[0].releaseDate).toBe('2025-10-01');
    expect(lines[1].releaseDate).toBe('2025-11-01');
    expect(lines[3].releaseDate).toBe('2026-01-01'); // rolls the year
    expect(lines[11].releaseDate).toBe('2026-09-01');
  });

  it('weekly steps 7 days per release', () => {
    const lines = generateSchedule({
      ...base,
      cadence: 'weekly',
      qtyPerRelease: 1_000_000, // → 2 releases, keep it short
    });
    expect(lines[0].releaseDate).toBe('2025-10-01');
    expect(lines[1].releaseDate).toBe('2025-10-08');
  });

  it('quarterly steps three calendar months per release', () => {
    const lines = generateSchedule({
      ...base,
      cadence: 'quarterly',
      qtyPerRelease: 500_000, // → 4 releases
    });
    expect(lines.map((l) => l.releaseDate)).toEqual([
      '2025-10-01',
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
    ]);
  });
});

describe('generateSchedule — line shape (all draft, chained ref, no fulfillment)', () => {
  it('every line is draft, seq 1..n, chained releaseRef, stamped releaseType', () => {
    const lines = generateSchedule(base);
    lines.forEach((l, i) => {
      expect(l.state).toBe('draft');
      expect(l.releaseSeq).toBe(i + 1);
      expect(l.releaseType).toBe('FRC');
      expect(l.releaseRef).toBe(`ctr-003/sa-0001/10/${i + 1}`);
    });
  });

  it('no fulfillment is ever fabricated (no actualQty/fulfilledDate/fulfilledBy)', () => {
    for (const l of generateSchedule(base)) {
      expect(l.actualQty).toBeUndefined();
      expect(l.fulfilledDate).toBeUndefined();
      expect(l.fulfilledBy).toBeUndefined();
    }
  });
});

describe('generateSchedule — guards + determinism', () => {
  it('a non-positive envelope or per-release qty yields [] (never a zero/neg line)', () => {
    expect(generateSchedule({ ...base, agreedTotalQty: 0 })).toEqual([]);
    expect(generateSchedule({ ...base, agreedTotalQty: -5 })).toEqual([]);
    expect(generateSchedule({ ...base, qtyPerRelease: 0 })).toEqual([]);
    expect(generateSchedule({ ...base, qtyPerRelease: -5 })).toEqual([]);
  });

  it('same input → same output (deterministic; no wall-clock, no randomness)', () => {
    expect(generateSchedule(base)).toEqual(generateSchedule(base));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · THE INTAKE VIEW'S FIRST BUILD IS CHEAP, AND IT IS THE SAME POPULATION.
//
// Measured before the fix: `generatedIntakeLines()` took 1,810 ms, 1.0–1.6 s of
// it in `somoHorizon`, which re-derives the horizon from the SDC clock on every
// call and was asked once PER LINE (~16,000 times). It is now asked once per
// grain and the build takes ~47 ms. A timing assertion would be a flaky
// instrument, so the MECHANISM is pinned instead — how often the horizon is
// asked — and the output is pinned equal, line for line, to the by-id answers
// the dispatcher and the store rely on.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

const calls = vi.hoisted(() => ({ n: 0 }));
vi.mock('./facts', async (importOriginal) => {
  const real = await importOriginal<typeof import('./facts')>();
  return {
    ...real,
    somoHorizon: (...args: Parameters<typeof real.somoHorizon>) => {
      calls.n++;
      return real.somoHorizon(...args);
    },
  };
});

import { generatedIntakeLine, generatedIntakeLines } from './somoIntake';

describe('PLN-5 · the generated intake population', () => {
  it('asks the SDC clock for the horizon once per GRAIN, not once per line', () => {
    calls.n = 0;
    const lines = generatedIntakeLines();
    expect(lines.length).toBeGreaterThan(10_000); // population control — the whole population was built
    expect(calls.n).toBeGreaterThan(0); // KNOWN-GOOD: the counter is wired to the module the build reads
    expect(calls.n).toBeLessThanOrEqual(2); // month and week
  });

  // Every 7th line: 7 is coprime with both horizons (12 months, 16 weeks), so the
  // sample walks every bucket position of every grain; the whole set ran 2 s,
  // which under suite load is the 5 s timeout this batch exists to stay under.
  it('is the same population as the by-id answers — every 7th line equal, every id unique', () => {
    const lines = generatedIntakeLines();
    const ids = new Set(lines.map((l) => l.id));
    expect(ids.size).toBe(lines.length);
    const sample = lines.filter((_, i) => i % 7 === 0);
    expect(new Set(sample.map((l) => l.periodBucket)).size).toBeGreaterThan(20); // both grains, every position
    for (const line of sample) expect(generatedIntakeLine(line.id), line.id).toEqual(line);
    // KNOWN-BAD: an id the producer never emitted still answers nothing.
    expect(generatedIntakeLine('pil-somo-SIM-PM-0012@1999-W01')).toBeNull();
  });
});

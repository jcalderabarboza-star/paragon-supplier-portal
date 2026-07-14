import { describe, it, expect } from 'vitest';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import {
  livenessFrom,
  isGreenFrom,
  liveness,
  isLive,
  awaitsHarvest,
  readinessNote,
  capabilityBacking,
} from './registry';

// ─────────────────────────────────────────────────────────────────────────────
// FLIP HARNESS (I3.3) — the SIMULATED→LIVE flip for `compliance`, proven and
// waiting. The 17-Oct clock demands the flip be a SMALL, TEST-COVERED, structural
// operation — not a scramble. This harness proves two things in advance:
//
//   1. GATE-1 (wiring) flips SIMULATED→LIVE on a SINGLE wiring change — adding
//      'compliance' to the command census is the whole of the structural step.
//   2. GATE-2 (data-source realness) is a REAL guard, not a comment
//      (LIVENESS-DATASOURCE-01): wiring the target while the data source is still
//      synthetic is GUARDED — never green. Green requires BOTH gates.
//
// `livenessFrom` / `isGreenFrom` are the pure, injectable cores; the harness feeds
// them constructed wired-sets so it can prove the flip without mutating the frozen
// process census. The real flip on harvest day performs exactly these two edits:
// wire the compliance CommandTarget (gate-1) and drop compliance from HARVEST_GATED
// once the Track-R data lands (gate-2).
// ─────────────────────────────────────────────────────────────────────────────

const WIRED = new Set(WIRED_COMMAND_TARGETS);
const WIRED_PLUS_COMPLIANCE = new Set([...WIRED_COMMAND_TARGETS, 'compliance']);
const backing = capabilityBacking.compliance; // 'compliance'

describe('flip harness — GATE-1 (wiring) flips SIMULATED→LIVE on one change', () => {
  it('today: compliance is NOT wired → gate-1 derives SIMULATED', () => {
    expect(WIRED.has('compliance')).toBe(false);
    expect(livenessFrom(backing, WIRED)).toBe('SIMULATED');
    // …and matches the live registry read (no divergence from the real census).
    expect(liveness('compliance')).toBe('SIMULATED');
  });

  it('wiring a compliance CommandTarget flips gate-1 to LIVE (single change)', () => {
    // The ENTIRE structural step: 'compliance' becomes a wired census key.
    expect(livenessFrom(backing, WIRED_PLUS_COMPLIANCE)).toBe('LIVE');
  });
});

describe('flip harness — GATE-2 (data realness) is a guard, not a comment', () => {
  it('compliance is harvest-gated today (real data source has NOT landed)', () => {
    expect(awaitsHarvest('compliance')).toBe(true);
    const note = readinessNote('compliance');
    expect(note).not.toBeNull();
    expect(note?.source).toBe('Track-R');
  });

  it('wiring ALONE (data still synthetic) is GUARDED — never green', () => {
    // LIVENESS-DATASOURCE-01: gate-1 LIVE + gate-2 still pending ⇒ NOT green. This
    // is the worst-case a false "Live" on legally-dated cert data would be — the
    // guard makes it structurally unreachable.
    expect(livenessFrom(backing, WIRED_PLUS_COMPLIANCE)).toBe('LIVE'); // gate-1 open
    expect(isGreenFrom(backing, WIRED_PLUS_COMPLIANCE, /* awaitingHarvest */ true))
      .toBe(false); // …but gate-2 still shut → guarded
  });

  it('real data WITHOUT wiring is also not green — gate-1 is still required', () => {
    expect(isGreenFrom(backing, WIRED, /* awaitingHarvest */ false)).toBe(false);
  });

  it('the real 17-Oct flip: BOTH gates open ⇒ green', () => {
    // Wire the target (gate-1) AND drop compliance from HARVEST_GATED once Track-R
    // data lands (gate-2). Only this two-edit state is green.
    expect(
      isGreenFrom(backing, WIRED_PLUS_COMPLIANCE, /* awaitingHarvest */ false),
    ).toBe(true);
  });
});

describe('flip harness — today the surface is proven + waiting (not yet green)', () => {
  it('the live registry read holds compliance non-green until harvest', () => {
    // Belt-and-suspenders: even if a naive edit wired compliance without landing
    // real data, the live `isLive` consults gate-2 and stays false.
    expect(isLive('compliance')).toBe(false);
  });
});

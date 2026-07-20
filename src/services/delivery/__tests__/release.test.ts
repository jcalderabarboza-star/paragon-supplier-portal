// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 2: the release step (headless; the batch's
// verification). Everything here is pure — inputs are generated frozen lines,
// nothing mutates a fixture, nothing dispatches, no clock is read (`now` is a
// literal injected into every call).
//
// These lock: both selection arms flip draft→released and stamp releasedAt; the
// releasedAt ⟺ 'released' invariant; input immutability; THE LEDGER REACTS to
// REAL releaseScheduleLines output (stronger than a hand-rolled spread); the
// enforced freeze (a released line refuses every adjustment); and every guard
// returning its honest reason rather than a silent success.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { releaseScheduleLines, adjustDraftLine } from '../release';
import { deriveDrawdownLedger, DRAWDOWN_PRESET_CASE_B } from '../ledger';
import { generateSchedule } from '../generator';
import type { ScheduleLine, SchedulingAgreementItem } from '../types';

/** Injected simulated stamps — never a clock read. */
const NOW = '2026-07-20T09:00:00.000Z';
const LATER = '2026-08-01T09:00:00.000Z';

// 12 monthly FRC lines from 2025-10-01: 11 × 180,000 + a 20,000 remainder tail.
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

function item(lines: readonly ScheduleLine[] = DRAFT_LINES): SchedulingAgreementItem {
  return {
    lineSeq: 10,
    materialCode: 'PK-PETB-8810',
    uom: 'PCS',
    agreedTotalQty: 2_000_000,
    cadence: 'monthly',
    qtyPerRelease: 180_000,
    releaseType: 'FRC',
    drawdownPolicy: { contractDefault: DRAWDOWN_PRESET_CASE_B, active: DRAWDOWN_PRESET_CASE_B },
    scheduleLines: lines,
  };
}

/** Unwrap an ok result or fail loudly — keeps the assertions below readable. */
function mustRelease(r: ReturnType<typeof releaseScheduleLines>) {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r;
}

describe('releaseScheduleLines — the horizon arm (the FRC/JIT "next N periods" motion)', () => {
  it('releases every line dated on or before the horizon, inclusive', () => {
    // Lines 1–3 are 2025-10-01 / 11-01 / 12-01; the horizon lands ON line 3.
    const res = mustRelease(releaseScheduleLines(item(), { horizonDate: '2025-12-01' }, NOW));
    expect(res.releasedSeqs).toEqual([1, 2, 3]);
    const states = res.item.scheduleLines.map((l) => l.state);
    expect(states.slice(0, 3)).toEqual(['released', 'released', 'released']);
    expect(states.slice(3).every((s) => s === 'draft')).toBe(true);
  });

  it('stamps releasedAt = the injected now on exactly the released lines', () => {
    const res = mustRelease(releaseScheduleLines(item(), { horizonDate: '2025-11-01' }, NOW));
    for (const l of res.item.scheduleLines) {
      expect(l.releasedAt).toBe(l.state === 'released' ? NOW : undefined);
    }
  });

  it('skips already-released lines silently and releases only the rest (idempotent repeat)', () => {
    const first = mustRelease(releaseScheduleLines(item(), { horizonDate: '2025-11-01' }, NOW));
    // Re-run against a LATER horizon: 1–2 already released, so only 3–4 flip.
    const second = mustRelease(
      releaseScheduleLines(first.item, { horizonDate: '2026-01-01' }, LATER),
    );
    expect(second.releasedSeqs).toEqual([3, 4]);
    // The first release's stamp is NOT overwritten by the second call.
    expect(second.item.scheduleLines[0].releasedAt).toBe(NOW);
    expect(second.item.scheduleLines[2].releasedAt).toBe(LATER);
  });

  it('a horizon whose whole range is already released is NO_LINES_SELECTED, not an empty ok', () => {
    const first = mustRelease(releaseScheduleLines(item(), { horizonDate: '2025-11-01' }, NOW));
    const again = releaseScheduleLines(first.item, { horizonDate: '2025-11-01' }, LATER);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('NO_LINES_SELECTED');
  });

  it('a horizon before the first line releases nothing (NO_LINES_SELECTED)', () => {
    const res = releaseScheduleLines(item(), { horizonDate: '2025-09-30' }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('NO_LINES_SELECTED');
  });
});

describe('releaseScheduleLines — the explicit-seq arm (a UI selection)', () => {
  it('releases exactly the named seqs, and can skip a line a horizon could not', () => {
    const res = mustRelease(releaseScheduleLines(item(), { releaseSeqs: [1, 3] }, NOW));
    expect(res.releasedSeqs).toEqual([1, 3]);
    expect(res.item.scheduleLines[0].state).toBe('released');
    expect(res.item.scheduleLines[1].state).toBe('draft'); // line 2 deliberately skipped
    expect(res.item.scheduleLines[2].state).toBe('released');
  });

  it('returns releasedSeqs ascending and de-duplicated regardless of caller order', () => {
    const res = mustRelease(releaseScheduleLines(item(), { releaseSeqs: [3, 1, 3] }, NOW));
    expect(res.releasedSeqs).toEqual([1, 3]);
  });

  it('an explicitly named released line is REFUSED (not silently skipped like a horizon)', () => {
    const first = mustRelease(releaseScheduleLines(item(), { releaseSeqs: [1] }, NOW));
    const again = releaseScheduleLines(first.item, { releaseSeqs: [1, 2] }, LATER);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('ALREADY_RELEASED');
    // …and the refusal is total: line 2 did NOT partially release.
    expect(first.item.scheduleLines[1].state).toBe('draft');
  });

  it('an unknown seq is UNKNOWN_RELEASE_SEQ, never a silent skip', () => {
    const res = releaseScheduleLines(item(), { releaseSeqs: [1, 99] }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('an empty selection is honest silence (NO_LINES_SELECTED), not an empty success', () => {
    const res = releaseScheduleLines(item(), { releaseSeqs: [] }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('NO_LINES_SELECTED');
  });
});

describe('releaseScheduleLines — release character (one document, one type)', () => {
  it('one call may never span FRC + JIT (RELEASE_TYPE_MISMATCH)', () => {
    // Cannot arise from seeded data (releaseType is stamped per-item by the
    // generator) — constructed here so the guard is proven for mixed-horizon.
    const mixed = DRAFT_LINES.map((l, i) =>
      i === 1 ? ({ ...l, releaseType: 'JIT' } as ScheduleLine) : l,
    );
    const res = releaseScheduleLines(item(mixed), { releaseSeqs: [1, 2] }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('RELEASE_TYPE_MISMATCH');
  });

  it('a uniform-type selection over the same item is fine', () => {
    const mixed = DRAFT_LINES.map((l, i) =>
      i === 1 ? ({ ...l, releaseType: 'JIT' } as ScheduleLine) : l,
    );
    expect(releaseScheduleLines(item(mixed), { releaseSeqs: [1, 3] }, NOW).ok).toBe(true);
  });
});

describe('releaseScheduleLines — purity (the input is never mutated)', () => {
  it('returns a NEW item and leaves the source lines all-draft and unstamped', () => {
    const source = item();
    const res = mustRelease(releaseScheduleLines(source, { horizonDate: '2026-12-01' }, NOW));
    expect(res.item).not.toBe(source);
    expect(res.item.scheduleLines).not.toBe(source.scheduleLines);
    expect(source.scheduleLines.every((l) => l.state === 'draft')).toBe(true);
    expect(source.scheduleLines.every((l) => l.releasedAt === undefined)).toBe(true);
    // The generated seed array itself is likewise untouched.
    expect(DRAFT_LINES.every((l) => l.state === 'draft')).toBe(true);
  });
});

describe('releaseScheduleLines — THE LEDGER REACTS (ledger.ts unchanged)', () => {
  it('a partial release accumulates into releasedQty and drops remainingQty', () => {
    const res = mustRelease(releaseScheduleLines(item(), { releaseSeqs: [1, 2, 3] }, NOW));
    const led = deriveDrawdownLedger(res.item);
    expect(led.releasedQty).toBe(540_000); // 3 × 180,000
    expect(led.remainingQty).toBe(1_460_000);
    expect(led.deliveredQty).toBe(0); // released ≠ delivered — no fulfillment exists
    expect(led.exceptions).toEqual([]);
  });

  it('releasing the FULL generated calendar lands EXACTLY on the envelope', () => {
    // The honest assertion. Under the generator invariant Σ plannedQty ===
    // agreedTotalQty, so a full release reaches the envelope and never breaches
    // it — no out-of-envelope line is fabricated to force an exception.
    const res = mustRelease(releaseScheduleLines(item(), { horizonDate: '2026-12-31' }, NOW));
    expect(res.releasedSeqs).toHaveLength(12);
    const led = deriveDrawdownLedger(res.item);
    expect(led.releasedQty).toBe(2_000_000);
    expect(led.remainingQty).toBe(0);
    expect(led.exceptions).toEqual([]);
  });
});

describe('adjustDraftLine — the ENFORCED freeze (Decision B)', () => {
  it('adjusts a draft line and stamps adjustedAt', () => {
    const res = adjustDraftLine(item(), 2, { plannedQty: 150_000 }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.adjustedSeq).toBe(2);
    const line = res.item.scheduleLines[1];
    expect(line.plannedQty).toBe(150_000);
    expect(line.adjustedAt).toBe(NOW);
    expect(line.state).toBe('draft'); // adjusting never releases
  });

  it('applies only the patched fields, leaving the rest intact', () => {
    const res = adjustDraftLine(item(), 2, { releaseDate: '2025-11-15' }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const line = res.item.scheduleLines[1];
    expect(line.releaseDate).toBe('2025-11-15');
    expect(line.plannedQty).toBe(180_000); // untouched
  });

  it('REFUSES a released line — the freeze is a law, not a comment', () => {
    const released = mustRelease(releaseScheduleLines(item(), { releaseSeqs: [1] }, NOW));
    const res = adjustDraftLine(released.item, 1, { plannedQty: 999_999 }, LATER);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('ALREADY_RELEASED');
    // The committed quantity is unchanged — no silent edit slipped through.
    expect(released.item.scheduleLines[0].plannedQty).toBe(180_000);
  });

  it('an unknown seq is UNKNOWN_RELEASE_SEQ', () => {
    const res = adjustDraftLine(item(), 99, { plannedQty: 1 }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('does not mutate the input item', () => {
    const source = item();
    adjustDraftLine(source, 2, { plannedQty: 1 }, NOW);
    expect(source.scheduleLines[1].plannedQty).toBe(180_000);
    expect(source.scheduleLines[1].adjustedAt).toBeUndefined();
  });
});

describe('the releasedAt ⟺ released invariant', () => {
  it('holds across a release, a repeat, and an adjustment', () => {
    const a = mustRelease(releaseScheduleLines(item(), { horizonDate: '2025-12-01' }, NOW));
    const b = mustRelease(releaseScheduleLines(a.item, { releaseSeqs: [5] }, LATER));
    const c = adjustDraftLine(b.item, 6, { plannedQty: 1_000 }, LATER);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    for (const l of c.item.scheduleLines) {
      expect(l.releasedAt !== undefined).toBe(l.state === 'released');
    }
  });

  it('an adjusted DRAFT line never acquires a releasedAt', () => {
    const res = adjustDraftLine(item(), 4, { plannedQty: 1_000 }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.item.scheduleLines[3].releasedAt).toBeUndefined();
    expect(res.item.scheduleLines[3].adjustedAt).toBe(NOW);
  });
});

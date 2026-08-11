import { describe, expect, it } from 'vitest';
import { deriveAgreementView } from '../views';
import {
  summarizeAgreementItem,
  toAgreementItemRows,
  filterAndRankRows,
  bucketCounts,
  type AgreementItemSummary,
} from '../summary';
import { SCALE_DEMO_AGREEMENTS, SCALE_DEMO_SHIPMENTS } from '../demoFixturesScale';
import { SCHEDULING_AGREEMENT_CTR003 } from '../fixtures';
import type { SchedulingAgreement } from '../types';

// Read every fixture against the shared SDC clock — the same instant the service
// derives at (2026-08-25). The summaries below therefore reflect exactly what the
// roll-up renders.
const NOW = '2026-08-25T12:00:00.000Z';

/** Derive one agreement's summary row (single-item scale agreements ⇒ row [0]). */
function summarize(agreement: SchedulingAgreement): AgreementItemSummary {
  const view = deriveAgreementView(agreement, SCALE_DEMO_SHIPMENTS, NOW, 'Test Supplier');
  return summarizeAgreementItem(view, view.items[0], NOW);
}

const byId = (id: string) => SCALE_DEMO_AGREEMENTS.find((a) => a.id === id)!;

describe('summarizeAgreementItem — honest, derived roll-up rows', () => {
  it('sa-1001 → MISSED: three undelivered released lines, 50% released', () => {
    const s = summarize(byId('sa-1001'));
    expect(s.bucket).toBe('missed');
    expect(s.counts.missed).toBe(3);
    expect(s.counts.fulfilled).toBe(0);
    expect(s.counts.draft).toBe(3);
    expect(Math.round(s.releasedPct)).toBe(50);
    // The next obligation is releasing the next draft period (2026-09-01).
    expect(s.nextDue).toEqual({ date: '2026-09-01', kind: 'release' });
  });

  it('sa-1002 → LATE: one late + one on-time delivery', () => {
    const s = summarize(byId('sa-1002'));
    expect(s.bucket).toBe('late');
    expect(s.counts.late).toBe(1);
    expect(s.counts.fulfilled).toBe(1);
    expect(s.counts.missed).toBe(0);
    expect(s.nextDue).toEqual({ date: '2026-09-01', kind: 'release' });
  });

  it('sa-1003 → ON-TRACK: fully released, all delivered on time, nothing due', () => {
    const s = summarize(byId('sa-1003'));
    expect(s.bucket).toBe('onTrack');
    expect(s.counts.fulfilled).toBe(3);
    expect(s.counts.draft).toBe(0);
    expect(Math.round(s.releasedPct)).toBe(100);
    expect(s.nextDue).toBeNull();
  });

  it('sa-1004 → PENDING: a released line still awaiting delivery (a DELIVER due)', () => {
    const s = summarize(byId('sa-1004'));
    expect(s.bucket).toBe('pending');
    expect(s.counts.fulfilled).toBe(2);
    expect(s.counts.pending).toBe(1);
    expect(s.counts.missed).toBe(0);
    expect(s.counts.late).toBe(0);
    // The soonest obligation is the pending DELIVERY (2026-09-01), not the later draft.
    expect(s.nextDue).toEqual({ date: '2026-09-01', kind: 'deliver' });
  });

  it('sa-1005 → DRAFT: nothing released, no delivery performance to judge', () => {
    const s = summarize(byId('sa-1005'));
    expect(s.bucket).toBe('draft');
    expect(s.counts.draft).toBe(4);
    expect(s.counts.fulfilled).toBe(0);
    expect(s.releasedPct).toBe(0);
    expect(s.nextDue).toEqual({ date: '2026-09-01', kind: 'release' });
  });

  it('sa-1006 → MISSED (mix): a missed line dominates a late + an on-time one', () => {
    const s = summarize(byId('sa-1006'));
    expect(s.bucket).toBe('missed');
    expect(s.counts.missed).toBe(1);
    expect(s.counts.late).toBe(1);
    expect(s.counts.fulfilled).toBe(1);
  });

  it('the pristine ctr-003 anchor → DRAFT bucket, ZERO exceptions (never on-track)', () => {
    const view = deriveAgreementView(SCHEDULING_AGREEMENT_CTR003, [], NOW, 'PT Sample Packaging');
    for (const iv of view.items) {
      const s = summarizeAgreementItem(view, iv, NOW);
      expect(s.bucket).toBe('draft');
      expect(s.counts.missed).toBe(0);
      expect(s.counts.late).toBe(0);
      expect(s.counts.fulfilled).toBe(0);
      expect(s.releasedPct).toBe(0);
    }
  });
});

describe('filterAndRankRows — exception-first + filters', () => {
  // The full scale fleet as rows (one per single-item agreement).
  const rows = toAgreementItemRows(
    SCALE_DEMO_AGREEMENTS.map((a) =>
      deriveAgreementView(a, SCALE_DEMO_SHIPMENTS, NOW, `sup:${a.supplierId}`),
    ),
    NOW,
  );
  const noFilter = { tab: 'all' as const, search: '', supplierIds: [], releaseTypes: [] };

  it('default (All) sorts worst-first: missed rows precede on-track/draft', () => {
    const ranked = filterAndRankRows(rows, noFilter);
    const buckets = ranked.map((r) => r.bucket);
    const firstOnTrack = buckets.indexOf('onTrack');
    const firstDraft = buckets.indexOf('draft');
    const lastMissed = buckets.lastIndexOf('missed');
    expect(lastMissed).toBeLessThan(firstOnTrack);
    expect(firstOnTrack).toBeLessThan(firstDraft);
    // The very first row is a missed exception.
    expect(ranked[0].bucket).toBe('missed');
  });

  it('a state tab narrows to that bucket only', () => {
    const missed = filterAndRankRows(rows, { ...noFilter, tab: 'missed' });
    expect(missed.length).toBeGreaterThan(0);
    expect(missed.every((r) => r.bucket === 'missed')).toBe(true);
  });

  it('search matches supplier / contract / material (case-insensitive)', () => {
    const byContract = filterAndRankRows(rows, { ...noFilter, search: 'CTR-006' });
    expect(byContract.every((r) => r.contractId === 'ctr-006')).toBe(true);
    const byMaterial = filterAndRankRows(rows, { ...noFilter, search: 'ai-niac' });
    expect(byMaterial.every((r) => r.materialCode === 'AI-NIAC-6601')).toBe(true);
    expect(byMaterial.length).toBe(2); // sa-1002 + sa-1004
  });

  it('supplier + release-type chips filter independently', () => {
    const sup001 = filterAndRankRows(rows, { ...noFilter, supplierIds: ['sup-001'] });
    expect(sup001.every((r) => r.supplierId === 'sup-001')).toBe(true);
    const frc = filterAndRankRows(rows, { ...noFilter, releaseTypes: ['FRC'] });
    expect(frc.every((r) => r.releaseType === 'FRC')).toBe(true);
    const jit = filterAndRankRows(rows, { ...noFilter, releaseTypes: ['JIT'] });
    expect(jit.every((r) => r.releaseType === 'JIT')).toBe(true);
  });

  it('the ranking is stable / deterministic across runs', () => {
    const a = filterAndRankRows(rows, noFilter).map((r) => r.agreementId);
    const b = filterAndRankRows(rows, noFilter).map((r) => r.agreementId);
    expect(a).toEqual(b);
  });

  it('bucketCounts tallies every bucket + all', () => {
    const c = bucketCounts(rows);
    expect(c.all).toBe(rows.length);
    expect(c.missed + c.late + c.pending + c.onTrack + c.draft).toBe(rows.length);
    expect(c.missed).toBeGreaterThanOrEqual(2); // sa-1001 + sa-1006
    expect(c.draft).toBeGreaterThanOrEqual(1); // sa-1005
  });
});

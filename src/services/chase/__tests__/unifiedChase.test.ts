import { describe, expect, it } from 'vitest';
import {
  DATA_CHASE_SEVERITY,
  makeSupplierChaseView,
  severityOf,
  worstSeverity,
  type ChaseSeverityLevel,
  type SupplierChaseView,
} from '../unifiedChase';
import type { ChaseSeverity, DeliveryChaseEntry } from '../deliveryChase';
import type { ChaseReason } from '../../sdc/consolidation';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5b — the unified chase MODEL. Type-level composition of the two families +
// the severity roll-up helpers. NO reduction over real data (that is 5c).
// ─────────────────────────────────────────────────────────────────────────────

/** A minimal commitment entry with a chosen severity (the roll-up input). */
function entry(severity: ChaseSeverity, releaseSeq = 1): DeliveryChaseEntry {
  return {
    supplierId: 'sup-007',
    agreementId: 'sa-x',
    itemSeq: 10,
    releaseSeq,
    mode: 'non-compliance-alert',
    type: severity === 'hard' ? 'firm' : 'semi-firm',
    severity,
    dueDate: '2026-07-01',
    materialCode: 'PK-PETB-8810',
  };
}

const OVERDUE: ChaseReason = 'overdue';

describe('worstSeverity — the shared ordering (hard > soft > none)', () => {
  const levels: ChaseSeverityLevel[] = ['hard', 'soft', 'none'];

  it('returns the worse of two levels', () => {
    expect(worstSeverity('hard', 'soft')).toBe('hard');
    expect(worstSeverity('soft', 'none')).toBe('soft');
    expect(worstSeverity('none', 'none')).toBe('none');
    expect(worstSeverity('hard', 'none')).toBe('hard');
  });

  it('is commutative across every pair', () => {
    for (const a of levels) {
      for (const b of levels) {
        expect(worstSeverity(a, b)).toBe(worstSeverity(b, a));
      }
    }
  });

  it('is stable/idempotent on equal inputs', () => {
    for (const a of levels) expect(worstSeverity(a, a)).toBe(a);
  });
});

describe('severityOf — the roll-up rule', () => {
  it('hard when ANY commitment entry is hard (a firm miss dominates)', () => {
    expect(severityOf({ dataReasons: [OVERDUE], commitmentEntries: [entry('soft'), entry('hard', 2)] })).toBe('hard');
  });

  it('soft when a soft commitment OR a data reason is present (no hard)', () => {
    expect(severityOf({ dataReasons: [], commitmentEntries: [entry('soft')] })).toBe('soft');
    expect(severityOf({ dataReasons: [OVERDUE], commitmentEntries: [] })).toBe('soft');
  });

  it('none when both families are empty', () => {
    expect(severityOf({ dataReasons: [], commitmentEntries: [] })).toBe('none');
  });

  it('data-staleness reasons roll up SOFT, never hard (advisory, not a firm breach)', () => {
    expect(DATA_CHASE_SEVERITY).toBe('soft');
    // Two data reasons and no commitment miss still cannot reach hard.
    expect(severityOf({ dataReasons: ['overdue', 'partial-response'], commitmentEntries: [] })).toBe('soft');
  });
});

describe('makeSupplierChaseView — composes both families under one supplier', () => {
  it('carries both families as sibling arrays (neither flattened), deriving severity + count', () => {
    const view = makeSupplierChaseView('sup-007', [OVERDUE], [entry('hard'), entry('soft', 2)]);
    expect(view.supplierId).toBe('sup-007');
    expect(view.dataReasons).toEqual(['overdue']);
    expect(view.commitmentEntries).toHaveLength(2);
    expect(view.overallSeverity).toBe('hard'); // the firm miss dominates
    expect(view.chaseCount).toBe(3); // 1 data reason + 2 commitment entries
  });

  it('a supplier with only the commitment family (no data reasons)', () => {
    const view = makeSupplierChaseView('sup-005', [], [entry('soft')]);
    expect(view.dataReasons).toEqual([]);
    expect(view.overallSeverity).toBe('soft');
    expect(view.chaseCount).toBe(1);
  });

  it('a supplier with only the data family (no commitment entries)', () => {
    const view = makeSupplierChaseView('sup-002', ['partial-response'], []);
    expect(view.commitmentEntries).toEqual([]);
    expect(view.overallSeverity).toBe('soft');
    expect(view.chaseCount).toBe(1);
  });

  it('a supplier with neither family rolls up to none / zero', () => {
    const view = makeSupplierChaseView('sup-999', [], []);
    expect(view.overallSeverity).toBe('none');
    expect(view.chaseCount).toBe(0);
  });

  it('overallSeverity is always consistent with severityOf over the same arrays', () => {
    const view: SupplierChaseView = makeSupplierChaseView('sup-007', [OVERDUE], [entry('hard')]);
    expect(view.overallSeverity).toBe(severityOf(view));
  });
});

import { describe, it, expect } from 'vitest';

import { getFlow, getTransition } from './index';
import { deriveLineState, deriveHeaderDisposition, headerVerbFor } from './grRollup';
import type { InspectionResult } from '../../data/mockGoodsReceipts';

// A minimal inspection line: qtyAccepted / qtyRejected + optional check overrides.
const line = (
  acc: number,
  rej: number,
  over: Partial<InspectionResult> = {},
): InspectionResult => ({
  materialCode: 'M',
  description: 'd',
  qtyExpected: acc + rej,
  qtyReceived: acc + rej,
  qtyAccepted: acc,
  qtyRejected: rej,
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
  ...over,
});

describe('GR flows — registration + shape (Step 4 batch ii)', () => {
  it('registers the GR header flow with the submitted-interim SAP state', () => {
    const gr = getFlow('goodsReceipt');
    expect(gr?.initial).toBe('Pending Inspection');
    expect(gr?.states).toContain('Posting to SAP');
    expect(gr?.states).toContain('Posted to SAP');
  });

  it('registers the per-line sub-flow (census G2)', () => {
    const line = getFlow('goodsReceiptLine');
    expect(line?.initial).toBe('Pending');
    expect(getTransition('t_grline_inspect')?.requiredFields).toEqual([
      'visualCheck',
      'packagingCheck',
    ]);
  });

  it('t_gr_post is the sapBoundary verb → interim Posting to SAP', () => {
    const t = getTransition('t_gr_post')!;
    expect(t.sapBoundary).toBe(true);
    expect(t.to).toBe('Posting to SAP');
    expect(t.from).toEqual(['Approved', 'Partially Approved']);
    expect(t.trigger).toBe('system');
  });

  it('each disposition verb carries its rollup hook (header is derived, not asserted)', () => {
    expect(getTransition('t_gr_approve')?.policyHooks).toContain('gr_rollup_all_accepted');
    expect(getTransition('t_gr_partial_approve')?.policyHooks).toContain('gr_rollup_mixed');
    expect(getTransition('t_gr_reject')?.policyHooks).toContain('gr_rollup_all_rejected');
  });
});

describe('GR line → header rollup (grRollup)', () => {
  it('derives a single line state from qty + checks', () => {
    expect(deriveLineState(line(10, 0))).toBe('Accepted');
    expect(deriveLineState(line(0, 10))).toBe('Rejected');
    expect(deriveLineState(line(6, 4))).toBe('Partial');
    expect(deriveLineState(line(0, 0, { visualCheck: 'Pending', packagingCheck: 'Pending' }))).toBe('Pending');
    // A failed check with nothing accepted rejects the line even at full qty.
    expect(deriveLineState(line(10, 0, { visualCheck: 'Fail' }))).toBe('Partial');
  });

  it('rolls the header up from the line states', () => {
    expect(deriveHeaderDisposition([line(10, 0)])).toBe('Approved');
    expect(deriveHeaderDisposition([line(0, 10)])).toBe('Rejected');
    expect(deriveHeaderDisposition([line(10, 0), line(0, 5)])).toBe('Partially Approved');
    expect(deriveHeaderDisposition([line(0, 0, { visualCheck: 'Pending', packagingCheck: 'Pending' })])).toBe('Pending');
    expect(deriveHeaderDisposition([])).toBe('Pending');
  });

  it('maps a rolled-up disposition to its header verb', () => {
    expect(headerVerbFor('Approved')).toBe('t_gr_approve');
    expect(headerVerbFor('Partially Approved')).toBe('t_gr_partial_approve');
    expect(headerVerbFor('Rejected')).toBe('t_gr_reject');
    expect(headerVerbFor('Pending')).toBeNull();
  });
});

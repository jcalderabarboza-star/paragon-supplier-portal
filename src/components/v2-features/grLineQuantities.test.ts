import { describe, it, expect } from 'vitest';
import { readGrLineQuantities, seedQty } from './grLineQuantities';

// ────────────────────────────────────────────────────────────────────────────
// grLineQuantities (CP-0 · W1 · 2f-a) — the ONE read of a GR line's
// received/accepted pair, and the states it can honestly be in.
//
// 2f-FIND-01. This is the numeric entry closest to inventory truth: the pair is
// stored on the GR, `qtyRejected` is derived from it, and the header disposition
// rolls up from that. The retired path read both with a bare `Number()` behind
// `type="number"` inputs.
//
// Every spec below DISCRIMINATES — each has a different answer under the retired
// implementation than under this one.
// ────────────────────────────────────────────────────────────────────────────

describe('readGrLineQuantities — the ONE read of the quantity pair', () => {
  it('reads an unambiguous pair', () => {
    const out = readGrLineQuantities('1500', '1400');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.received).toBe(1500);
    expect(out.accepted).toBe(1400);
  });

  // THE DEFECT THAT NEEDS NO id-ID BROWSER. `type="number"` rejects a
  // comma-grouped token outright, so "1,500" left `.value` empty in en-US and
  // `Number('')` finished the job — a silent zero on a goods receipt.
  it('REFUSES "1,500" rather than resolving it — the en-US zero-fabrication path', () => {
    const out = readGrLineQuantities('1,500', '1500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('received');
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('REFUSES the cross-convention "1.500" — never 1.5 on a quantity that becomes stock', () => {
    const out = readGrLineQuantities('1.500', '1500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // BLANK REFUSES (operator ruling). The whole finding in one spec: a cleared
  // field used to become 0, and 0 satisfied every guard the wizard had.
  it('REFUSES a blank received quantity — a cleared field is not a receipt of none', () => {
    const out = readGrLineQuantities('', '0');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('received');
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES a blank accepted quantity too — both halves are required', () => {
    const out = readGrLineQuantities('1500', '');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('accepted');
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES a whitespace-only field — trimmed, then refused as empty', () => {
    const out = readGrLineQuantities('   ', '1500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  // A TYPED ZERO IS A REAL ASSERTION and survives intact — the distinction the
  // blank-refusal exists to protect, not to suppress. "Nothing arrived, and
  // someone said so."
  it('PRESERVES a typed zero on both halves — nothing arrived, and it is recorded', () => {
    const out = readGrLineQuantities('0', '0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.received).toBe(0);
    expect(out.accepted).toBe(0);
  });

  it('PRESERVES a typed zero ACCEPTED against a real received — a full rejection', () => {
    const out = readGrLineQuantities('1500', '0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.received).toBe(1500);
    expect(out.accepted).toBe(0);
  });

  it('REFUSES an unreadable token — never coerced, never defaulted', () => {
    const out = readGrLineQuantities('about 1500', '1500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  it('reads a fractional quantity — KG and L receipts are ordinary, no whole-number rule', () => {
    // Legal under EN only (id-ID would need a comma), so unambiguous.
    const out = readGrLineQuantities('12.5', '12.5');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.received).toBe(12.5);
  });

  it('names RECEIVED when both halves are unreadable — the field filled first', () => {
    const out = readGrLineQuantities('1.500', '2.400');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('received');
  });

  it('does NOT enforce accepted <= received — that guard stays in the wizard', () => {
    // The module parses and nothing else: the sign check, the <= invariant and
    // the rejection-reason rule remain in `receiptValid`, individually
    // untouched. They simply become unreachable under a refusal.
    const out = readGrLineQuantities('10', '999');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.accepted).toBe(999);
  });
});

describe('seedQty — the form must not refuse its own untouched default', () => {
  it('seeds CANONICAL, ungrouped digits', () => {
    expect(seedQty(2400)).toBe('2400');
    expect(seedQty(0)).toBe('0');
  });

  it('THE LOCK — every seeded value round-trips through the parser', () => {
    // The IntakeAdjustDrawer trap: a GROUPED seed ("2.400") is exactly the token
    // the parser refuses as AMBIGUOUS, so a form seeded with `formatNumber`
    // would open in a refusing state on values nobody had touched.
    for (const n of [0, 1, 12.5, 1500, 2400, 120_000, 200_000]) {
      const out = readGrLineQuantities(seedQty(n), seedQty(n));
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.received).toBe(n);
    }
  });
});

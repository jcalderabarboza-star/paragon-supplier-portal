import { describe, it, expect } from 'vitest';
import {
  readConfirmedQty,
  readConfirmedQuantities,
  seedConfirmQty,
} from './poConfirmModel';

// ────────────────────────────────────────────────────────────────────────────
// poConfirmModel (CP-0 · W1 · 2f-c) — the first lock, built in front of a
// second (`poConfirmQtyWithinOrdered`) that already holds. Every spec below
// DISCRIMINATES against the retired `Number(e.target.value)` path.
// ────────────────────────────────────────────────────────────────────────────

describe('readConfirmedQty — the ONE read of a confirm cell', () => {
  it('reads an unambiguous quantity', () => {
    const out = readConfirmedQty('5000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(5000);
  });

  // THE READING THE POLICY CANNOT CATCH — the live defect this batch closes.
  // `Number('1.500')` is 1.5, and 0 < 1.5 ≤ 5000 PASSES the bounds policy, so
  // the misread was stamped onto the stored line and `expectedValue`
  // (Σ confirmedQty × unitPrice) — the 3-way match input — was poisoned.
  it('REFUSES "1.500" rather than resolving it to 1.5 — the token the second lock passes', () => {
    const out = readConfirmedQty('1.500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // Previously: `type="number"` eats the comma-grouped token in en-US
  // (`.value === ''`), `Number('')` is 0, and the POLICY bounced it — with a
  // raw English debug string naming bounds the operator never violated. The
  // refusal now happens at the cell, named, before any dispatch.
  it('REFUSES "1,500" at the cell — no dispatch, no debug-string toast', () => {
    const out = readConfirmedQty('1,500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // BLANK REFUSES. These cells are seeded from the ordered quantity, so every
  // blank is operator-CLEARED. The retired path fabricated `Number('') === 0`
  // into state and let the dispatcher bounce it after the fact.
  it('REFUSES a cleared cell — a cleared confirmation is not a confirmation of none', () => {
    const out = readConfirmedQty('');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES an unreadable token — never coerced, never defaulted', () => {
    const out = readConfirmedQty('approx 5000');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  // A TYPED ZERO PARSES INTACT — it is the POLICY that refuses it (0 < q),
  // and the surface mirrors that in the operator's language. The parse holds
  // no domain rule; the distinction between "unreadable" and "not allowed"
  // is the whole architecture of this batch.
  it('PRESERVES a typed zero — the parse reads it; the bounds policy is what refuses it', () => {
    const out = readConfirmedQty('0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(0);
  });

  it('reads a fractional quantity — KG and L confirmations are ordinary', () => {
    const out = readConfirmedQty('12.5');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(12.5);
  });

  // The 2f-b boundary, both sides — where grouped Indonesian digits stop being
  // ambiguous. ONE separator ("150.000") is legal under BOTH conventions
  // (150,000 id vs 150.0 en) and refuses; TWO separators ("1.500.000") are
  // legal under id ONLY, so there is exactly one honest answer and it is given.
  it('REFUSES single-group "150.000" — the en reading 150.0 is also legal', () => {
    const out = readConfirmedQty('150.000');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('READS multi-group "1.500.000" — only one convention parses it', () => {
    const out = readConfirmedQty('1.500.000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(1_500_000);
  });
});

describe('readConfirmedQuantities — the composite the dispatch reads', () => {
  it('reads every line when every line is readable', () => {
    const out = readConfirmedQuantities(['5000', '300']);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quantities).toEqual([5000, 300]);
  });

  it('names the FIRST refusing line by index', () => {
    const out = readConfirmedQuantities(['5000', '']);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.line).toBe(1);
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('does NOT enforce the bounds — that is the policy, not the parse', () => {
    // 0 and an over-ordered 999999 both READ; `confirmedQtyWithinBounds` and
    // the policy hook are what refuse them. No second recipe of the law.
    const out = readConfirmedQuantities(['0', '999999']);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quantities).toEqual([0, 999999]);
  });

  it('an empty confirmation (no lines) reads as an empty list — covering-every-line is the flow’s rule', () => {
    const out = readConfirmedQuantities([]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quantities).toEqual([]);
  });
});

describe('seedConfirmQty — the form must not refuse its own untouched defaults', () => {
  it('seeds CANONICAL, ungrouped digits', () => {
    expect(seedConfirmQty(150000)).toBe('150000');
    expect(seedConfirmQty(300)).toBe('300');
  });

  // THE LOCK — live on open here, not latent: the real fixtures order 5,000 /
  // 150,000 / 500,000, all large enough that a display-formatter seed would
  // GROUP ("150.000") into exactly the token the parser refuses. The wizard
  // would open with every line refusing values nobody touched.
  it('THE LOCK — every seeded ordered quantity round-trips through the parser', () => {
    for (const n of [1, 300, 2000, 5000, 12.5, 150_000, 500_000]) {
      const out = readConfirmedQty(seedConfirmQty(n));
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.value).toBe(n);
    }
  });

  it('and the grouped alternative really would refuse — the counter-case, asserted', () => {
    const grouped = new Intl.NumberFormat('id-ID').format(150000);
    expect(grouped).toBe('150.000');
    const out = readConfirmedQty(grouped);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });
});

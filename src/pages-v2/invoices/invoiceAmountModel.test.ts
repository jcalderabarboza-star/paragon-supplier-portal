import { describe, it, expect } from 'vitest';
import { readInvoiceAmount } from './invoiceAmountModel';

// ────────────────────────────────────────────────────────────────────────────
// invoiceAmountModel (CP-0 · W1 · 2f-d) — the other operand of the SAME verdict
// 2f-c defended. `deriveMatchVerdict(expectedValue, inv.amount, …)`: 2f-c stopped
// a misread confirmed quantity poisoning the first, this stops a misread amount
// poisoning the second, and either produces the same false accusation against a
// supplier — an honest invoice booked 'Price Variance'.
//
// 2f-FIND-04's guard was REAL (`!Number.isFinite(amount) || amount <= 0`), so
// this batch closes only what a finiteness check structurally cannot see.
// ────────────────────────────────────────────────────────────────────────────

describe('readInvoiceAmount — what the finiteness guard could not see', () => {
  it('reads an unambiguous amount', () => {
    const out = readInvoiceAmount('185000000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(185_000_000);
  });

  // THE ONLY THING THAT GOT THROUGH. finite ✓, positive ✓ — the guard waves 1.5
  // past, and an Rp 1,500 invoice is stored as Rp 1.5, then compared against a
  // correct expectedValue and booked 'Price Variance'.
  it('REFUSES "1.500" rather than resolving it to 1.5 — the token the guard passes', () => {
    const out = readInvoiceAmount('1.500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('READS multi-group "185.000.000" — one convention parses it, so it is not ambiguous', () => {
    // The way an Indonesian supplier actually types an invoice amount. The
    // retired `type="number"` rejected the token outright (`.value === ''`),
    // so `Number('')` was 0 and the guard refused a perfectly real invoice —
    // an expressibility failure hiding inside a working guard.
    const out = readInvoiceAmount('185.000.000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(185_000_000);
  });

  it('REFUSES single-group "185.000" — the en reading 185.0 is also legal', () => {
    const out = readInvoiceAmount('185.000');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('REFUSES a blank — the field is UNSEEDED, so this is the 2e-a gate case', () => {
    // Refuses at the gate (submit disabled); the surface does not nag on sight,
    // because an untouched blank here is a form not yet filled, not a cleared
    // fact (contrast the seeded 2f-a/2f-c cells).
    const out = readInvoiceAmount('');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES an unreadable token', () => {
    const out = readInvoiceAmount('about 185m');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  it('REFUSES a negative amount without needing its own branch', () => {
    const out = readInvoiceAmount('-185000');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  // A TYPED ZERO parses intact; the pre-existing `> 0` submit rule is what
  // refuses it, PRESERVED VERBATIM. Whether a zero-value invoice is legal is a
  // commercial question, not a parsing one.
  it('PRESERVES a typed zero — the parse reads it; the `> 0` submit rule refuses it', () => {
    const out = readInvoiceAmount('0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(0);
  });

  it('reads a fractional amount — IDR sub-unit entry is not the parser’s business to forbid', () => {
    const out = readInvoiceAmount('1234.56');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(1234.56);
  });
});

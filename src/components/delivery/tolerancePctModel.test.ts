import { describe, it, expect } from 'vitest';
import { readTolerancePct, seedTolerancePct } from './tolerancePctModel';

// ────────────────────────────────────────────────────────────────────────────
// tolerancePctModel (CP-0 · W1 · 2f-d) — an EXPRESSIBILITY failure, not a
// misread. Every other member of the 4b-FIND-01 family produced a wrong value;
// this one produced an IMPOSSIBLE INPUT: the platform's default locale could not
// write a decimal tolerance at all, and nothing said why.
// ────────────────────────────────────────────────────────────────────────────

describe('readTolerancePct — the input an id-ID user could not previously enter', () => {
  // THE HEADLINE SPEC. "2,5" is the ONLY correct way to write two-and-a-half in
  // id-ID. `type="number"` ate it (`.value === ''`), which landed on pctInvalid,
  // which disabled Save and rendered nothing. This is a capability GAIN: the
  // value is not merely parsed correctly now, it is enterable at all.
  it('READS "2,5" — unambiguous, because only the id convention can parse it', () => {
    const out = readTolerancePct('2,5');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pct).toBe(2.5);
    expect(out.fraction).toBe(0.025);
  });

  it('READS a plain "10" identically under either convention', () => {
    const out = readTolerancePct('10');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pct).toBe(10);
    expect(out.fraction).toBe(0.1);
  });

  it('READS the en form "2.5" too — both conventions are served, neither is guessed', () => {
    const out = readTolerancePct('2.5');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pct).toBe(2.5);
  });

  it('REFUSES a cross-convention "1.500" rather than picking a reading', () => {
    const out = readTolerancePct('1.500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('REFUSES a blank — and the surface now SAYS so instead of muting Save', () => {
    const out = readTolerancePct('');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES an unreadable token', () => {
    const out = readTolerancePct('ten percent');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  it('REFUSES a negative without needing its own branch', () => {
    const out = readTolerancePct('-5');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  // A typed zero is a REAL, STRICT policy (exactly on the agreed quantity, no
  // slack) and is distinct from `null` = unlimited. Neither is "absent".
  it('PRESERVES a typed zero — zero slack is a policy, not an absence', () => {
    const out = readTolerancePct('0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pct).toBe(0);
    expect(out.fraction).toBe(0);
  });

  // NO UPPER BOUND, on the record: a >100% envelope is conceivably meaningful,
  // and inventing a ceiling nobody asked for would be severity invention.
  it('accepts a >100% tolerance — no invented ceiling (noted non-defect)', () => {
    const out = readTolerancePct('250');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.fraction).toBe(2.5);
  });
});

describe('seedTolerancePct — the form must not refuse or misreport its own default', () => {
  it('seeds a stored fraction as canonical percent digits', () => {
    expect(seedTolerancePct(0.1)).toBe('10');
    expect(seedTolerancePct(0.25)).toBe('25');
    expect(seedTolerancePct(0)).toBe('0');
  });

  it('seeds null as blank — "unlimited" has no percentage to show', () => {
    expect(seedTolerancePct(null)).toBe('');
  });

  // THE FLOAT TRAP, and why the retired `String(frac * 100)` was not enough.
  // IEEE 754 makes `0.07 * 100` equal 7.000000000000001, so the old `toPct`
  // seeded a number NOBODY TYPED into the box — and worse, made an UNTOUCHED
  // Save read as a real change (7.000000000000001 / 100 !== 0.07), stamping a
  // fabricated policy-deviation event with a who/when/why triple.
  //
  // The exact values matter, so they are asserted rather than described: these
  // are the artefacts, found by enumeration, not assumed. (0.075 is NOT one —
  // my first draft of this spec claimed it was, and the test caught me.)
  it('THE FLOAT TRAP — 0.07 seeds as "7", not 7.000000000000001', () => {
    expect(String(0.07 * 100)).toBe('7.000000000000001'); // the retired behaviour
    expect(seedTolerancePct(0.07)).toBe('7'); // the fix
  });

  it('THE FLOAT TRAP, both directions — 0.29 rounds UP-short, 0.55 over', () => {
    expect(String(0.29 * 100)).toBe('28.999999999999996');
    expect(String(0.55 * 100)).toBe('55.00000000000001');
    expect(seedTolerancePct(0.29)).toBe('29');
    expect(seedTolerancePct(0.55)).toBe('55');
  });

  it('THE LOCK — every seeded fraction round-trips back to ITSELF', () => {
    // Both halves: the seed must parse, AND it must return the same stored
    // fraction, or an untouched form would look edited.
    // Includes the four enumerated float artefacts (0.07 / 0.28 / 0.29 / 0.55),
    // which is what makes this lock discriminate rather than decorate.
    for (const frac of [0, 0.01, 0.025, 0.05, 0.07, 0.075, 0.1, 0.15, 0.25, 0.28, 0.29, 0.55, 0.57, 1, 2.5]) {
      const seeded = seedTolerancePct(frac);
      const out = readTolerancePct(seeded);
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.fraction).toBe(frac);
    }
  });

  it('and the grouped alternative really would refuse — the counter-case, asserted', () => {
    // A display formatter would render a large percent grouped ("1.500" for
    // 1500%), which is exactly the token the parser refuses.
    const grouped = new Intl.NumberFormat('id-ID').format(1500);
    expect(grouped).toBe('1.500');
    expect(readTolerancePct(grouped).ok).toBe(false);
  });
});

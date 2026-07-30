import { describe, it, expect } from 'vitest';
import {
  normalizeContractNumbers,
  readContractValue,
  readNoticeRequiredDays,
  seedContractNumber,
} from './contractCreateModel';

// ────────────────────────────────────────────────────────────────────────────
// contractCreateModel (CP-0 · W1 · 2f-b) — the ONE read of the contract-create
// wizard's two numbers, and the states each can honestly be in.
//
// 2f-FIND-02. The retired path read `draft.value` three times with three recipes
// and `draft.noticeRequiredDays` three more, both behind `type="number"`.
//
// Every spec below DISCRIMINATES — each has a different answer under the retired
// implementation than under this one. Where a spec's old answer was "also
// blocked, but for the wrong reason and with no message", that is stated.
// ────────────────────────────────────────────────────────────────────────────

describe('readContractValue — the ONE read of the commitment', () => {
  it('reads an unambiguous value', () => {
    const out = readContractValue('4500000000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(4_500_000_000);
  });

  // THE DEFECT NO GATE COULD CATCH. "1.500" is a VALID float, so `Number`
  // returned 1.5, `1.5 > 0` passed the step gate, and the contract stored Rp 1.5
  // — which `formatIDR` (0 fraction digits) then rounded to "Rp 2". A 1000×
  // understatement of a commercial commitment, rendered as a confident number.
  it('REFUSES "1.500" rather than resolving it to 1.5 — the 1000× understatement', () => {
    const out = readContractValue('1.500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // THE BEST CASE FOR THE PARSER, and the one a refuse-everything-grouped rule
  // would have got wrong. Fully grouped Indonesian digits are NOT ambiguous:
  // only the id reading parses them at all (en cannot take three decimal points),
  // so there is exactly one honest answer and `normalizeQty` gives it. The
  // retired path could not: `type="number"` rejects the token outright, leaving
  // `.value === ''`, and `Number('') || 0` turned an Rp 4.5bn agreement into
  // Rp 0. This is the way an Indonesian buyer actually types the number.
  it('READS a fully grouped "4.500.000.000" — one convention parses it, so it is not ambiguous', () => {
    const out = readContractValue('4.500.000.000');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(4_500_000_000);
  });

  // Previously blocked, but ANONYMOUSLY: `type="number"` empties a comma-grouped
  // token in en-US, `Number('')` is 0, and `0 > 0` held the wizard on step 2 with
  // nothing said. The refusal is the change — the field now names the fix.
  it('REFUSES "1,500" with a NAMED reason, not a silent disabled Next', () => {
    const out = readContractValue('1,500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // BLANK REFUSES (operator ruling, 2f-b). There is no dispatcher behind this
  // page to catch an omission — the parse gate is the only lock (see the module
  // header), so a blank has to refuse here or nowhere.
  it('REFUSES a blank value — a contract with no value is not a contract for nothing', () => {
    const out = readContractValue('');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES a whitespace-only value — trimmed, then refused as empty', () => {
    const out = readContractValue('   ');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES an unreadable token — never coerced, never defaulted to 0', () => {
    const out = readContractValue('about 4.5bn');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  it('REFUSES a negative value without needing its own branch', () => {
    const out = readContractValue('-4500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  // A TYPED ZERO IS A REAL ASSERTION and survives the parse intact — the
  // distinction the blank-refusal exists to protect. It is the pre-existing `> 0`
  // STEP GATE that stops it, not the parser, and that separation is deliberate:
  // whether a zero-value contract is legal is a commercial question.
  it('PRESERVES a typed zero — the parse reads it; the `> 0` gate is what refuses it', () => {
    const out = readContractValue('0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(0);
  });
});

describe('readNoticeRequiredDays — the field that had NO gate at all', () => {
  it('reads the seeded default', () => {
    const out = readNoticeRequiredDays('90');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(90);
  });

  // THE PURE `|| 0` FABRICATION. `value` was at least incidentally shielded by
  // the `> 0` step gate; the notice period had nothing. A cleared field became
  // `Number('') || 0` → a contract asserting a notice requirement of zero days.
  it('REFUSES a blank notice period — a cleared field is not a zero-day notice', () => {
    const out = readNoticeRequiredDays('');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  it('REFUSES an unreadable notice period rather than defaulting it to 0', () => {
    const out = readNoticeRequiredDays('ninety');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
  });

  it('REFUSES an ambiguous "1.500" — never 1.5 days on a contractual term', () => {
    const out = readNoticeRequiredDays('1.500');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  // No whole-number rule, the `readMoq` reasoning: the parser does not legislate
  // a convention it was not asked to enforce.
  it('does NOT invent a whole-number rule', () => {
    const out = readNoticeRequiredDays('45.5');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(45.5);
  });

  it('PRESERVES a typed zero — "no notice required" is a real term', () => {
    const out = readNoticeRequiredDays('0');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe(0);
  });
});

describe('normalizeContractNumbers — the composite the gate and the entity read', () => {
  it('reads both numbers when both are unambiguous', () => {
    const out = normalizeContractNumbers({
      value: '4500000000',
      noticeRequiredDays: '90',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toEqual({ value: 4_500_000_000, noticeRequiredDays: 90 });
  });

  it('names VALUE first when both refuse — the field the operator fills', () => {
    const out = normalizeContractNumbers({
      value: '1.500',
      noticeRequiredDays: '2.400',
    });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('value');
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });

  it('names NOTICE when only the notice period refuses', () => {
    const out = normalizeContractNumbers({
      value: '4500000000',
      noticeRequiredDays: '',
    });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('noticeRequiredDays');
    expect(out.reason).toBe('EMPTY_QTY');
  });

  // The composite holds no domain rule — `> 0` stays in the step gate, exactly
  // as the three receipt guards stayed in `receiptValid` (2f-a). It parses and
  // nothing else.
  it('does NOT enforce the `> 0` rule — that stays in the step gate', () => {
    const out = normalizeContractNumbers({ value: '0', noticeRequiredDays: '90' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.value).toBe(0);
  });
});

describe('seedContractNumber — the form must not refuse its own untouched default', () => {
  it('seeds CANONICAL, ungrouped digits', () => {
    expect(seedContractNumber(90)).toBe('90');
    expect(seedContractNumber(0)).toBe('0');
  });

  // THE LOCK — the IntakeAdjustDrawer trap (PR-2b), repeated in 2f-a, locked
  // again here: a seed produced by a DISPLAY formatter is exactly the token the
  // parser refuses, so the form would open in a refusing state on a value nobody
  // touched.
  //
  // STATED HONESTLY: for THIS page's only current default (90 days) the risk is
  // LATENT, not live — `Intl` does not group three digits, so a grouped seed
  // would round-trip anyway. The four-digit values below are what make this spec
  // discriminate, and they are why the helper exists: the next numeric default
  // added to this wizard is where it bites. A revert probe confirmed that without
  // them the spec passes on a deliberately broken `seedContractNumber`.
  it('THE LOCK — every seeded value round-trips through the parser', () => {
    for (const n of [0, 1, 30, 60, 90, 365, 1500, 2400, 12_000, 4_500_000_000]) {
      const out = readNoticeRequiredDays(seedContractNumber(n));
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.value).toBe(n);
    }
  });

  it('and the grouped alternative it rules out really would refuse', () => {
    // The counter-case, asserted rather than assumed — this is the fact that
    // makes the helper load-bearing instead of decorative.
    const grouped = new Intl.NumberFormat('id-ID').format(1500);
    expect(grouped).toBe('1.500');
    const out = readNoticeRequiredDays(grouped);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
  });
});

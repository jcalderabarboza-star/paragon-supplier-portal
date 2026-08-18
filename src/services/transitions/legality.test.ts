// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// `userVerbsFrom` — the seam that answers "what may a person do from here?"
//
// ⚠️ RULE 4, AND IT IS NOT DECORATION HERE. This function's failure mode is
// returning `[]`, and `[]` is ALSO its correct answer for a terminal state, an
// unknown entity and a typo. A one-directional probe — "does it decline the bad
// state?" — passes on a function that declines everything, which is exactly the
// broken instrument that would have re-hidden the release button. Every
// emptiness assertion below is therefore paired with a MEMBERSHIP assertion on
// the same flow.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { userVerbsFrom, isTerminalState, getFlow } from './index';

describe('userVerbsFrom — legality, derived from the machine', () => {
  it('answers at all: the known-GOOD state yields the verb the defect hid', () => {
    const ids = userVerbsFrom('invoice', 'Approved').map((t) => t.id);
    expect(ids).toContain('t_invoice_release_payment');
    expect(ids).toContain('t_invoice_dispute');
  });

  it('is asked with the CANONICAL state — the display label is not a state at all', () => {
    // 'Overdue' is a clock-derived DISPLAY label (DR-8), never a member of the
    // machine. Passing it must yield nothing — and the paired assertion proves
    // the empty answer is about the input, not about a broken lookup.
    expect(userVerbsFrom('invoice', 'Overdue')).toEqual([]);
    expect(userVerbsFrom('invoice', 'Approved').length).toBeGreaterThan(0);
  });

  it('offers ONLY user-triggered verbs — system and cascade edges are not affordances', () => {
    // 'Payment Released' has exactly one declared exit, t_invoice_remit, and it
    // is system-triggered: the surface must not render it as a button (PF-1a).
    const declared = getFlow('invoice')!.transitions.filter((t) =>
      t.from.includes('Payment Released'),
    );
    expect(declared.map((t) => t.id)).toEqual(['t_invoice_remit']);
    expect(userVerbsFrom('invoice', 'Payment Released')).toEqual([]);

    // Same shape on another flow, so the rule is not an invoice accident.
    expect(userVerbsFrom('quotation', 'Under Review')).toEqual([]);
    expect(userVerbsFrom('goodsReceipt', 'Quality Hold').map((t) => t.id)).toContain(
      't_gr_request_retest',
    );
  });

  it('never returns a creation verb — it has no `from` to be legal from', () => {
    const all = getFlow('invoice')!.states.flatMap((s) => userVerbsFrom('invoice', s));
    expect(all.map((t) => t.id)).not.toContain('t_invoice_create');
    expect(all.length).toBeGreaterThan(0);
  });

  it('is total over nonsense — and still non-empty for sense', () => {
    expect(userVerbsFrom('no_such_entity', 'Approved')).toEqual([]);
    expect(userVerbsFrom('invoice', 'No Such State')).toEqual([]);
    expect(userVerbsFrom('invoice', '')).toEqual([]);
    expect(userVerbsFrom('invoice', 'Disputed').map((t) => t.id)).toEqual(['t_invoice_resolve']);
  });
});

describe('isTerminalState — an ending is not the same as nothing to offer', () => {
  it('separates the two, which is the conflation the census rules warn about', () => {
    // Terminal: the flow declares it an end.
    expect(isTerminalState('invoice', 'Remittance Received')).toBe(true);
    // NOT terminal, and no user verb either — a state the surface cannot leave.
    // That is a FINDING, not an ending, and the two must not read alike.
    expect(isTerminalState('invoice', 'Payment Released')).toBe(false);
    expect(userVerbsFrom('invoice', 'Payment Released')).toEqual([]);
  });

  it('is false for an unknown entity rather than throwing', () => {
    expect(isTerminalState('no_such_entity', 'Whatever')).toBe(false);
    expect(isTerminalState('invoice', 'Remittance Received')).toBe(true);
  });
});

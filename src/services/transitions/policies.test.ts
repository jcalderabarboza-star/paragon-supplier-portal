import { describe, it, expect } from 'vitest';
import { resolvePolicyHook, confirmedQtyWithinBounds } from './policies';
import { POLICY_HOOKS } from './policyHooks';
import type { CommandTarget } from './dispatcher';

// ────────────────────────────────────────────────────────────────────────────
// poConfirmQtyWithinOrdered — the policy's FIRST direct unit tests (CP-0 · 2f-c).
//
// This hook carries the ENTIRE enforcement of the PO-confirm quantity bound,
// and until this file its only coverage was schema-membership ("the transition
// lists the hook") — the "correct mechanism with nothing verifying it is
// load-bearing" shape from 4a and 2f-a. These specs exercise the hook ITSELF,
// through `resolvePolicyHook`, exactly as the dispatcher resolves it.
//
// The NaN spec discriminates the 2f-c spec edit: under the retired
// `typeof q !== 'number'` guard, NaN passed all three checks (typeof NaN is
// 'number'; NaN <= 0 and NaN > ordered are both false) and would have stamped
// `confirmedQty: NaN` into the store — poisoning `expectedValue`, the 3-way
// match input, permanently.
// ────────────────────────────────────────────────────────────────────────────

const PO = {
  id: 'po-x',
  status: 'Sent',
  supplierId: 'sup-007',
  lineItems: [
    { id: 'li-1', quantity: 5000 },
    { id: 'li-2', quantity: 300 },
  ],
};

const target: CommandTarget = {
  readState: () => 'Sent',
  readScopeOwner: () => 'sup-007',
  readEntity: () => PO,
  applyTransition: () => {},
};

const hook = resolvePolicyHook(POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED)!;

const run = (confirmedQuantities: unknown) =>
  hook({
    entityId: 'po-x',
    currentState: 'Sent',
    toState: 'Confirmed',
    payload: { confirmedQuantities },
    target,
  });

describe('poConfirmQtyWithinOrdered — the law the 2f-c parse gate is built in front of', () => {
  it('PASSES a full confirmation at the ordered quantities', () => {
    expect(run([5000, 300]).ok).toBe(true);
  });

  it('PASSES the q = ordered boundary exactly — ≤ is inclusive', () => {
    // The boundary the operator named: the most common confirmation of all
    // (confirm-as-ordered) sits exactly ON the bound and must not be refused.
    expect(run([5000, 1]).ok).toBe(true);
    expect(run([1, 300]).ok).toBe(true);
  });

  it('REFUSES a zero line — the register-corrected fact: zero does NOT pass "within ordered"', () => {
    // 2f-FIND-03 as filed claimed a zero confirmation passes this hook. It does
    // not, and never did: the bound is 0 < q, not 0 ≤ q. This spec pins the
    // corrected reading so the register cannot drift wrong again.
    const res = run([0, 300]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/line 1/);
  });

  it('REFUSES an over-ordered line, naming the line and the bound', () => {
    const res = run([5000, 301]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/line 2/);
    expect(res.reason).toMatch(/300/);
  });

  it('REFUSES NaN — the num() hole, closed (2f-c spec edit)', () => {
    // typeof NaN === 'number', and NaN fails both comparisons — under the
    // retired guard this was APPROVED and stamped NaN into the store.
    const res = run([NaN, 300]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/line 1/);
  });

  it('REFUSES Infinity by the same finiteness rule', () => {
    expect(run([Infinity, 300]).ok).toBe(false);
  });

  it('REFUSES a confirmation that does not cover every line', () => {
    const res = run([5000]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/every line/);
  });

  it('REFUSES a non-numeric entry outright', () => {
    expect(run(['5000', 300]).ok).toBe(false);
  });
});

describe('confirmedQtyWithinBounds — the ONE shared expression of the bound', () => {
  // The surface mirror imports THIS predicate — one expression, two consumers,
  // so the courtesy display cannot drift from the law it mirrors.
  it('agrees with the hook on the boundary and the refusals', () => {
    expect(confirmedQtyWithinBounds(5000, 5000)).toBe(true);
    expect(confirmedQtyWithinBounds(1, 5000)).toBe(true);
    expect(confirmedQtyWithinBounds(0, 5000)).toBe(false);
    expect(confirmedQtyWithinBounds(5001, 5000)).toBe(false);
    expect(confirmedQtyWithinBounds(NaN, 5000)).toBe(false);
  });
});

// GL-0 — the refusal vocabulary, pinned BILATERALLY to the code that emits it.
//
// The array in `refusals.ts` is a PINNED COPY, not the source. The source is
// `dispatcher.ts`, and this file derives from it: a prefix the dispatcher
// constructs but the vocabulary omits is red, and a member the dispatcher never
// constructs is red. Without the second direction the array could outlive its
// subject — the `C9-STALE-BY-FIX-01` shape, one grain down.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMAND_REFUSALS, refusal, refusalKindOf, type CommandRefusal } from './refusals';

const dispatcherSource = () => readFileSync(join(__dirname, 'dispatcher.ts'), 'utf8');

/**
 * Every refusal kind the dispatcher constructs, **in the order it constructs
 * them** — de-duplicated keeping FIRST occurrence, so a kind built at two sites
 * takes the position of the earlier one.
 */
function constructedInOrder(): string[] {
  const src = dispatcherSource();
  const seen: string[] = [];
  const push = (k: string) => {
    if (!seen.includes(k)) seen.push(k);
  };
  const hits: { at: number; kind: string }[] = [];
  // `refusal('KIND'` — the post-GL-0 construction form.
  for (const m of src.matchAll(/\brefusal\(\s*'([A-Z_]+)'/g)) hits.push({ at: m.index!, kind: m[1] });
  // Bare literals passed as the reason argument — the pre-GL-0 form. Kept so
  // this test is meaningful BEFORE the dispatcher is re-pointed (it must fail
  // for the right reason, not vacuously pass on an empty derivation).
  for (const m of src.matchAll(/'failed',\s*[`']([A-Z_]+)/g)) hits.push({ at: m.index!, kind: m[1] });
  for (const h of hits.sort((a, b) => a.at - b.at)) push(h.kind);
  return seen;
}

/** Every refusal kind the dispatcher actually constructs, read from source. */
function derivedFromDispatcher(): string[] {
  return [...constructedInOrder()].sort();
}

describe('command refusal vocabulary (GL-0)', () => {
  const derived = derivedFromDispatcher();

  it('derives a non-empty population from the dispatcher', () => {
    expect(derived.length).toBeGreaterThan(5);
  });

  it('every refusal the dispatcher constructs is in the vocabulary', () => {
    const missing = derived.filter((d) => !(COMMAND_REFUSALS as readonly string[]).includes(d));
    expect(missing, `dispatcher emits refusals the vocabulary does not name: ${missing.join(', ')}`)
      .toEqual([]);
  });

  it('every vocabulary member is one the dispatcher constructs', () => {
    const orphan = COMMAND_REFUSALS.filter((m) => !derived.includes(m));
    expect(orphan, `vocabulary names refusals nothing emits: ${orphan.join(', ')}`).toEqual([]);
  });

  it('is frozen and free of duplicates', () => {
    expect(new Set(COMMAND_REFUSALS).size).toBe(COMMAND_REFUSALS.length);
  });

  // ⚠️ **THE ORDER WAS A COMMENT AND IS NOW A GATE (1c).** `refusals.ts` says
  // the array *"doubles as the refusal PRECEDENCE"* and that the ordering is
  // *"a fact about the machine, not a formatting choice"*. Until this spec,
  // BOTH membership directions were pinned and the ORDER was enforced by
  // nothing — so a tenth kind could be appended to the end while the dispatcher
  // evaluated it fourth, and every test here would still pass. That is the
  // exact shape of a claim the register keeps catching: a load-bearing property
  // asserted in prose beside the thing it describes.
  //
  // The proxy, stated because it is a proxy: this compares SOURCE ORDER, not
  // executed order. They coincide today because every construction sits in one
  // straight-line sequence — no refusal is built in a helper or behind a branch
  // that reorders it. A future dispatcher that hoists one would need this test
  // re-derived rather than re-sorted.
  it('the array order IS the dispatcher construction order, position for position', () => {
    const order = constructedInOrder();
    expect(order.length, 'the order derivation must see the dispatcher').toBeGreaterThan(5);
    expect(order).toEqual([...COMMAND_REFUSALS]);
  });

  // The known-good / known-bad pair for the ordering instrument itself. Without
  // these, `toEqual` passing over two empty arrays would read as a pass.
  it('CONTROL — the order derivation is non-empty and discriminating', () => {
    const order = constructedInOrder();
    expect(order[0]).toBe('UNKNOWN_TRANSITION');
    expect(order).toContain('STALE_STATE');
    // and it is a real ORDER, not a set: the state precondition is evaluated
    // after the role gate and before legality, which is the whole reason its
    // position in the array is semantic.
    expect(order.indexOf('STALE_STATE')).toBeGreaterThan(order.indexOf('ROLE_NOT_PERMITTED'));
    expect(order.indexOf('STALE_STATE')).toBeLessThan(order.indexOf('ILLEGAL_TRANSITION'));
    expect(order).not.toContain('SCOPE_DENIED'); // thrown, not returned — not a member
  });

  it('round-trips a bare refusal and a detailed one', () => {
    expect(refusal('MISSING_ENTITY_ID')).toBe('MISSING_ENTITY_ID');
    expect(refusal('ROLE_NOT_PERMITTED', 'gr:post')).toBe('ROLE_NOT_PERMITTED:gr:post');
    expect(refusalKindOf('ROLE_NOT_PERMITTED:gr:post')).toBe('ROLE_NOT_PERMITTED');
    expect(refusalKindOf('MISSING_ENTITY_ID')).toBe('MISSING_ENTITY_ID');
  });

  it('returns null for a reason this vocabulary does not own — never a default', () => {
    expect(refusalKindOf('SAP_REJECTED:whatever')).toBeNull();
    expect(refusalKindOf(undefined)).toBeNull();
    expect(refusalKindOf('')).toBeNull();
  });

  it('treats the detail as opaque — a colon inside it does not change the kind', () => {
    const kind: CommandRefusal = 'POLICY_REJECTED';
    expect(refusalKindOf(refusal(kind, 'hook:inner:detail'))).toBe('POLICY_REJECTED');
  });
});

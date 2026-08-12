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

/** Every refusal kind the dispatcher actually constructs, read from source. */
function derivedFromDispatcher(): string[] {
  const src = readFileSync(join(__dirname, 'dispatcher.ts'), 'utf8');
  const found = new Set<string>();
  // `refusal('KIND'` — the post-GL-0 construction form.
  for (const m of src.matchAll(/\brefusal\(\s*'([A-Z_]+)'/g)) found.add(m[1]);
  // Bare literals passed as the reason argument — the pre-GL-0 form. Kept so
  // this test is meaningful BEFORE the dispatcher is re-pointed (it must fail
  // for the right reason, not vacuously pass on an empty derivation).
  for (const m of src.matchAll(/'failed',\s*[`']([A-Z_]+)/g)) found.add(m[1]);
  return [...found].sort();
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

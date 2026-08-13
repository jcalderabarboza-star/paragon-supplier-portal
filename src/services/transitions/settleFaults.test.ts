// ─────────────────────────────────────────────────────────────────────────────
// §43 · THE SETTLE-FAULT VOCABULARY, PINNED BILATERALLY.
//
// The classifier is the whole of the ruling *"a permanent misconfiguration must
// not read as a retryable blip"*, so the things worth pinning are not that it
// compiles but that (a) every member is REACHABLE from some real input, (b) no
// input escapes the union, and (c) the code set it splits on is the one the
// dispatcher actually throws — DERIVED from `dispatcher.ts`, not restated here.
//
// ⚠️ (c) IS THE ONE THAT MATTERS. If a third `throw new DataError` is added to
// the dispatcher and nobody updates `DISPATCHER_THROWN_CODES`, that code would
// be silently reclassified from a governed refusal to a retryable TRANSPORT —
// a wrong answer that no test asserting only "the classifier works" could see.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DataError } from '../data/types';
import type { DataErrorCode } from '../data/types';
import {
  SETTLE_FAULTS,
  SETTLE_FAULT_RETRYABLE,
  DISPATCHER_THROWN_CODES,
  classifySettleFault,
  settleFault,
  settleFaultDetail,
  settleFaultKindOf,
} from './settleFaults';
import { refusal } from './refusals';

describe('settle faults — the vocabulary', () => {
  it('classifies a known-GOOD input first: the function answers at all', () => {
    // Rule 4. Everything below is only meaningful if the classifier runs — a
    // classifier that threw on every input would make each "not REFUSED"
    // assertion below pass for the wrong reason.
    expect(SETTLE_FAULTS).toContain('REFUSED');
    expect(classifySettleFault(new DataError('NOT_FOUND', 'gone'))).toBe('REFUSED');
  });

  it('every member is reachable from a real input, and nothing escapes the union', () => {
    const samples: readonly unknown[] = [
      new DataError('NOT_FOUND', 'gone'), // REFUSED
      new DataError('SCOPE_DENIED', 'no'), // REFUSED
      new DataError('UPSTREAM', 'no answer'), // TRANSPORT
      new DataError('CHAOS', 'injected'), // TRANSPORT
      new DataError('UNKNOWN', 'unclassified'), // TRANSPORT
      new Error('flow \'x\' is already registered'), // UNGOVERNED — registry.ts:25
      new TypeError('x is not a function'), // UNGOVERNED
      'a thrown string', // UNGOVERNED
      null, // UNGOVERNED
      undefined, // UNGOVERNED
    ];
    const seen = new Set(samples.map(classifySettleFault));
    // BOTH directions: every classification is a member …
    for (const s of seen) expect(SETTLE_FAULTS).toContain(s);
    // … and every member is produced by something. A member no input can reach
    // is a member with no definition in practice, whatever the glossary says.
    expect([...seen].sort()).toEqual([...SETTLE_FAULTS].sort());
  });

  it('splits on the codes the DISPATCHER ITSELF throws — derived from its source', () => {
    // Project-relative: vitest runs from the repo root, and the path is the
    // module this vocabulary is a boundary for.
    const src = readFileSync('src/services/transitions/dispatcher.ts', 'utf8');
    const thrown = new Set(
      [...src.matchAll(/throw new DataError\(\s*'([A-Z_]+)'/g)].map((m) => m[1]),
    );
    // Known-GOOD control on the DERIVATION, not just on its result: if the regex
    // matched nothing the set-equality below would still pass whenever the
    // constant were emptied too. An empty population reporting clean is
    // `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b) and it is exactly what this catches.
    expect(thrown.size, `codes matched in dispatcher.ts: ${[...thrown].join(', ')}`)
      .toBeGreaterThan(0);
    expect([...thrown].sort()).toEqual([...DISPATCHER_THROWN_CODES].sort());
  });

  it('a DataError code the dispatcher does NOT throw is TRANSPORT, not REFUSED', () => {
    // The F1 direction, and the reason the split keys on the code rather than on
    // `instanceof DataError`: `httpDataService` will throw UPSTREAM for a dead
    // backend, and filing that as a governed refusal is the exact misreading the
    // ruling forbids.
    const notThrown: readonly DataErrorCode[] = (['UPSTREAM', 'CHAOS', 'UNKNOWN'] as const).filter(
      (c) => !DISPATCHER_THROWN_CODES.includes(c),
    );
    expect(notThrown.length).toBeGreaterThan(0);
    for (const code of notThrown) {
      expect(classifySettleFault(new DataError(code, 'x'))).toBe('TRANSPORT');
    }
  });

  it('retryability is total over the union, and UNGOVERNED is NOT retryable', () => {
    for (const m of SETTLE_FAULTS) expect(typeof SETTLE_FAULT_RETRYABLE[m]).toBe('boolean');
    // The ruling, as an assertion: a fault that never entered the governed
    // channel is not offered as a passing blip.
    expect(SETTLE_FAULT_RETRYABLE.UNGOVERNED).toBe(false);
    expect(SETTLE_FAULT_RETRYABLE.REFUSED).toBe(false);
    expect(SETTLE_FAULT_RETRYABLE.TRANSPORT).toBe(true);
  });

  it('the detail is what the throw CALLS itself — never its message', () => {
    expect(settleFaultDetail(new DataError('UPSTREAM', 'gateway said nothing'))).toBe('UPSTREAM');
    expect(settleFaultDetail(new TypeError('x is not a function'))).toBe('TypeError');
    expect(settleFaultDetail('bare string')).toBe('String');
    expect(settleFaultDetail(null)).toBe('unknown');
    // The message is free-form prose; putting it in the wire value would be the
    // stringly-reason class GL-0 retired, one vocabulary over.
    expect(settleFaultDetail(new DataError('UPSTREAM', 'gateway said nothing')))
      .not.toContain('gateway');
  });

  it('round-trips the wire value, and does NOT claim the refusal vocabulary', () => {
    expect(settleFaultKindOf(settleFault('TRANSPORT', 'UPSTREAM'))).toBe('TRANSPORT');
    expect(settleFaultKindOf(settleFault('UNGOVERNED'))).toBe('UNGOVERNED');
    // Two vocabularies, not one. Folding either into the other would make a
    // census of either silently wrong — `refusalKindOf`'s null-is-real rule.
    expect(settleFaultKindOf(refusal('POLICY_REJECTED', 'x:y'))).toBeNull();
    expect(settleFaultKindOf(undefined)).toBeNull();
  });
});

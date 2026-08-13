// ─────────────────────────────────────────────────────────────────────────────
// D-F · THE `DataError` SHAPE, PINNED — and the requirement F1 inherits.
//
// `cause?: unknown` was deleted here on 2026-08-13 (§41). It was never
// populated: all seven construction sites passed two arguments, and all seven
// are policy refusals or synthetic injection with no underlying failure to wrap.
// The requirement that replaced it lives beside `DataErrorCode` in `types.ts`,
// and this file is what stops that requirement being a promise with no verifier.
//
// ⚠️ **WHY AN ENUMERABILITY TEST AND NOT A "DOES IT EXIST" TEST.** The defect was
// never that a cause was present — it was that this one was declared as a class
// FIELD, which makes it an own ENUMERABLE property, where the platform's
// `new Error(msg, { cause })` makes it own and NON-ENUMERABLE. Enumerable means
// `JSON.stringify` includes it, so a populated cause would reach every log line,
// telemetry payload and audit record with nobody having chosen. A test that only
// asserted absence would go green the day somebody re-adds it the same wrong way.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { DataError } from './types';

describe('DataError — the DR-4 failure channel', () => {
  it('still is an Error, and still survives instanceof across the target', () => {
    // The known-GOOD assertion, and it runs first: everything below is only
    // meaningful if the class still works (heuristic rule 4).
    const e = new DataError('NOT_FOUND', 'gone');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(DataError);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.message).toBe('gone');
    expect(e.name).toBe('DataError');
  });

  it('carries NO own `cause` — so `in` cannot report one that is not there', () => {
    // Consequence A of the deleted field: `'cause' in err` was TRUE on every
    // DataError while the value was always `undefined`, so any feature-detect by
    // `in` got a false positive. A plain Error answers false; so does this now.
    const e = new DataError('SCOPE_DENIED', 'denied');
    expect(Object.getOwnPropertyDescriptor(e, 'cause')).toBeUndefined();
    expect('cause' in e).toBe(false);
    expect('cause' in new Error('plain')).toBe(false);
  });

  it('serialises without a cause key, and never gains one enumerably', () => {
    // Consequence B, the reason the field was deleted rather than deferred. If a
    // cause channel returns, `types.ts` requires it be defined NON-enumerable —
    // which keeps this assertion true. Re-adding it as a class field does not.
    const e = new DataError('UPSTREAM', 'upstream failed');
    const keys = Object.keys(e);
    expect(keys, `DataError own enumerable keys: ${keys.join(', ')}`).not.toContain('cause');
    expect(JSON.stringify(e)).not.toContain('cause');

    // The platform's own shape, asserted so the requirement names something
    // real rather than something remembered: a spec'd cause is NOT enumerable.
    //
    // ⚠️ The cast is load-bearing and is part of the finding. This project's
    // `lib` is ES2020, which PREDATES `Error.cause` (it arrives in
    // `lib.es2022.error.d.ts`) — so TypeScript here does not know the two-argument
    // `Error` constructor exists, which is precisely why the deleted field never
    // looked like a redeclaration to anyone reading it. The RUNTIME supports it;
    // only the type lib does not. Asserted through the runtime shape.
    const NativeError = Error as unknown as new (m: string, o: { cause: unknown }) => Error;
    const native = new NativeError('native', { cause: 'root' });
    expect(Object.getOwnPropertyDescriptor(native, 'cause')?.enumerable).toBe(false);
    expect(JSON.stringify(native)).not.toContain('cause');
  });

  it('takes exactly two constructor arguments', () => {
    // A third argument was silently accepted and stored for the life of DR-4,
    // and no call site ever passed one. The arity is the contract now.
    expect(DataError.length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RR submit — THE READING, proven at the transition (`rr_submit_qty_agrees`).
//
// THE HOIST. Before this, the payload carried a bare number and the contract had
// to take the caller's word for what it meant: a caller that parsed "1.234"
// under `en` and shipped 1.234, one that parsed it under `id` and shipped 1234,
// and one that parsed nothing at all and shipped 7, were INDISTINGUISHABLE at
// the transition. All three are finite and non-negative, so the floor passed
// them all. The token now travels with the number and the transition re-runs the
// one legal parser over it.
//
// ⚠️ **THIS IS NOT THE GUARD THAT WAS FIRST RULED, AND THE MEASUREMENT THAT
// CHANGED IT IS WORTH KEEPING BESIDE THE TESTS.** The ruling asked for
// `LOCALE_MISMATCH` — the transition would compare the convention on the draft
// against a `locale` the datasheet grid carries per row. There is no such field:
// `GridRow` is `Record<string, string>`, the concrete row type is
// `{ batchNumber, qty, expiryDate }`, and the convention lives exactly ONCE PER
// PARSE CALL on `GridContext.numberFormatHint`, which never enters a draft or a
// payload. A mismatch check needs TWO independently-supplied locales; there is
// one. Authored anyway, it would have compared the single convention with itself,
// refused nothing, and shipped green — `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b) in a
// guard's clothing. The second witness is the RAW TOKEN instead.
//
// ⚠️ **AND THE COST IS STATED HERE RATHER THAN IN A CAVEAT: THIS MOVES THE PARSE
// INTO THE CONTRACT AND LEAVES THE THING THAT MAKES IT CORRECT OUTSIDE.** The
// convention is still the caller's to supply. A caller that reads an Indonesian
// typist's "1.234" under a declared `'en'`, ships 1.234, and declares `'en'`
// agrees with itself perfectly and is refused by nothing here. What the guard
// buys is INTERNAL CONSISTENCY, which is strictly more than the contract asked
// for before and strictly less than correctness. No guard at this layer can
// close the gap; saying so is the point.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { normalizeQty } from '../../../lib/localeNumber';
import { buildRequirementResponsePayload, FORECAST_PUBLICATIONS } from '../../sdc';
import type { QueryScope } from '../types';

const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const svc = new MockCommandService();

const pub = FORECAST_PUBLICATIONS.find((p) => p.publicationId === 'PUB-2026-08-RM-R2')!;
const line = pub.lines.find(
  (l) => l.supplierId === 'sup-002' && l.materialCode === 'RM-EMUL-3310',
)!;

/**
 * THE PRODUCTION CHAIN, run end to end rather than imitated. This is exactly
 * what `SupplierForecasts.tsx` does: ONE hint-free `normalizeQty` on the typed
 * string, then `buildRequirementResponsePayload` with the parsed value and the
 * token, then dispatch. Writing the payload by hand here would have tested a
 * copy of the caller instead of the caller.
 */
const submitAsSurfaceDoes = (typed: string) => {
  const parsed = normalizeQty(typed);
  if (!parsed.ok) return { refusedAtSurface: parsed.reason } as const;
  const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
    confirmedQty: parsed.value,
    confirmedQtyRaw: typed,
  });
  return { refusedAtSurface: null, payload, value: parsed.value } as const;
};

/** A hand-crafted dispatch — the F1-author / channel shape the surface bypasses. */
const handCrafted = (payload: Record<string, unknown>) =>
  svc.dispatch(sup002, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: {
      publicationId: 'PUB-2026-08-RM-R2',
      planVersion: 'PV-2026-08.2',
      materialCode: 'RM-EMUL-3310',
      periodBucket: '2026-08',
      supplierId: 'sup-002',
      ...payload,
    },
  });

beforeEach(() => {
  requirementResponseStore.reset();
});

// ── THE KNOWN-GOOD HALF. FIRST, AND IT IS THE LOAD-BEARING ONE. ──────────────
//
// Rule 4's companion, applied BEFORE the work rather than as a review step: a
// guard is habitually probed in one direction only — "does it catch the bad
// thing?" — so a guard that is wrong about what it should ACCEPT ships looking
// like a working guard. This batch's specific exposure is that the refusals
// below would ALL still pass if the agreement hook simply refused everything.
//
// ⚠️ **AND THE FENCE THIS DEFENDS IS THE OPERATOR'S: A REFACTOR THAT MOVES A
// PARSE MUST NOT CHANGE WHAT PASSES.** What the screen sends grew by one field;
// what the screen can successfully send must be byte-for-byte the same set.
describe('THE KNOWN-GOOD HALF — everything the surface accepts today still passes', () => {
  // Agreement on this path is STRUCTURAL, not lucky: the surface parses once at
  // `SupplierForecasts.tsx:853` and ships that same result at :893, and the
  // transition re-runs the identical call on the identical string. There is no
  // second parse that could drift, which is why this is asserted as a property
  // over a token set rather than as one happy-path example.
  const ACCEPTED = [
    ['6000', 6000], // plain
    ['0', 0], // the ratified F-2 typed zero
    ['1500.5', 1500.5], // fractional — en decimal, illegal id grouping
    ['1500,5', 1500.5], // fractional — id decimal
    ['12,5', 12.5], // the token that was argued about all afternoon
    ['  6000  ', 6000], // padded: normalizeQty trims at BOTH ends of the wire
  ] as const;

  it.each(ACCEPTED)('the surface chain ships %s and the transition accepts it', async (typed, expected) => {
    const attempt = submitAsSurfaceDoes(typed);
    expect(attempt.refusedAtSurface).toBeNull();
    const res = await svc.dispatch(sup002, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: attempt.payload!,
    });
    expect(res.status).not.toBe('failed');
    const stored = requirementResponseStore.get(res.entityId!)!;
    expect(stored.forecastConfirmation!.confirmedQty).toBe(expected);
  });

  it('a token the SURFACE already refuses never reaches the transition — the delta is zero at both ends', () => {
    // The refusal set is unchanged by the hoist: these refuse at the surface
    // exactly as before, and the transition would now refuse them too. Both
    // layers agreeing is the point — the second one is not a replacement.
    for (const typed of ['', '   ', 'abc', '2.400', '40.000']) {
      expect(submitAsSurfaceDoes(typed).refusedAtSurface).not.toBeNull();
    }
  });

  it('the FLOOR still passes what it passed — the two guards do not overlap', async () => {
    // 1500.5 exercises the floor's "bounds the value, never its precision" rule
    // while carrying a token that reads as exactly that number. If the agreement
    // hook had been written to require integers, this is what would catch it.
    const attempt = submitAsSurfaceDoes('1500,5');
    const res = await svc.dispatch(sup002, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: attempt.payload!,
    });
    expect(res.status).not.toBe('failed');
  });
});

// ── WHAT IT REFUSES THAT NOTHING REFUSED BEFORE ──────────────────────────────
describe('the agreement guard — the four shapes it catches, none of them reachable before', () => {
  it('a BARE NUMBER WITH NO TOKEN — the case `requiredFields` alone cannot see', async () => {
    // `isEmpty` is the dispatcher's rule-5 predicate and it is FALSE for `0`,
    // `false` and `'   '`. Presence is proven by requiredFields; a token that is
    // present but not a readable quantity is proven only here.
    const before = requirementResponseStore.all().length;
    const missing = await handCrafted({ confirmedQty: 6000 });
    expect(missing.status).toBe('failed');
    expect(missing.reason).toMatch(/MISSING_FIELDS:.*confirmedQtyRaw/);

    // …and the whitespace token that slips past `isEmpty` is caught by the hook.
    const blank = await handCrafted({ confirmedQty: 6000, confirmedQtyRaw: '   ' });
    expect(blank.status).toBe('failed');
    expect(blank.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_agrees/);
    expect(blank.reason).toMatch(/EMPTY_QTY/);
    expect(requirementResponseStore.all().length).toBe(before);
  });

  it('A NUMBER IN THE TOKEN SLOT — `isEmpty(6000)` is false, so rule 5 admits it', async () => {
    const res = await handCrafted({ confirmedQty: 6000, confirmedQtyRaw: 6000 });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_agrees/);
    expect(res.reason).toMatch(/must be the quantity token as typed/);
  });

  it('A CALLER THAT PARSES ONE WAY AND DECLARES ANOTHER — the guard’s subject', async () => {
    // "1.234" is 1234 to an Indonesian typist and 1.234 to an English one. Both
    // readings are legal; what is not legal is shipping one while declaring the
    // convention that produces the other.
    const honest = await handCrafted({
      confirmedQty: 1234,
      confirmedQtyRaw: '1.234',
      numberConvention: 'id',
    });
    expect(honest.status).not.toBe('failed');

    const crossed = await handCrafted({
      confirmedQty: 1234,
      confirmedQtyRaw: '1.234',
      numberConvention: 'en',
    });
    expect(crossed.status).toBe('failed');
    expect(crossed.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_agrees/);
    expect(crossed.reason).toMatch(/disagrees/);
    expect(crossed.reason).toMatch(/1\.234/); // the refusal names BOTH readings
  });

  it('A NUMBER THAT SIMPLY IS NOT WHAT THE TOKEN SAYS — the `|| 0` class, generalised', async () => {
    const res = await handCrafted({ confirmedQty: 999, confirmedQtyRaw: '6000' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/disagrees/);
    expect(res.reason).toMatch(/6000/);
  });

  it('AN AMBIGUOUS TOKEN declared as one of its two readings — refused at the CONTRACT now, not only at the surface', async () => {
    for (const [qty, label] of [
      [2400, 'the id reading'],
      [2.4, 'the en reading'],
    ] as const) {
      const res = await handCrafted({ confirmedQty: qty, confirmedQtyRaw: '2.400' });
      expect(res.status, label).toBe('failed');
      expect(res.reason, label).toMatch(/AMBIGUOUS_QTY/);
    }
  });

  it('AN UNRECOGNISED CONVENTION is refused rather than silently ignored', async () => {
    // Ignoring it would downgrade to the hint-free parse — which is STRICTER, so
    // it would usually still refuse. "Usually" is not a contract, and a caller
    // shipping `'de'` has a defect it deserves to be told about.
    const res = await handCrafted({
      confirmedQty: 6000,
      confirmedQtyRaw: '6000',
      numberConvention: 'de',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/numberConvention must be 'id' or 'en'/);
  });

  it('AN UNREADABLE TOKEN names WHY, rather than collapsing into one refusal', async () => {
    const res = await handCrafted({ confirmedQty: 6000, confirmedQtyRaw: 'six thousand' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/NOT_NUMERIC/);
  });

  it('every refusal above leaves the store untouched', async () => {
    const before = requirementResponseStore.all().length;
    for (const payload of [
      { confirmedQty: 6000 },
      { confirmedQty: 6000, confirmedQtyRaw: '   ' },
      { confirmedQty: 999, confirmedQtyRaw: '6000' },
      { confirmedQty: 2.4, confirmedQtyRaw: '2.400' },
      { confirmedQty: 6000, confirmedQtyRaw: '6000', numberConvention: 'de' },
    ]) {
      expect((await handCrafted(payload)).status).toBe('failed');
    }
    expect(requirementResponseStore.all().length).toBe(before);
  });
});

// ── THE COST, ASSERTED SO IT CANNOT BE FORGOTTEN ─────────────────────────────
describe('⚠️ WHAT THIS GUARD CANNOT DO — asserted, not commented', () => {
  it('a caller that is CONSISTENTLY WRONG passes, and that is the batch’s honest cost', async () => {
    // An Indonesian planner types "1.234" meaning 1 234 units. A caller that
    // reads it under `en` gets 1.234, declares `en`, and is internally perfect.
    // The guard has nothing to object to. THE CONVENTION IS STILL SUPPLIED BY
    // THE CALLER AND NOTHING AT THIS LAYER KNOWS WHO TYPED THE TOKEN.
    const res = await handCrafted({
      confirmedQty: 1.234,
      confirmedQtyRaw: '1.234',
      numberConvention: 'en',
    });
    expect(res.status).not.toBe('failed');
    expect(
      requirementResponseStore.get(res.entityId!)!.forecastConfirmation!.confirmedQty,
    ).toBe(1.234);
    // Stated as an assertion so that a future batch claiming "the parse is in the
    // contract, so quantities are safe" is contradicted by a green test rather
    // than by a paragraph. The remedy is a convention DERIVED at the seam, which
    // is a different batch and is named in the entry.
  });
});

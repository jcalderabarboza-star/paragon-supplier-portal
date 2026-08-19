// ────────────────────────────────────────────────────────────────────────────
// RR submit — the quantity floor AT THE TRANSITION, and the parse gap it leaves.
//
// WHY THIS EXISTS, STATED AS THE RANKING RATHER THAN AS A BUG. The one
// production caller of `t_requirementresponse_submit` parses through
// `normalizeQty` and refuses EMPTY_QTY / NOT_NUMERIC / AMBIGUOUS_QTY
// (`SupplierForecasts.tsx`), so **no human could reach the gap this closes**.
// That makes it a SPEC defect rather than a live one — and the worse of the two:
// a live defect is fixed by whoever hits it; a spec defect is IMPLEMENTED
// FAITHFULLY. `RequirementResponseDraft` types `confirmedQty: number` with no
// floor, and the dispatcher's `requiredFields` rule proves PRESENCE only
// (`isEmpty`), so an F1 author reading the contract saw a governed commitment
// field that accepted -1, NaN and Infinity — while `t_po_confirm`, one flow
// along and on a field of the SAME NAME, already carried both a floor and the
// `Number.isFinite` NaN lock.
//
// ⚠️ **THE KNOWN-GOOD IS THE LOAD-BEARING HALF, AND IT IS FIRST ON PURPOSE.**
// The neighbour's bound is `q > 0`. Copying it verbatim would have refused the
// ONE answer this verb exists to carry: a TYPED 0 is the ratified F-2 "cannot
// supply at all" short confirmation. So the first assertion below is not that
// the floor catches something — it is that the floor still LETS THROUGH the
// thing the product needs. A probe that only proves the fix catches the bad
// input would have shipped a floor that broke F-2 and stayed green.
//
// ⚠️ **SUB-01 IS A WITNESS AND IT ASSERTS THE WRONG BEHAVIOUR ON PURPOSE.**
// The floor validates the VALUE; it cannot validate the READING. The parse
// lives at the caller (CP-0 §4, "the builder does not parse"), so the
// transition cannot tell 2400 from 2.4 — both are finite and non-negative.
// Moving the parse into the transition is a DTO change and a separate batch, so
// the gap is held open by an assertion that FAILS THE DAY IT IS CORRECTED,
// rather than by a comment nobody re-reads. Same instrument, same reason, as
// the 2e-c-6 mixed-currency fixture: the gap is load-bearing, not remembered.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { getTransition } from '../../transitions';
import type { QueryScope } from '../types';

const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

const svc = new MockCommandService();

/** The R2 fanned line for sup-002 (RM-EMUL-3310 / 2026-08), payload-complete. */
const submit = (confirmedQty: unknown) => ({
  transitionId: 't_requirementresponse_submit',
  entity: 'requirementResponse',
  payload: {
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    materialCode: 'RM-EMUL-3310',
    periodBucket: '2026-08',
    supplierId: 'sup-002',
    confirmedQty,
    committedDate: '2026-08-20',
  },
});

const fire = (confirmedQty: unknown) => svc.dispatch(sup002, submit(confirmedQty));

beforeEach(() => {
  requirementResponseStore.reset();
});

describe('RR submit — the floor is declared on the transition, not only at the caller', () => {
  it('the verb carries the hook (the contract, not the surface, is what an F1 author reads)', () => {
    expect(getTransition('t_requirementresponse_submit')!.policyHooks).toContain(
      'rr_submit_qty_floor',
    );
  });
});

describe('RR submit qty floor — WHAT MUST STILL PASS (the known-good half)', () => {
  // The bound is `>= 0`, NOT the PO-confirm neighbour's `> 0`. If this test ever
  // goes red, the floor has been tightened into the F-2 ruling.
  it('⚠️ A TYPED 0 IS A LEGAL SHORT CONFIRMATION (F-2) AND THE FLOOR MUST NOT REFUSE IT', async () => {
    const res = await fire(0);
    expect(res.status).not.toBe('failed');
    const stored = requirementResponseStore.all().find((r) => r.supplierId === 'sup-002');
    expect(stored?.forecastConfirmation?.confirmedQty).toBe(0);
  });

  it('an ordinary positive commitment passes unchanged', async () => {
    const res = await fire(6000);
    expect(res.status).not.toBe('failed');
  });

  it('a fractional quantity passes — the floor bounds the value, never its precision', async () => {
    const res = await fire(1500.5);
    expect(res.status).not.toBe('failed');
  });
});

describe('RR submit qty floor — WHAT IT NOW REFUSES THAT IT ACCEPTED BEFORE', () => {
  it('refuses a negative quantity — a commitment cannot be less than nothing', async () => {
    const res = await fire(-1);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_floor/);
  });

  // `typeof NaN === 'number'` and NaN fails every comparison silently, so the
  // 2f-c `Number.isFinite` lock is what closes this — exactly as on t_po_confirm.
  it('refuses NaN — the 4a-FIND-01 class, which a bare typeof check admits', async () => {
    const res = await fire(Number.NaN);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_floor/);
  });

  it('refuses Infinity', async () => {
    const res = await fire(Number.POSITIVE_INFINITY);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_floor/);
  });

  // The DTO says `number`; nothing at the seam enforced it. A channel-ingested
  // response (DEC-COMMS-PRIMARY shares this write-path) would arrive as text.
  it('refuses a string that looks like a number — the DTO said number and nothing proved it', async () => {
    const res = await fire('6000');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_floor/);
  });

  it('the store is untouched by every refusal', async () => {
    const before = requirementResponseStore.all().length;
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, '6000']) {
      expect((await fire(bad)).status).toBe('failed');
    }
    expect(requirementResponseStore.all().length).toBe(before);
  });
});

describe('SUB-01 — THE WITNESS. This asserts the WRONG behaviour on purpose.', () => {
  // "2.400" is 2400 under an id-ID reading and 2.4 under an en-US one.
  // `normalizeQty` refuses it as AMBIGUOUS_QTY — at the CALLER. The transition
  // never sees the token, only a number, so it cannot tell the two apart.
  it('⚠️ THE TRANSITION ACCEPTS 2.4 — the wrong reading of "2.400" — because the parse is not its job', async () => {
    const res = await fire(2.4);

    // NOT the behaviour we want. It is the behaviour the contract currently
    // specifies, and it is asserted so that the day the parse moves INTO the
    // transition (a DTO change, a separate batch), THIS TEST GOES RED and the
    // author is sent to this comment rather than to a merge conflict.
    expect(res.status).not.toBe('failed');
    const stored = requirementResponseStore.all().find((r) => r.supplierId === 'sup-002');
    expect(stored?.forecastConfirmation?.confirmedQty).toBe(2.4);
  });

  it('⚠️ AND THE FLOOR CANNOT CLOSE IT — 2.4 satisfies every bound the floor states', () => {
    // Stated as an assertion rather than as prose so the claim is checked: the
    // gap is not an oversight in the floor, it is outside what a value-level
    // guard can express. Closing it requires the raw token, which the
    // transition is not given.
    const q = 2.4;
    expect(Number.isFinite(q) && q >= 0).toBe(true);
  });
});

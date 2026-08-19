// ────────────────────────────────────────────────────────────────────────────
// RR submit — the quantity floor AT THE TRANSITION, and the parse gap it leaves.
//
// WHY THIS EXISTS, STATED AS THE RANKING RATHER THAN AS A BUG. The one
// production caller of `t_requirementresponse_submit` parses through
// `normalizeQty` and refuses EMPTY_QTY / NOT_NUMERIC / AMBIGUOUS_QTY
// (`SupplierForecasts.tsx`), so **no human could reach the gap this closes**.
// That is still true of the floor, and it is why the hoist below was ranked as
// a contract repair rather than an outage: it closes what an F1 author reading
// the DTO could do, not what a supplier at a keyboard could do.
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
// ⚠️ **SUB-01 WAS A WITNESS THAT ASSERTED THE WRONG BEHAVIOUR ON PURPOSE, AND
// THE DAY IT FAILED HAS ARRIVED. IT IS INVERTED, NOT DELETED.** It held open a
// gap: the floor validates the VALUE and could not validate the READING, so the
// transition could not tell 2400 from 2.4 — both finite, both non-negative.
// The hoist closed it by handing the transition the TOKEN and re-running the one
// legal parser (`rr_submit_qty_agrees`).
//
// The case is unchanged — still "2.400", still the number 2.4 — and only the
// EXPECTATION flipped, because a witness that is deleted rather than flipped
// loses the record of what it was witnessing (operator ruling). What used to
// read "the transition accepts the wrong reading" now reads "the transition
// refuses the pairing", and a reader who follows the git blame lands on the
// comment that explains why it ever passed.
//
// ⚠️ **AND ITS SECOND ASSERTION WAS A TAUTOLOGY THE WHOLE TIME.** It read
// `expect(Number.isFinite(2.4) && 2.4 >= 0).toBe(true)` — a statement about two
// literals that no product change could ever falsify. It was written to say
// "the floor cannot close this gap", which was TRUE, but it proved nothing and
// could not have gone red when the gap closed. It is replaced below by the
// assertion it was reaching for: the same token, declared under two different
// conventions, where one pairing holds and the other is refused.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { getTransition } from '../../transitions';
import type { QueryScope } from '../types';

const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

const svc = new MockCommandService();

/** The R2 fanned line for sup-002 (RM-EMUL-3310 / 2026-08), payload-complete.
 *
 *  `raw` defaults to `String(confirmedQty)` so the FLOOR cases below read exactly
 *  as they did before the hoist — a caller that states one number states it once.
 *  The AGREEMENT cases pass a token that differs from the number on purpose. */
const submit = (confirmedQty: unknown, raw?: string, numberConvention?: 'id' | 'en') => ({
  transitionId: 't_requirementresponse_submit',
  entity: 'requirementResponse',
  payload: {
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    materialCode: 'RM-EMUL-3310',
    periodBucket: '2026-08',
    supplierId: 'sup-002',
    confirmedQty,
    confirmedQtyRaw: raw ?? String(confirmedQty),
    ...(numberConvention ? { numberConvention } : {}),
    committedDate: '2026-08-20',
  },
});

const fire = (confirmedQty: unknown, raw?: string, numberConvention?: 'id' | 'en') =>
  svc.dispatch(sup002, submit(confirmedQty, raw, numberConvention));

beforeEach(() => {
  requirementResponseStore.reset();
});

describe('RR submit — the floor is declared on the transition, not only at the caller', () => {
  it('the verb carries the hook (the contract, not the surface, is what an F1 author reads)', () => {
    expect(getTransition('t_requirementresponse_submit')!.policyHooks).toContain(
      'rr_submit_qty_floor',
    );
  });

  it('and the READING is proven too — the agreement guard rides the same verb', () => {
    const t = getTransition('t_requirementresponse_submit')!;
    expect(t.policyHooks).toContain('rr_submit_qty_agrees');
    expect(t.requiredFields).toContain('confirmedQtyRaw');
    // ORDER IS LOAD-BEARING: the floor establishes that `confirmedQty` is a
    // finite number, so the agreement hook can compare against it without
    // re-proving its type. Asserted rather than commented, because a reordering
    // would still pass every behavioural test in this file.
    expect(t.policyHooks.indexOf('rr_submit_qty_floor')).toBeLessThan(
      t.policyHooks.indexOf('rr_submit_qty_agrees'),
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

describe('SUB-01 — INVERTED. The witness kept its case and flipped its expectation.', () => {
  // "2.400" is 2400 under an id-ID reading and 2.4 under an en-US one. Before the
  // hoist the transition never saw the token, only a number, so it could not tell
  // the two apart and this test asserted that it accepted the wrong one.
  it('⚠️ THE TRANSITION NOW REFUSES 2.4 FROM "2.400" — it re-reads the token and will not guess', async () => {
    const before = requirementResponseStore.all().length;
    const res = await fire(2.4, '2.400');

    // WAS: `expect(res.status).not.toBe('failed')` + stored 2.4. That was the
    // behaviour the contract specified and this file existed to make visible.
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_agrees/);
    expect(res.reason).toMatch(/AMBIGUOUS_QTY/);
    // Hint-free, so the refusal is AMBIGUITY, not disagreement: 2.4 genuinely is
    // one of the two legal readings. The transition declines to pick, which is
    // the same answer the surface gives — now stated in the contract as well.
    expect(requirementResponseStore.all().length).toBe(before);
  });

  // ⚠️ THIS REPLACES A TAUTOLOGY. The assertion that stood here compared two
  // literals (`Number.isFinite(2.4) && 2.4 >= 0`) and could never fail. What it
  // was reaching for is below, and it is the guard's real subject: ONE TOKEN,
  // TWO DECLARED CONVENTIONS, and only one of the pairings is honest.
  it('⚠️ THE SAME TOKEN UNDER "en" AGREES WITH 2.4 — a stated convention resolves what silence refuses', async () => {
    const res = await fire(2.4, '2.400', 'en');
    expect(res.status).not.toBe('failed');
    const stored = requirementResponseStore.all().find((r) => r.supplierId === 'sup-002');
    expect(stored?.forecastConfirmation?.confirmedQty).toBe(2.4);
  });

  it('⚠️ AND UNDER "id" IT IS REFUSED — the caller parsed one way and declared another', async () => {
    // The failure this guard exists for. "2.400" under id is 2400; a caller that
    // ships 2.4 while declaring 'id' has read the token with one convention and
    // labelled it with the other. Nothing before the hoist could see this: the
    // transition received the number 2.4 and had no second fact to check it with.
    const before = requirementResponseStore.all().length;
    const res = await fire(2.4, '2.400', 'id');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_submit_qty_agrees/);
    expect(res.reason).toMatch(/disagrees/);
    expect(res.reason).toMatch(/2400/); // the refusal NAMES the number the token reads
    expect(requirementResponseStore.all().length).toBe(before);
  });
});

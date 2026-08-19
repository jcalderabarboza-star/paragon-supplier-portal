// ────────────────────────────────────────────────────────────────────────────
// R1b — THE DISPUTE LEDGER: the buyer's words, required, proven, and STORED.
//
// WHY THIS EXISTS, AS THE RANKING RATHER THAN AS A BUG. Neither verb has a
// production caller — surfacing them is R1b proper and still booked — so nothing
// here fixes a live defect. It fixes the CONTRACT an F1 author reads, which is
// the worse of the two: a live defect is fixed by whoever hits it; a spec defect
// is IMPLEMENTED FAITHFULLY. Before this batch `t_requirementresponse_dispute`
// required nothing at all, so the contract said a supplier's commitment could be
// rejected with no recorded ground — while `t_invoice_dispute`, the verb this
// machine was copied from, had required a `disputeReason` since it was written.
//
// ⚠️ AND THE NEIGHBOUR IS ONLY HALF A PRECEDENT. `t_invoice_dispute` requires its
// reason, collects it in a real form, carries it in the payload — and then drops
// it: `invoiceTarget.applyTransition` writes `status` and `amount`, and
// `disputeReason` is on NO DTO in the tree. Copying the required field without
// the storage would have shipped the same write-only field twice. The assertions
// below are therefore about the LEDGER, not about the refusal message.
//
// ⚠️ THE KNOWN-GOOD IS FIRST AND IT IS LOAD-BEARING (rule 4). Two of them:
// an authored dispute must PASS, and a REVIEW must add NOTHING. The second is
// the one a one-directional probe would miss — `t_requirementresponse_review`
// lands on `UnderReview` exactly as a resolution does, so a guard keyed on the
// destination would append a phantom "resolved" entry to a response that was
// never disputed, and every refusal test here would still be green.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { getTransition } from '../../transitions';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const svc = new MockCommandService();

/** The fixture in 'Submitted' — the one state a review is legal from. */
const RR = 'rr-0001';

const fire = (transitionId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(buyer, { transitionId, entity: 'requirementResponse', entityId: RR, payload });

const review = () => fire('t_requirementresponse_review');
const dispute = (text: unknown = 'Short by 3,000 KG against a firm line.') =>
  fire('t_requirementresponse_dispute', { disputeReason: text });
const resolve = (text: unknown = 'Shortfall accepted; covered from the Q4 buffer.') =>
  fire('t_requirementresponse_resolve', { resolutionReason: text });

const ledger = () => requirementResponseStore.get(RR)?.disputeResponse ?? [];

beforeEach(() => {
  requirementResponseStore.reset();
});

describe('R1b — the contract an F1 author reads (not the surface)', () => {
  it('dispute REQUIRES its text and proves it — the asymmetry with t_invoice_dispute, closed', () => {
    const t = getTransition('t_requirementresponse_dispute')!;
    expect(t.requiredFields).toEqual(['disputeReason']);
    expect(t.policyHooks).toContain('rr_dispute_text_authored');
  });

  it('resolve REQUIRES its text and proves it — the operator ruling against the invoice twin', () => {
    // `t_invoice_resolve` is payload-free and the symmetry argument for copying
    // it is real. The ruling is about the SUPPLIER: a resolution that carries
    // nothing reports the outcome of a promised review as a bare status change.
    const t = getTransition('t_requirementresponse_resolve')!;
    expect(t.requiredFields).toEqual(['resolutionReason']);
    expect(t.policyHooks).toContain('rr_dispute_text_authored');
  });

  it('⚠️ CONTROL — the neighbour it did NOT copy: t_invoice_dispute still requires disputeReason', () => {
    // Asserted, not assumed. If the invoice lane ever drops its requirement, the
    // comparison this batch is built on stops being true and this goes red.
    expect(getTransition('t_invoice_dispute')!.requiredFields).toEqual(['disputeReason']);
  });
});

describe('R1b — WHAT MUST PASS (the known-good half, first on purpose)', () => {
  it('⚠️ AN AUTHORED DISPUTE FIRES, and its words land in the ledger', async () => {
    expect((await review()).status).toBe('done');
    const res = await dispute();
    expect(res.status).not.toBe('failed');

    expect(requirementResponseStore.get(RR)!.status).toBe('Disputed');
    expect(ledger()).toHaveLength(1);
    expect(ledger()[0].kind).toBe('raised');
    expect(ledger()[0].text).toBe('Short by 3,000 KG against a firm line.');
  });

  it('⚠️ A REVIEW ADDS NOTHING — the from-state is what separates it from a resolution', async () => {
    // Submitted → UnderReview lands on the SAME state a resolution lands on. A
    // guard keyed on the destination would write a phantom "resolved" entry onto
    // a response nobody ever disputed, and every refusal test above stays green.
    expect((await review()).status).toBe('done');
    expect(requirementResponseStore.get(RR)!.status).toBe('UnderReview');
    expect(ledger()).toEqual([]);
  });

  it('the round trip still holds end to end — the loose-end repair is not regressed', async () => {
    await review();
    await dispute();
    expect((await resolve()).status).toBe('done');
    expect(requirementResponseStore.get(RR)!.status).toBe('UnderReview');
  });
});

describe('R1b — THE LEDGER APPENDS. It never clears and never replaces.', () => {
  it('⚠️ A RESOLVED DISPUTE STILL CARRIES ITS RAISE — answered is not the same as never raised', async () => {
    await review();
    await dispute();
    await resolve();

    // The operator ruling in one assertion: clearing the reason loses the fact
    // that a dispute happened; leaving it alone makes it a stale accusation.
    // Two entries, in order, is neither.
    expect(ledger().map((e) => e.kind)).toEqual(['raised', 'resolved']);
    expect(ledger()[0].text).toContain('Short by 3,000 KG');
    expect(ledger()[1].text).toContain('Shortfall accepted');
  });

  it('a SECOND dispute appends a third entry — the ledger is a history, not a pair', async () => {
    await review();
    await dispute('First: short against the firm line.');
    await resolve('Withdrawn — read the wrong period.');
    await dispute('Second: the committed date slipped past the window.');

    expect(ledger().map((e) => e.kind)).toEqual(['raised', 'resolved', 'raised']);
    expect(ledger()[2].text).toContain('committed date slipped');
    // The FIRST raise is still exactly as it was written.
    expect(ledger()[0].text).toBe('First: short against the firm line.');
  });

  it('⚠️ the instant is STORE-MINTED — a payload `at` is ignored, never honoured', async () => {
    await review();
    await dispute();
    // The `pinnedAt` discipline: a caller that could set the instant could
    // backdate its own dispute against a response deadline.
    const res = await fire('t_requirementresponse_resolve', {
      resolutionReason: 'Accepted.',
      at: '1999-01-01T00:00:00.000Z',
    });
    expect(res.status).not.toBe('failed');
    expect(ledger()[1].at).not.toBe('1999-01-01T00:00:00.000Z');
    expect(Number.isFinite(Date.parse(ledger()[1].at))).toBe(true);
  });
});

describe('R1b — WHAT IS NOW REFUSED, and the store is untouched by every refusal', () => {
  it('refuses a dispute with NO text — MISSING_FIELDS, at the dispatcher', async () => {
    await review();
    const res = await fire('t_requirementresponse_dispute');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:disputeReason/);
  });

  it('⚠️ refuses a BLANK dispute — `isEmpty("   ")` is FALSE, so required alone admitted the space bar', async () => {
    await review();
    const res = await dispute('   ');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_dispute_text_authored/);
  });

  it('refuses a NON-STRING dispute — the DTO says text and nothing else proved it', async () => {
    await review();
    const res = await dispute(42);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:rr_dispute_text_authored/);
  });

  it('refuses a resolution with no text, and a blank one', async () => {
    await review();
    await dispute();
    expect((await fire('t_requirementresponse_resolve')).reason).toMatch(
      /MISSING_FIELDS:resolutionReason/,
    );
    expect((await resolve('  ')).reason).toMatch(/POLICY_REJECTED:rr_dispute_text_authored/);
  });

  it('every refusal leaves the state AND the ledger exactly as they were', async () => {
    await review();
    await dispute();
    const before = JSON.stringify(ledger());

    for (const bad of ['', '   ', 42, null, {}]) {
      expect((await resolve(bad)).status).toBe('failed');
    }
    expect(requirementResponseStore.get(RR)!.status).toBe('Disputed');
    expect(JSON.stringify(ledger())).toBe(before);
  });
});

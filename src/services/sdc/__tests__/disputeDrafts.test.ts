// ────────────────────────────────────────────────────────────────────────────
// R1b — THE BUYER'S DRAFTS, and the boundary that keeps them from collapsing
// into the stored record.
//
// ⚠️ **THE DTO FIELD IS THE ANSWER; THE DRAFT FIELD IS WHAT THE ACTOR WROTE TO
// PRODUCE IT** (operator ruling). This suite asserts the distinction rather than
// describing it, because the failure mode is not a crash — it is a later author
// reading `disputeResponse` as "the buyer's note field", writing to it from a
// form, and turning an append-only ledger into an editable cell. Nothing here
// would catch that at runtime; what it catches is the SHAPE drifting so that the
// two become interchangeable.
//
// NO SURFACE CONSUMES THESE YET. The action cell is R1b proper and waits on this
// batch — the model lands first so the surface has a typed thing to fill.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  buildRequirementDisputePayload,
  buildRequirementResolutionPayload,
  type DisputeRaiseDraft,
  type DisputeResolutionDraft,
} from '../submitModel';
import { getTransition } from '../../transitions';

const RAISE: DisputeRaiseDraft = {
  disputeReason: 'Confirmed 6,000 KG against a 9,000 KG firm line — short by 3,000.',
};
const RESOLVE: DisputeResolutionDraft = {
  resolutionReason: 'Shortfall accepted; covered from the Q4 buffer.',
};

describe('R1b — the draft builders are PURE ASSEMBLY (the words given are the words shipped)', () => {
  it('the raise builder ships the planner’s objection under the name the verb requires', () => {
    expect(buildRequirementDisputePayload(RAISE)).toEqual({
      disputeReason: RAISE.disputeReason,
    });
  });

  it('the resolution builder ships the answer under the name ITS verb requires', () => {
    expect(buildRequirementResolutionPayload(RESOLVE)).toEqual({
      resolutionReason: RESOLVE.resolutionReason,
    });
  });

  it('⚠️ NEITHER BUILDER TRIMS, VALIDATES OR REJECTS — substance is proven at the TRANSITION', () => {
    // A builder that trimmed here would put the real guard in the ONE layer a
    // hand-crafted dispatch skips. `rr_dispute_text_authored` is the law; this
    // is assembly. The blank survives the builder and dies at the machine — and
    // the machine's half is asserted in requirementResponseDisputeLedger.test.ts.
    expect(buildRequirementDisputePayload({ disputeReason: '   ' })).toEqual({
      disputeReason: '   ',
    });
    // ⚠️ BOTH BUILDERS, NOT ONE. The first cut asserted this for the RAISE only,
    // and a mutation that made the RESOLUTION builder trim survived the suite —
    // found by probing, not by review. Two builders is two assertions; a guard
    // proven on one half is a guard on one half.
    expect(buildRequirementResolutionPayload({ resolutionReason: '   ' })).toEqual({
      resolutionReason: '   ',
    });
  });
});

describe('R1b — THE BOUNDARY: the draft key IS the required field, derived from the machine', () => {
  // The builders exist to feed the transitions. If a verb's requiredFields ever
  // change and a builder does not, the surface (R1b proper) ships a payload the
  // dispatcher refuses — and the refusal reads as a broken button, not as a
  // renamed field. Derived from the flow, never transcribed.
  it('every key the raise builder emits is exactly what t_requirementresponse_dispute requires', () => {
    const required = getTransition('t_requirementresponse_dispute')!.requiredFields;
    expect(Object.keys(buildRequirementDisputePayload(RAISE)).sort()).toEqual([...required].sort());
  });

  it('every key the resolution builder emits is exactly what t_requirementresponse_resolve requires', () => {
    const required = getTransition('t_requirementresponse_resolve')!.requiredFields;
    expect(Object.keys(buildRequirementResolutionPayload(RESOLVE)).sort()).toEqual(
      [...required].sort(),
    );
  });

  it('⚠️ CONTROL — the two verbs do NOT require the same field, so the drafts cannot be merged', () => {
    // The ruling this batch executes: two acts, two drafts, two names. If these
    // ever converge, the argument for splitting them has gone away and somebody
    // should be told rather than left to discover it in a merged draft type.
    const raise = getTransition('t_requirementresponse_dispute')!.requiredFields;
    const resolve = getTransition('t_requirementresponse_resolve')!.requiredFields;
    expect(raise).not.toEqual(resolve);
    expect(raise).toEqual(['disputeReason']);
    expect(resolve).toEqual(['resolutionReason']);
  });

  it('⚠️ AND NEITHER BUILDER EMITS THE STORED FIELD — the answer is not something a draft carries', () => {
    // `disputeResponse` is the append-only ledger the STORE owns. A builder that
    // emitted it would let a caller hand the store its own history, which is the
    // collapse this separation exists to prevent.
    const keys = [
      ...Object.keys(buildRequirementDisputePayload(RAISE)),
      ...Object.keys(buildRequirementResolutionPayload(RESOLVE)),
    ];
    expect(keys).not.toContain('disputeResponse');
    expect(keys).not.toContain('at');
  });
});

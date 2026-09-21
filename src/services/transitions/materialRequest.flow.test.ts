// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE MATERIAL-REQUEST MACHINE.
//
// ⚠️ **THE BARREL, NOT `./registry` (§42b).** Importing the bare registry means
// no shipped flow has self-registered, `getKnownFlows()` returns `[]`, and every
// "nothing is wrong" assertion below passes over an EMPTY population — a right
// answer from an instrument that examined nothing
// (`EMPTY-INPUT-REPORTS-CLEAN-01`). The REACH block is what says it did not.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getKnownFlows, materialRequestFlow } from './index';
import { MATERIAL_REQUEST_BIRTH_FIELDS } from './flows/materialRequest.flow';
import { POLICY_HOOKS } from './policyHooks';
import { SYSTEM_ROLES, type SystemRoleId } from './businessRoles';

/**
 * ⚠️ **THE SIX BUYER LANES, NAMED HERE RATHER THAN EXPORTED FROM THE MODULE.**
 * `SYSTEM_ROLES` is the full offer and includes `buyer_all` and `admin`, which
 * are DERIVED UNIONS over the lanes — so asking "which roles hold this atom?"
 * of `SYSTEM_ROLES` returns the unions too, and the segregation property would
 * read as violated by construction. The property is about LANES.
 *
 * The list is pinned against the module below, so it cannot silently fall
 * behind a seventh lane: that would be the derivation-in-prose defect this
 * project refuses, and the pin is what stops it.
 */
const BUYER_LANES = [
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
] as const satisfies readonly SystemRoleId[];

const lanesOf = (atom: string): string[] =>
  BUYER_LANES.filter((l) => (SYSTEM_ROLES[l] as readonly string[]).includes(atom)).sort();

const flow = materialRequestFlow;
const byId = (id: string) => flow.transitions.find((t) => t.id === id)!;

// ── REACH · the instrument is looking at the shipped tree ────────────────────
describe('REACH — the population is real', () => {
  it('⚠️ THE FLOW IS REGISTERED, so nothing below is vacuous', () => {
    const entities = getKnownFlows().map((f) => f.entity);
    // KNOWN-TRUE: this flow.
    expect(entities).toContain('materialRequest');
    // KNOWN-TRUE CONTROL, a flow this batch did not touch — proves the registry
    // is populated rather than holding only the new arrival.
    expect(entities).toContain('supplierApplication');
    // KNOWN-FALSE CONTROL: the instrument can say no.
    expect(entities).not.toContain('materialRequestZZZ');
  });

  it('the flow declares four transitions and nothing else', () => {
    expect(flow.transitions.map((t) => t.id).sort()).toEqual([
      't_materialrequest_approve',
      't_materialrequest_reject',
      't_materialrequest_start_review',
      't_materialrequest_submit',
    ]);
  });
});

describe('the states and the endings', () => {
  it('four states, Submitted initial', () => {
    expect(flow.states).toEqual(['Submitted', 'Under Review', 'Approved', 'Rejected']);
    expect(flow.initial).toBe('Submitted');
  });

  it('⚠️ BOTH ENDINGS ARE TERMINAL, AND ON ONE GROUND ONLY', () => {
    // The precedent (`supplierApplication`) refuses an edge out of `Rejected` on
    // TWO grounds: (1) no slot persists, and (2) the applicant holds no verb at
    // all. **(2) IS FALSE HERE** — a material requester is a buyer seat holding
    // `materialrequest:submit` — so the conclusion stands on (1) alone, and
    // this test pins the SHAPE that ground produces rather than the ground.
    expect(flow.terminals).toEqual(['Approved', 'Rejected']);
    const out = flow.transitions.filter(
      (t) => t.from.includes('Approved') || t.from.includes('Rejected'),
    );
    expect(out).toEqual([]);
  });

  it('⚠️ AND (2) REALLY IS FALSE — the requester holds a verb on this machine', () => {
    // Stated as a measurement, because it is the reason the precedent's argument
    // could not be copied. A lane that holds the submitting atom is a lane a
    // requester can sit in.
    expect(lanesOf('materialrequest:submit').length).toBeGreaterThan(0);
    // And the precedent's atom is held too, by contrast — so this assertion is
    // about the shape of the lane map and not about one atom being special.
    expect(lanesOf('application:submit').length).toBeGreaterThan(0);
  });

  it('there is NO Draft state — the wizard and the page are the draft', () => {
    expect(flow.states).not.toContain('Draft');
    const births = flow.transitions.filter((t) => t.from.length === 0);
    expect(births.map((t) => t.id)).toEqual(['t_materialrequest_submit']);
  });
});

describe('⚠️ THE ONE-INBOUND-EDGE PROPERTY — the target depends on it', () => {
  it('each written state has EXACTLY ONE inbound edge', () => {
    // `applyTransition` receives no transitionId and discriminates on `toState`
    // alone. That is sufficient ONLY while this holds. A fifth verb landing on
    // an existing state would make one of the target's writes fire on the wrong
    // verb, silently — so the property is asserted here rather than described in
    // a comment that can go stale.
    for (const state of ['Under Review', 'Approved', 'Rejected']) {
      const inbound = flow.transitions.filter((t) => t.to === state);
      expect(inbound).toHaveLength(1);
    }
    // And `Submitted` is reached only through the birth edge.
    expect(flow.transitions.filter((t) => t.to === 'Submitted').map((t) => t.id)).toEqual([
      't_materialrequest_submit',
    ]);
  });
});

describe('the verbs, their atoms, fields and hooks', () => {
  it('submit: creation, procurement atom, the three birth fields, three hooks', () => {
    const t = byId('t_materialrequest_submit');
    expect(t.trigger).toBe('creation');
    expect(t.requiredRole).toBe('materialrequest:submit');
    expect(t.requiredFields).toEqual([...MATERIAL_REQUEST_BIRTH_FIELDS]);
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.MATERIALREQUEST_CATEGORY_KNOWN,
      POLICY_HOOKS.MATERIALREQUEST_NEED_AUTHORED,
      POLICY_HOOKS.MATERIALREQUEST_RFQ_RESOLVED,
    ]);
  });

  it('⚠️ THE BIRTH FIELDS ARE THREE, AND THE FOUR OPTIONAL ONES ARE ABSENT BY DESIGN', () => {
    expect([...MATERIAL_REQUEST_BIRTH_FIELDS]).toEqual([
      'requestedLabel',
      'category',
      'need',
    ]);
    // A STANDALONE request legitimately carries none of these, and
    // `requiredFields` is flat — it cannot say "required when". Putting
    // `raisedFromRfqId` here would refuse the entire page entrance.
    for (const f of ['raisedFromRfqId', 'specification', 'expectedUom', 'catalogReason']) {
      expect(byId('t_materialrequest_submit').requiredFields).not.toContain(f);
    }
  });

  it('start review: planning atom, no fields, four-eyes hook', () => {
    const t = byId('t_materialrequest_start_review');
    expect(t.trigger).toBe('user');
    expect(t.requiredRole).toBe('materialrequest:review');
    expect(t.requiredFields).toEqual([]);
    expect(t.policyHooks).toEqual([POLICY_HOOKS.MATERIALREQUEST_DECIDER_NOT_REQUESTER]);
  });

  it('⚠️ APPROVE CARRIES NO FIELDS AND MINTS NOTHING', () => {
    const t = byId('t_materialrequest_approve');
    expect(t.from).toEqual(['Under Review']);
    expect(t.to).toBe('Approved');
    expect(t.requiredRole).toBe('materialrequest:decide');
    // No authored text on an acceptance: a field nobody must fill is a field
    // somebody will. And no `justification` means the field can only ever be
    // written by the refusal edge.
    expect(t.requiredFields).toEqual([]);
  });

  it('reject: justification required, refusal-authored hook present', () => {
    const t = byId('t_materialrequest_reject');
    expect(t.from).toEqual(['Under Review']);
    expect(t.to).toBe('Rejected');
    expect(t.requiredRole).toBe('materialrequest:decide');
    expect(t.requiredFields).toEqual(['justification']);
    expect(t.policyHooks).toContain(POLICY_HOOKS.MATERIALREQUEST_REFUSAL_AUTHORED);
  });

  it('every verb is surfaced — this lane has no ruled-unsurfaced member', () => {
    for (const t of flow.transitions) {
      expect(t.surfaceable).toEqual({ surfaced: true });
    }
  });
});

describe('⚠️ THE TWO AUTHORITIES ARE IN DIFFERENT LANES', () => {
  it('raising is procurement; reviewing and deciding are planning', () => {
    expect(lanesOf('materialrequest:submit')).toEqual(['procurement']);
    expect(lanesOf('materialrequest:review')).toEqual(['planning']);
    expect(lanesOf('materialrequest:decide')).toEqual(['planning']);
    // ⚠️ THE PROPERTY, not the membership: no lane holds BOTH the raising and
    // the deciding. Re-cutting the lanes keeps this true or reddens here.
    const raising = new Set(lanesOf('materialrequest:submit'));
    const deciding = new Set(lanesOf('materialrequest:decide'));
    expect([...raising].filter((l) => deciding.has(l))).toEqual([]);
  });

  it('⚠️ AND NO NEW ROLE WAS MINTED — the three atoms sit in existing lanes', () => {
    // `SystemRoleId` is untouched by this lane. Asserted because "no new role"
    // is a binding rule and a comment cannot check it.
    const roles = Object.keys(SYSTEM_ROLES);
    expect(roles).toContain('procurement');
    expect(roles).toContain('planning');
    expect(roles).not.toContain('masterdata');
    expect(roles).not.toContain('materialrequest');
    // ⚠️ AND THE LANE LIST ABOVE IS PINNED TO THE MODULE, both directions, so a
    // seventh lane cannot appear without this file noticing.
    const declaredBuyerLanes = (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).filter(
      (r) => r !== 'buyer' && r !== 'buyer_all' && r !== 'admin' && r !== 'supplier' &&
        r !== 'commercial' && r !== 'fulfilment' && r !== 'back_office',
    );
    expect([...declaredBuyerLanes].sort()).toEqual([...BUYER_LANES].sort());
  });
});

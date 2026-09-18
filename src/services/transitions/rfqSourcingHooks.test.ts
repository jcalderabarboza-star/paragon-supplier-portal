// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE THREE SOURCING HOOKS, THROUGH A REAL DISPATCHER ROUND TRIP.
//
// ⚠️ **NO PAGE IS RENDERED IN THIS FILE AND THE ENVIRONMENT IS `node`.** That is
// the assertion, not a convenience: P2's whole design rests on the gate living
// at the VERB, so a refusal that could only be observed through a component
// would mean the gate was on the page after all. Every refusal below is
// obtained by dispatching, with no DOM, no provider and no query client in
// existence.
//
// ⚠️ **AND THE WIRE FORMAT IS TAKEN FROM THE MACHINE, NEVER TYPED OUT.** A
// policy reason reads `POLICY_REJECTED:<hook>:<the hook's own text>`, and two
// shipped surfaces once tested the inner code with `startsWith` — conditions
// that were structurally unsatisfiable, so two fully-translated remedial
// sentences had never once rendered. A test that spells the format itself can
// only restate the belief that caused that, so the format is read off a real
// dispatch and only then asserted against (`refusedByPolicy.test.ts`'s rule).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { quotationStore } from '../data/mock/stores/quotationStore';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { POLICY_HOOKS } from './policyHooks';
import { refusedByPolicy } from './refusalMessage';
import { SOURCING_REFUSAL_GLOSSARY } from '../../lib/glossary';
import type { QueryScope } from '../data/types';

const svc = new MockCommandService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

const publish = (entityId: string) =>
  svc.dispatch(buyer, { transitionId: 't_rfq_publish', entity: 'rfq', entityId });

const award = (entityId: string, awardedQuotationId: string, awardedSupplierId: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId,
    payload: { awardedQuotationId, awardedSupplierId },
  });

/** A Draft minted by the real creation verb, so the invitee set is ours. */
const draftWith = async (invitedSupplierIds: string[], materialIds: string[] = ['AI-NIAC-6601']) => {
  const res = await svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'hook probe — sourcing gate',
      materialCategory: 'Active Ingredients',
      totalQty: 100,
      invitedSupplierIds,
      materialIds,
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the hooks are wired and the harness can fire them', () => {
  it('a compliant publish SUCCEEDS — the known-GOOD control, first', () => {
    // ⚠️ Rule 4. Every refusal below is worthless until a good input is shown
    // to pass: a hook that refused everything would satisfy all of them.
    return draftWith(['sup-005', 'sup-006', 'sup-009'], ['RM-EMUL-3310']).then(async (id) => {
      const res = await publish(id);
      expect(res.status, res.reason).toBe('done');
      expect(rfqStore.get(id)!.status).toBe('Open');
    });
  });

  it('every refusal this file names has a glossary definition in BOTH locales', () => {
    for (const key of [
      'INVITEE_NOT_ELIGIBLE',
      'COMPETITION_UNDER_FLOOR',
      'AWARDEE_NOT_INVITED',
      'AWARDEE_NOT_THE_QUOTING_SUPPLIER',
    ] as const) {
      expect(SOURCING_REFUSAL_GLOSSARY[key].en.length).toBeGreaterThan(20);
      expect(SOURCING_REFUSAL_GLOSSARY[key].id.length).toBeGreaterThan(20);
      expect(SOURCING_REFUSAL_GLOSSARY[key].en).not.toBe(SOURCING_REFUSAL_GLOSSARY[key].id);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ RFQ_PUBLISH_COMPETITION — the floor refuses, the floor value does not', () => {
  it('ONE eligible invitee is refused, and the refusal names the hook', async () => {
    const id = await draftWith(['sup-005'], ['RM-EMUL-3310']);
    const res = await publish(id);
    expect(res.status).toBe('failed');
    // THE FORMAT, READ OFF THE MACHINE — then asserted.
    expect(res.reason).toMatch(/^POLICY_REJECTED:/);
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_COMPETITION)).toBe(true);
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE)).toBe(false);
    expect(res.reason).toContain('COMPETITION_UNDER_FLOOR');
    // …and nothing moved.
    expect(rfqStore.get(id)!.status).toBe('Draft');
  });

  it('⚠️ EXACTLY TWO IS ALLOWED — the allowance, which no refusal can express', async () => {
    const id = await draftWith(['sup-005', 'sup-006'], ['RM-EMUL-3310']);
    const res = await publish(id);
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Open');
  });

  it('⚠️ AN EXEMPT EVENT PUBLISHES WITH ONE INVITEE — the floor does not apply', async () => {
    // sup-005 holds an in-force Mandatory listing for AI-NIAC-6601. The same
    // invitee count that was refused above now passes, so this proves the
    // exemption arm rather than a relaxed floor.
    const id = await draftWith(['sup-005'], ['AI-NIAC-6601']);
    const res = await publish(id);
    expect(res.status, res.reason).toBe('done');
  });

  it('a supplier who is merely VALIDATED does not buy the exemption', async () => {
    // sup-005 is Validated on AI-HYALU-6610 — in force, and still competing.
    const id = await draftWith(['sup-005'], ['AI-HYALU-6610']);
    const res = await publish(id);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_COMPETITION)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ RFQ_PUBLISH_INVITEES_ELIGIBLE — and it decides BEFORE the count', () => {
  it('a SUSPENDED invitee refuses the publish, named with its status', async () => {
    const id = await draftWith(['sup-007', 'sup-008', 'sup-012'], ['RM-EMUL-3310']);
    const res = await publish(id);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE)).toBe(true);
    expect(res.reason).toContain('sup-012');
    expect(res.reason).toContain('Suspended');
    expect(rfqStore.get(id)!.status).toBe('Draft');
  });

  it('⚠️ THE ELIGIBILITY REFUSAL WINS OVER THE COUNT — the order is observable', async () => {
    // Two invitees, one Suspended. BOTH hooks would refuse: eligibility on
    // sup-012, competition because only one invitee is eligible. The caller
    // must be told the actionable one — remove the supplier — and that is only
    // true if eligibility is evaluated first.
    const id = await draftWith(['sup-007', 'sup-012'], ['RM-EMUL-3310']);
    const res = await publish(id);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE)).toBe(true);
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_PUBLISH_COMPETITION)).toBe(false);
  });

  it('⚠️ AN ONBOARDING INVITEE IS ACCEPTED — the deliberate non-member', async () => {
    // sup-010 and sup-011 are Onboarding. If the refusable set ever gains
    // Onboarding this goes red, which is the point: the other reading cannot be
    // adopted without this spec saying so.
    const id = await draftWith(['sup-005', 'sup-011'], ['RM-EMUL-3310']);
    const res = await publish(id);
    expect(res.status, res.reason).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ RFQ_AWARD_AWARDEE_INTEGRITY — dispatched directly, because no fixture reaches it', () => {
  it('the ordinary award still works', async () => {
    const res = await award('rfq-003', 'qt-003a', 'sup-001');
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-003')!.status).toBe('Awarded');
  });

  it('⚠️ AWARDING ONE SUPPLIER ANOTHER SUPPLIER’S QUOTATION IS REFUSED', async () => {
    // ⚠️ HAND-CRAFTED ON PURPOSE. The corpus cannot produce this: the two award
    // fields are separate payload keys, and only a caller can make them
    // disagree. sup-002 is genuinely invited to rfq-003 and genuinely holds a
    // quotation on it, so the weaker "was the awardee invited?" check passes
    // here — this is the case that check cannot see.
    const res = await award('rfq-003', 'qt-003a', 'sup-002');
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY)).toBe(true);
    expect(res.reason).toContain('AWARDEE_NOT_THE_QUOTING_SUPPLIER');
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
  });

  it('⚠️ AND NOTHING CASCADED — a refused award leaves every quotation where it was', async () => {
    // The half that makes the refusal worth having: `t_rfq_award` is the
    // cascade SOURCE, so a refusal that landed after the fan-out would have
    // rejected every losing quotation on an award that never happened.
    const before = quotationStore.forRfq('rfq-003').map((q) => `${q.id}:${q.status}`);
    await award('rfq-003', 'qt-003a', 'sup-002');
    expect(quotationStore.forRfq('rfq-003').map((q) => `${q.id}:${q.status}`)).toEqual(before);
  });

  it('an awardee who was never invited is refused', async () => {
    // sup-008 holds no quotation on rfq-003 and was never invited. The
    // quotation arm fires first (it is the stronger claim) — what matters is
    // that the award does not land.
    const res = await award('rfq-003', 'qt-003a', 'sup-008');
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY)).toBe(true);
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
  });

  it('an award naming a quotation that does not exist is refused, not passed', async () => {
    const res = await award('rfq-003', 'qt-does-not-exist', 'sup-001');
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('no such quotation');
  });
});

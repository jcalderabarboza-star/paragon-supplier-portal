// ────────────────────────────────────────────────────────────────────────────
// §68 — THE REQUESTER'S SIDE OF THE MACHINE, AND THE ATTRIBUTION ON THE
// DECIDER'S SIDE. `t_pr_submit` / `t_pr_revise` through the REAL
// MockCommandService + the real purchaseRequisitionStore, plus the two things
// this batch added to the machine: a PERSISTED revision note, and an approval
// that names who decided it from the SESSION rather than from the payload.
//
// ⚠️ **WHY IT MATTERS THAT THE QUEUE CAN NOW FILL.** §67 made approve/reject
// reachable over a SEEDED FIXTURE and nothing else: `t_pr_create` lands a
// requisition at `Draft`, `t_pr_submit` is the only edge out, and no shipped
// code dispatched it. The approval surface emptied a queue nothing filled.
// These specs walk the whole loop — create → submit → reject → revise → submit
// → approve — which is the first time any test has crossed both role bundles.
//
// ⚠️ RULE 4 THROUGHOUT: the known-GOOD input is asserted on the SAME harness as
// every refusal. A guard that is wrong about what it ACCEPTS ships looking like
// a working guard.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { NO_PERSON } from '../../../context/noPerson';
import { MockCommandService, commandAuditSink } from './MockCommandService';

const svc = new MockCommandService();

/** The whole buyer seat — today's default, holding BOTH sides. */
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};
/** Raises requisitions; cannot decide them. */
const requisitioner: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['requisitioner'],
  actor: NO_PERSON,
};
/** Decides them; cannot raise them. */
const procurement: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

/** The seeded Draft fixture — the state the whole batch is about. */
const DRAFT = 'pr-005';
/** The seeded fixture already in the approval queue. */
const PENDING = 'pr-004';

const dispatch = (
  scope: QueryScope,
  transitionId: string,
  entityId: string,
  payload?: Record<string, unknown>,
) =>
  svc.dispatch(scope, {
    transitionId,
    entity: 'purchaseRequisition',
    entityId,
    ...(payload ? { payload } : {}),
  });

beforeEach(() => {
  purchaseRequisitionStore.reset();
});

/** The most recent recorded event for a transition id (the sink is append-only). */
const lastEvent = (id: string) => {
  const events = commandAuditSink.byEvent(id);
  expect(events.length).toBeGreaterThan(0);
  return events[events.length - 1];
};

describe('the population this file rests on', () => {
  it('⚠️ FIRST — pr-005 really is a Draft, and both requester verbs are registered', () => {
    // Without this, every refusal below could be an ILLEGAL_TRANSITION over a
    // row in the wrong state and would read as a working role gate.
    expect(purchaseRequisitionStore.get(DRAFT)!.status).toBe('Draft');
    expect(getTransition('t_pr_submit')!.from).toContain('Draft');
    expect(getTransition('t_pr_revise')!.from).toContain('Rejected');
  });
});

describe('§68 · submit — the edge that fills the queue', () => {
  it('✅ a requisitioner submits: Draft → Pending Approval, in the store', async () => {
    const res = await dispatch(requisitioner, 't_pr_submit', DRAFT);
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(DRAFT)!.status).toBe('Pending Approval');
  });

  it('⚠️ PROCUREMENT CANNOT SUBMIT — the segregation, from the side nothing exercised', async () => {
    // Until §68 the machine only ever ran one side, so `pr:submit` living
    // outside `procurement` was a property of the bundles that no dispatch
    // touched. This is that property, exercised.
    const res = await dispatch(procurement, 't_pr_submit', DRAFT);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    expect(purchaseRequisitionStore.get(DRAFT)!.status).toBe('Draft');
  });

  it('the default buyer seat submits too — it holds requisitioner today', async () => {
    expect((await dispatch(buyer, 't_pr_submit', DRAFT)).status).toBe('done');
  });

  it('submitting twice is refused — the second finds no Draft to leave', async () => {
    expect((await dispatch(requisitioner, 't_pr_submit', DRAFT)).status).toBe('done');
    const again = await dispatch(requisitioner, 't_pr_submit', DRAFT);
    expect(again.status).toBe('failed');
    expect(again.reason).toContain('ILLEGAL_TRANSITION');
  });

  it('⚠️ AND A PR THE INTAKE JUST CREATED CAN REACH THE QUEUE — the dead end is closed', async () => {
    // The whole point. Before §68 a created requisition sat at Draft forever:
    // t_pr_create mints it, t_pr_submit is the only edge out, and nothing in
    // shipped code dispatched it.
    const created = await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Halal Glycerin 99.5%', quantity: 2_000 },
    });
    expect(created.status).toBe('done');
    expect(purchaseRequisitionStore.get(created.entityId!)!.status).toBe('Draft');

    const submitted = await dispatch(requisitioner, 't_pr_submit', created.entityId!);
    expect(submitted.status).toBe('done');
    expect(purchaseRequisitionStore.get(created.entityId!)!.status).toBe('Pending Approval');
  });
});

describe('§68 · revise — REQUIRED, NON-BLANK, AND AT LAST PERSISTED', () => {
  const NOTE = 'Split into two lots of 1,000 KG and moved the second to the Q4 budget.';

  /** Put PENDING into Rejected, which is the only state revise leaves from. */
  const reject = () =>
    dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: 'Over budget.' });

  it('✅ THE KNOWN-GOOD INPUT PASSES — a note is given, the PR returns to Draft', async () => {
    await reject();
    const res = await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: NOTE });
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Draft');
  });

  it('⚠️ AND THE NOTE IS WRITTEN ONTO THE DOCUMENT — the half that did not exist', async () => {
    // The verb has REQUIRED this field since PF-1a and `applyTransition` then
    // dropped it. A full enforcement chain terminating in nothing.
    await reject();
    await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: NOTE });
    expect(purchaseRequisitionStore.get(PENDING)!.revisionNote).toBe(NOTE);
  });

  it('revising with NO note is refused — MISSING_FIELDS, and nothing moves', async () => {
    await reject();
    const res = await dispatch(requisitioner, 't_pr_revise', PENDING);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Rejected');
  });

  it('⚠️ THE SPACE BAR IS REFUSED, AND requiredFields ALONE WOULD HAVE ADMITTED IT', async () => {
    // `isEmpty('   ')` is FALSE. The refusal comes from
    // PR_REVISION_NOTE_AUTHORED and names the field.
    await reject();
    const res = await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: '   ' });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('revisionNote');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Rejected');
  });

  it('a NUMBER in the note field is refused too — isEmpty(0) is also false', async () => {
    await reject();
    const res = await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: 0 });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('revisionNote');
  });

  it('procurement cannot revise — recourse belongs to the requester', async () => {
    await reject();
    const res = await dispatch(procurement, 't_pr_revise', PENDING, { revisionNote: NOTE });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    expect(purchaseRequisitionStore.get(PENDING)!.revisionNote).toBeUndefined();
  });

  it('⚠️ THE REJECTION REASON SURVIVES AND THE NOTE JOINS IT — both, not either', async () => {
    // The reason says why it came back; the note says what was done about it.
    // An approver reading a re-submitted requisition needs them together.
    await reject();
    await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: NOTE });
    const pr = purchaseRequisitionStore.get(PENDING)!;
    expect(pr.rejectionReason).toBe('Over budget.');
    expect(pr.revisionNote).toBe(NOTE);
  });

  it('a fresh revision REPLACES the last — a note describes the change that produced this draft', async () => {
    await reject();
    await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: NOTE });
    await dispatch(requisitioner, 't_pr_submit', PENDING);
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: 'Still over.' });
    await dispatch(requisitioner, 't_pr_revise', PENDING, { revisionNote: 'Halved it again.' });
    expect(purchaseRequisitionStore.get(PENDING)!.revisionNote).toBe('Halved it again.');
  });

  it('an untouched requisition carries NO revisionNote — absence is not an empty string', () => {
    expect(purchaseRequisitionStore.get(DRAFT)!.revisionNote).toBeUndefined();
  });
});

describe('⚠️ §68 · THE APPROVAL NAMES ITS DECIDER — C10 §6.2, both halves', () => {
  it('✅ THE KNOWN-GOOD PATH PASSES — a session with an actor approves', async () => {
    const res = await dispatch(procurement, 't_pr_approve', PENDING);
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Approved');
  });

  it('⚠️ AND THE ATTRIBUTION IS WRITTEN ONTO THE DOCUMENT, FROM THE SESSION', async () => {
    await dispatch(procurement, 't_pr_approve', PENDING);
    // Today this is ALWAYS the honest absence, because nothing in shipped code
    // constructs a RESOLVED actor (C10 §2.3). `approvalLevel` — the field that
    // used to be called `approver` — said 'Section Head' before anybody had
    // approved anything, and still says it: it is the DESTINATION, not the act.
    expect(purchaseRequisitionStore.get(PENDING)!.approvedBy).toEqual({
      kind: 'UNATTRIBUTED',
      reason: 'NO_PERSON_IN_SESSION',
    });
  });

  it('⚠️ A PAYLOAD-SUPPLIED `approvedBy` IS REFUSED BY NAME — §6.2 half two', async () => {
    // §6.2: *"not ignored, not overwritten, not silently replaced by the
    // session's. Refused, loudly."* The overwrite is the tempting build and it
    // is the one ruled out — a silent correction of an attribution is a caller
    // that believes it attributed an act and a record that says somebody else
    // did. This is the first implementation of that half in the tree.
    const res = await dispatch(procurement, 't_pr_approve', PENDING, {
      approvedBy: { kind: 'RESOLVED', person: { personId: 'usr-014', displayName: 'A Person' } },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('approvedBy');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('⚠️ AND IT IS REFUSED BY KEY, NOT BY SHAPE — a malformed one is refused too', async () => {
    // Refusing only a WELL-FORMED resolved actor would let a malformed one
    // through to be dropped silently, which is the same silent correction
    // wearing a type error. The caller has no business writing the key at all.
    const res = await dispatch(procurement, 't_pr_approve', PENDING, { approvedBy: 'me' });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('approvedBy');
  });

  it('⚠️ AN UNATTRIBUTED PAYLOAD IS REFUSED HERE TOO — attribution is not a payload concern', async () => {
    // §6.2 keeps an UNATTRIBUTED payload value legal for `setBy`, whose whole
    // shape is caller-supplied. This verb takes attribution from the session
    // instead, so the key is not a legal thing to send AT ALL — which is a
    // narrower rule than §6.2's and strictly inside it.
    const res = await dispatch(procurement, 't_pr_approve', PENDING, {
      approvedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('approvedBy');
  });

  it('a scope with NO actor is refused — an approval that cannot say who decided is not a record', async () => {
    const anonymous: QueryScope = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['procurement'],
    };
    const res = await dispatch(anonymous, 't_pr_approve', PENDING);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('POLICY_REJECTED');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('⚠️ REJECT IS NOT ATTRIBUTED ON THE DOCUMENT — stated, not overlooked', async () => {
    // The ruling named `t_pr_approve`. A rejection records its REASON and, via
    // the ledger below, its attribution — but nothing on the document says who
    // declined it. Pinned so the asymmetry is a fact in the tree rather than a
    // sentence in a report.
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: 'No.' });
    expect(purchaseRequisitionStore.get(PENDING)!.approvedBy).toBeUndefined();
  });
});

describe('⚠️ §68 · THE LEDGER — C10 §6.4, and ABSENT MEANS A MACHINE ACT', () => {
  beforeEach(() => commandAuditSink.clear());

  it('✅ a user-trigger event carries the attribution, BESIDE the seat actor', async () => {
    await dispatch(procurement, 't_pr_approve', PENDING);
    const ev = lastEvent('t_pr_approve');
    expect(getTransition('t_pr_approve')!.trigger).toBe('user');
    expect(ev.attribution).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    // ⚠️ AND `actor` IS UNCHANGED. It answers WHICH SEAT and is a true fact
    // about the scope; attribution answers WHICH HUMAN. Collapsing them is
    // `ENF-EVENT-ACTOR-IS-A-PERSONA-01` with extra steps (C10 §6.4), so the
    // assertion that the old field survives is as load-bearing as the new one.
    expect(ev.actor).toBe('buyer:all');
  });

  it('⚠️ A CREATION EVENT CARRIES NONE — a machine act is never dressed as UNATTRIBUTED', async () => {
    // `UNATTRIBUTED` is a CLAIM that a human acted and could not be resolved,
    // and every member of the vocabulary names a failure somebody can go and
    // fix. Stamping creations and cascades with it would flood the count, and
    // the count is the only pressure that ever gets one fixed.
    await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Niacinamide B3 USP Grade', quantity: 10 },
    });
    const ev = lastEvent('t_pr_create');
    expect(getTransition('t_pr_create')!.trigger).toBe('creation');
    expect(ev.attribution).toBeUndefined();
    // The seat is still recorded — absence of a HUMAN is not absence of a scope.
    expect(ev.actor).toBe('buyer:all');
  });

  it('⚠️ AND A REFUSED COMMAND IS ATTRIBUTED TOO — who tried is part of the record', async () => {
    // The failure event is the population the DR-10 ledger exists for; an
    // attempted approval nobody can be traced to is exactly the gap.
    await dispatch(requisitioner, 't_pr_approve', PENDING);
    const ev = lastEvent('t_pr_approve');
    expect(ev.outcome).toBe('failed');
    expect(ev.attribution).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
  });
});

describe('⚠️ §68 · THE WHOLE LOOP, ACROSS BOTH BUNDLES', () => {
  it('create → submit → reject → revise → submit → approve, each act by the seat that holds it', async () => {
    const created = await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Centella Asiatica Extract 10:1', quantity: 300 },
    });
    const id = created.entityId!;

    expect((await dispatch(requisitioner, 't_pr_submit', id)).status).toBe('done');
    expect(
      (await dispatch(procurement, 't_pr_reject', id, { rejectionReason: 'Wrong grade.' })).status,
    ).toBe('done');
    expect(
      (await dispatch(requisitioner, 't_pr_revise', id, { revisionNote: 'Grade corrected.' }))
        .status,
    ).toBe('done');
    expect((await dispatch(requisitioner, 't_pr_submit', id)).status).toBe('done');
    expect((await dispatch(procurement, 't_pr_approve', id)).status).toBe('done');

    const pr = purchaseRequisitionStore.get(id)!;
    expect(pr.status).toBe('Approved');
    expect(pr.rejectionReason).toBe('Wrong grade.');
    expect(pr.revisionNote).toBe('Grade corrected.');
    expect(pr.approvedBy).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
  });

  it('⚠️ AND NEITHER NARROW SEAT COULD HAVE WALKED IT ALONE — derived from the bundles', () => {
    // The loop above needed two seats. That is the segregation being real
    // rather than notional, and it is derived so that moving an atom tomorrow
    // reddens this line instead of leaving a comment that says the old thing.
    expect(SYSTEM_ROLES.requisitioner).toContain('pr:submit');
    expect(SYSTEM_ROLES.requisitioner).toContain('pr:revise');
    expect(SYSTEM_ROLES.requisitioner).not.toContain('pr:approve');
    expect(SYSTEM_ROLES.procurement).toContain('pr:approve');
    expect(SYSTEM_ROLES.procurement).not.toContain('pr:submit');
    expect(SYSTEM_ROLES.procurement).not.toContain('pr:revise');
    // …and the DEFAULT seat still collapses it, which stays open (item 7).
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('requisitioner');
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('procurement');
  });
});

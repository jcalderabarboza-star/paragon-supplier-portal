// ────────────────────────────────────────────────────────────────────────────
// §67 — THE APPROVAL LANE, DISPATCHED. `t_pr_approve` / `t_pr_reject` through
// the REAL MockCommandService + the real purchaseRequisitionStore.
//
// ⚠️ **WHY THIS FILE EXISTS AT ALL: THE VERBS WERE NEVER UNBUILT.** Both have
// been authored, registered and dispatchable since F0.4 with ZERO call sites in
// the tree — not even a consumerless hook, which is strictly less than
// `t_invoice_approve` ever had. Nothing was missing from the machine; the
// CONNECTION was missing. These tests pin the connection AND the two things
// this batch added to the machine: a REQUIRED, NON-BLANK, PERSISTED rejection
// reason.
//
// ⚠️ RULE 4 THROUGHOUT — every refusal claim is paired with the known-GOOD
// input passing on the SAME harness. A guard is habitually probed in one
// direction only, and one that is wrong about what it should ACCEPT ships
// looking like a working guard.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { NO_PERSON } from '../../../context/noPerson';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';

/** Procurement 1, from the roster — never a spelled id (`simUsrNamespace.test.ts`). */
const PROCUREMENT_1_ID = SAMPLE_PEOPLE.find((p) => p.role === 'procurement' && p.ordinal === 1)!.personId;

const svc = new MockCommandService();

// ⚠️ §68 — EVERY COMMANDING SCOPE NOW CARRIES `actor`, AND THAT IS NOT
// BOILERPLATE. Since E2E-1 (`PR_DECIDER_NAMED`) `t_pr_approve` and
// `t_pr_reject` refuse a seat that names nobody, so the two deciding scopes
// below act as a NAMED sample person, and the unnamed twins beside them are
// the refused case, asserted on purpose further down.
/** The person the deciding scopes act as. */
const DECIDER = SAMPLE_ACTORS.procurement1;
/** The whole buyer seat (every buyer lane bundle), acting as a named person. */
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: DECIDER,
};
/** The same whole seat as it OPENS — naming nobody. */
const unnamedBuyer: QueryScope = { ...buyer, actor: NO_PERSON };
/** A NARROWED seat: raises requisitions, cannot decide them. */
const requisitioner: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['requisitioner'],
  actor: NO_PERSON,
};
/** A narrowed seat that decides them and cannot raise them, acting as a named person. */
const procurement: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: DECIDER,
};
/** The same deciding seat naming nobody — it holds the atom and is still refused. */
const unnamedProcurement: QueryScope = { ...procurement, actor: NO_PERSON };
const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

/** The seeded fixture that is already in the approval queue. */
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

describe('the population itself — the fixture this file rests on', () => {
  it('⚠️ FIRST — pr-004 really is in Pending Approval, and both verbs are registered', () => {
    // Without this, every refusal below could be an ILLEGAL_TRANSITION over a
    // row in the wrong state and would read as a working role gate.
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
    expect(getTransition('t_pr_approve')!.from).toContain('Pending Approval');
    expect(getTransition('t_pr_reject')!.from).toContain('Pending Approval');
  });
});

describe('§67 · approve — the act that had no caller', () => {
  it('procurement approves: Pending Approval → Approved, in the store', async () => {
    const res = await dispatch(procurement, 't_pr_approve', PENDING);
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Approved');
  });

  it('the whole buyer seat approves too — the default holds procurement', async () => {
    expect((await dispatch(buyer, 't_pr_approve', PENDING)).status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Approved');
  });

  it('⚠️ and the approval is recorded against EXACTLY the person the seat named', async () => {
    await dispatch(procurement, 't_pr_approve', PENDING);
    expect(DECIDER).toEqual({ kind: 'RESOLVED', person: { personId: PROCUREMENT_1_ID } });
    expect(purchaseRequisitionStore.get(PENDING)!.approvedBy).toEqual(DECIDER);
  });

  it('⚠️ a REQUISITIONER cannot approve — the segregation exists in the bundles', async () => {
    const res = await dispatch(requisitioner, 't_pr_approve', PENDING);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    // and the document did not move.
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('a supplier never reaches the role gate — PRs are buyer-internal', async () => {
    // ⚠️ **THE TITLE WAS ASPIRATIONAL AND IS NOW TRUE.** Until the owner-less
    // scope fix a supplier DID reach the role gate here — `purchaseRequisition`
    // is owner-less, so a null owner failed to deny and `ROLE_NOT_PERMITTED` came
    // back for a PR that exists while `SCOPE_DENIED` came back for one that does
    // not. Scope denies it now, and the two answers are the same answer.
    await expect(dispatch(supplier, 't_pr_approve', PENDING)).rejects.toThrow(
      /denied for scope/,
    );
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('approving twice is refused — the second finds a state the verb does not leave from', async () => {
    expect((await dispatch(procurement, 't_pr_approve', PENDING)).status).toBe('done');
    const again = await dispatch(procurement, 't_pr_approve', PENDING);
    expect(again.status).toBe('failed');
    expect(again.reason).toContain('ILLEGAL_TRANSITION');
  });
});

describe('§67 · reject — REQUIRED, NON-BLANK, AND PERSISTED', () => {
  const REASON =
    'Volume exceeds the Q3 budget envelope - resubmit at 1,000 KG or attach the CFO waiver.';

  it('✅ THE KNOWN-GOOD INPUT PASSES — a reason is given, the PR is Rejected', async () => {
    // RULE 4: assert the guard ACCEPTS before believing it REFUSES.
    const res = await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: REASON });
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Rejected');
  });

  it('⚠️ AND THE REASON IS WRITTEN ONTO THE DOCUMENT — the half the invoice lane never built', async () => {
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: REASON });
    // There, a required `disputeReason` reaches applyTransition and is dropped.
    expect(purchaseRequisitionStore.get(PENDING)!.rejectionReason).toBe(REASON);
  });

  it('rejecting with NO reason at all is refused — MISSING_FIELDS', async () => {
    const res = await dispatch(procurement, 't_pr_reject', PENDING);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('⚠️ THE SPACE BAR IS REFUSED, AND requiredFields ALONE WOULD HAVE ADMITTED IT', async () => {
    // `isEmpty('   ')` is FALSE, so presence-only would pass this. The refusal
    // comes from PR_REJECT_REASON_AUTHORED and names the field.
    const res = await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: '   ' });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('rejectionReason');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Pending Approval');
  });

  it('a NUMBER in the reason field is refused too — isEmpty(0) is also false', async () => {
    const res = await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: 0 });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('rejectionReason');
  });

  it('⚠️ a REQUISITIONER cannot reject either — and a refused reject stores no reason', async () => {
    const res = await dispatch(requisitioner, 't_pr_reject', PENDING, { rejectionReason: REASON });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    expect(purchaseRequisitionStore.get(PENDING)!.rejectionReason).toBeUndefined();
  });

  it('the reason SURVIVES the revise edge — "why this came back" is what a reviser needs', async () => {
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: REASON });
    const revised = await dispatch(buyer, 't_pr_revise', PENDING, {
      revisionNote: 'Split into two lots.',
    });
    expect(revised.status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.status).toBe('Draft');
    expect(purchaseRequisitionStore.get(PENDING)!.rejectionReason).toBe(REASON);
  });

  it('and a FRESH rejection replaces it — only a new decision overwrites an old one', async () => {
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: REASON });
    await dispatch(buyer, 't_pr_revise', PENDING, { revisionNote: 'Split into two lots.' });
    await dispatch(buyer, 't_pr_submit', PENDING);
    await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: 'Still over budget.' });
    expect(purchaseRequisitionStore.get(PENDING)!.rejectionReason).toBe('Still over budget.');
  });

  it('an intake-created PR carries NO rejectionReason — absence is not an empty string', async () => {
    const created = await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Halal Glycerin 99.5%', quantity: 2_000 },
    });
    expect(created.status).toBe('done');
    expect(purchaseRequisitionStore.get(created.entityId!)!.rejectionReason).toBeUndefined();
  });
});

describe('⚠️ E2E-1 · A SEAT THAT NAMES NOBODY DECIDES NOTHING — approve AND reject', () => {
  const REASON = 'Volume exceeds the Q3 budget envelope.';

  beforeEach(() => commandAuditSink.clear());

  it('⚠️ FIRST — the unnamed twins differ from the named seats ONLY in the actor', () => {
    // Without this, a refusal below could be the role gate over a seat that
    // lost its lane, and would read as a working named-seat gate.
    expect(unnamedProcurement.businessRoles).toEqual(procurement.businessRoles);
    expect(unnamedBuyer.businessRoles).toEqual(buyer.businessRoles);
    expect(unnamedProcurement.actor).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    expect(unnamedBuyer.actor).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    expect(procurement.actor).toEqual(DECIDER);
  });

  it.each([
    ['the narrowed procurement seat', unnamedProcurement],
    ['the whole buyer seat', unnamedBuyer],
  ])('an unnamed APPROVE is refused by name on %s, and the document does not move', async (_label, scope) => {
    const res = await dispatch(scope, 't_pr_approve', PENDING);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('POLICY_REJECTED:pr_decider_named');
    expect(res.reason).toContain('PR_DECIDER_UNATTRIBUTED');

    const pr = purchaseRequisitionStore.get(PENDING)!;
    expect(pr.status).toBe('Pending Approval');
    expect(pr.approvedBy).toBeUndefined();
    expect(pr.rejectionReason).toBeUndefined();

    // …and nothing on the ledger says an approval happened.
    const events = commandAuditSink.byEvent('t_pr_approve');
    expect(events.length).toBeGreaterThan(0);
    expect(events.filter((e) => e.outcome === 'done')).toEqual([]);
  });

  it.each([
    ['the narrowed procurement seat', unnamedProcurement],
    ['the whole buyer seat', unnamedBuyer],
  ])('an unnamed REJECT is refused by name on %s, and no reason is stored', async (_label, scope) => {
    // A well-formed reason, so the refusal cannot be MISSING_FIELDS or the
    // authored-reason hook.
    const res = await dispatch(scope, 't_pr_reject', PENDING, { rejectionReason: REASON });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('POLICY_REJECTED:pr_decider_named');
    expect(res.reason).toContain('PR_DECIDER_UNATTRIBUTED');

    const pr = purchaseRequisitionStore.get(PENDING)!;
    expect(pr.status).toBe('Pending Approval');
    expect(pr.approvedBy).toBeUndefined();
    expect(pr.rejectionReason).toBeUndefined();

    const events = commandAuditSink.byEvent('t_pr_reject');
    expect(events.length).toBeGreaterThan(0);
    expect(events.filter((e) => e.outcome === 'done')).toEqual([]);
  });

  it('✅ THE OTHER DIRECTION, SAME HARNESS — the named seat approves and is the recorded decider', async () => {
    const res = await dispatch(procurement, 't_pr_approve', PENDING);
    expect(res.status).toBe('done');
    const pr = purchaseRequisitionStore.get(PENDING)!;
    expect(pr.status).toBe('Approved');
    expect(pr.approvedBy).toEqual(DECIDER);
    expect(commandAuditSink.byEvent('t_pr_approve').map((e) => e.outcome)).toEqual(['done']);
  });

  it('✅ and the named seat rejects — the reason lands, on the same harness', async () => {
    const res = await dispatch(procurement, 't_pr_reject', PENDING, { rejectionReason: REASON });
    expect(res.status).toBe('done');
    const pr = purchaseRequisitionStore.get(PENDING)!;
    expect(pr.status).toBe('Rejected');
    expect(pr.rejectionReason).toBe(REASON);
  });

  it('a refused unnamed approve leaves the document decidable — the named seat then approves it', async () => {
    expect((await dispatch(unnamedProcurement, 't_pr_approve', PENDING)).status).toBe('failed');
    expect((await dispatch(procurement, 't_pr_approve', PENDING)).status).toBe('done');
    expect(purchaseRequisitionStore.get(PENDING)!.approvedBy).toEqual(DECIDER);
  });

  it('the requester verbs are NOT gated — an unnamed seat still creates, submits and revises', async () => {
    const created = await svc.dispatch(unnamedBuyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Halal Glycerin 99.5%', quantity: 2_000 },
    });
    expect(created.status).toBe('done');
    const id = created.entityId!;
    expect((await dispatch(unnamedBuyer, 't_pr_submit', id)).status).toBe('done');
    // Reject needs a name; revise, which follows it, does not.
    expect(
      (await dispatch(procurement, 't_pr_reject', id, { rejectionReason: REASON })).status,
    ).toBe('done');
    expect(
      (await dispatch(unnamedBuyer, 't_pr_revise', id, { revisionNote: 'Halved.' })).status,
    ).toBe('done');
    expect(purchaseRequisitionStore.get(id)!.status).toBe('Draft');
  });
});

describe('⚠️ THE SEGREGATION, DERIVED FROM THE BUNDLES RATHER THAN ASSERTED', () => {
  it('procurement decides and requisitioner raises — disjoint on the PR atoms', () => {
    // Derived from SYSTEM_ROLES, so moving an atom tomorrow reddens this line
    // rather than leaving a comment that says the old thing.
    expect(SYSTEM_ROLES.procurement).toContain('pr:approve');
    expect(SYSTEM_ROLES.procurement).toContain('pr:reject');
    expect(SYSTEM_ROLES.requisitioner).not.toContain('pr:approve');
    expect(SYSTEM_ROLES.requisitioner).not.toContain('pr:reject');
    expect(SYSTEM_ROLES.requisitioner).toContain('pr:submit');
    expect(SYSTEM_ROLES.procurement).not.toContain('pr:submit');
  });

  it('⚠️ AND THE DEFAULT BUYER SEAT COLLAPSES IT — this is the finding, pinned', () => {
    // The bundles are segregated; the SEAT is not. Today one buyer session
    // holds both sides, so no ROLE stops a seat approving what it raised. When
    // the default narrows, this test is the thing that notices.
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('requisitioner');
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('procurement');
  });
});

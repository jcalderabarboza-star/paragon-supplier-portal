// FB-4 · ACTIVATE: THE PROCESS OBEYS THE CHANGE — and rollback, which is the
// same switch thrown back. Every act through the shipped dispatcher. The
// document the walk gates is a real seeded requisition resting where the gated
// act can be taken, never a row written for the spec.
import { describe, it, expect, beforeEach } from 'vitest';
import { commandAuditSink, commandTargetFor } from './MockCommandService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { createDispatcher, getFlow, resolvePolicyHook } from '../../transitions';
import { COMMAND_REFUSALS } from '../../transitions/refusals';
import { atomsForSeat } from '../../transitions/customRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { SUPER_ADMIN_REASON_REQUIRED } from '../../identity/superAdmin';
import { flowVersionStore } from '../../flowBuilder/flowVersionStore';
import { stepLedger } from '../../flowBuilder/stepLedger';
import {
  dueStep,
  dueStepsFor,
  inForce,
  parsePendingDetail,
  parseStepKey,
  stepKey,
  stepOpenFor,
  versionStampFor,
} from '../../flowBuilder/flowOverlay';
import type { QueryScope } from '../types';
import {
  act,
  contentWith,
  financeApproval,
  FINANCE_STEP,
  GATED_ACT,
  GATED_ENTITY,
  pendingRequisition,
  seatOf,
  unnamedSeat,
  versionAt,
} from '../../../test/flowVersions';

const procurement = seatOf('procurement');
const procurement2 = seatOf('procurement', 2);
const finance = seatOf('finance');
const admin = seatOf('admin');
const superAdmin = seatOf('super_admin');
const head = (reason: string | undefined): string => (reason ?? '').split(':').slice(2, 3).join('').trim();
const stateOf = (id: string): string => purchaseRequisitionStore.get(id)!.status;
const shipped = (): number => getFlow(GATED_ENTITY)!.version;

beforeEach(() => {
  flowVersionStore.reset();
  stepLedger.reset();
  purchaseRequisitionStore.reset();
  commandAuditSink.clear();
});

describe('FB-4 · with nothing in force the process runs as it shipped', () => {
  it('KNOWN-GOOD FIRST — the gated act is taken in one act, and an approved change that is not switched on changes nothing', async () => {
    await versionAt('Approved');
    const pr = pendingRequisition();
    expect(inForce(GATED_ENTITY)).toEqual({ version: null, setAside: null });
    expect(dueStepsFor(GATED_ENTITY, pr, 'Pending Approval')).toEqual([]);
    const r = await act(procurement, GATED_ACT, pr);
    expect(r.status, r.reason).toBe('done');
    expect(stateOf(pr)).toBe('Approved');
  });

  it('a dispatcher built with no overlay emits no version and asks nothing — and a preview consumes nothing', () => {
    const events: { flowVersion?: string }[] = [];
    const calls: string[] = [];
    const deps = {
      resolveRoles: (scope: QueryScope) => atomsForSeat(scope.businessRoles ?? []),
      target: commandTargetFor,
      resolvePolicyHook,
      sink: { emit: (e: { flowVersion?: string }) => void events.push(e) },
      nextCorrelationId: () => 'c1',
      now: () => '2026-01-01T00:00:00.000Z',
    };
    const pr = pendingRequisition();
    const input = { transitionId: GATED_ACT, entity: GATED_ENTITY, entityId: pr, payload: {} };

    // A preview through an overlay that reports a pending step: nothing spent, nothing emitted.
    const gated = createDispatcher({
      ...deps,
      flowOverlay: {
        pendingStep: () => (calls.push('pending'), 'x:y:z'),
        check: () => ({ ok: true }),
        consume: () => void calls.push('consume'),
        versionLabel: (entity) => `${entity}@9.9`,
      },
    } as Parameters<typeof createDispatcher>[0]);
    expect(gated.bypassRulesFor(procurement, input)).toEqual([]);
    expect(calls).toEqual(['pending']);
    expect(events).toEqual([]);
    expect(gated.dispatch(procurement, input).reason).toBe('STEP_PENDING:x:y:z');
    expect(events.map((e) => e.flowVersion)).toEqual([`${GATED_ENTITY}@9.9`]);
    expect(calls).not.toContain('consume');
    expect(stateOf(pr)).toBe('Pending Approval');

    // No overlay: the act is taken, and the event has no such field at all.
    events.length = 0;
    const plain = createDispatcher(deps as Parameters<typeof createDispatcher>[0]);
    expect(plain.dispatch(procurement, input).status).toBe('done');
    expect(events).toHaveLength(1);
    expect('flowVersion' in events[0]).toBe(false);
  });
});

describe('FB-4 · an act with a due step', () => {
  it('is refused STEP_PENDING naming the step, and the document does not move', async () => {
    const version = await versionAt('Active');
    const pr = pendingRequisition();
    expect(inForce(GATED_ENTITY).version?.id).toBe(version.id);
    const r = await act(procurement, GATED_ACT, pr);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe(`STEP_PENDING:${stepKey(GATED_ENTITY, pr, FINANCE_STEP)}`);
    expect(parseStepKey(parsePendingDetail(r.reason!.slice('STEP_PENDING:'.length)).key)).toEqual({
      entity: GATED_ENTITY,
      docId: pr,
      stepId: FINANCE_STEP,
    });
    expect(stateOf(pr)).toBe('Pending Approval');
    // An act the change does not stand in front of is not touched.
    const other = await act(procurement, 't_pr_reject', pr, { rejectionReason: 'not needed' });
    expect(other.status, other.reason).toBe('done');
  });

  it('the refusal order holds: a seat without the lane is refused on the lane, an illegal act on legality, and only then on the step', async () => {
    await versionAt('Active');
    const pr = pendingRequisition();
    expect((await act(finance, GATED_ACT, pr)).reason).toBe('ROLE_NOT_PERMITTED:pr:approve');
    const draft = purchaseRequisitionStore.all().find((r) => r.status === 'Draft')!.id;
    expect((await act(procurement, GATED_ACT, draft)).reason).toBe('ILLEGAL_TRANSITION:Draft->Approved');
    expect((await act(procurement, GATED_ACT, pr)).reason).toMatch(/^STEP_PENDING:/);
    // …and it is where the closed list says it is.
    const at = (k: (typeof COMMAND_REFUSALS)[number]) => COMMAND_REFUSALS.indexOf(k);
    expect(at('STEP_PENDING')).toBeGreaterThan(at('MISSING_FIELDS'));
    expect(at('STEP_PENDING')).toBeLessThan(at('UNBOUND_HOOK'));
    expect(at('STEP_PENDING')).toBeGreaterThan(at('ROLE_NOT_PERMITTED'));
    expect(at('STEP_PENDING')).toBeGreaterThan(at('ILLEGAL_TRANSITION'));
  });

  it('completing the step lets the act through, and the completion is used up — the next document round, the step is due again', async () => {
    const version = await versionAt('Active');
    const pr = pendingRequisition();
    const key = stepKey(GATED_ENTITY, pr, FINANCE_STEP);
    const done = await act(finance, 't_step_complete', key);
    expect(done.status, done.reason).toBe('done');
    expect(stepLedger.all()).toMatchObject([
      { entity: GATED_ENTITY, docId: pr, stepId: FINANCE_STEP, versionId: version.id, versionLabel: version.label, decision: 'completed', by: finance.actor, used: false },
    ]);
    expect(dueStep(GATED_ENTITY, pr, GATED_ACT)).toBeNull();
    // Done once is done: it is not due, so it cannot be completed twice.
    expect(head((await act(finance, 't_step_complete', key)).reason)).toBe('STEP_NOT_DUE');

    const approved = await act(procurement, GATED_ACT, pr);
    expect(approved.status, approved.reason).toBe('done');
    expect(stateOf(pr)).toBe('Approved');
    expect(stepLedger.all().map((r) => r.used)).toEqual([true]);
    // Spent: asked of the same document again, the step would be due again.
    expect(dueStep(GATED_ENTITY, pr, GATED_ACT)?.step.id).toBe(FINANCE_STEP);

    // A second document meets the step afresh.
    const next = purchaseRequisitionStore.all().find((r) => r.status === 'Draft')!.id;
    await act(seatOf('requisitioner'), 't_pr_submit', next);
    expect(stateOf(next)).toBe('Pending Approval');
    expect((await act(procurement, GATED_ACT, next)).reason).toBe(`STEP_PENDING:${stepKey(GATED_ENTITY, next, FINANCE_STEP)}`);
  });

  it('a seat outside the step’s lane cannot complete it; the surface and the hook give the same answer, for every sample seat', async () => {
    const version = await versionAt('Active');
    const key = stepKey(GATED_ENTITY, pendingRequisition(), FINANCE_STEP);
    const step = version.content.steps[0];
    const buyers = SAMPLE_PEOPLE.filter((p) => p.personaType === 'buyer');
    const answers: [string, boolean][] = [];
    for (const p of buyers) {
      const seat = seatOf(p.role, p.ordinal);
      // Asked without taking it: a seat that is refused leaves the step due.
      stepLedger.reset();
      const r = await act(seat, 't_step_complete', key, {}, { bypassReason: 'probe' });
      const refusedOnLane = r.status === 'failed' && (head(r.reason) === 'STEP_LANE_NOT_HELD' || r.reason === 'ROLE_NOT_PERMITTED:step:complete');
      expect(stepOpenFor(step, seat.businessRoles ?? []), `${p.personId}: ${r.reason}`).toBe(!refusedOnLane);
      answers.push([p.role, !refusedOnLane]);
    }
    // BOTH WAYS — named members on each side, or the agreement is over nothing.
    expect(answers).toContainEqual(['finance', true]);
    expect(answers).toContainEqual(['admin', true]);
    expect(answers).toContainEqual(['procurement', false]);
    expect(answers).toContainEqual(['compliance', false]);
  });

  it('a seat that names nobody cannot complete a step, and an invented step is not found', async () => {
    await versionAt('Active');
    const pr = pendingRequisition();
    const unnamed = await act(unnamedSeat('finance'), 't_step_complete', stepKey(GATED_ENTITY, pr, FINANCE_STEP));
    expect(head(unnamed.reason)).toBe('STEP_ACTOR_UNATTRIBUTED');
    await expect(act(finance, 't_step_complete', stepKey(GATED_ENTITY, pr, 's_bogus_9'))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(act(finance, 't_step_complete', stepKey(GATED_ENTITY, 'PR-NO-SUCH', FINANCE_STEP))).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('a declined approval keeps the act refused and names the reason; decided again, the latest decision counts', async () => {
    await versionAt('Active');
    const pr = pendingRequisition();
    const key = stepKey(GATED_ENTITY, pr, FINANCE_STEP);
    expect(head((await act(finance, 't_step_decline', key, { reason: '  ' })).reason)).toBe('STEP_DECLINE_REASON_BLANK');
    const declined = await act(finance, 't_step_decline', key, { reason: 'over the budget line' });
    expect(declined.status, declined.reason).toBe('done');
    const refused = await act(procurement, GATED_ACT, pr);
    expect(refused.reason).toBe(`STEP_PENDING:${key}:declined`);
    expect(dueStep(GATED_ENTITY, pr, GATED_ACT)!.declined).toMatchObject({ reason: 'over the budget line', by: finance.actor });
    expect(stateOf(pr)).toBe('Pending Approval');

    await act(finance, 't_step_complete', key);
    expect(stepLedger.all().map((r) => r.decision)).toEqual(['declined', 'completed']);
    expect((await act(procurement, GATED_ACT, pr)).status).toBe('done');
  });

  it('only an approval is declined, and a data-capture step asks for its fields', async () => {
    await versionAt(
      'Active',
      contentWith(
        financeApproval({
          id: 's_capture_1',
          kind: 'capture',
          fields: [{ name: 'costCentre', label: { en: 'Cost centre', id: 'Pusat biaya' }, type: 'text', required: true }],
        }),
      ),
    );
    const key = stepKey(GATED_ENTITY, pendingRequisition(), 's_capture_1');
    expect(head((await act(finance, 't_step_decline', key, { reason: 'no' })).reason)).toBe('STEP_NOT_AN_APPROVAL');
    expect(head((await act(finance, 't_step_complete', key, { values: {} })).reason)).toBe('STEP_FIELD_MISSING');
    const done = await act(finance, 't_step_complete', key, { values: { costCentre: 'CC-4410' } });
    expect(done.status, done.reason).toBe('done');
    expect(stepLedger.all()[0].values).toEqual({ costCentre: 'CC-4410' });
  });
});

describe('FB-4 · the separation an author asked for', () => {
  it('the completer-may-not-act rule refuses the same person at the act, admits another, and a Super Admin passes it with a recorded reason', async () => {
    await versionAt('Active', contentWith(financeApproval({ lane: 'procurement', completerMayNotAct: true })));
    const pr = pendingRequisition();
    const key = stepKey(GATED_ENTITY, pr, FINANCE_STEP);
    expect((await act(procurement, 't_step_complete', key)).status).toBe('done');
    const same = await act(procurement, GATED_ACT, pr);
    expect(same.reason).toMatch(/^POLICY_REJECTED:added_check:STEP_COMPLETER_MAY_NOT_ACT: /);
    expect(same.reason).toContain((procurement.actor as { person: { personId: string } }).person.personId);
    expect(stateOf(pr)).toBe('Pending Approval');
    const other = await act(procurement2, GATED_ACT, pr);
    expect(other.status, other.reason).toBe('done');

    // A Super Admin who completed the step: refused without a reason, and with one it is recorded.
    purchaseRequisitionStore.reset();
    stepLedger.reset();
    expect((await act(superAdmin, 't_step_complete', key)).status).toBe('done');
    expect((await act(superAdmin, GATED_ACT, pr)).reason).toContain(SUPER_ADMIN_REASON_REQUIRED);
    const reasoned = await act(superAdmin, GATED_ACT, pr, {}, { bypassReason: 'the only person on shift' });
    expect(reasoned.status, reasoned.reason).toBe('done');
    expect(commandAuditSink.all().find((e) => e.correlationId === reasoned.correlationId)!.bypass).toEqual({
      rules: ['STEP_COMPLETER_MAY_NOT_ACT'],
      reason: 'the only person on shift',
    });
  });

  it('a step that must be completed by a different person from an earlier one refuses the same person, by head', async () => {
    await versionAt(
      'Active',
      contentWith(
        financeApproval({ lane: 'procurement' }),
        financeApproval({ id: 's_confirmation_1', kind: 'confirmation', order: 2, lane: 'procurement', differentFrom: [FINANCE_STEP] }),
      ),
    );
    const pr = pendingRequisition();
    const second = stepKey(GATED_ENTITY, pr, 's_confirmation_1');
    // The second is not due while the first is open.
    expect(head((await act(procurement, 't_step_complete', second)).reason)).toBe('STEP_NOT_DUE');
    await act(procurement, 't_step_complete', stepKey(GATED_ENTITY, pr, FINANCE_STEP));
    expect(head((await act(procurement, 't_step_complete', second)).reason)).toBe('STEP_COMPLETER_IS_EARLIER_COMPLETER');
    expect((await act(procurement2, 't_step_complete', second)).status).toBe('done');
    expect(dueStep(GATED_ENTITY, pr, GATED_ACT)).toBeNull();
  });
});

describe('FB-4 · versions in force, and the record', () => {
  it('every event carries the version in force — the shipped one before activation, the change after', async () => {
    const pr = pendingRequisition();
    await act(finance, GATED_ACT, pr);
    const before = commandAuditSink.all().slice(-1)[0]!;
    expect(before.flowVersion).toBe(`${GATED_ENTITY}@${shipped()}`);
    const version = await versionAt('Active');
    expect(versionStampFor(GATED_ENTITY)).toBe(`${GATED_ENTITY}@${version.label}`);
    await act(procurement, GATED_ACT, pr);
    const after = commandAuditSink.all().slice(-1)[0]!;
    expect(after.event).toBe(GATED_ACT);
    expect(after.flowVersion).toBe(`${GATED_ENTITY}@${shipped()}.1`);
    // An act on another process says that process's own version.
    expect(commandAuditSink.all().find((e) => e.event === 't_flowversion_activate')!.flowVersion).toBe(
      `flowVersion@${getFlow('flowVersion')!.version}`,
    );
  });

  it('activating a second version retires the first by cascade; at most one is active per process', async () => {
    const first = await versionAt('Active');
    const second = await versionAt('Active', contentWith(financeApproval({ lane: 'procurement' })));
    const states = () => flowVersionStore.forEntity(GATED_ENTITY).map((v) => [v.label, v.state]);
    expect(states()).toEqual([[first.label, 'Retired'], [second.label, 'Active']]);
    const superseded = flowVersionStore.byId(first.id)!.history.slice(-1)[0]!;
    expect(superseded).toMatchObject({ act: 'supersede', by: null, reason: second.label, from: 'Active', to: 'Retired' });
    const event = commandAuditSink.all().find((e) => e.event === 't_flowversion_supersede')!;
    expect(event.outcome).toBe('done');
    expect(event.attribution).toBeUndefined();
    expect(inForce(GATED_ENTITY).version?.id).toBe(second.id);
    // Nobody can declare a supersede by hand.
    const third = await versionAt('Active');
    expect((await act(admin, 't_flowversion_supersede', third.id)).reason).toBe('ROLE_NOT_PERMITTED:flow:supersede');
  });

  it('a cascade-fired act is never gated: the library refuses a step in front of one, and the overlay answers nothing for it', async () => {
    const { validateVersion } = await import('../../flowBuilder/validateVersion');
    const { liveWorld } = await import('../../flowBuilder/liveWorld');
    const { emptyContent } = await import('../../flowBuilder/flowVersion');
    const quotation = getFlow('quotation')!;
    const award = quotation.transitions.find((t) => t.id === 't_quotation_award')!;
    expect(award.trigger).toBe('cascade');
    const gated = { ...emptyContent('quotation', quotation.version), steps: [financeApproval({ before: award.id })] };
    expect(validateVersion(gated, liveWorld()).filter((f) => f.code === 'R04').map((f) => f.element)).toContain(FINANCE_STEP);
    // And a change that DID gate it could not be proposed, so it is never in force.
    const v = await versionAt('Draft', gated);
    expect(head((await act(seatOf('compliance'), 't_flowversion_propose', v.id, { reason: 'x' })).reason)).toBe('FLOWVERSION_BREAKS_RULE');
  });
});

describe('FB-4 · the fixture is grown as the processes shipped', () => {
  it('while the boot seeds run a change in force stops nothing, and the moment they end it does again', async () => {
    const { fixtureSeeding } = await import('../../flowBuilder/stepsDue');
    await versionAt('Active');
    const pr = pendingRequisition();
    expect((await act(procurement, GATED_ACT, pr)).reason).toMatch(/^STEP_PENDING:/);
    fixtureSeeding(true);
    try {
      expect(inForce(GATED_ENTITY)).toEqual({ version: null, setAside: null });
      expect(versionStampFor(GATED_ENTITY)).toBe(`${GATED_ENTITY}@${shipped()}`);
      const grown = await act(procurement, GATED_ACT, pr);
      expect(grown.status, grown.reason).toBe('done');
    } finally {
      fixtureSeeding(false);
    }
    purchaseRequisitionStore.reset();
    expect((await act(procurement, GATED_ACT, pendingRequisition())).reason).toMatch(/^STEP_PENDING:/);
  });

  it('only the boot sequence can stand the overlay down — no surface, hook or service calls it', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const SRC = join(process.cwd(), 'src');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
      });
    const callers = walk(SRC)
      .filter((f) => readFileSync(f, 'utf8').includes('fixtureSeeding('))
      .map((f) => f.slice(SRC.length + 1).split('\\').join('/'))
      .sort();
    // CONTROL — the scan reaches the definition, so an empty answer would mean it read nothing.
    expect(callers).toContain('services/flowBuilder/stepsDue.ts');
    expect(callers).toEqual(['main.tsx', 'services/flowBuilder/stepsDue.ts']);
  });
});

describe('FB-4 · rollback', () => {
  it('retiring the active version returns the process to the shipped default at once — the gated act succeeds with no step', async () => {
    const version = await versionAt('Active');
    const pr = pendingRequisition();
    expect((await act(procurement, GATED_ACT, pr)).reason).toMatch(/^STEP_PENDING:/);
    // One named holder, with a reason — and no second person is asked for.
    expect(head((await act(unnamedSeat('admin'), 't_flowversion_retire', version.id, { reason: 'x' })).reason)).toBe(
      'FLOWVERSION_DECIDER_UNATTRIBUTED',
    );
    expect((await act(admin, 't_flowversion_retire', version.id, {})).reason).toBe('MISSING_FIELDS:reason');
    const retired = await act(admin, 't_flowversion_retire', version.id, { reason: 'Finance is away this week' });
    expect(retired.status, retired.reason).toBe('done');
    expect(flowVersionStore.byId(version.id)!.history.slice(-1)[0]).toMatchObject({
      act: 'retire', by: admin.actor, reason: 'Finance is away this week', to: 'Retired',
    });
    expect(inForce(GATED_ENTITY)).toEqual({ version: null, setAside: null });
    expect(versionStampFor(GATED_ENTITY)).toBe(`${GATED_ENTITY}@${shipped()}`);
    const approved = await act(procurement, GATED_ACT, pr);
    expect(approved.status, approved.reason).toBe('done');
  });

  it('restore validates again and retires the current version by cascade — and refuses a version whose process moved', async () => {
    const earlier = await versionAt('Retired');
    const current = await versionAt('Active', contentWith(financeApproval({ lane: 'procurement' })));
    const flow = getFlow(GATED_ENTITY) as { version: number };
    flow.version += 1;
    try {
      expect(head((await act(admin, 't_flowversion_restore', earlier.id, { reason: 'back' })).reason)).toBe('FLOWVERSION_BASE_MOVED');
      // THE ACTIVE ONE IS SET ASIDE, BY NAME — the process runs on the default.
      const read = inForce(GATED_ENTITY);
      expect(read.version).toBeNull();
      expect(read.setAside?.version.id).toBe(current.id);
      expect(read.setAside?.findings.map((f) => f.code)).toContain('R02');
      expect(versionStampFor(GATED_ENTITY)).toBe(`${GATED_ENTITY}@${flow.version}`);
      expect((await act(procurement, GATED_ACT, pendingRequisition())).status).toBe('done');
    } finally {
      flow.version -= 1;
    }
    purchaseRequisitionStore.reset();
    const restored = await act(admin, 't_flowversion_restore', earlier.id, { reason: 'the earlier rule was right' });
    expect(restored.status, restored.reason).toBe('done');
    expect(flowVersionStore.forEntity(GATED_ENTITY).map((v) => [v.label, v.state])).toEqual([
      [earlier.label, 'Active'],
      [current.label, 'Retired'],
    ]);
    expect(inForce(GATED_ENTITY).version?.id).toBe(earlier.id);
    expect((await act(procurement, GATED_ACT, pendingRequisition())).reason).toMatch(/^STEP_PENDING:/);
  });

  it('activate and restore refuse a sample person on production, and retire does not — the way back stays open', async () => {
    const { moduleDeployment } = await import('../../modules/deployment');
    const approved = await versionAt('Approved');
    const active = await versionAt('Active');
    try {
      moduleDeployment.set(null);
      expect(head((await act(admin, 't_flowversion_activate', approved.id, { reason: 'x' })).reason)).toBe(
        'FLOWVERSION_SAMPLE_IN_PRODUCTION',
      );
      expect((await act(admin, 't_flowversion_retire', active.id, { reason: 'x' })).status).toBe('done');
      expect(head((await act(admin, 't_flowversion_restore', active.id, { reason: 'x' })).reason)).toBe(
        'FLOWVERSION_SAMPLE_IN_PRODUCTION',
      );
    } finally {
      moduleDeployment.reset();
    }
  });
});

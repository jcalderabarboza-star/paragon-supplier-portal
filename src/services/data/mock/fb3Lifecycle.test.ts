// FB-3 · PROPOSE, REVIEW, APPROVE — every act through the shipped dispatcher,
// by the sample people the roster holds. Each refusal is asserted BY HEAD, and
// beside each refusal stands the case the same rule admits.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { commandAuditSink } from './MockCommandService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { getFlow, POLICY_HOOKS } from '../../transitions';
import { rolesHolding } from '../../transitions/businessRoles';
import { atomsForSeat } from '../../transitions/customRoles';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { moduleDeployment } from '../../modules/deployment';
import { SUPER_ADMIN_REASON_REQUIRED } from '../../identity/superAdmin';
import { lastAct, proposerOf, type FlowVersionContent } from '../../flowBuilder/flowVersion';
import { flowVersionStore } from '../../flowBuilder/flowVersionStore';
import { stepLedger } from '../../flowBuilder/stepLedger';
import { liveWorld } from '../../flowBuilder/liveWorld';
import { isGateable, validateVersion } from '../../flowBuilder/validateVersion';
import { findingKey } from '../../flowBuilder/flowVersion';
import {
  act,
  contentWith,
  financeApproval,
  FINANCE_STEP,
  GATED_ENTITY,
  seatOf,
  unnamedSeat,
  versionAt,
} from '../../../test/flowVersions';

const compliance = seatOf('compliance');
const admin = seatOf('admin');
const superAdmin = seatOf('super_admin');
const personOf = (scope: { actor?: unknown }): string =>
  (scope.actor as { person: { personId: string } }).person.personId;
const head = (reason: string | undefined): string => (reason ?? '').split(':').slice(2, 3).join('').trim();
const hookOf = (reason: string | undefined): string => (reason ?? '').split(':')[1] ?? '';

beforeEach(() => {
  flowVersionStore.reset();
  stepLedger.reset();
  purchaseRequisitionStore.reset();
  commandAuditSink.clear();
  moduleDeployment.reset();
});
afterEach(() => moduleDeployment.reset());

describe('FB-3 · the machine, and who holds each act', () => {
  it('⚠ POPULATION CONTROL — the acts are registered, and each permission sits with Compliance, Admin and Super Admin', () => {
    const flow = getFlow('flowVersion')!;
    expect(flow.states).toEqual(['Draft', 'In Review', 'Approved', 'Active', 'Retired', 'Rejected']);
    expect(flow.terminals).toEqual(['Rejected']);
    const role = (id: string) => flow.transitions.find((t) => t.id === id)!.requiredRole;
    expect([role('t_flowversion_propose'), role('t_flowversion_withdraw')]).toEqual(['flow:draft', 'flow:draft']);
    expect(['return', 'approve', 'reject'].map((a) => role(`t_flowversion_${a}`))).toEqual(Array(3).fill('flow:decide'));
    expect(['activate', 'retire', 'restore'].map((a) => role(`t_flowversion_${a}`))).toEqual(Array(3).fill('flow:activate'));
    for (const atom of ['flow:draft', 'flow:decide', 'flow:activate']) {
      // ONE lane holds it; Admin and Super Admin hold every buyer-side lane's atoms.
      expect(rolesHolding(atom), atom).toEqual(['compliance']);
      for (const role of ['admin', 'super_admin']) expect(atomsForSeat([role]), `${role} ${atom}`).toContain(atom);
      for (const role of ['procurement', 'finance']) expect(atomsForSeat([role]), `${role} ${atom}`).not.toContain(atom);
    }
    // Nobody declares a supersede: no role a person can hold carries it.
    expect(rolesHolding('flow:supersede')).toEqual([]);
  });

  it('a seat outside the lane is refused on the lane, for every act that moves a change', async () => {
    const v = await versionAt('In Review');
    for (const a of ['approve', 'return', 'reject']) {
      const r = await act(seatOf('procurement'), `t_flowversion_${a}`, v.id, { reason: 'x' });
      expect(r.reason, a).toBe('ROLE_NOT_PERMITTED:flow:decide');
    }
    expect(flowVersionStore.byId(v.id)!.state).toBe('In Review');
  });
});

describe('FB-3 · propose', () => {
  it('KNOWN-GOOD FIRST — a change that obeys its rules is proposed, and the record says who, when and why', async () => {
    const v = await versionAt('In Review');
    expect(v.state).toBe('In Review');
    expect(v.history.map((h) => [h.act, h.from, h.to, h.reason])).toEqual([
      ['propose', 'Draft', 'In Review', 'proposed for the walk'],
    ]);
    expect(proposerOf(v)).toEqual(compliance.actor);
    expect(lastAct(v, 'propose')!.at).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('propose refuses an error finding, an unacknowledged warning and a moved base — each by head', async () => {
    // AN ERROR: the label is written in one language only (rule R07).
    const broken = await versionAt('Draft', contentWith(financeApproval({ label: { en: 'Finance approval', id: '' } })));
    const r1 = await act(compliance, 't_flowversion_propose', broken.id, { reason: 'try' });
    expect(refusedByPolicy(r1.reason, POLICY_HOOKS.FLOWVERSION_OBEYS_RULES)).toBe(true);
    expect(head(r1.reason)).toBe('FLOWVERSION_BREAKS_RULE');
    expect(r1.reason).toContain(`R07 (${FINANCE_STEP})`);
    expect(flowVersionStore.byId(broken.id)!.state).toBe('Draft');

    // A WARNING NOBODY ACKNOWLEDGED. Derived here, not assumed: every way out of
    // one state is gated, which the library flags.
    const flow = getFlow(GATED_ENTITY)!;
    const exits = flow.transitions.filter((t) => isGateable(t) && t.from.includes('Pending Approval'));
    expect(exits.length).toBeGreaterThan(1);
    const gatesAll: FlowVersionContent = contentWith(
      ...exits.map((t, i) => financeApproval({ id: `s_approval_${i + 1}`, before: t.id })),
    );
    const warnings = validateVersion(gatesAll, liveWorld()).filter((f) => f.severity === 'warning');
    expect(warnings.map((f) => f.code)).toContain('R15');
    const warned = await versionAt('Draft', gatesAll);
    const r2 = await act(compliance, 't_flowversion_propose', warned.id, { reason: 'try' });
    expect(head(r2.reason)).toBe('FLOWVERSION_WARNING_UNACKNOWLEDGED');
    // …and acknowledged, the same change is proposed.
    await act(compliance, 't_flowversion_save', warned.id, {
      content: flowVersionStore.byId(warned.id)!.content,
      acknowledged: warnings.map(findingKey),
    });
    const r2b = await act(compliance, 't_flowversion_propose', warned.id, { reason: 'meant' });
    expect(r2b.status, r2b.reason).toBe('done');

    // THE BASE MOVED: a deploy shipped a new version of the process underneath it.
    const stale = await versionAt('Draft');
    const shipped = flow as { version: number };
    shipped.version += 1;
    try {
      const r3 = await act(compliance, 't_flowversion_propose', stale.id, { reason: 'try' });
      expect(head(r3.reason)).toBe('FLOWVERSION_BASE_MOVED');
    } finally {
      shipped.version -= 1;
    }
    const r3b = await act(compliance, 't_flowversion_propose', stale.id, { reason: 'now it stands' });
    expect(r3b.status, r3b.reason).toBe('done');
  });

  it('an empty change, and one holding an element the platform cannot apply yet, are refused by head', async () => {
    const empty = await versionAt('Draft', contentWith());
    expect(head((await act(compliance, 't_flowversion_propose', empty.id, { reason: 'x' })).reason)).toBe('FLOWVERSION_EMPTY');
    const scan = await versionAt('Draft', contentWith(financeApproval({ kind: 'scan', scan: { matches: 'id' } })));
    expect(head((await act(compliance, 't_flowversion_propose', scan.id, { reason: 'x' })).reason)).toBe(
      'FLOWVERSION_ELEMENT_NOT_BUILT',
    );
  });

  it('a seat that names nobody, and a reason that says nothing, are refused by head', async () => {
    const v = await versionAt('Draft');
    const unnamed = await act(unnamedSeat('compliance'), 't_flowversion_propose', v.id, { reason: 'x' });
    expect(head(unnamed.reason)).toBe('FLOWVERSION_AUTHOR_UNATTRIBUTED');
    const blank = await act(compliance, 't_flowversion_propose', v.id, { reason: '   ' });
    expect(hookOf(blank.reason)).toBe(POLICY_HOOKS.FLOWVERSION_REASON_AUTHORED);
    expect(head(blank.reason)).toBe('FLOWVERSION_REASON_BLANK');
    const absent = await act(compliance, 't_flowversion_propose', v.id, {});
    expect(absent.reason).toBe('MISSING_FIELDS:reason');
  });
});

describe('FB-3 · four eyes', () => {
  it('approve refuses the proposer, by name — and admits a different named person', async () => {
    const v = await versionAt('In Review');
    const self = await act(compliance, 't_flowversion_approve', v.id, { reason: 'mine' });
    expect(refusedByPolicy(self.reason, POLICY_HOOKS.FLOWVERSION_APPROVER_NOT_PROPOSER)).toBe(true);
    expect(head(self.reason)).toBe('FLOWVERSION_APPROVER_IS_PROPOSER');
    expect(self.reason).toContain(personOf(compliance));
    expect(flowVersionStore.byId(v.id)!.state).toBe('In Review');

    const other = await act(admin, 't_flowversion_approve', v.id, { reason: 'read and agreed' });
    expect(other.status, other.reason).toBe('done');
    const now = flowVersionStore.byId(v.id)!;
    expect(now.state).toBe('Approved');
    expect(lastAct(now, 'approve')).toMatchObject({ by: admin.actor, reason: 'read and agreed', from: 'In Review' });
    expect(lastAct(now, 'approve')!.bypass).toBeUndefined();
  });

  it('a Super Admin who proposed may approve only with a reason; the event and the record carry the rule and the reason — and an Admin who proposed is refused', async () => {
    const mine = await versionAt('Draft');
    await act(superAdmin, 't_flowversion_propose', mine.id, { reason: 'proposed by the super admin' });
    const bare = await act(superAdmin, 't_flowversion_approve', mine.id, { reason: 'ok' });
    expect(bare.status).toBe('failed');
    expect(bare.reason).toContain(SUPER_ADMIN_REASON_REQUIRED);
    expect(flowVersionStore.byId(mine.id)!.state).toBe('In Review');

    const reasoned = await act(superAdmin, 't_flowversion_approve', mine.id, { reason: 'ok' }, { bypassReason: 'nobody else is on shift' });
    expect(reasoned.status, reasoned.reason).toBe('done');
    const bypass = { rules: ['FLOWVERSION_APPROVER_IS_PROPOSER'], reason: 'nobody else is on shift' };
    expect(lastAct(flowVersionStore.byId(mine.id)!, 'approve')!.bypass).toEqual(bypass);
    const event = commandAuditSink.all().find((e) => e.correlationId === reasoned.correlationId)!;
    expect(event.bypass).toEqual(bypass);

    // ADMIN HOLDS THE SAME PERMISSIONS AND IS NOT EXEMPT — a reason does not help.
    const theirs = await versionAt('Draft');
    await act(admin, 't_flowversion_propose', theirs.id, { reason: 'proposed by the admin' });
    const refused = await act(admin, 't_flowversion_approve', theirs.id, { reason: 'ok' }, { bypassReason: 'I would like to' });
    expect(head(refused.reason)).toBe('FLOWVERSION_APPROVER_IS_PROPOSER');
  });

  it('reject and return admit any one named holder — the safe direction stays reachable, even for the proposer', async () => {
    const a = await versionAt('In Review');
    const returned = await act(compliance, 't_flowversion_return', a.id, { reason: 'the lane is wrong' });
    expect(returned.status, returned.reason).toBe('done');
    expect(flowVersionStore.byId(a.id)!.state).toBe('Draft');

    const b = await versionAt('In Review');
    const rejected = await act(compliance, 't_flowversion_reject', b.id, { reason: 'not wanted' });
    expect(rejected.status, rejected.reason).toBe('done');
    expect(flowVersionStore.byId(b.id)!.state).toBe('Rejected');
    // An ending: nothing moves it again.
    const again = await act(admin, 't_flowversion_approve', b.id, { reason: 'x' });
    expect(again.reason).toBe('ILLEGAL_TRANSITION:Rejected->Approved');

    // …and still a NAMED holder: a seat that names nobody is refused, by head.
    const c = await versionAt('In Review');
    const unnamed = await act(unnamedSeat('compliance'), 't_flowversion_reject', c.id, { reason: 'x' });
    expect(head(unnamed.reason)).toBe('FLOWVERSION_DECIDER_UNATTRIBUTED');
  });

  it('approve refuses a sample person on production and admits one on preview', async () => {
    const v = await versionAt('In Review');
    moduleDeployment.set(null);
    expect(moduleDeployment.isProduction()).toBe(true);
    const prod = await act(admin, 't_flowversion_approve', v.id, { reason: 'ok' });
    expect(refusedByPolicy(prod.reason, POLICY_HOOKS.FLOWVERSION_NOT_SAMPLE_IN_PROD)).toBe(true);
    expect(head(prod.reason)).toBe('FLOWVERSION_SAMPLE_IN_PRODUCTION');
    moduleDeployment.set('PREVIEW');
    const preview = await act(admin, 't_flowversion_approve', v.id, { reason: 'ok' });
    expect(preview.status, preview.reason).toBe('done');
  });

  it('approve validates again: a change whose process moved while it waited is refused by head', async () => {
    const v = await versionAt('In Review');
    const shipped = getFlow(GATED_ENTITY) as { version: number };
    shipped.version += 1;
    try {
      expect(head((await act(admin, 't_flowversion_approve', v.id, { reason: 'ok' })).reason)).toBe('FLOWVERSION_BASE_MOVED');
    } finally {
      shipped.version -= 1;
    }
  });
});

describe('FB-3 · a version that left Draft is not edited', () => {
  it('content cannot be saved once the version has left Draft — and a withdrawn one can be', async () => {
    const v = await versionAt('In Review');
    const content = contentWith(financeApproval({ lane: 'procurement' }));
    const saved = await act(compliance, 't_flowversion_save', v.id, { content });
    expect(saved.reason).toBe('ILLEGAL_TRANSITION:In Review->Draft');
    expect(flowVersionStore.byId(v.id)!.content.steps[0].lane).toBe('finance');
    // The second lock, on the door itself.
    flowVersionStore.save(v.id, content, [], compliance.actor!);
    expect(flowVersionStore.byId(v.id)!.content.steps[0].lane).toBe('finance');

    const back = await act(compliance, 't_flowversion_withdraw', v.id, { reason: 'one more change' });
    expect(back.status, back.reason).toBe('done');
    const again = await act(compliance, 't_flowversion_save', v.id, { content });
    expect(again.status, again.reason).toBe('done');
    expect(flowVersionStore.byId(v.id)!.content.steps[0].lane).toBe('procurement');
  });

  it('the store has no door that deletes a version or edits one outside those acts', () => {
    const doors = Object.keys(flowVersionStore).sort();
    // CONTROL — the list is read off the object: the three writers are there.
    expect(doors).toEqual(expect.arrayContaining(['create', 'save', 'move']));
    expect(doors).toEqual(
      ['all', 'byId', 'create', 'forEntity', 'move', 'readState', 'rehydrate', 'reset', 'revision', 'save', 'subscribe'].sort(),
    );
    expect(doors.filter((d) => /delete|remove|update|edit|set/i.test(d))).toEqual(['reset']);
  });

  it('the record survives a reload with its history, and a row whose state its history does not reach is refused by name', async () => {
    const v = await versionAt('Approved');
    flowVersionStore.rehydrate();
    const back = flowVersionStore.byId(v.id)!;
    expect(back.state).toBe('Approved');
    expect(back.history.map((h) => h.act)).toEqual(['propose', 'approve']);
    expect(back.history[1].by).toEqual(admin.actor);

    const raw = JSON.parse(window.localStorage.getItem('paragon.flowVersions')!);
    raw.versions[0].state = 'Active';
    window.localStorage.setItem('paragon.flowVersions', JSON.stringify(raw));
    flowVersionStore.rehydrate();
    expect(flowVersionStore.byId(v.id)).toBeUndefined();
    expect(flowVersionStore.readState().rejected.map((r) => r.id)).toEqual([v.id]);
    expect(flowVersionStore.readState().rejected[0].reason).toContain("'Active'");
  });
});

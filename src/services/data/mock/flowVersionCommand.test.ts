// ────────────────────────────────────────────────────────────────────────────
// FB-1 · A CHANGE TO A PROCESS, THROUGH THE REAL DISPATCHER AND THE REAL STORE.
//
//   1. THE TWO ACTS — create and save: who may take them, what each refuses by
//      head, and that a refused act leaves the store as it was.
//   2. THE STORE — the id, the label and the stamps are minted by it; absent,
//      corrupt and unparseable storage are told apart from an empty store; a
//      row refused on read is named and kept; a label is never handed out twice.
//   3. THE READ — a stored version that no longer obeys the rules of its
//      process is reported, by rule and by element, and is not dropped.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, WIRED_COMMAND_TARGETS, commandAuditSink } from './MockCommandService';
import type { QueryScope } from '../types';
import { DECLARED_PRESENT_INSTANT } from '../fixturePresent';
import { getFlow, getKnownFlows, POLICY_HOOKS } from '../../transitions';
import { rolesHolding } from '../../transitions/businessRoles';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { emptyContent, parseVersionLabel, shippedLabel, versionLabel, versionStamp } from '../../flowBuilder/flowVersion';
import { FLOW_VERSIONS_KEY, flowVersionStore } from '../../flowBuilder/flowVersionStore';
import { readFlowVersions, stepLanes } from '../../flowBuilder/liveWorld';
import { flowVersionRefusalKey, FLOW_VERSION_REFUSAL_HEADS } from '../../../pages-v2/process-flows/flowVersionRefusal';
import { flowBuilderEn, flowBuilderId } from '../../../lib/i18n/flowBuilder';

const svc = new MockCommandService();

const person = (role: string) =>
  ({ kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role)!.personId } }) as const;
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const seat = (role: string, actor: QueryScope['actor'] = person(role)): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [role],
  actor,
});
const compliance = seat('compliance');

const create = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_flowversion_create', entity: 'flowVersion', payload });
const save = (scope: QueryScope, entityId: string, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_flowversion_save', entity: 'flowVersion', entityId, payload });

const PR = 'purchaseRequisition';
const prVersion = (): number => getFlow(PR)!.version;
const aStep = {
  id: 's_finance',
  kind: 'approval',
  before: 't_pr_approve',
  order: 1,
  lane: 'finance',
  label: { en: 'Finance approval', id: 'Persetujuan Keuangan' },
  instruction: { en: 'Check the budget line.', id: 'Periksa pos anggaran.' },
} as const;

beforeEach(() => {
  flowVersionStore.reset();
});

describe('FB-1 · the label rule', () => {
  it('a shipped process is its version; a change is <shipped>.<n>; the two read back', () => {
    expect(shippedLabel(2)).toBe('2');
    expect(versionLabel(2, 1)).toBe('2.1');
    expect(versionStamp(PR, versionLabel(2, 1))).toBe(`${PR}@2.1`);
    expect(parseVersionLabel('2.1')).toEqual({ baseVersion: 2, seq: 1 });
    for (const bad of ['2', '2.0', '0.1', '2.1.1', 'v2.1', '']) expect(parseVersionLabel(bad), bad).toBeNull();
  });
});

describe('FB-1 · who may draft a change', () => {
  it('⚠ POPULATION CONTROL — the flow is registered and wired, and the right sits with Compliance alone', () => {
    expect(getKnownFlows().map((f) => f.entity)).toContain('flowVersion');
    expect(WIRED_COMMAND_TARGETS).toContain('flowVersion');
    // The two acts a draft is written with; the rest of the machine is `fb3Lifecycle.test.ts`'s.
    expect(getFlow('flowVersion')!.transitions.filter((t) => t.to === 'Draft' && t.requiredFields.every((f) => f !== 'reason')).map((t) => t.id)).toEqual([
      't_flowversion_create',
      't_flowversion_save',
    ]);
    expect(rolesHolding('flow:draft')).toEqual(['compliance']);
  });

  it('create refuses a seat that names nobody', async () => {
    const res = await create(seat('compliance', NOBODY), { flow: PR, title: 'Finance approval' });
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.FLOWVERSION_AUTHOR_NAMED)).toBe(true);
    expect(res.reason).toContain('FLOWVERSION_AUTHOR_UNATTRIBUTED:');
    expect(flowVersionStore.all()).toEqual([]);
  });

  it('create admits a named Compliance seat, and Admin and Super Admin with it', async () => {
    for (const role of ['compliance', 'admin', 'super_admin']) {
      flowVersionStore.reset();
      const res = await create(seat(role), { flow: PR, title: 'Finance approval' });
      expect(res.status, role).toBe('done');
      expect(flowVersionStore.all().map((v) => v.id), role).toEqual([res.entityId]);
    }
  });

  it('a lane the process binds cannot draft a change to it — refused on the permission', async () => {
    for (const role of stepLanes().filter((r) => r !== 'compliance')) {
      const res = await create(seat(role), { flow: PR, title: 'Finance approval' });
      expect(res.reason, role).toBe('ROLE_NOT_PERMITTED:flow:draft');
    }
    expect(flowVersionStore.all()).toEqual([]);
  });
});

describe('FB-1 · what create and save refuse, by head', () => {
  it('create refuses a process that is not registered, the change process itself, one no command can write through, and a blank title', async () => {
    const unwritable = getKnownFlows().map((f) => f.entity).find((e) => !WIRED_COMMAND_TARGETS.includes(e))!;
    expect(unwritable).toBeTruthy();
    const cases: [Record<string, unknown>, string][] = [
      [{ flow: 'noSuchProcess', title: 'x' }, 'FLOWVERSION_PROCESS_UNKNOWN'],
      [{ flow: 'flowVersion', title: 'x' }, 'FLOWVERSION_PROCESS_SELF'],
      [{ flow: unwritable, title: 'x' }, 'FLOWVERSION_PROCESS_NOT_WRITABLE'],
      [{ flow: PR, title: '   ' }, 'FLOWVERSION_TITLE_BLANK'],
    ];
    for (const [payload, head] of cases) {
      const res = await create(compliance, payload);
      expect(res.status, head).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE), head).toBe(true);
      expect(res.reason, head).toContain(`:${head}:`);
      expect(flowVersionRefusalKey(res.reason), head).toBe(`flowBuilder.refusal.${head}`);
    }
    expect((await create(compliance, { flow: PR })).reason).toBe('MISSING_FIELDS:title');
    expect(flowVersionStore.all()).toEqual([]);
  });

  it('save keeps well-formed content, and refuses content that is malformed or about another process', async () => {
    const { entityId } = await create(compliance, { flow: PR, title: 'Finance approval' });
    const good = { ...emptyContent(PR, prVersion()), steps: [aStep] };
    expect((await save(compliance, entityId!, { content: good })).status).toBe('done');
    expect(flowVersionStore.byId(entityId!)!.content).toEqual(good);
    expect(flowVersionStore.byId(entityId!)!.state).toBe('Draft');

    const cases: [unknown, string][] = [
      [{ ...good, steps: [{ ...aStep, kind: 'vote' }] }, 'FLOWVERSION_CONTENT_MALFORMED'],
      [{ entity: PR, baseVersion: prVersion(), steps: [] }, 'FLOWVERSION_CONTENT_MALFORMED'],
      [{ ...good, entity: 'invoice' }, 'FLOWVERSION_CONTENT_MOVED'],
      [{ ...good, baseVersion: prVersion() + 1 }, 'FLOWVERSION_CONTENT_MOVED'],
    ];
    for (const [content, head] of cases) {
      const res = await save(compliance, entityId!, { content });
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.FLOWVERSION_CONTENT_WELL_FORMED), head).toBe(true);
      expect(res.reason, head).toContain(`:${head}:`);
      expect(flowVersionRefusalKey(res.reason), head).toBe(`flowBuilder.refusal.${head}`);
    }
    // Every refused save left the draft as the good save wrote it.
    expect(flowVersionStore.byId(entityId!)!.content).toEqual(good);
    expect((await save(seat('compliance', NOBODY), entityId!, { content: good })).reason).toContain(
      'FLOWVERSION_AUTHOR_UNATTRIBUTED:',
    );
    // A version this browser does not hold is not found — thrown, as every absent document is.
    await expect(save(compliance, 'fv-999', { content: good })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('every refusal head a flow-version hook can say has a sentence in both languages, and no key is left over', () => {
    const heads = Object.values(FLOW_VERSION_REFUSAL_HEADS).flat();
    expect(heads).toContain('FLOWVERSION_CONTENT_MOVED');
    for (const fragment of [flowBuilderEn, flowBuilderId]) {
      const keys = Object.keys(fragment).filter((k) => k.startsWith('flowBuilder.refusal.'));
      expect(keys.sort()).toEqual(heads.map((h) => `flowBuilder.refusal.${h}`).sort());
    }
    // A reason these hooks did not produce is not claimed.
    expect(flowVersionRefusalKey('POLICY_REJECTED:role_grant_governed:FLOWVERSION_TITLE_BLANK: x')).toBeNull();
    expect(flowVersionRefusalKey('ROLE_NOT_PERMITTED:flow:draft')).toBeNull();
  });
});

describe('FB-2 · a save carries the acknowledged warnings, and a draft may start from a version', () => {
  it('acknowledgements ride the save, are kept once each, and are replaced by the next save', async () => {
    const { entityId } = await create(compliance, { flow: PR, title: 'Finance approval' });
    const content = { ...emptyContent(PR, prVersion()), steps: [aStep] };
    expect(flowVersionStore.byId(entityId!)!.acknowledged).toEqual([]);
    expect((await save(compliance, entityId!, { content, acknowledged: ['R15:Draft', 'R16:s_finance', 'R15:Draft'] })).status).toBe('done');
    expect(flowVersionStore.byId(entityId!)!.acknowledged).toEqual(['R15:Draft', 'R16:s_finance']);
    flowVersionStore.rehydrate();
    expect(flowVersionStore.byId(entityId!)!.acknowledged).toEqual(['R15:Draft', 'R16:s_finance']);
    // A save that says nothing about them leaves none: the save is the whole draft.
    await save(compliance, entityId!, { content });
    expect(flowVersionStore.byId(entityId!)!.acknowledged).toEqual([]);
  });

  it('an acknowledgement that names no rule is refused, by head, and nothing is written', async () => {
    const { entityId } = await create(compliance, { flow: PR, title: 'Finance approval' });
    const content = { ...emptyContent(PR, prVersion()), steps: [aStep] };
    for (const acknowledged of ['R15:Draft', ['yes'], [15], ['R15'], [{ code: 'R15' }]]) {
      const res = await save(compliance, entityId!, { content, acknowledged });
      expect(res.reason, JSON.stringify(acknowledged)).toContain(':FLOWVERSION_ACKNOWLEDGED_MALFORMED:');
      expect(flowVersionRefusalKey(res.reason)).toBe('flowBuilder.refusal.FLOWVERSION_ACKNOWLEDGED_MALFORMED');
    }
    expect(flowVersionStore.byId(entityId!)).toMatchObject({ content: emptyContent(PR, prVersion()), savedAt: null });
  });

  it('a draft started from a version has its elements, the shipped version of today, its own label and no acknowledgement', async () => {
    const source = await create(compliance, { flow: PR, title: 'Finance approval' });
    const content = { ...emptyContent(PR, prVersion()), steps: [aStep] };
    await save(compliance, source.entityId!, { content, acknowledged: ['R15:Draft'] });
    const admin = seat('admin');
    const copy = await create(admin, { flow: PR, title: 'Second try', fromVersion: source.entityId });
    expect(copy.status).toBe('done');
    expect(flowVersionStore.byId(copy.entityId!)).toMatchObject({
      label: versionLabel(prVersion(), 2),
      title: 'Second try',
      state: 'Draft',
      content,
      acknowledged: [],
      createdBy: admin.actor,
      savedBy: null,
    });
    // The source is untouched, and the two are separate drafts from here on.
    await save(admin, copy.entityId!, { content: emptyContent(PR, prVersion()) });
    expect(flowVersionStore.byId(source.entityId!)).toMatchObject({ content, acknowledged: ['R15:Draft'], label: versionLabel(prVersion(), 1) });
  });

  it('a copy is written against the process and the version it is given, never the ones its source named', () => {
    const made = flowVersionStore.create(
      { entity: PR, baseVersion: 7, title: 'x', from: { ...emptyContent('invoice', 3), steps: [aStep] } },
      compliance.actor!,
    );
    expect(made.content).toEqual({ entity: PR, baseVersion: 7, steps: [aStep], forks: [], checks: [] });
    expect(made.label).toBe(versionLabel(7, 1));
  });

  it('a source this browser does not hold, or of another process, is refused by head', async () => {
    const source = await create(compliance, { flow: 'invoice', title: 'On invoices' });
    const cases: [Record<string, unknown>, string][] = [
      [{ flow: PR, title: 'x', fromVersion: 'fv-404' }, 'FLOWVERSION_SOURCE_UNKNOWN'],
      [{ flow: PR, title: 'x', fromVersion: source.entityId }, 'FLOWVERSION_SOURCE_OTHER_PROCESS'],
    ];
    for (const [payload, head] of cases) {
      const res = await create(compliance, payload);
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE), head).toBe(true);
      expect(res.reason, head).toContain(`:${head}:`);
      expect(flowVersionRefusalKey(res.reason), head).toBe(`flowBuilder.refusal.${head}`);
    }
    expect(flowVersionStore.all().map((v) => v.id)).toEqual([source.entityId]);
  });

  it('a row stored before warnings could be acknowledged reads back with none', async () => {
    await create(compliance, { flow: PR, title: 'older' });
    const env = JSON.parse(window.localStorage.getItem(FLOW_VERSIONS_KEY)!);
    delete env.versions[0].acknowledged;
    window.localStorage.setItem(FLOW_VERSIONS_KEY, JSON.stringify(env));
    flowVersionStore.rehydrate();
    expect(flowVersionStore.readState().rejected).toEqual([]);
    expect(flowVersionStore.all()[0].acknowledged).toEqual([]);
    // …and one whose acknowledgements are not a list of names is refused, by name.
    env.versions[0].acknowledged = 'all of them';
    window.localStorage.setItem(FLOW_VERSIONS_KEY, JSON.stringify(env));
    flowVersionStore.rehydrate();
    expect(flowVersionStore.readState().rejected).toEqual([{ id: 'row 0', reason: 'not a version' }]);
  });
});

describe('FB-1 · the store mints', () => {
  it('id, label and stamps are store-minted — a payload value is ignored', async () => {
    const res = await create(compliance, {
      flow: PR,
      title: '  Finance approval  ',
      id: 'fv-777',
      label: '9.9',
      seq: 40,
      state: 'Active',
      createdAt: '1999-01-01T00:00:00.000Z',
      baseVersion: 99,
    });
    expect(res.status).toBe('done');
    const made = flowVersionStore.byId(res.entityId!)!;
    expect(made).toMatchObject({
      id: 'fv-1',
      label: versionLabel(prVersion(), 1),
      seq: 1,
      title: 'Finance approval',
      state: 'Draft',
      createdAt: DECLARED_PRESENT_INSTANT,
      createdBy: compliance.actor,
      savedBy: null,
      savedAt: null,
      acknowledged: [],
      content: emptyContent(PR, prVersion()),
    });
    // The person who acted may not arrive in the payload at all.
    const smuggled = await create(compliance, { flow: PR, title: 'x', createdBy: person('finance') });
    expect(smuggled.reason).toBe('ACTOR_IN_PAYLOAD:createdBy');
    // A save stamps who saved and when, and nothing a payload says about either.
    const saver = seat('admin');
    await save(saver, made.id, { content: emptyContent(PR, prVersion()), savedAt: '1999-01-01T00:00:00.000Z', title: 'renamed' });
    expect(flowVersionStore.byId(made.id)).toMatchObject({
      title: 'Finance approval',
      savedBy: saver.actor,
      savedAt: DECLARED_PRESENT_INSTANT,
      createdBy: compliance.actor,
    });
    expect((await save(saver, made.id, { content: emptyContent(PR, prVersion()), savedBy: saver.actor })).reason).toBe(
      'ACTOR_IN_PAYLOAD:savedBy',
    );
  });

  it('labels count per process and each act leaves an event', async () => {
    const before = commandAuditSink.byEvent('t_flowversion_create').length;
    const a = await create(compliance, { flow: PR, title: 'one' });
    const b = await create(compliance, { flow: 'invoice', title: 'two' });
    const c = await create(compliance, { flow: PR, title: 'three' });
    const label = (id?: string) => flowVersionStore.byId(id!)!.label;
    expect([label(a.entityId), label(b.entityId), label(c.entityId)]).toEqual([
      versionLabel(prVersion(), 1),
      versionLabel(getFlow('invoice')!.version, 1),
      versionLabel(prVersion(), 2),
    ]);
    expect(flowVersionStore.forEntity(PR).map((v) => v.title)).toEqual(['one', 'three']);
    expect(commandAuditSink.byEvent('t_flowversion_create').length).toBe(before + 3);
  });
});

describe('FB-1 · the store reads honestly', () => {
  const stored = (): { v: number; versions: Record<string, unknown>[]; counters: Record<string, number> } =>
    JSON.parse(window.localStorage.getItem(FLOW_VERSIONS_KEY)!);
  const write = (value: unknown): void => {
    window.localStorage.setItem(FLOW_VERSIONS_KEY, typeof value === 'string' ? value : JSON.stringify(value));
    flowVersionStore.rehydrate();
  };

  it('the saved draft survives a reload and reads back equal', async () => {
    const { entityId } = await create(compliance, { flow: PR, title: 'Finance approval' });
    await save(compliance, entityId!, { content: { ...emptyContent(PR, prVersion()), steps: [aStep] } });
    const before = flowVersionStore.byId(entityId!);
    flowVersionStore.rehydrate();
    expect(flowVersionStore.byId(entityId!)).toEqual(before);
    expect(flowVersionStore.readState()).toMatchObject({ rejected: [], unreadable: false, suspended: false });
  });

  it('absent, corrupt and unparseable are distinguished from empty', async () => {
    // ABSENT — nothing was ever stored.
    expect(window.localStorage.getItem(FLOW_VERSIONS_KEY)).toBeNull();
    expect(flowVersionStore.readState()).toMatchObject({ versions: [], unreadable: false });
    // EMPTY — a store that holds no version.
    write({ v: 1, versions: [], counters: {} });
    expect(flowVersionStore.readState()).toMatchObject({ versions: [], rejected: [], unreadable: false });
    // UNPARSEABLE — not JSON.
    write('{ not json');
    expect(flowVersionStore.readState()).toMatchObject({ versions: [], unreadable: true });
    // CORRUPT — JSON, and not this store's envelope.
    for (const corrupt of [{ v: 2, versions: [] }, { v: 1 }, [], 'a string', null]) {
      write(corrupt);
      expect(flowVersionStore.readState().unreadable, JSON.stringify(corrupt)).toBe(true);
      expect(flowVersionStore.all()).toEqual([]);
    }
  });

  it('a row that is not a version is refused on read, by name with its reason — and is kept, with its label never reused', async () => {
    const good = await create(compliance, { flow: PR, title: 'kept' });
    const env = stored();
    const row = env.versions[0];
    write({
      ...env,
      versions: [
        row,
        { ...row, id: 'fv-2', seq: 2, label: versionLabel(prVersion(), 9) },
        { ...row, id: 'fv-3', seq: 3, label: versionLabel(prVersion(), 3), state: 'Enacted' },
        { ...row, id: 'fv-4', seq: 4, label: versionLabel(prVersion(), 4), createdBy: { kind: 'SOMEBODY' } },
        { ...row, id: 'fv-1', seq: 5, label: versionLabel(prVersion(), 5) },
        { ...row, id: 'fv-6', seq: 6, label: versionLabel(prVersion(), 6), content: { entity: PR } },
      ],
    });
    const read = flowVersionStore.readState();
    expect(read.versions.map((v) => v.id)).toEqual([good.entityId]);
    expect(read.rejected.map((r) => r.id)).toEqual(['fv-2', 'fv-3', 'fv-4', 'fv-1', 'row 5']);
    expect(read.rejected.map((r) => r.reason)).toEqual([
      `label '${versionLabel(prVersion(), 9)}' does not match version ${prVersion()}, change 2`,
      "'Enacted' is not a state a version can be in",
      'a stamp is not a recorded attribution',
      "'fv-1' appears twice in the store",
      'not a version',
    ]);
    // A write after the read drops nothing that was refused…
    const next = await create(compliance, { flow: PR, title: 'after' });
    expect(stored().versions).toHaveLength(7);
    // …and mints past every id and every sequence a refused row claimed.
    expect(flowVersionStore.byId(next.entityId!)).toMatchObject({ id: 'fv-7', label: versionLabel(prVersion(), 7) });
  });

  it('a stored row that fails today’s rules is reported on read, not absorbed', async () => {
    const { entityId } = await create(compliance, { flow: PR, title: 'moved underneath' });
    await save(compliance, entityId!, { content: { ...emptyContent(PR, prVersion()), steps: [aStep] } });
    // KNOWN-GOOD first: as written, it obeys every rule and nothing is reported.
    expect(readFlowVersions().flagged).toEqual([]);

    // The shipped process moves on, and the step now names an act it no longer has.
    const env = stored();
    const row = env.versions[0] as { content: Record<string, unknown>; label: string };
    write({
      ...env,
      versions: [
        {
          ...row,
          label: versionLabel(prVersion() + 5, 1),
          content: { ...row.content, baseVersion: prVersion() + 5, steps: [{ ...aStep, before: 't_pr_vanished' }] },
        },
      ],
    });
    const read = readFlowVersions();
    expect(read.versions.map((v) => v.id)).toEqual([entityId]);
    expect(read.rejected).toEqual([]);
    expect(read.flagged.map((f) => f.version.id)).toEqual([entityId]);
    expect(read.flagged[0].findings.map((f) => `${f.code} ${f.element}`)).toEqual([`R02 ${PR}`, 'R03 s_finance']);
  });
});

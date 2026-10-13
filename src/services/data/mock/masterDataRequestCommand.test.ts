// ─────────────────────────────────────────────────────────────────────────────
// MD-4 / MD-5 · A MASTER-DATA CHANGE REQUEST, through the dispatcher.
//
// SAP owns the record, so the claim under every spec here is the same one: no
// act of this flow changes a master record. A request is proposed, reviewed by
// a second person, handed to SAP, and closed by SAP's answer; the record moves
// only when a sync run delivers it.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { masterDataRequestStore } from './stores/masterDataRequestStore';
import type { QueryScope } from '../types';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { moduleDeployment } from '../../modules/deployment';
import { getFlow, rolesHolding } from '../../transitions';
import { MDR_REFUSAL_HEADS, mdrRefusalKey } from '../../../pages-v2/master-data/mdrRefusal';
import { masterDataEn, masterDataId } from '../../../lib/i18n/masterData';
import { handOffPackage, MDR_STATES, type MasterDataRequest } from '../../masterData/changeRequest';
import { materialRecords, recordOf, syncRuns } from '../../masterData/replica';
import { applySyncRun, ensureSeeded, resetReplica } from '../../masterData/syncApplier';
import { labelOf } from '../../sdc/materialMaster';

const svc = new MockCommandService();

type Actor = Extract<NonNullable<QueryScope['actor']>, { kind: 'RESOLVED' }>;
const person = (role: string, n = 0): Actor => {
  const rows = SAMPLE_PEOPLE.filter((p) => p.role === role);
  if (!rows[n]) throw new Error(`control: the roster names no ${role} #${n}`);
  return { kind: 'RESOLVED', person: { personId: rows[n].personId } };
};
const seat = (role: string, actor?: Actor): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [role] as QueryScope['businessRoles'],
  ...(actor ? { actor } : {}),
});

const PROCUREMENT = seat('procurement', person('procurement'));
const PLANNING = seat('planning', person('planning'));
const COMPLIANCE = seat('compliance', person('compliance'));

const CODE = 'RM-COCO-8200';
const SUPPLIER = 'BP-10001235';
const NEW_MATERIAL = { description: 'Sample squalane, plant derived', materialType: 'ROH', materialGroup: 'MG-02', baseUnit: 'KG' };

const act = (scope: QueryScope, transitionId: string, entityId: string | undefined, payload: Record<string, unknown>, bypassReason?: string) =>
  svc.dispatch(scope, {
    transitionId,
    entity: 'masterDataRequest',
    ...(entityId ? { entityId } : {}),
    payload,
    ...(bypassReason === undefined ? {} : { bypassReason }),
  });
const propose = (scope: QueryScope, payload: Record<string, unknown>) => act(scope, 't_mdr_propose', undefined, payload);
const get = (id: string): MasterDataRequest => {
  const r = masterDataRequestStore.get(id);
  if (!r) throw new Error(`control: request ${id} is in the store`);
  return r;
};
/** A material change proposed by procurement and taken to `state` by planning. */
async function requestAt(state: 'Proposed' | 'In Review' | 'Approved' | 'Sent to SAP'): Promise<string> {
  const made = await propose(PROCUREMENT, { kind: 'material.change', subjectKey: CODE, proposed: { description: 'CFAD, distilled' }, reason: 'the supplier renamed the grade' });
  const id = made.entityId as string;
  if (state === 'Proposed') return id;
  await act(PLANNING, 't_mdr_start_review', id, {});
  if (state === 'In Review') return id;
  await act(PLANNING, 't_mdr_approve', id, {});
  if (state === 'Approved') return id;
  await act(PROCUREMENT, 't_mdr_hand_off', id, {});
  return id;
}
const head = (reason: string | undefined): string => (reason ?? '').split(':').slice(2, 3).join('').trim();

beforeEach(() => {
  masterDataRequestStore.reset();
  resetReplica();
  ensureSeeded();
});
afterEach(() => moduleDeployment.reset());

describe('MD-4 · the machine', () => {
  it('⚠ CONTROL — the flow is registered with its eight states and nine acts, and the lanes hold the atoms', () => {
    const flow = getFlow('masterDataRequest');
    expect(flow?.states).toEqual([...MDR_STATES]);
    expect(flow?.transitions.map((t) => t.id)).toEqual([
      't_mdr_propose', 't_mdr_start_review', 't_mdr_return', 't_mdr_approve', 't_mdr_reject',
      't_mdr_withdraw', 't_mdr_hand_off', 't_mdr_sap_complete', 't_mdr_sap_decline',
    ]);
    expect([...rolesHolding('masterdata:propose')].sort()).toEqual(['planning', 'procurement']);
    expect([...rolesHolding('masterdata:review')].sort()).toEqual(['compliance', 'planning']);
    expect(rolesHolding('masterdata:handoff')).toEqual(['procurement']);
    expect(rolesHolding('masterdata:record-sap-answer')).toEqual(['procurement']);
  });

  it('propose → review → agree → send: each act lands, and the record never moves', async () => {
    const before = JSON.stringify(recordOf('material', CODE));
    const id = await requestAt('Sent to SAP');
    const r = get(id);
    expect(r.state).toBe('Sent to SAP');
    expect(r.number).toBe('MDR-2026-0001');
    expect(r.history.map((h) => h.act)).toEqual(['t_mdr_propose', 't_mdr_start_review', 't_mdr_approve', 't_mdr_hand_off']);
    expect(r.proposedBy).toEqual(PROCUREMENT.actor);
    expect(r.history[2].by).toEqual(PLANNING.actor);
    // Agreed and sent, and SAP's record is exactly what it was.
    expect(JSON.stringify(recordOf('material', CODE))).toBe(before);
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');
  });

  it('the base is what the replica held when the request was written', async () => {
    const r = get(await requestAt('Proposed'));
    expect(r.base).toMatchObject({ syncRun: recordOf('material', CODE)?.stamp.syncRun, values: { description: 'Coconut Fatty Acid Distillate (CFAD)' } });
  });

  it('returned, the request is Proposed again with the reviewer’s note; rejected and withdrawn are endings', async () => {
    const returned = await requestAt('In Review');
    expect((await act(PLANNING, 't_mdr_return', returned, { note: 'which grade?' })).status).toBe('done');
    expect(get(returned).state).toBe('Proposed');
    expect(get(returned).history[get(returned).history.length - 1]).toMatchObject({ act: 't_mdr_return', note: 'which grade?' });

    await act(PLANNING, 't_mdr_start_review', returned, {});
    expect((await act(PLANNING, 't_mdr_reject', returned, { note: 'not a grade we buy' })).status).toBe('done');
    expect(get(returned).state).toBe('Rejected');
    expect((await act(PLANNING, 't_mdr_start_review', returned, {})).status).toBe('failed');

    const withdrawn = (await propose(PROCUREMENT, { kind: 'material.create', proposed: NEW_MATERIAL, reason: 'a new launch needs it' })).entityId as string;
    expect((await act(PROCUREMENT, 't_mdr_withdraw', withdrawn, { note: 'the launch was dropped' })).status).toBe('done');
    expect(get(withdrawn).state).toBe('Withdrawn');
  });
});

describe('MD-4 · what a proposal must be', () => {
  const refusal = async (payload: Record<string, unknown>): Promise<string> => head((await propose(PROCUREMENT, payload)).reason);

  it('⚠ CONTROL — a well-formed create and a well-formed change are both taken', async () => {
    expect((await propose(PROCUREMENT, { kind: 'material.create', proposed: NEW_MATERIAL, reason: 'a new launch needs it' })).status).toBe('done');
    expect((await propose(PLANNING, { kind: 'material.change', subjectKey: CODE, proposed: { baseUnit: 'L' }, reason: 'it is bought by volume' })).status).toBe('done');
    expect((await propose(PROCUREMENT, { kind: 'supplier.change', subjectKey: SUPPLIER, proposed: { city: 'Deli Serdang' }, reason: 'the plant moved' })).status).toBe('done');
  });

  it('a create never carries a key, and needs every field', async () => {
    expect(await refusal({ kind: 'material.create', subjectKey: 'RM-MINE-0001', proposed: NEW_MATERIAL, reason: 'x' })).toBe('MDR_CREATE_CARRIES_KEY');
    expect(await refusal({ kind: 'material.create', proposed: { ...NEW_MATERIAL, baseUnit: '' }, reason: 'x' })).toBe('MDR_FIELD_MISSING');
  });

  it('a change names a record the replica holds, moves a field, and proposes only what its kind may', async () => {
    expect(await refusal({ kind: 'material.change', subjectKey: 'RM-SAMPLE-TST-01', proposed: { description: 'x' }, reason: 'x' })).toBe('MDR_SUBJECT_UNKNOWN');
    expect(await refusal({ kind: 'material.change', subjectKey: CODE, proposed: { description: 'Coconut Fatty Acid Distillate (CFAD)' }, reason: 'x' })).toBe('MDR_NOTHING_CHANGES');
    expect(await refusal({ kind: 'material.change', subjectKey: CODE, proposed: { materialType: 'VERP' }, reason: 'x' })).toBe('MDR_FIELD_NOT_PROPOSABLE');
    expect(await refusal({ kind: 'supplier.change', subjectKey: SUPPLIER, proposed: { portalSupplierId: 'sup-999' }, reason: 'x' })).toBe('MDR_FIELD_NOT_PROPOSABLE');
  });

  it('a value that belongs to a reference table must be in it', async () => {
    expect(await refusal({ kind: 'material.change', subjectKey: CODE, proposed: { baseUnit: 'DRUM' }, reason: 'x' })).toBe('MDR_VALUE_NOT_IN_TABLE');
    expect(await refusal({ kind: 'supplier.change', subjectKey: SUPPLIER, proposed: { paymentTerm: 'Net 90' }, reason: 'x' })).toBe('MDR_VALUE_NOT_IN_TABLE');
    expect(await refusal({ kind: 'supplier.change', subjectKey: SUPPLIER, proposed: { paymentTerm: 'NT60' }, reason: 'x' })).toBe('');
  });

  it('an unknown kind and a blank reason are refused by name', async () => {
    expect(await refusal({ kind: 'bank.create', proposed: {}, reason: 'x' })).toBe('MDR_KIND_UNKNOWN');
    expect(await refusal({ kind: 'material.create', proposed: NEW_MATERIAL, reason: '   ' })).toBe('MDR_REASON_BLANK');
  });

  it('a second open request for the same subject and field is refused by name; a closed one does not block', async () => {
    const first = await requestAt('In Review');
    const again = await propose(PLANNING, { kind: 'material.change', subjectKey: CODE, proposed: { description: 'Another name' }, reason: 'x' });
    expect(head(again.reason)).toBe('MDR_DUPLICATE_OPEN');
    expect(again.reason).toContain(get(first).number);
    // A different field of the same record is a different ask.
    expect((await propose(PLANNING, { kind: 'material.change', subjectKey: CODE, proposed: { baseUnit: 'L' }, reason: 'x' })).status).toBe('done');
    await act(PLANNING, 't_mdr_reject', first, { note: 'no' });
    expect((await propose(PLANNING, { kind: 'material.change', subjectKey: CODE, proposed: { description: 'Another name' }, reason: 'x' })).status).toBe('done');
  });
});

describe('MD-4 · who may act', () => {
  it('a seat that names nobody is refused on every act, by name', async () => {
    const unnamed = await propose(seat('procurement'), { kind: 'material.create', proposed: NEW_MATERIAL, reason: 'x' });
    expect(unnamed.status).toBe('failed');
    expect(unnamed.reason).toContain('MDR_ACTOR_UNATTRIBUTED');
    const id = await requestAt('Proposed');
    expect((await act(seat('planning'), 't_mdr_start_review', id, {})).reason).toContain('MDR_ACTOR_UNATTRIBUTED');
    expect(get(id).state).toBe('Proposed');
  });

  it('each kind is reviewed by its own lane: a material is planning’s, a supplier compliance’s', async () => {
    const material = await requestAt('Proposed');
    expect(head((await act(COMPLIANCE, 't_mdr_start_review', material, {})).reason)).toBe('MDR_WRONG_LANE');
    expect((await act(PLANNING, 't_mdr_start_review', material, {})).status).toBe('done');

    const supplier = (await propose(PROCUREMENT, { kind: 'supplier.change', subjectKey: SUPPLIER, proposed: { city: 'Deli Serdang' }, reason: 'the plant moved' })).entityId as string;
    expect(head((await act(PLANNING, 't_mdr_start_review', supplier, {})).reason)).toBe('MDR_WRONG_LANE');
    expect((await act(COMPLIANCE, 't_mdr_start_review', supplier, {})).status).toBe('done');
    expect((await act(COMPLIANCE, 't_mdr_approve', supplier, {})).status).toBe('done');
  });

  it('a lane without the atom is refused at the role gate, before any check', async () => {
    const id = await requestAt('Proposed');
    const res = await act(seat('finance', person('finance')), 't_mdr_start_review', id, {});
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    // Procurement proposes and hands off, and does not review.
    expect((await act(PROCUREMENT, 't_mdr_start_review', id, {})).reason).toContain('ROLE_NOT_PERMITTED');
    expect((await act(PLANNING, 't_mdr_hand_off', await requestAt2(), {})).reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('a supplier seat is refused at scope', async () => {
    const id = await requestAt('Proposed');
    await expect(
      act({ personaType: 'supplier', supplierId: 'sup-002', businessRoles: ['commercial'] as QueryScope['businessRoles'] }, 't_mdr_start_review', id, {}),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(get(id).state).toBe('Proposed');
  });
});

/** A second request, on another field, taken to Approved — for a spec that needs one beside the first. */
async function requestAt2(): Promise<string> {
  const id = (await propose(PROCUREMENT, { kind: 'material.change', subjectKey: CODE, proposed: { baseUnit: 'L' }, reason: 'it is bought by volume' })).entityId as string;
  await act(PLANNING, 't_mdr_start_review', id, {});
  await act(PLANNING, 't_mdr_approve', id, {});
  return id;
}

describe('MD-4 · four eyes', () => {
  /** A request planning proposed and planning is reviewing — the one shape where proposer and decider can be one person. */
  const ownRequest = async (scope: QueryScope): Promise<string> => {
    const id = (await propose(scope, { kind: 'material.change', subjectKey: CODE, proposed: { description: 'CFAD, distilled' }, reason: 'renamed' })).entityId as string;
    expect((await act(scope, 't_mdr_start_review', id, {})).status).toBe('done');
    return id;
  };

  it('a request cannot be approved, or rejected, by the person who proposed it', async () => {
    const id = await ownRequest(PLANNING);
    const approve = await act(PLANNING, 't_mdr_approve', id, {});
    expect(approve.status).toBe('failed');
    expect(head(approve.reason)).toBe('MDR_APPROVER_IS_PROPOSER');
    expect(head((await act(PLANNING, 't_mdr_reject', id, { note: 'no' })).reason)).toBe('MDR_APPROVER_IS_PROPOSER');
    expect(get(id).state).toBe('In Review');
  });

  it('⚠ the other way: a second person approves it', async () => {
    const id = await ownRequest(PLANNING);
    // The roster names one planning person, so the second pair of eyes is the
    // Admin: a different person, holding the review atom, and not exempt.
    const second = seat('admin', person('admin'));
    expect(second.actor).not.toEqual(PLANNING.actor);
    expect((await act(second, 't_mdr_approve', id, {})).status).toBe('done');
    expect(get(id).state).toBe('Approved');
  });

  it('a Super Admin may approve their own request with a reason, and the event carries the check and the reason', async () => {
    const SUPER = seat('super_admin', person('super_admin'));
    const id = await ownRequest(SUPER);
    const bare = await act(SUPER, 't_mdr_approve', id, {});
    expect(bare.status).toBe('failed');
    expect(bare.reason).toContain('SUPER_ADMIN_REASON_REQUIRED');
    const res = await act(SUPER, 't_mdr_approve', id, {}, 'The planning lead is on leave; the grade name is on the supplier certificate');
    expect(res.status, res.reason).toBe('done');
    expect(get(id).state).toBe('Approved');
    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId);
    expect(event?.bypass).toEqual({
      rules: ['MDR_APPROVER_IS_PROPOSER'],
      reason: 'The planning lead is on leave; the grade name is on the supplier certificate',
    });
  });

  it('an Admin holds the same atoms and is not exempt', async () => {
    const ADMIN = seat('admin', person('admin'));
    const id = await ownRequest(ADMIN);
    const res = await act(ADMIN, 't_mdr_approve', id, {}, 'a reason does not help an Admin');
    expect(res.status).toBe('failed');
    expect(head(res.reason)).toBe('MDR_APPROVER_IS_PROPOSER');
  });
});

describe('MD-4 / MD-5 · SAP wins: a request is held when SAP changes the field first', () => {
  const sapChanges = (description: string) =>
    applySyncRun({
      id: `RUN-${description}`,
      source: 'SAP_S4',
      at: '2026-11-01T02:00:00.000Z',
      mode: 'DELTA',
      objects: [],
      records: [{ object: 'material', key: CODE, data: { ...recordOf('material', CODE)?.data, description } }],
    });

  it('it cannot be agreed, and an agreed one cannot be sent, until it is withdrawn', async () => {
    const reviewing = await requestAt('In Review');
    sapChanges('CFAD (SAP renamed it)');
    const approve = await act(PLANNING, 't_mdr_approve', reviewing, {});
    expect(head(approve.reason)).toBe('MDR_SAP_CHANGED_FIRST');
    expect(approve.reason).toContain('description');
    expect(get(reviewing).state).toBe('In Review');
    // The record is SAP's value, not the request's.
    expect(labelOf(CODE)).toBe('CFAD (SAP renamed it)');
  });

  it('a change to a field the request does not touch does not hold it', async () => {
    const id = (await propose(PROCUREMENT, { kind: 'material.change', subjectKey: CODE, proposed: { baseUnit: 'L' }, reason: 'by volume' })).entityId as string;
    await act(PLANNING, 't_mdr_start_review', id, {});
    sapChanges('CFAD (SAP renamed it)');
    expect((await act(PLANNING, 't_mdr_approve', id, {})).status).toBe('done');
  });

  it('an agreed request is checked again at hand-off', async () => {
    const id = await requestAt('Approved');
    sapChanges('CFAD (SAP renamed it)');
    expect(head((await act(PROCUREMENT, 't_mdr_hand_off', id, {})).reason)).toBe('MDR_SAP_CHANGED_FIRST');
    expect((await act(PROCUREMENT, 't_mdr_withdraw', id, { note: 'SAP changed it first' })).status).toBe('done');
  });
});

describe('MD-5 · hand-off and SAP’s answer', () => {
  it('hand-off produces a package naming the request, the kind, the proposed fields, proposer and approver, and the base', async () => {
    const r = get(await requestAt('Sent to SAP'));
    expect(handOffPackage(r)).toEqual({
      externalReference: r.number,
      kind: 'material.change',
      object: 'material',
      subjectKey: CODE,
      proposed: { description: 'CFAD, distilled' },
      reason: 'the supplier renamed the grade',
      proposedBy: PROCUREMENT.actor && 'person' in PROCUREMENT.actor ? PROCUREMENT.actor.person.personId : null,
      approvedBy: PLANNING.actor && 'person' in PLANNING.actor ? PLANNING.actor.person.personId : null,
      base: r.base,
    });
  });

  it('a request sent to SAP adds and changes no record: the replica and its log are exactly as they were', async () => {
    const records = JSON.stringify(materialRecords());
    const runs = syncRuns().map((x) => x.id);
    await requestAt('Sent to SAP');
    expect(JSON.stringify(materialRecords())).toBe(records);
    expect(syncRuns().map((x) => x.id)).toEqual(runs);
  });

  it('a sample completion delivers the record THROUGH THE APPLIER, as a run of its own, stamped SAMPLE', async () => {
    const id = await requestAt('Sent to SAP');
    const res = await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: 'SAMPLE-CR-1', sample: true });
    expect(res.status, res.reason).toBe('done');
    const r = get(id);
    expect(r.state).toBe('Completed in SAP');
    expect(r.sap).toEqual({ sapRequestNumber: 'SAMPLE-CR-1', resultKey: CODE, reason: null, sample: true });
    const run = syncRuns()[0];
    expect(run).toMatchObject({ id: `SAMPLE-ANSWER-${r.number}`, source: 'SAMPLE', changed: 1, created: 0 });
    expect(recordOf('material', CODE)?.data.description).toBe('CFAD, distilled');
    expect(recordOf('material', CODE)?.stamp).toMatchObject({ source: 'SAMPLE', syncRun: `SAMPLE-ANSWER-${r.number}` });
    expect(run.replaced[0]?.data).toMatchObject({ description: 'Coconut Fatty Acid Distillate (CFAD)' });
  });

  it('a completed create arrives under a SAMPLE key SAP "gave", never one the request carried', async () => {
    const id = (await propose(PROCUREMENT, { kind: 'material.create', proposed: NEW_MATERIAL, reason: 'a new launch needs it' })).entityId as string;
    await act(PLANNING, 't_mdr_start_review', id, {});
    await act(PLANNING, 't_mdr_approve', id, {});
    await act(PROCUREMENT, 't_mdr_hand_off', id, {});
    const before = materialRecords().length;
    expect(get(id).subjectKey).toBeNull();
    await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: 'SAMPLE-CR-2', sample: true });
    const key = get(id).sap?.resultKey as string;
    expect(key).toBe(`SAMPLE-${get(id).number}`);
    expect(materialRecords()).toHaveLength(before + 1);
    expect(recordOf('material', key)?.data).toEqual(NEW_MATERIAL);
    expect(recordOf('material', key)?.stamp.source).toBe('SAMPLE');
    expect(labelOf(key)).toBe(NEW_MATERIAL.description);
  });

  it('a declined request shows SAP’s reason, changes nothing, and may be proposed again as a new request', async () => {
    const id = await requestAt('Sent to SAP');
    const before = JSON.stringify(recordOf('material', CODE));
    expect((await act(PROCUREMENT, 't_mdr_sap_decline', id, { sapRequestNumber: 'SAMPLE-CR-3', sample: true, note: 'the description is already in use' })).status).toBe('done');
    expect(get(id).state).toBe('Declined by SAP');
    expect(get(id).sap).toEqual({ sapRequestNumber: 'SAMPLE-CR-3', resultKey: null, reason: 'the description is already in use', sample: true });
    expect(JSON.stringify(recordOf('material', CODE))).toBe(before);
    expect((await propose(PROCUREMENT, { kind: 'material.change', subjectKey: CODE, proposed: { description: 'CFAD, distilled grade' }, reason: 'a second try' })).status).toBe('done');
  });

  it('the sample answer is refused on a production deployment, and taken on a demo one', async () => {
    const id = await requestAt('Sent to SAP');
    moduleDeployment.set(null);
    expect(moduleDeployment.isProduction()).toBe(true);
    const refused = await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: 'SAMPLE-CR-4', sample: true });
    expect(head(refused.reason)).toBe('MDR_SAMPLE_ANSWER_IN_PRODUCTION');
    expect(get(id).state).toBe('Sent to SAP');
    moduleDeployment.reset();
    expect(moduleDeployment.isProduction()).toBe(false);
    expect((await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: 'SAMPLE-CR-4', sample: true })).status).toBe('done');
  });

  it('an answer not marked as a sample is refused: SAP is not connected', async () => {
    const id = await requestAt('Sent to SAP');
    expect(head((await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: 'CR-9' })).reason)).toBe('MDR_SAP_NOT_CONNECTED');
    expect(head((await act(PROCUREMENT, 't_mdr_sap_complete', id, { sapRequestNumber: '  ', sample: true })).reason)).toBe('MDR_SAP_NUMBER_BLANK');
  });
});

describe('MD-4 · every refusal is worded, in both languages', () => {
  const heads = Object.values(MDR_REFUSAL_HEADS).flat();

  it('the map names each head once, and each has a sentence in EN and ID', () => {
    expect(new Set(heads).size).toBe(heads.length);
    for (const h of heads) {
      expect(masterDataEn[`masterData.request.refusal.${h}`], h).toBeTruthy();
      expect(masterDataId[`masterData.request.refusal.${h}`], h).toBeTruthy();
      expect(masterDataId[`masterData.request.refusal.${h}`], h).not.toBe(masterDataEn[`masterData.request.refusal.${h}`]);
    }
    const worded = Object.keys(masterDataEn).filter((k) => k.startsWith('masterData.request.refusal.')).map((k) => k.split('.').pop());
    expect(worded.sort()).toEqual([...heads].sort());
  });

  it('a real refusal resolves to its key, and a refusal from another flow to none', async () => {
    const res = await propose(PROCUREMENT, { kind: 'material.create', proposed: { ...NEW_MATERIAL, baseUnit: '' }, reason: 'x' });
    expect(mdrRefusalKey(res.reason)).toBe('masterData.request.refusal.MDR_FIELD_MISSING');
    expect(mdrRefusalKey('POLICY_REJECTED:po_confirm_qty_within_ordered:SOMETHING: else')).toBeNull();
    expect(mdrRefusalKey(undefined)).toBeNull();
  });
});

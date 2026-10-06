// ────────────────────────────────────────────────────────────────────────────
// RFx-1 · THE STAGED SOURCING EVENT — the machine, through the real dispatcher
// and the real stores.
//
// One event, three stages (RFI → RFP → RFQ). The buyer chooses where it starts,
// closes bidding on a stage and advances it with a shortlist of the suppliers
// who answered, awards only at RFQ, and may conclude without an award at any
// stage. At RFI and RFP a supplier's answer is a stage response (interest and a
// note); at RFQ it is a quotation, as before.
//
// Every refusal below is paired with a known-good input that passes: a hook
// that refused everything would satisfy the refusals alone.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { mockDataService } from './mockDataService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { stageResponseStore } from './stores/stageResponseStore';
import { mockRfqs } from '../../../data/mockRfqs';
import { mockStageResponses } from '../../../data/mockStageResponses';
import {
  RFQ_STAGES,
  isRfqStage,
  nextStageOf,
  notShortlistedAdvanceOf,
  stageOf,
  stagePathOf,
  startStageOf,
} from '../../../data/rfqStage';
import { DECLARED_PRESENT } from '../fixturePresent';
import { supplierMayRead, toSupplierRfqView } from '../rfqSupplierView';
import { getFlow } from '../../transitions';
import { cascadesFor } from '../../transitions/cascades';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { buildRfqCreatePayload } from '../../../pages-v2/sourcing/rfqCreateModel';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const nobody: QueryScope = { ...named, actor: NO_PERSON };
const supplier = (supplierId: string, businessRoles: string[] = ['supplier', 'commercial']): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: businessRoles as QueryScope['businessRoles'],
  actor: NO_PERSON,
});

const DAY = 86_400_000;
const dayBefore = (iso: string): string => new Date(Date.parse(iso) - DAY).toISOString().slice(0, 10);
const LATER = '2026-10-15';
const THREE = ['sup-002', 'sup-005', 'sup-007'];

const rfqVerb = (
  transitionId: string,
  entityId: string,
  payload: Record<string, unknown> = {},
  scope: QueryScope = named,
) => svc.dispatch(scope, { transitionId, entity: 'rfq', entityId, payload });

/** A Draft minted by the real creation verb. `extra` overrides or adds payload fields. */
const raise = async (extra: Record<string, unknown> = {}): Promise<string> => {
  const res = await svc.dispatch(named, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-1 probe — refill pouch',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: LATER,
      awardDeadline: '2026-10-30',
      ...extra,
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

/** An event published at `stage` with the three sample suppliers invited. */
const openAt = async (stage: string): Promise<string> => {
  const id = await raise({ stage });
  const res = await rfqVerb('t_rfq_publish', id);
  expect(res.status, res.reason).toBe('done');
  return id;
};

const interest = (supplierId: string, rfqId: string, extra: Record<string, unknown> = {}, scope?: QueryScope) =>
  svc.dispatch(scope ?? supplier(supplierId), {
    transitionId: 't_stageresponse_submit',
    entity: 'stageResponse',
    payload: { rfqId, supplierId, ...extra },
  });

const quote = (supplierId: string, rfqId: string) =>
  svc.dispatch(supplier(supplierId), {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: {
      rfqId,
      supplierId,
      unitPrice: 14_200,
      leadTimeDays: 10,
      currency: 'IDR',
      validUntil: '2026-12-31',
      paymentTermsOffered: 'Net 30',
    },
  });

const advance = (rfqId: string, payload: Record<string, unknown>, scope: QueryScope = named) =>
  rfqVerb('t_rfq_advance', rfqId, { responseDeadline: LATER, ...payload }, scope);

/** An RFI all three answered, with bidding closed: ready to advance. */
const closedRfi = async (): Promise<string> => {
  const id = await openAt('RFI');
  for (const s of THREE) expect((await interest(s, id)).status).toBe('done');
  expect((await rfqVerb('t_rfq_close', id)).status).toBe('done');
  return id;
};

const refusedBy = (res: { status: string; reason?: string }, hook: string, head: string) => {
  expect(res.status).toBe('failed');
  expect(refusedByPolicy(res.reason, hook as never), res.reason).toBe(true);
  expect(res.reason).toContain(head);
};

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
});

describe('A · the stage is a field, and an event that states none is at RFQ', () => {
  it('the three stages, in the only order an event moves through them', () => {
    expect([...RFQ_STAGES]).toEqual(['RFI', 'RFP', 'RFQ']);
    expect(nextStageOf('RFI')).toBe('RFP');
    expect(nextStageOf('RFP')).toBe('RFQ');
    expect(nextStageOf('RFQ')).toBeNull();
    expect(isRfqStage('RFP')).toBe(true);
    expect(isRfqStage('rfp')).toBe(false);
    expect(isRfqStage(undefined)).toBe(false);
  });

  it('EXISTING DATA IS UNCHANGED — every event authored before stages states none and reads RFQ', () => {
    const before = mockRfqs.filter((r) => r.id !== 'rfq-018');
    // population control: the seeded events, by name
    expect(before.map((r) => r.id)).toContain('rfq-003');
    expect(before.length).toBeGreaterThan(12);
    expect(before.filter((r) => r.stage !== undefined).map((r) => r.id)).toEqual([]);
    expect(before.filter((r) => stageOf(r) !== 'RFQ').map((r) => r.id)).toEqual([]);
    expect(before.filter((r) => stagePathOf(r).length !== 1).map((r) => r.id)).toEqual([]);
  });

  it('the one seeded staged event: started at RFI, at RFP now, one supplier left out with a reason', () => {
    const staged = mockRfqs.filter((r) => r.stage !== undefined);
    expect(staged.map((r) => r.id)).toEqual(['rfq-018']);
    const e = staged[0];
    expect(stageOf(e)).toBe('RFP');
    expect(startStageOf(e)).toBe('RFI');
    expect(stagePathOf(e)).toEqual(['RFI', 'RFP', 'RFQ']);
    expect(e.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    expect(notShortlistedAdvanceOf(e, 'sup-002')?.reason).toContain('in-house');
    expect(notShortlistedAdvanceOf(e, 'sup-005')).toBeNull();
    // the day of the advance moves with the event: after it was created, before the declared present
    const day = e.stageHistory![0].advancedAt;
    expect(day > e.createdAt && day < DECLARED_PRESENT, day).toBe(true);
  });

  it('who has answered is read per stage: the RFP responders, not the RFI ones', () => {
    expect(mockStageResponses.filter((r) => r.rfqId === 'rfq-018' && r.stage === 'RFI')).toHaveLength(3);
    expect(rfqStore.get('rfq-018')!.respondedSupplierIds).toEqual(['sup-005']);
    expect(mockRfqs.find((r) => r.id === 'rfq-018')!.respondedSupplierIds).toEqual(['sup-005']);
    // known-good control: an RFQ-stage event still reads its quotation holders
    expect(rfqStore.get('rfq-003')!.respondedSupplierIds).toEqual(['sup-001', 'sup-002', 'sup-010']);
  });
});

describe('B · the buyer chooses the start stage', () => {
  it.each(['RFI', 'RFP', 'RFQ'] as const)('an event raised at %s is at %s', async (stage) => {
    const id = await raise({ stage });
    expect(rfqStore.get(id)!.stage).toBe(stage);
    expect(stageOf(rfqStore.get(id)!)).toBe(stage);
    expect(rfqStore.get(id)!.status).toBe('Draft');
  });

  it('an event raised with no stage stores none, and is at RFQ', async () => {
    const id = await raise();
    expect('stage' in rfqStore.get(id)!).toBe(false);
    expect(stageOf(rfqStore.get(id)!)).toBe('RFQ');
  });

  it('THE REFUSAL — a stage that is none of the three is refused by name, not read as RFQ', async () => {
    const res = await svc.dispatch(named, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      payload: { title: 'x', materialCategory: 'Packaging', totalQty: 1, stage: 'RFX' },
    });
    refusedBy(res, POLICY_HOOKS.RFQ_CREATE_STAGE_KNOWN, 'STAGE_UNKNOWN');
    expect(rfqStore.all().some((r) => r.title === 'x')).toBe(false);
  });

  it('the wizard’s payload carries the stage it was given, and none when it was given none', () => {
    const terms = {
      title: 't', category: 'Packaging', materials: [], uom: 'KG', responseDeadline: LATER,
      awardDeadline: LATER, incoterms: 'FOB', paymentTerms: 'Net 30', invitedSupplierIds: [],
    };
    expect(buildRfqCreatePayload({ ...terms, stage: 'RFI' }, { totalQty: 1 }).stage).toBe('RFI');
    expect('stage' in buildRfqCreatePayload(terms, { totalQty: 1 })).toBe(false);
  });
});

describe('C · publishing an event whose response deadline has passed', () => {
  it('the flow: the deadline check is last, behind the three it joined', () => {
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_publish')!.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
      POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE,
      POLICY_HOOKS.RFQ_PUBLISH_COMPETITION,
      POLICY_HOOKS.RFQ_PUBLISH_DEADLINE_CURRENT,
    ]);
  });

  it('KNOWN-GOOD — a draft inside its deadline publishes', async () => {
    const res = await rfqVerb('t_rfq_publish', 'rfq-014');
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get('rfq-014')!.status).toBe('Open');
  });

  it('THE REFUSAL — the seeded draft left past its deadline, and nothing else refuses it', async () => {
    const draft = rfqStore.get('rfq-017')!;
    expect(draft.status).toBe('Draft');
    expect(draft.responseDeadline < DECLARED_PRESENT, draft.responseDeadline).toBe(true);
    const res = await rfqVerb('t_rfq_publish', 'rfq-017');
    refusedBy(res, POLICY_HOOKS.RFQ_PUBLISH_DEADLINE_CURRENT, 'PUBLISH_DEADLINE_PAST');
    expect(res.reason).toContain(draft.responseDeadline);
    expect(rfqStore.get('rfq-017')!.status).toBe('Draft');
    // the date is the ONLY thing in the way: the same roster with a later deadline publishes
    rfqStore.update('rfq-017', (r) => ({ ...r, responseDeadline: LATER }));
    expect((await rfqVerb('t_rfq_publish', 'rfq-017')).status).toBe('done');
  });

  it('the deadline day itself still publishes; the day before does not', async () => {
    const today = await raise({ responseDeadline: DECLARED_PRESENT });
    expect((await rfqVerb('t_rfq_publish', today)).status).toBe('done');
    const yesterday = await raise({ responseDeadline: dayBefore(DECLARED_PRESENT) });
    refusedBy(
      await rfqVerb('t_rfq_publish', yesterday),
      POLICY_HOOKS.RFQ_PUBLISH_DEADLINE_CURRENT,
      'PUBLISH_DEADLINE_PAST',
    );
  });

  it('a draft that states no deadline is refused with the past ones', async () => {
    const id = await raise({ responseDeadline: '' });
    refusedBy(await rfqVerb('t_rfq_publish', id), POLICY_HOOKS.RFQ_PUBLISH_DEADLINE_CURRENT, 'PUBLISH_DEADLINE_PAST');
  });
});

describe('D · a supplier’s answer at RFI and RFP: interest and a note', () => {
  it('the machine: one state, one creation verb, four checks in this order', () => {
    const flow = getFlow('stageResponse')!;
    expect(flow.states).toEqual(['Submitted']);
    expect(flow.terminals).toEqual(['Submitted']);
    expect(flow.transitions.map((t) => t.id)).toEqual(['t_stageresponse_submit']);
    expect(flow.transitions[0].policyHooks).toEqual([
      POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN,
      POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST,
      POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE,
      POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE,
    ]);
  });

  it('KNOWN-GOOD — an invited supplier records interest at RFI, with its note, at the event’s own stage', async () => {
    const id = await openAt('RFI');
    const res = await interest('sup-002', id, { note: '  We can supply this.  ', stage: 'RFQ' });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(res.entityId!)!;
    expect(row).toMatchObject({ rfqId: id, supplierId: 'sup-002', note: 'We can supply this.' });
    // the stage is the event's, never the payload's
    expect(row.stage).toBe('RFI');
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-002']);
    expect(rfqStore.get(id)!.stageResponses!.map((r) => r.id)).toEqual([res.entityId]);
  });

  it('a response with no note stores none', async () => {
    const id = await openAt('RFI');
    const res = await interest('sup-005', id);
    expect('note' in stageResponseStore.get(res.entityId!)!).toBe(false);
  });

  it('THE REFUSAL — an event the buyer closed takes no response', async () => {
    const id = await openAt('RFI');
    await rfqVerb('t_rfq_close', id);
    refusedBy(await interest('sup-002', id), POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN, 'INTEREST_EVENT_NOT_OPEN');
    expect(stageResponseStore.forRfq(id)).toHaveLength(0);
  });

  it('THE REFUSAL — an event at RFQ is answered with a quotation', async () => {
    refusedBy(
      await interest('sup-002', 'rfq-015'),
      POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST,
      'INTEREST_STAGE_TAKES_QUOTATIONS',
    );
    // known-good: the same supplier quotes the same event
    expect((await quote('sup-002', 'rfq-015')).status).toBe('done');
  });

  it('THE REFUSAL — after the stage’s response deadline; the deadline day itself is open', async () => {
    const id = await openAt('RFI');
    rfqStore.update(id, (r) => ({ ...r, responseDeadline: dayBefore(DECLARED_PRESENT) }));
    refusedBy(await interest('sup-002', id), POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE, 'INTEREST_DEADLINE_PASSED');
    rfqStore.update(id, (r) => ({ ...r, responseDeadline: DECLARED_PRESENT }));
    expect((await interest('sup-002', id)).status).toBe('done');
  });

  it('THE REFUSAL — a second response at the same stage; the NEXT stage takes one again', async () => {
    // sup-005 holds rsp-004 at the seeded event's current stage (RFP)
    refusedBy(await interest('sup-005', 'rfq-018'), POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE, 'INTEREST_ALREADY_RECORDED');
    // sup-007 answered the RFI (rsp-003) and has not answered the RFP: one per STAGE, not per event
    expect(stageResponseStore.forRfq('rfq-018').filter((r) => r.supplierId === 'sup-007').map((r) => r.stage)).toEqual(['RFI']);
    const res = await interest('sup-007', 'rfq-018');
    expect(res.status, res.reason).toBe('done');
    expect(stageResponseStore.get(res.entityId!)!.stage).toBe('RFP');
    expect(rfqStore.get('rfq-018')!.respondedSupplierIds).toEqual(['sup-005', 'sup-007']);
  });

  it('a supplier left off the shortlist, and one never invited, are denied at scope', async () => {
    await expect(interest('sup-002', 'rfq-018')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    await expect(interest('sup-001', 'rfq-018')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    // and a supplier cannot answer as another
    await expect(interest('sup-007', 'rfq-018', {}, supplier('sup-005'))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('a seat without the commercial lane does not hold the verb', async () => {
    const res = await interest('sup-007', 'rfq-018', {}, supplier('sup-007', ['supplier', 'fulfilment']));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
  });
});

describe('E · a quotation is taken at the RFQ stage only', () => {
  it('the machine: the stage is read third, after "is the event open"', () => {
    const hooks = getFlow('quotation')!.transitions.find((t) => t.id === 't_quotation_submit')!.policyHooks;
    expect(hooks.indexOf(POLICY_HOOKS.QUOTATION_SUBMIT_AT_RFQ_STAGE)).toBe(2);
    expect(hooks.indexOf(POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)).toBe(1);
    expect(hooks.indexOf(POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE)).toBe(3);
  });

  it('THE REFUSAL — a quotation on an RFP is refused by name, and no row is made', async () => {
    refusedBy(await quote('sup-007', 'rfq-018'), POLICY_HOOKS.QUOTATION_SUBMIT_AT_RFQ_STAGE, 'QUOTE_STAGE_NOT_RFQ');
    expect(quotationStore.forRfq('rfq-018')).toHaveLength(0);
  });

  it('KNOWN-GOOD — the same supplier quotes an event that states no stage', async () => {
    expect((await quote('sup-007', 'rfq-011')).status).toBe('done');
  });
});

describe('F · advance to the next stage with a shortlist', () => {
  it('the machine: from Closed only, to Open, seven checks in this order', () => {
    const t = getFlow('rfq')!.transitions.find((x) => x.id === 't_rfq_advance')!;
    expect(t.from).toEqual(['Closed']);
    expect(t.to).toBe('Open');
    expect(t.requiredRole).toBe('rfq:advance');
    expect(t.requiredFields).toEqual(['shortlistSupplierIds', 'responseDeadline']);
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
      POLICY_HOOKS.RFQ_ADVANCE_HAS_NEXT_STAGE,
      POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_STATED,
      POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_RESPONDED,
      POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_COMPETITIVE,
      POLICY_HOOKS.RFQ_ADVANCE_REASON_STATED,
      POLICY_HOOKS.RFQ_ADVANCE_DEADLINE_CURRENT,
    ]);
  });

  it('KNOWN-GOOD — RFI to RFP with two of three: stage, invite list, deadline, ledger, and Open again', async () => {
    const id = await closedRfi();
    const res = await advance(id, {
      // named out of invite order, with a repeat: the event keeps its own order, once each
      shortlistSupplierIds: ['sup-007', 'sup-005', 'sup-007'],
      shortlistReason: '  Capacity below the volume needed.  ',
      responseDeadline: '2026-11-01',
      awardDeadline: '2026-11-20',
    });
    expect(res.status, res.reason).toBe('done');
    const e = rfqStore.get(id)!;
    expect(e.status).toBe('Open');
    expect(e.stage).toBe('RFP');
    expect(e.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    expect(e.responseDeadline).toBe('2026-11-01');
    expect(e.awardDeadline).toBe('2026-11-20');
    expect(e.stageHistory).toHaveLength(1);
    expect(e.stageHistory![0]).toMatchObject({
      from: 'RFI',
      to: 'RFP',
      shortlistedSupplierIds: ['sup-005', 'sup-007'],
      notShortlistedSupplierIds: ['sup-002'],
      reason: 'Capacity below the volume needed.',
    });
    expect(e.stageHistory![0].advancedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // nobody has answered the NEW stage yet; the RFI answers are still on the event
    expect(e.respondedSupplierIds).toEqual([]);
    expect(e.stageResponses).toHaveLength(3);
  });

  it('carrying everybody needs no reason, and records none', async () => {
    const id = await closedRfi();
    const res = await advance(id, { shortlistSupplierIds: THREE });
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.stageHistory![0].notShortlistedSupplierIds).toEqual([]);
    expect('reason' in rfqStore.get(id)!.stageHistory![0]).toBe(false);
  });

  it('an advance that states no award deadline leaves the event’s own', async () => {
    const id = await closedRfi();
    await advance(id, { shortlistSupplierIds: THREE });
    expect(rfqStore.get(id)!.awardDeadline).toBe('2026-10-30');
  });

  it('an Open event is not advanced — bidding is closed first', async () => {
    const id = await openAt('RFI');
    for (const s of THREE) await interest(s, id);
    const res = await advance(id, { shortlistSupplierIds: THREE });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ILLEGAL_TRANSITION');
    expect(rfqStore.get(id)!.stage).toBe('RFI');
  });

  it('THE REFUSAL — RFQ is the last stage', async () => {
    // rfq-004 is seeded Closed, and states no stage
    expect(rfqStore.get('rfq-004')!.status).toBe('Closed');
    refusedBy(
      await advance('rfq-004', { shortlistSupplierIds: ['sup-003', 'sup-004'] }),
      POLICY_HOOKS.RFQ_ADVANCE_HAS_NEXT_STAGE,
      'STAGE_IS_FINAL',
    );
  });

  it('THE REFUSAL — a shortlist that names nobody', async () => {
    const id = await closedRfi();
    // An empty list never reaches the hook: the required-fields gate reads it as absent.
    expect((await advance(id, { shortlistSupplierIds: [] })).reason).toContain('MISSING_FIELDS');
    // A list that holds entries and names no supplier does.
    refusedBy(await advance(id, { shortlistSupplierIds: [7, ''] }), POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_STATED, 'SHORTLIST_EMPTY');
    expect(rfqStore.get(id)!.stage).toBe('RFI');
  });

  it('THE REFUSAL — a supplier that did not answer this stage is not carried', async () => {
    const id = await openAt('RFI');
    await interest('sup-005', id);
    await interest('sup-007', id);
    await rfqVerb('t_rfq_close', id);
    const res = await advance(id, { shortlistSupplierIds: THREE, shortlistReason: 'x' });
    refusedBy(res, POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_RESPONDED, 'SHORTLIST_NOT_A_RESPONDER');
    expect(res.reason).toContain('sup-002');
    expect(res.reason).not.toContain('sup-005,');
    // known-good: the two who answered go forward
    expect((await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'x' })).status).toBe('done');
  });

  it('THE REFUSAL — a shortlist of one is under the floor publishing holds', async () => {
    const id = await closedRfi();
    refusedBy(
      await advance(id, { shortlistSupplierIds: ['sup-005'], shortlistReason: 'x' }),
      POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_COMPETITIVE,
      'SHORTLIST_UNDER_FLOOR',
    );
    // known-good: two is the floor, and is allowed
    expect((await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'x' })).status).toBe('done');
  });

  it('THE REFUSAL — a supplier is left out and no reason is stated; blanks are not a reason', async () => {
    const id = await closedRfi();
    const none = await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'] });
    refusedBy(none, POLICY_HOOKS.RFQ_ADVANCE_REASON_STATED, 'SHORTLIST_REASON_MISSING');
    expect(none.reason).toContain('sup-002');
    refusedBy(
      await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: '   ' }),
      POLICY_HOOKS.RFQ_ADVANCE_REASON_STATED,
      'SHORTLIST_REASON_MISSING',
    );
    expect(rfqStore.get(id)!.invitedSupplierIds).toEqual(THREE);
  });

  it('THE REFUSAL — the next stage’s deadline has passed; today is still a deadline', async () => {
    const id = await closedRfi();
    refusedBy(
      await advance(id, { shortlistSupplierIds: THREE, responseDeadline: dayBefore(DECLARED_PRESENT) }),
      POLICY_HOOKS.RFQ_ADVANCE_DEADLINE_CURRENT,
      'STAGE_DEADLINE_PAST',
    );
    expect((await advance(id, { shortlistSupplierIds: THREE, responseDeadline: DECLARED_PRESENT })).status).toBe('done');
  });

  it('a missing deadline is a missing field', async () => {
    const id = await closedRfi();
    const res = await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
  });

  it('THE REFUSAL — a seat with nobody named does not advance; a named one does', async () => {
    const id = await closedRfi();
    refusedBy(
      await advance(id, { shortlistSupplierIds: THREE }, nobody),
      POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
      'RFQ_ACTOR_UNATTRIBUTED',
    );
    expect(rfqStore.get(id)!.stage).toBe('RFI');
    expect((await advance(id, { shortlistSupplierIds: THREE })).status).toBe('done');
  });

  it('after the advance the supplier left out can no longer answer, and the two carried can', async () => {
    const id = await closedRfi();
    await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'x' });
    await expect(interest('sup-002', id)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const res = await interest('sup-005', id);
    expect(res.status, res.reason).toBe('done');
    expect(stageResponseStore.get(res.entityId!)!.stage).toBe('RFP');
  });
});

describe('F2 · no other verb advances the stage', () => {
  // The target is not told which verb it applies. An advance is the Closed →
  // Open edge with a shortlist in the payload, so every other verb on that edge
  // must refuse such a payload, and no verb off it may move the stage.
  const shortlist = { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'x', responseDeadline: LATER };

  it('POPULATION — the verbs on the Closed → Open edge, derived from the flow', () => {
    const onEdge = getFlow('rfq')!.transitions.filter((t) => t.from.includes('Closed') && t.to === 'Open' && !t.statePreserving);
    expect(onEdge.map((t) => t.id).sort()).toEqual(['t_rfq_advance', 't_rfq_reopen']);
    for (const t of onEdge.filter((x) => x.id !== 't_rfq_advance')) {
      expect(t.policyHooks, t.id).toContain(POLICY_HOOKS.RFQ_REOPEN_NOT_AN_ADVANCE);
    }
  });

  it('THE REFUSAL — a reopen carrying a shortlist is refused, and the stage does not move', async () => {
    const id = await closedRfi();
    refusedBy(await rfqVerb('t_rfq_reopen', id, shortlist), POLICY_HOOKS.RFQ_REOPEN_NOT_AN_ADVANCE, 'REOPEN_CARRIES_SHORTLIST');
    expect(rfqStore.get(id)!.stage).toBe('RFI');
    expect(rfqStore.get(id)!.status).toBe('Closed');
    expect(rfqStore.get(id)!.invitedSupplierIds).toEqual(THREE);
  });

  it('KNOWN-GOOD — a plain reopen still reopens, at the same stage, with the same invite list', async () => {
    const id = await closedRfi();
    const res = await rfqVerb('t_rfq_reopen', id);
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Open');
    expect(rfqStore.get(id)!.stage).toBe('RFI');
    expect(rfqStore.get(id)!.stageHistory).toBeUndefined();
  });

  it('a verb off that edge carrying a shortlist moves nothing but its own state', async () => {
    // close: Open → Closed
    const open = await openAt('RFI');
    for (const s of THREE) await interest(s, open);
    expect((await rfqVerb('t_rfq_close', open, shortlist)).status).toBe('done');
    expect(rfqStore.get(open)!.stage).toBe('RFI');
    expect(rfqStore.get(open)!.invitedSupplierIds).toEqual(THREE);
    expect(rfqStore.get(open)!.responseDeadline).toBe(LATER);
    // publish: Draft → Open
    const draft = await raise({ stage: 'RFI', responseDeadline: '2026-11-11' });
    expect((await rfqVerb('t_rfq_publish', draft, shortlist)).status).toBe('done');
    expect(rfqStore.get(draft)!.stage).toBe('RFI');
    expect(rfqStore.get(draft)!.invitedSupplierIds).toEqual(THREE);
    expect(rfqStore.get(draft)!.responseDeadline).toBe('2026-11-11');
    // conclude: Closed → Concluded
    expect((await rfqVerb('t_rfq_conclude', open, { ...shortlist, concludeReason: 'x' })).status).toBe('done');
    expect(rfqStore.get(open)!.stage).toBe('RFI');
    expect(rfqStore.get(open)!.stageHistory).toBeUndefined();
  });

  it('and only a conclude writes the conclude fields', async () => {
    const id = await openAt('RFI');
    expect((await rfqVerb('t_rfq_close', id, { concludeReason: 'not a conclude' })).status).toBe('done');
    expect(rfqStore.get(id)!.concludeReason).toBeUndefined();
    expect(rfqStore.get(id)!.concludedAt).toBeUndefined();
  });
});

describe('G · the award is made at the RFQ stage only', () => {
  it('the machine: the stage is read before the awardee', () => {
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_award')!.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
      POLICY_HOOKS.RFQ_AWARD_AT_RFQ_STAGE,
      POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY,
      POLICY_HOOKS.RFQ_AWARD_FX_BASIS,
    ]);
  });

  it('THE REFUSAL — an award on an RFP, by name (not "no such quotation")', async () => {
    const res = await rfqVerb('t_rfq_award', 'rfq-018', { awardedQuotationId: 'qt-x', awardedSupplierId: 'sup-005' });
    refusedBy(res, POLICY_HOOKS.RFQ_AWARD_AT_RFQ_STAGE, 'AWARD_STAGE_NOT_RFQ');
    expect(rfqStore.get('rfq-018')!.status).toBe('Open');
  });

  it('END TO END — RFI, shortlist of two, RFP, RFQ, a quotation, the award', async () => {
    const id = await closedRfi();
    expect((await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'Volume.' })).status).toBe('done');
    for (const s of ['sup-005', 'sup-007']) expect((await interest(s, id)).status).toBe('done');
    expect((await rfqVerb('t_rfq_close', id)).status).toBe('done');
    expect((await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'] })).status).toBe('done');
    const e = rfqStore.get(id)!;
    expect(e.stage).toBe('RFQ');
    expect(e.stageHistory!.map((a) => `${a.from}>${a.to}`)).toEqual(['RFI>RFP', 'RFP>RFQ']);
    expect(stagePathOf(e)).toEqual(['RFI', 'RFP', 'RFQ']);
    // at RFQ the answer is a quotation, and interest is refused
    refusedBy(await interest('sup-005', id), POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST, 'INTEREST_STAGE_TAKES_QUOTATIONS');
    const q = await quote('sup-005', id);
    expect(q.status, q.reason).toBe('done');
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-005']);
    const award = await rfqVerb('t_rfq_award', id, { awardedQuotationId: q.entityId, awardedSupplierId: 'sup-005' });
    expect(award.status, award.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Awarded');
    expect(quotationStore.get(q.entityId!)!.status).toBe('Awarded');
    // an awarded event is at its last stage and over: no further advance
    expect((await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'] })).reason).toContain('ILLEGAL_TRANSITION');
  });
});

describe('H · conclude without an award', () => {
  it('the machine: from Open and Closed, to the terminal Concluded, a named person and a reason', () => {
    const flow = getFlow('rfq')!;
    expect(flow.states).toContain('Concluded');
    expect(flow.terminals).toEqual(['Awarded', 'Concluded', 'Cancelled']);
    const t = flow.transitions.find((x) => x.id === 't_rfq_conclude')!;
    expect(t.from).toEqual(['Open', 'Closed']);
    expect(t.to).toBe('Concluded');
    expect(t.requiredFields).toEqual(['concludeReason']);
    expect(t.policyHooks).toEqual([POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED, POLICY_HOOKS.RFQ_CONCLUDE_REASON_STATED]);
    expect(cascadesFor('t_rfq_conclude')).toEqual([{ targetEntity: 'quotation', targetTransitionId: 't_quotation_withdraw' }]);
  });

  it('KNOWN-GOOD — an RFI nobody answered is concluded: the day and the reason are on the event', async () => {
    const id = await openAt('RFI');
    const res = await rfqVerb('t_rfq_conclude', id, { concludeReason: '  No supplier could fill in-house.  ' });
    expect(res.status, res.reason).toBe('done');
    const e = rfqStore.get(id)!;
    expect(e.status).toBe('Concluded');
    expect(e.concludeReason).toBe('No supplier could fill in-house.');
    expect(e.concludedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(e.stage).toBe('RFI');
    // it is an ending: nothing leaves it
    for (const verb of ['t_rfq_reopen', 't_rfq_cancel', 't_rfq_close']) {
      expect((await rfqVerb(verb, id)).reason, verb).toContain('ILLEGAL_TRANSITION');
    }
    expect((await rfqVerb('t_rfq_conclude', id, { concludeReason: 'again' })).reason).toContain('ILLEGAL_TRANSITION');
  });

  it('a Closed event is concluded too; a Draft is not (it is cancelled)', async () => {
    expect((await rfqVerb('t_rfq_conclude', 'rfq-004', { concludeReason: 'Prices too high.' })).status).toBe('done');
    expect((await rfqVerb('t_rfq_conclude', 'rfq-014', { concludeReason: 'x' })).reason).toContain('ILLEGAL_TRANSITION');
  });

  it('the quotations still being weighed are withdrawn, and one already decided is left alone', async () => {
    // rfq-011 holds one Submitted quotation; rfq-003 holds three Under Review
    expect(quotationStore.forRfq('rfq-003').map((q) => q.status)).toEqual(['Under Review', 'Under Review', 'Under Review']);
    expect((await rfqVerb('t_rfq_conclude', 'rfq-003', { concludeReason: 'Requirement covered by contract.' })).status).toBe('done');
    expect(quotationStore.forRfq('rfq-003').map((q) => q.status)).toEqual(['Withdrawn', 'Withdrawn', 'Withdrawn']);
    expect(quotationStore.get('qt-011a')!.status).toBe('Submitted');
    expect((await rfqVerb('t_rfq_conclude', 'rfq-011', { concludeReason: 'One offer only.' })).status).toBe('done');
    expect(quotationStore.get('qt-011a')!.status).toBe('Withdrawn');
    // an awarded event's quotations were never in reach
    expect(quotationStore.get('qt-006a')!.status).toBe('Awarded');
  });

  it('THE REFUSAL — a reason of spaces; an absent one is a missing field', async () => {
    refusedBy(
      await rfqVerb('t_rfq_conclude', 'rfq-003', { concludeReason: '   ' }),
      POLICY_HOOKS.RFQ_CONCLUDE_REASON_STATED,
      'CONCLUDE_REASON_MISSING',
    );
    expect((await rfqVerb('t_rfq_conclude', 'rfq-003')).reason).toContain('MISSING_FIELDS');
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
  });

  it('THE REFUSAL — a seat with nobody named does not conclude', async () => {
    refusedBy(
      await rfqVerb('t_rfq_conclude', 'rfq-003', { concludeReason: 'x' }, nobody),
      POLICY_HOOKS.RFQ_ACTOR_ATTRIBUTED,
      'RFQ_ACTOR_UNATTRIBUTED',
    );
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
  });
});

describe('I · what a supplier reads of a staged event', () => {
  const read = async (id: string) => (await mockDataService.procurement.getRFQs(supplier(id))).items;

  it('the supplier left out still reads the event — with its own outcome and the reason', async () => {
    const e = (await read('sup-002')).find((r) => r.id === 'rfq-018')!;
    expect(e, 'sup-002 reads rfq-018').toBeTruthy();
    expect(e.invitedSupplierIds).toEqual([]);
    expect(e.stage).toBe('RFP');
    expect(e.stageHistory).toEqual([
      {
        from: 'RFI',
        to: 'RFP',
        advancedAt: rfqStore.get('rfq-018')!.stageHistory![0].advancedAt,
        shortlistedSupplierIds: [],
        notShortlistedSupplierIds: ['sup-002'],
        reason: 'Supply would be subcontracted; this programme needs an in-house source.',
      },
    ]);
    expect(e.stageResponses!.map((r) => r.id)).toEqual(['rsp-001']);
  });

  it('a supplier carried forward reads that it was, and not the reason given to another', async () => {
    const e = (await read('sup-005')).find((r) => r.id === 'rfq-018')!;
    expect(e.invitedSupplierIds).toEqual(['sup-005']);
    expect(e.stageHistory![0].shortlistedSupplierIds).toEqual(['sup-005']);
    expect(e.stageHistory![0].notShortlistedSupplierIds).toEqual([]);
    expect('reason' in e.stageHistory![0]).toBe(false);
    expect(e.stageResponses!.map((r) => r.id)).toEqual(['rsp-002', 'rsp-004']);
  });

  it('a supplier never on the event does not read it', async () => {
    expect((await read('sup-001')).some((r) => r.id === 'rfq-018')).toBe(false);
    const row = rfqStore.get('rfq-018')!;
    expect(supplierMayRead(row, 'sup-001')).toBe(false);
    expect(supplierMayRead(row, 'sup-002')).toBe(true);
    expect(supplierMayRead(row, 'sup-007')).toBe(true);
  });

  it('the reason an event was concluded stays with the buyer; the day crosses', async () => {
    await rfqVerb('t_rfq_conclude', 'rfq-018', { concludeReason: 'Programme postponed to 2027.' });
    const e = (await read('sup-005')).find((r) => r.id === 'rfq-018')!;
    expect(e.status).toBe('Concluded');
    expect(e.concludedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect('concludeReason' in e).toBe(false);
    expect(JSON.stringify(e)).not.toContain('postponed');
    // known-good: the buyer's row holds it
    expect(rfqStore.get('rfq-018')!.concludeReason).toBe('Programme postponed to 2027.');
  });

  it('after a live advance, no supplier on the event reads another supplier’s id or answer', async () => {
    const id = await closedRfi();
    await advance(id, { shortlistSupplierIds: ['sup-005', 'sup-007'], shortlistReason: 'Volume.' });
    for (const reader of THREE) {
      const e = (await read(reader)).find((r) => r.id === id)!;
      expect(e, `${reader} reads the event`).toBeTruthy();
      const text = JSON.stringify(e);
      for (const other of THREE.filter((s) => s !== reader)) {
        expect(text.includes(`"${other}"`), `${reader} reads ${other}`).toBe(false);
      }
      expect(e.stageResponses!.every((r) => r.supplierId === reader)).toBe(true);
    }
    // known-good control: the buyer's row names all three
    expect(JSON.stringify(rfqStore.get(id))).toContain('"sup-002"');
    // and the projection itself, not only the service, narrows
    expect(toSupplierRfqView(rfqStore.get(id)!, 'sup-002').stageHistory![0].reason).toBe('Volume.');
    expect('reason' in toSupplierRfqView(rfqStore.get(id)!, 'sup-005').stageHistory![0]).toBe(false);
  });
});

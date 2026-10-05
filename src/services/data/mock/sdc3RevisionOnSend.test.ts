// ────────────────────────────────────────────────────────────────────────────
// SDC-3 · A REVISION REPLACES ONLY WHEN IT IS SENT (R-SDC P0 #4), AN
// ACKNOWLEDGMENT NEVER BLOCKS A COMMITMENT (R-SDC P0 #5), AND ACCEPT / DISPUTE
// ARE A PERSON'S DECISION (operator ruling). Real dispatcher, real stores.
//
// Measured in R-SDC browser QA on `main` @ 4f29bf2 (e8-06/07): the supplier
// saved a revision of a disputed answer as a DRAFT, and the dispute left the
// buyer's resolve queue, the line read awaiting and the chase counted it overdue,
// while the supplier's card said "you answered it with a revision" — nothing had
// been sent. The acknowledgment case is reached by any republish: the projection
// makes a visibility line semi-firm, and the open acknowledgment then refused
// every commitment on it, while `revise` refuses acknowledgments.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockCommandService } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { buildRequirementResponsePayload, sdcClock, type RequirementResponse } from '../../sdc';
import { SDC_REFUSAL_KEYS, sdcRefusalKey } from '../../../lib/sdcRefusal';
import type { QueryScope } from '../types';

const svc = new MockCommandService();
const collab = new MockCollaborationService();
const personOf = (role: SystemRoleId) => ({
  kind: 'RESOLVED' as const,
  person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId },
});
const BUYER_NAMED: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: personOf('planning') };
const BUYER_UNNAMED: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplier = (supplierId: string): QueryScope => ({ personaType: 'supplier', supplierId, businessRoles: PERSONA_SYSTEM_ROLES.supplier });
const SUP002 = supplier('sup-002');
const SUP005 = supplier('sup-005');
const SUP007 = supplier('sup-007');

const act = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(scope, { transitionId, entity: 'requirementResponse', entityId, payload });
const revisionOf = (priorId: string): RequirementResponse | undefined =>
  requirementResponseStore.all().find((r) => r.supersedes === priorId);
const rows = async () => (await collab.getConsolidation(BUYER_NAMED)).items;
const rowFor = async (key: string) => (await rows()).find((r) => r.id === key)!;
const status = (id: string) => requirementResponseStore.get(id)!.status;

beforeEach(() => {
  requirementResponseStore.reset();
  forecastPublicationStore.reset();
});
afterEach(() => sdcClock.reset());

describe('SDC-3 · the population, before any act', () => {
  it('rr-0002 is a Disputed answer of sup-005, rr-0001 a Submitted one of sup-002, rr-0005 sup-007’s acknowledgment', () => {
    expect(requirementResponseStore.get('rr-0002')).toMatchObject({ supplierId: 'sup-005', status: 'Disputed' });
    expect(requirementResponseStore.get('rr-0001')).toMatchObject({ supplierId: 'sup-002', status: 'Submitted' });
    const ack = requirementResponseStore.get('rr-0005')!;
    expect(ack).toMatchObject({ supplierId: 'sup-007', materialCode: 'AI-NIAC-6601', periodBucket: '2026-10', status: 'Submitted' });
    expect(ack.acknowledgment).toBeDefined();
  });
});

describe('SDC-3 · a revision of a DISPUTED answer replaces it only when it is sent', () => {
  it('while the revision is a draft, the dispute stands for the buyer: queue, line state and ledger unchanged', async () => {
    const before = await rowFor('sup-005|RM-EMUL-3310|2026-08');
    expect((await act(SUP005, 't_requirementresponse_revise', 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' })).status).toBe('done');
    expect(status('rr-0002')).toBe('Disputed');
    expect(requirementResponseStore.get('rr-0002')!.disputeResponse?.map((e) => e.kind)).toEqual(['raised']);
    const during = await rowFor('sup-005|RM-EMUL-3310|2026-08');
    expect(during.state).toEqual(before.state);
    expect('response' in during.state && during.state.response.id).toBe('rr-0002');
    // the buyer's resolve queue is derived from the rows' Disputed responses — still there
    expect((await rows()).filter((r) => 'response' in r.state && r.state.response.status === 'Disputed').map((r) => r.id)).toContain(
      'sup-005|RM-EMUL-3310|2026-08',
    );
  });

  it('SENDING the revision retires the dispute, answered by the supplier, and the buyer reviews v2', async () => {
    await act(SUP005, 't_requirementresponse_revise', 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    const draft = revisionOf('rr-0002')!;
    expect((await act(SUP005, 't_requirementresponse_promote', draft.id)).status).toBe('done');
    expect(requirementResponseStore.get('rr-0002')).toMatchObject({ status: 'Superseded', supersededFrom: 'Disputed' });
    expect(requirementResponseStore.get('rr-0002')!.disputeResponse?.map((e) => e.kind)).toEqual(['raised', 'superseded-by-revision']);
    const row = await rowFor('sup-005|RM-EMUL-3310|2026-08');
    expect('response' in row.state && row.state.response.id).toBe(draft.id);
    expect(row.revisionOf).toBe('Disputed');
  });

  it('a first answer sent (no revision link) retires nothing — the cascade needs the link', async () => {
    const before = requirementResponseStore.all().map((r) => `${r.id}:${r.status}`);
    expect(status('rr-0003')).toBe('Draft');
    expect((await act(SUP002, 't_requirementresponse_promote', 'rr-0003')).status).toBe('done');
    const after = requirementResponseStore.all().map((r) => `${r.id}:${r.status}`);
    expect(after.filter((s) => !before.includes(s))).toEqual(['rr-0003:Submitted']);
  });
});

describe('SDC-3 · a revision of an ACCEPTED figure replaces it only when it is sent', () => {
  const accept = async () => {
    expect((await act(BUYER_NAMED, 't_requirementresponse_review', 'rr-0001')).status).toBe('done');
    expect((await act(BUYER_NAMED, 't_requirementresponse_accept', 'rr-0001')).status).toBe('done');
  };

  it('while the cut is a draft the accepted 6 000 stands and nobody is chased for a cut; sent, it is chased hard', async () => {
    await accept();
    const cut = await act(SUP002, 't_requirementresponse_revise', 'rr-0001', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      rootCause: { level1: 'capacity', note: 'Line down for retooling.' },
    });
    expect(cut.status, cut.reason).toBe('done');
    expect(status('rr-0001')).toBe('Accepted');
    const during = await rowFor('sup-002|RM-EMUL-3310|2026-08');
    expect('response' in during.state && during.state.response.id).toBe('rr-0001');
    expect(during.state.kind).not.toBe('revised-after-accept');
    expect((await collab.getChase(BUYER_NAMED)).items.map((e) => e.reason)).not.toContain('revised-after-accept');

    await act(SUP002, 't_requirementresponse_promote', revisionOf('rr-0001')!.id);
    expect(requirementResponseStore.get('rr-0001')).toMatchObject({ status: 'Superseded', supersededFrom: 'Accepted' });
    expect((await rowFor('sup-002|RM-EMUL-3310|2026-08')).state).toMatchObject({ kind: 'revised-after-accept', acceptedQty: 6000, cutQty: 5900 });
    expect((await collab.getChase(BUYER_NAMED)).items[0]).toMatchObject({ supplierId: 'sup-002', reason: 'revised-after-accept' });
  });
});

describe('SDC-3 · the buyer may act on the prior while the revision is a draft', () => {
  it('resolved meanwhile (Disputed → UnderReview), the sent revision still replaces it — one open answer remains', async () => {
    await act(SUP005, 't_requirementresponse_revise', 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    expect((await act(BUYER_NAMED, 't_requirementresponse_resolve', 'rr-0002', { resolutionReason: 'Agreed on a call — revise to 3 500.' })).status).toBe('done');
    expect(status('rr-0002')).toBe('UnderReview');
    const draft = revisionOf('rr-0002')!;
    expect((await act(SUP005, 't_requirementresponse_promote', draft.id)).status).toBe('done');
    expect(status('rr-0002')).toBe('Superseded');
    // retired from UnderReview: nothing to answer, nothing stamped as if it had been disputed
    expect(requirementResponseStore.get('rr-0002')!.supersededFrom).toBeUndefined();
    const open = requirementResponseStore.forResponseKey('sup-005', 'RM-EMUL-3310', '2026-08').filter((r) => r.status !== 'Superseded');
    expect(open.map((r) => r.id)).toEqual([draft.id]);
  });
});

describe('SDC-3 · an acknowledgment never blocks a commitment', () => {
  /**
   * A fresh plan from the grid (not carried — a carried line keeps its class): the
   * planner splits AI-NIAC-6601 · 2026-10 to sup-007 again, and the machine's
   * projection (C8 §2.2 as built: first bucket firm, every later one semi-firm)
   * makes the line a COMMITMENT where R2 had it visibility-only.
   */
  async function republish(): Promise<string> {
    const planner: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] };
    const PV = 'PV-2026-08.2';
    const id = (
      await svc.dispatch(planner, {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}` },
      })
    ).entityId!;
    const split = await svc.dispatch(planner, {
      transitionId: 't_publication_allocate',
      entity: 'forecastPublication',
      entityId: id,
      payload: { materialCode: 'AI-NIAC-6601', periodBucket: '2026-10', supplierId: 'sup-007', forecastQty: 800, forecastQtyRaw: '800', basis: 'planner-split' },
    });
    expect(split.status, split.reason).toBe('done');
    expect((await svc.dispatch(planner, { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: id, payload: {} })).status).toBe('done');
    return id;
  }

  it('after a republish the acknowledged line asks for a COMMITMENT, and the supplier can give one', async () => {
    const id = await republish();
    const pub = forecastPublicationStore.publications().find((p) => p.publicationId === id)!;
    const line = pub.lines.find((l) => l.supplierId === 'sup-007' && l.materialCode === 'AI-NIAC-6601' && l.periodBucket === '2026-10')!;
    // the population this case needs: the line is now a commitment, and the acknowledgment is still open
    expect(line.commitmentClass).toBe('semi-firm');
    expect(status('rr-0005')).toBe('Submitted');
    const made = await svc.dispatch(SUP007, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: buildRequirementResponsePayload(pub, line, 'sup-007', { confirmedQty: 800, confirmedQtyRaw: '800' }),
    });
    expect(made.status, made.reason).toBe('done');
    expect((await act(SUP007, 't_requirementresponse_promote', made.entityId!)).status).toBe('done');
    const row = await rowFor('sup-007|AI-NIAC-6601|2026-10');
    expect(row.state.kind).toBe('confirmed-full');
    expect('response' in row.state && row.state.response.id).toBe(made.entityId);
  });

  it('KNOWN-BAD twin: a second COMMITMENT over an open commitment is still refused by name', async () => {
    const id = await republish();
    const pub = forecastPublicationStore.publications().find((p) => p.publicationId === id)!;
    const line = pub.lines.find((l) => l.supplierId === 'sup-007' && l.materialCode === 'AI-NIAC-6601')!;
    const payload = buildRequirementResponsePayload(pub, line, 'sup-007', { confirmedQty: 800, confirmedQtyRaw: '800' });
    expect((await svc.dispatch(SUP007, { transitionId: 't_requirementresponse_submit', entity: 'requirementResponse', payload })).status).toBe('done');
    const second = await svc.dispatch(SUP007, { transitionId: 't_requirementresponse_submit', entity: 'requirementResponse', payload });
    expect(second.status).toBe('failed');
    expect(second.reason).toMatch(/^POLICY_REJECTED:rr_submit_no_open_sibling:/);
    expect(second.reason).not.toMatch(/rr-0005/);
  });
});

describe('SDC-3 · operator ruling — accept and dispute are a person’s decision', () => {
  beforeEach(async () => {
    expect((await act(BUYER_UNNAMED, 't_requirementresponse_review', 'rr-0001')).status).toBe('done');
  });

  it('an unattributed seat is refused BY NAME on accept, and nothing moves', async () => {
    const r = await act(BUYER_UNNAMED, 't_requirementresponse_accept', 'rr-0001');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^POLICY_REJECTED:rr_review_actor_attributed:RR_REVIEW_ACTOR_UNATTRIBUTED: this seat carries no person/);
    expect(status('rr-0001')).toBe('UnderReview');
    expect(requirementResponseStore.get('rr-0001')!.acceptedAt).toBeUndefined();
  });

  it('an unattributed seat is refused BY NAME on dispute, and the ledger is untouched', async () => {
    const r = await act(BUYER_UNNAMED, 't_requirementresponse_dispute', 'rr-0001', { disputeReason: 'Need the full 6 000.' });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/RR_REVIEW_ACTOR_UNATTRIBUTED:/);
    expect(status('rr-0001')).toBe('UnderReview');
    expect(requirementResponseStore.get('rr-0001')!.disputeResponse).toBeUndefined();
  });

  it('KNOWN-GOOD: a seat that names a sample person accepts — and disputes', async () => {
    expect((await act(BUYER_NAMED, 't_requirementresponse_dispute', 'rr-0001', { disputeReason: 'Need the full 6 000.' })).status).toBe('done');
    expect(status('rr-0001')).toBe('Disputed');
    expect((await act(BUYER_NAMED, 't_requirementresponse_resolve', 'rr-0001', { resolutionReason: 'Covered by stock.' })).status).toBe('done');
    expect((await act(BUYER_NAMED, 't_requirementresponse_accept', 'rr-0001')).status).toBe('done');
    expect(status('rr-0001')).toBe('Accepted');
  });

  it('review is NOT gated — taking a response up decides nothing (the ruling names accept and dispute)', () => {
    expect(status('rr-0001')).toBe('UnderReview');
  });
});

describe('SDC-3 · the refusal map is gated both ways', () => {
  const source = ['src/services/transitions/policies.ts', 'src/services/data/mock/MockCommandService.ts']
    .map((f) => readFileSync(join(process.cwd(), f), 'utf8'))
    .join('\n');

  it('every mapped head is a head a hook really emits — and each one fires through the map', async () => {
    for (const head of Object.keys(SDC_REFUSAL_KEYS)) expect(source).toContain(`${head}:`);
    await act(BUYER_UNNAMED, 't_requirementresponse_review', 'rr-0001');
    const unnamed = await act(BUYER_UNNAMED, 't_requirementresponse_accept', 'rr-0001');
    expect(sdcRefusalKey(unnamed.reason)).toBe('sdc.refusal.reviewActorUnattributed');
    await act(SUP005, 't_requirementresponse_revise', 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    const twice = await act(SUP005, 't_requirementresponse_revise', 'rr-0002', { confirmedQty: 3400, confirmedQtyRaw: '3400' });
    expect(sdcRefusalKey(twice.reason)).toBe('sdc.refusal.revisionAlreadyDrafted');
  });

  it('KNOWN-BAD: a reason this map does not own resolves to null, and a head without its colon does not match', () => {
    expect(sdcRefusalKey('POLICY_REJECTED:rr_dispute_text_authored:the objection is blank')).toBeNull();
    expect(sdcRefusalKey('RR_REVIEW_ACTOR_UNATTRIBUTED_EXTRA: nope')).toBeNull();
    expect(sdcRefusalKey(undefined)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SDC-1 · ONE CURRENT PUBLICATION PER GRAIN (R-SDC P0 #1, and the latent
// withdraw). On the REAL dispatcher, the REAL stores and the REAL services.
//
// The sequence is R-SDC's browser QA e13, replayed: the planner opens a WEEKLY
// draft from the generated SOMO plan, splits ONE line (SIM-PM-0002 · 2026-W36 ·
// 5 000 PCS to one supplier), procurement signs it, the planner publishes. On
// `main` @ 4f29bf2 that single line replaced the monthly plan for EVERY reader:
// the buyer's consolidation fell to one line, three responses awaiting review
// and one dispute left the queues, and the packaging supplier read "0 published
// lines — the first plan you have been sent" — while the monthly panel still
// said PV-2026-08.2 was published. Every assertion below was red there.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { planVersionOffers } from './publicationFeed';
import { derivePlanningFacts } from './planningFacts';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import {
  buildRequirementResponsePayload,
  chaseList,
  currentPublication,
  currentPublications,
  publicationGrain,
  sdcClock,
} from '../../sdc';
import { ownPlansOf } from '../../query/sdcSupplierHooks';
import type { QueryScope } from '../types';

const commands = new MockCommandService();
const collab = new MockCollaborationService();

const seat = (roles: readonly SystemRoleId[], role?: SystemRoleId): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(role
    ? { actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId } } }
    : {}),
});
const BUYER = seat(PERSONA_SYSTEM_ROLES.buyer);
const PLANNER = seat(['planning']);
// E2E-1 — publishing, discarding and withdrawing need a named person (PUBLICATION_ACTOR_NAMED).
const PLANNER_NAMED = seat(['planning'], 'planning');
const PROCUREMENT = seat(['procurement'], 'procurement');
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
});

const MONTHLY = 'PUB-2026-08-RM-R2';
/** The seeded monthly plan's seven lines, as `supplier|material|bucket`. */
const MONTHLY_LINE_IDS = forecastPublicationStore
  .publications()
  .find((p) => p.publicationId === MONTHLY)!
  .lines.map((l) => `${l.supplierId}|${l.materialCode}|${l.periodBucket}`);
/** The open responses the buyer's queues carry at seed. */
const OPEN_RESPONSES = ['rr-0001', 'rr-0002', 'rr-0004', 'rr-0005'];

const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });

/** e13: one weekly line (or the given buckets), signed, published. Returns the weekly publication id. */
async function publishOneWeeklyLine(qty = 5000, buckets: readonly string[] = ['2026-W36']): Promise<string> {
  const offer = planVersionOffers('week')[0];
  const opened = await commands.dispatch(PLANNER, {
    transitionId: 't_publication_open',
    entity: 'forecastPublication',
    payload: { planVersion: offer.planVersion, grain: 'week', horizon: offer.horizon, sourceRef: offer.sourceRef },
  });
  expect(opened.status, opened.reason).toBe('done');
  const id = opened.entityId!;
  for (const periodBucket of buckets) {
    const split = await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: 'SIM-PM-0002',
      periodBucket,
      supplierId: 'sup-002',
      forecastQty: qty,
      forecastQtyRaw: String(qty),
      basis: 'planner-split',
    });
    expect(split.status, split.reason).toBe('done');
  }
  for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
    const signed = await fire(PROCUREMENT, 't_publication_approve_firm', id, {
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      supplierId: l.supplierId,
    });
    expect(signed.status, signed.reason).toBe('done');
  }
  const published = await fire(PLANNER_NAMED, 't_publication_publish', id);
  expect(published.status, published.reason).toBe('done');
  return id;
}

const rowIds = async () => (await collab.getConsolidation(BUYER)).items.map((r) => r.id);
const rowResponseIds = async () =>
  (await collab.getConsolidation(BUYER)).items.flatMap((r) => ('response' in r.state ? [r.state.response.id] : []));

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
});

describe('SDC-1 · the population is what the seed says it is (read BEFORE any act)', () => {
  it('the monthly plan is current with its seven lines, its open responses are in the consolidation, and no weekly plan exists', async () => {
    expect(MONTHLY_LINE_IDS).toHaveLength(7);
    expect(currentPublication(forecastPublicationStore.publications(), 'month')?.publicationId).toBe(MONTHLY);
    expect(currentPublication(forecastPublicationStore.publications(), 'week')).toBeNull();
    expect(await rowIds()).toEqual(MONTHLY_LINE_IDS);
    expect(await rowResponseIds()).toEqual(expect.arrayContaining(OPEN_RESPONSES));
  });
});

describe('SDC-1 · a weekly publish supersedes only the weekly plan (R-SDC e13, replayed)', () => {
  it('both grains are current, and the panel (state) and every reader (dates) agree on each', async () => {
    const weekly = await publishOneWeeklyLine();
    const pubs = forecastPublicationStore.publications();
    expect(currentPublication(pubs, 'month')?.publicationId).toBe(MONTHLY);
    expect(currentPublication(pubs, 'week')?.publicationId).toBe(weekly);
    expect(forecastPublicationStore.currentFor('month')?.publicationId).toBe(MONTHLY);
    expect(forecastPublicationStore.currentFor('week')?.publicationId).toBe(weekly);
    expect(forecastPublicationStore.get(MONTHLY)!.state).toBe('Published');
    expect(currentPublications(pubs).map(publicationGrain)).toEqual(['month', 'week']);
  });

  it('the buyer’s consolidation keeps every monthly line and its open responses, and gains the weekly one', async () => {
    await publishOneWeeklyLine();
    expect(await rowIds()).toEqual([...MONTHLY_LINE_IDS, 'sup-002|SIM-PM-0002|2026-W36']);
    expect(await rowResponseIds()).toEqual(expect.arrayContaining(OPEN_RESPONSES));
  });

  it('the chase keeps chasing the monthly plan: the packaging supplier’s awaiting lines are still counted', async () => {
    const before = (await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-007');
    expect(before).toBeDefined();
    await publishOneWeeklyLine();
    const after = (await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-007');
    expect(after).toEqual(before);
  });

  it('a supplier owing lines in both grains gets ONE entry: the most urgent reason, its deadline, every awaiting line of both plans', async () => {
    const monthlyOnly = (await collab.getChase(BUYER)).items.find((e) => e.supplierId === 'sup-002')!;
    // the population this case needs: sup-002 is OVERDUE on the monthly plan (its deadline passed)
    expect(monthlyOnly).toMatchObject({ reason: 'overdue', dueAt: '2026-08-22T00:00:00.000Z' });
    // A weekly plan of two REAL-material lines for sup-002, put Published beside the monthly
    // one. (Written when a generated SIM code could not be answered; SDC-5 made it answerable,
    // and `sdc5EveryStateHasAWayOut.test.ts` answers one end to end.)
    const seedLine = forecastPublicationStore.get(MONTHLY)!.lines.find((l) => l.supplierId === 'sup-002')!;
    const weeklyLines = ['2026-W36', '2026-W37'].map((periodBucket) => ({ ...seedLine, periodBucket }));
    forecastPublicationStore.put({
      ...forecastPublicationStore.get(MONTHLY)!,
      publicationId: 'PUB-TEST-WEEK',
      planVersion: 'PV-TEST-WEEK',
      grain: 'week',
      horizon: ['2026-W36', '2026-W37'],
      lines: weeklyLines,
      seed: undefined,
      publishedAt: '2026-08-31T00:00:00.000Z',
      responseDueAt: '2026-09-07T00:00:00.000Z',
    });
    const pub = forecastPublicationStore.publications().find((p) => p.publicationId === 'PUB-TEST-WEEK')!;
    expect(currentPublication(forecastPublicationStore.publications(), 'week')?.publicationId).toBe('PUB-TEST-WEEK');
    const sup = supplier('sup-002');
    const made = await commands.dispatch(sup, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: buildRequirementResponsePayload(pub, pub.lines[0], 'sup-002', { confirmedQty: 5000, confirmedQtyRaw: '5000' }),
    });
    expect(made.status, made.reason).toBe('done');
    const sent = await commands.dispatch(sup, { transitionId: 't_requirementresponse_promote', entity: 'requirementResponse', entityId: made.entityId! });
    expect(sent.status, sent.reason).toBe('done');
    // CONTROL: the two grains genuinely disagree, so the merge below is exercised, not assumed
    const rows = (await collab.getConsolidation(BUYER)).items.filter((r) => r.line.periodBucket.includes('W'));
    expect(chaseList(pub, rows, sdcClock.now()).find((e) => e.supplierId === 'sup-002')?.reason).toBe('partial-response');
    const both = (await collab.getChase(BUYER)).items.filter((e) => e.supplierId === 'sup-002');
    expect(both).toEqual([
      { supplierId: 'sup-002', reason: 'overdue', dueAt: monthlyOnly.dueAt, awaitingLines: monthlyOnly.awaitingLines + 1 },
    ]);
  });

  it('the packaging supplier still reads the monthly plan’s three lines — the weekly plan holds none of theirs', async () => {
    await publishOneWeeklyLine();
    const page = await collab.getPublications(supplier('sup-007'), { includeSimulatedSample: true });
    const plans = ownPlansOf(page.items, 'sup-007');
    expect(plans.map((p) => p.publication.publicationId)).toEqual([MONTHLY]);
    expect(plans[0].lines.map((l) => `${l.materialCode}|${l.periodBucket}`)).toEqual([
      'PK-PETB-8810|2026-08',
      'PK-CAPF-8820|2026-09',
      'AI-NIAC-6601|2026-10',
    ]);
  });

  it('a supplier with lines in both grains sees BOTH plans, monthly first, each line in its own plan', async () => {
    const weekly = await publishOneWeeklyLine();
    const page = await collab.getPublications(supplier('sup-002'), { includeSimulatedSample: true });
    const plans = ownPlansOf(page.items, 'sup-002');
    expect(plans.map((p) => p.publication.publicationId)).toEqual([MONTHLY, weekly]);
    expect(plans[1].lines.map((l) => `${l.materialCode}|${l.periodBucket}`)).toEqual(['SIM-PM-0002|2026-W36']);
    expect(plans[0].lines.every((l) => !l.periodBucket.includes('W'))).toBe(true);
  });

  it('the coverage read keeps the monthly plan’s committed demand for every pair', async () => {
    const pairs = async () => (await collab.getCoverage(BUYER)).items.map((e) => `${e.supplierId}|${e.materialCode}|${e.committedDemandQty}`).sort();
    const before = await pairs();
    expect(before).toContain('sup-007|PK-PETB-8810|40000');
    await publishOneWeeklyLine();
    // the monthly pairs are all still read; the weekly line ADDS its own pair
    expect(await pairs()).toEqual([...before, 'sup-002|SIM-PM-0002|5000'].sort());
  });

  it('the monthly planning grid keeps the monthly plan’s published split', async () => {
    const alloc = () =>
      derivePlanningFacts({ horizon: ['2026-08', '2026-09', '2026-10'], measures: ['allocation'], materialCodes: ['RM-EMUL-3310'] });
    const pick = (o: ReturnType<typeof alloc>) =>
      o.ok ? o.facts.filter((f) => f.sourceRef === 'PV-2026-08.2').map((f) => `${f.supplierId}|${f.periodBucket}|${f.value}`).sort() : [];
    const before = pick(alloc());
    expect(before).toContain('sup-002|2026-08|6000');
    await publishOneWeeklyLine();
    expect(pick(alloc())).toEqual(before);
  });

  it('a second weekly publish supersedes the FIRST weekly one — and only it', async () => {
    const first = await publishOneWeeklyLine(5000);
    const second = await publishOneWeeklyLine(4000);
    expect(forecastPublicationStore.get(first)).toMatchObject({ state: 'Superseded', supersededBy: second });
    expect(forecastPublicationStore.get(MONTHLY)!.state).toBe('Published');
    expect(currentPublication(forecastPublicationStore.publications(), 'week')?.publicationId).toBe(second);
  });
});

describe('SDC-1 · a withdrawal restores nothing it should not', () => {
  it('withdrawing the weekly plan leaves no weekly plan current — and the monthly one untouched', async () => {
    const weekly = await publishOneWeeklyLine();
    const r = await fire(PLANNER_NAMED, 't_publication_withdraw', weekly, { reason: 'SOMO re-ran the packaging plan' });
    expect(r.status, r.reason).toBe('done');
    const pubs = forecastPublicationStore.publications();
    expect(currentPublication(pubs, 'week')).toBeNull();
    expect(currentPublication(pubs, 'month')?.publicationId).toBe(MONTHLY);
    expect(await rowIds()).toEqual(MONTHLY_LINE_IDS);
  });

  it('withdrawing the monthly plan does NOT bring back the plan it superseded', async () => {
    // KNOWN-GOOD first: the superseded seed is in every reader's input, by date the latest left.
    expect(forecastPublicationStore.publications().map((p) => p.publicationId)).toEqual(['PUB-2026-08-RM', MONTHLY]);
    const r = await fire(PLANNER_NAMED, 't_publication_withdraw', MONTHLY, { reason: 'SOMO re-ran the plan' });
    expect(r.status, r.reason).toBe('done');
    const pubs = forecastPublicationStore.publications();
    expect(pubs.map((p) => p.publicationId)).toEqual(['PUB-2026-08-RM']);
    expect(currentPublication(pubs, 'month')).toBeNull();
    expect(forecastPublicationStore.currentFor('month')).toBeUndefined();
    expect(await rowIds()).toEqual([]);
    expect(ownPlansOf((await collab.getPublications(supplier('sup-007'), { includeSimulatedSample: true })).items, 'sup-007')).toEqual([]);
  });

  it('a seed superseded IN SESSION carries the stamp too: after a monthly republish and its withdrawal, R2 stays retired', async () => {
    const offer = planVersionOffers('month').find((o) => o.planVersion === 'PV-2026-08.2')!;
    const id = (
      await commands.dispatch(PLANNER, {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: offer.planVersion, grain: 'month', horizon: offer.horizon, sourceRef: offer.sourceRef, carryForwardFrom: MONTHLY },
      })
    ).entityId!;
    for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
      await fire(PROCUREMENT, 't_publication_approve_firm', id, { materialCode: l.materialCode, periodBucket: l.periodBucket, supplierId: l.supplierId });
    }
    expect((await fire(PLANNER_NAMED, 't_publication_publish', id)).status).toBe('done');
    expect(currentPublication(forecastPublicationStore.publications(), 'month')?.publicationId).toBe(id);
    expect((await fire(PLANNER_NAMED, 't_publication_withdraw', id, { reason: 'wrong split' })).status).toBe('done');
    expect(currentPublication(forecastPublicationStore.publications(), 'month')).toBeNull();
  });
});

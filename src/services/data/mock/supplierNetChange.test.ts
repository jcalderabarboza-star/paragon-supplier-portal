// ────────────────────────────────────────────────────────────────────────────
// B4b-2 · the supplier side of a revision (Design 2 §2.1, §2.4, §10), on the
// REAL dispatcher, store and collaboration service: net change (carried vs
// changed, and the carried line's prior answer still counting — for the buyer
// too), the deadline and its overdue derivation, the receipt, and operator
// rulings 3 (one open draft per grain) and 4 (carried-forward basis).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import {
  FORECAST_PUBLICATIONS,
  consolidationRows,
  currentPublication,
  isResponseOverdue,
  netChangeOf,
  netChangeSummary,
  previousPublication,
  responseDueAtOf,
  sdcClock,
  type ForecastLine,
  type ForecastPublication,
} from '../../sdc';
import type { QueryScope } from '../types';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';

const commands = new MockCommandService();
const collab = new MockCollaborationService();
const personFor = (role: SystemRoleId) => SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId;
const seat = (roles: readonly SystemRoleId[], personId?: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(personId ? { actor: { kind: 'RESOLVED', person: { personId } } } : {}),
});
const PLANNER = seat(['planning']);
const PROCUREMENT_NAMED = seat(['procurement'], personFor('procurement'));
// SDC-3 · operator ruling: accept and dispute require an ATTRIBUTED actor, so the seat
// that takes them names the planning sample person. The assertions are unchanged;
// the refusal of an unattributed seat is pinned in `sdc3RevisionOnSend.test.ts`.
const BUYER = seat(PERSONA_SYSTEM_ROLES.buyer, personFor('planning'));
const SUP002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const [R1, R2] = FORECAST_PUBLICATIONS;
const PV = 'PV-2026-08.2';
const OPEN = { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}` };
const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });
const open = (over: Record<string, unknown> = {}) =>
  commands.dispatch(PLANNER, { transitionId: 't_publication_open', entity: 'forecastPublication', payload: { ...OPEN, ...over } });
const line = (pub: ForecastPublication, sup: string, code: string, bucket: string) =>
  pub.lines.find((l) => l.supplierId === sup && l.materialCode === code && l.periodBucket === bucket)!;

/** A revision of R2: carried, one split moved, firm lines signed, published. */
async function publishRevision(move?: { sup: string; code: string; bucket: string; qty: number }) {
  // carry from whatever is CURRENT (PUB_CARRY_FROM_CURRENT admits nothing else)
  const id = (await open({ carryForwardFrom: forecastPublicationStore.currentFor('month')!.publicationId })).entityId!;
  if (move) {
    const r = await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: move.code,
      periodBucket: move.bucket,
      supplierId: move.sup,
      forecastQty: move.qty,
      forecastQtyRaw: String(move.qty),
      basis: 'planner-split',
    });
    expect(r.status, r.reason).toBe('done');
  }
  for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
    await fire(PROCUREMENT_NAMED, 't_publication_approve_firm', id, {
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      supplierId: l.supplierId,
    });
  }
  const p = await fire(PLANNER, 't_publication_publish', id);
  expect(p.status, p.reason).toBe('done');
  return id;
}

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
});
afterEach(() => sdcClock.reset());

describe('net change (Design 2 §10) — carried iff quantity AND class are unchanged', () => {
  it('the seeds: R2 superseded R1; sup-002’s 3310 line is CARRIED, its 3320 line CHANGED (2 000 → 2 600)', () => {
    expect(previousPublication(FORECAST_PUBLICATIONS, R2)?.publicationId).toBe(R1.publicationId);
    expect(previousPublication(FORECAST_PUBLICATIONS, R1)).toBeNull();
    expect(netChangeOf(line(R2, 'sup-002', 'RM-EMUL-3310', '2026-08'), R1)).toBe('carried');
    expect(netChangeOf(line(R2, 'sup-002', 'RM-EMUL-3320', '2026-09'), R1)).toBe('changed');
    expect(netChangeSummary(R2.lines.filter((l) => l.supplierId === 'sup-002'), R1)).toEqual({ changed: 1, carried: 1 });
  });

  it('KNOWN-BAD: the same quantity in a DIFFERENT class is changed, not carried', () => {
    const l = line(R2, 'sup-002', 'RM-EMUL-3310', '2026-08');
    const reclassed: ForecastLine = { ...l, commitmentClass: 'semi-firm' };
    expect(netChangeOf(reclassed, R1)).toBe('changed');
    // CONTROL: the unchanged line, same inputs otherwise
    expect(netChangeOf(l, R1)).toBe('carried');
  });

  it('a line with no counterpart is changed (new), and a first plan has nothing to carry', () => {
    const fresh: ForecastLine = { ...line(R2, 'sup-002', 'RM-EMUL-3310', '2026-08'), periodBucket: '2026-10' };
    expect(netChangeOf(fresh, R1)).toBe('changed');
    expect(netChangeOf(fresh, null)).toBe('changed');
  });

  it('after a revision is PUBLISHED from the grid, the supplier reads the new plan against the one it superseded', async () => {
    const id = await publishRevision({ sup: 'sup-002', code: 'RM-EMUL-3310', bucket: '2026-08', qty: 5500 });
    const page = await collab.getPublications(SUP002, { includeSimulatedSample: true });
    expect(page.sample).toBe(true);
    const cur = currentPublication(page.items, 'month')!;
    const prev = previousPublication(page.items, cur)!;
    expect([cur.publicationId, prev.publicationId]).toEqual([id, R2.publicationId]);
    // sup-002: 3310 moved 6 000 → 5 500 (changed); 3320 carried at 2 600
    expect(cur.lines.map((l) => [l.materialCode, netChangeOf(l, prev)])).toEqual([
      ['RM-EMUL-3320', 'carried'],
      ['RM-EMUL-3310', 'changed'],
    ]);
  });

  it('the carried line’s PRIOR ANSWER COUNTS for the buyer too — the consolidation reads the same rule', () => {
    // rr-0001 answered R1's 3310 line (6 000); R2 carries it unchanged → presumed valid.
    const row = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all()).find(
      (r) => r.line.supplierId === 'sup-002' && r.line.materialCode === 'RM-EMUL-3310',
    )!;
    expect(row.state).toMatchObject({ kind: 'confirmed-full', carriedForward: true });
    // KNOWN-BAD: re-class R2's line at the same quantity — the answer no longer carries
    const reclassed = FORECAST_PUBLICATIONS.map((p) =>
      p.publicationId !== R2.publicationId
        ? p
        : { ...p, lines: p.lines.map((l) => (l.supplierId === 'sup-002' && l.materialCode === 'RM-EMUL-3310' ? { ...l, commitmentClass: 'semi-firm' as const } : l)) },
    );
    const moved = consolidationRows(reclassed, requirementResponseStore.all()).find(
      (r) => r.line.supplierId === 'sup-002' && r.line.materialCode === 'RM-EMUL-3310',
    )!;
    expect(moved.state.kind).toBe('stale-against-current');
  });
});

describe('a frozen clock gives two revisions ONE instant — the recorded order decides (found by this batch)', () => {
  it('two publishes in one session: current is the LATER one, and previous the earlier — never the reverse', async () => {
    const first = await publishRevision({ sup: 'sup-002', code: 'RM-EMUL-3310', bucket: '2026-08', qty: 5500 });
    const second = await publishRevision();
    const pubs = forecastPublicationStore.publications();
    // CONTROL: the premise — both carry the SAME instant
    const at = (id: string) => pubs.find((p) => p.publicationId === id)!.publishedAt;
    expect(at(first)).toBe(at(second));
    expect(currentPublication(pubs, 'month')?.publicationId).toBe(second);
    expect(previousPublication(pubs, currentPublication(pubs, 'month'))?.publicationId).toBe(first);
    // and the store agrees by STATE, which is what the planner's panel reads
    expect(forecastPublicationStore.get(first)!.state).toBe('Superseded');
    expect(forecastPublicationStore.get(second)!.state).toBe('Published');
  });
});

describe('the deadline — stamped at publish, OVERDUE derived at read', () => {
  it('a published revision carries responseDueAt; before it the line is due, after it overdue — nothing is stored', async () => {
    const id = await publishRevision();
    const due = forecastPublicationStore.get(id)!.responseDueAt!;
    expect(due).toBe('2026-09-07T12:00:00.000Z');
    const pub = { publishedAt: forecastPublicationStore.get(id)!.publishedAt!, responseDueAt: due };
    expect(isResponseOverdue(pub, sdcClock.now())).toBe(false);
    sdcClock.set('2026-09-08T00:00:00.000Z');
    expect(isResponseOverdue(pub, sdcClock.now())).toBe(true);
    // the record did not change — overdue is not a field
    expect(Object.keys(forecastPublicationStore.get(id)!)).not.toContain('overdue');
  });

  // ⚠️ RE-PINNED BY SDC-2 (R-SDC P0 #3). This read "…and claim no deadline", asserting a seed is
  // never overdue. The buyer's chase has always held the seed to publishedAt + RESPONSE_DUE_DAYS
  // (the sample clock is set past it on purpose), so the two seats disagreed about one plan.
  it('the seeds carry no stamp, and are due by the SAME policy the chase reads', async () => {
    expect(R2.responseDueAt).toBeUndefined();
    expect(responseDueAtOf(R2)).toBe('2026-08-22T00:00:00.000Z');
    expect(isResponseOverdue(R2, '2026-08-21T23:59:59.000Z')).toBe(false);
    expect(isResponseOverdue(R2, '2026-08-22T00:00:01.000Z')).toBe(true);
    const chase = new MockCollaborationService();
    const entry = (await chase.getChase({ personaType: 'buyer', supplierId: null })).items.find((e) => e.supplierId === 'sup-007');
    expect(entry?.dueAt).toBe(responseDueAtOf(R2));
  });
});

describe('the receipt — the buyer’s accept, dated by the store', () => {
  it('review → accept stamps acceptedAt from the SDC clock; nothing before the accept does', async () => {
    const rr = 'rr-0001';
    expect(requirementResponseStore.get(rr)!.acceptedAt).toBeUndefined();
    const review = await commands.dispatch(BUYER, { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: rr, payload: {} });
    expect(review.status, review.reason).toBe('done');
    expect(requirementResponseStore.get(rr)!.acceptedAt).toBeUndefined();
    sdcClock.set('2026-09-02T09:00:00.000Z');
    const accept = await commands.dispatch(BUYER, { transitionId: 't_requirementresponse_accept', entity: 'requirementResponse', entityId: rr, payload: {} });
    expect(accept.status, accept.reason).toBe('done');
    expect(requirementResponseStore.get(rr)).toMatchObject({ status: 'Accepted', acceptedAt: '2026-09-02T09:00:00.000Z' });
  });

  it('an acceptedAt in the PAYLOAD does not stamp the receipt — the store does', async () => {
    const rr = 'rr-0001';
    await commands.dispatch(BUYER, { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: rr, payload: {} });
    await commands.dispatch(BUYER, { transitionId: 't_requirementresponse_accept', entity: 'requirementResponse', entityId: rr, payload: { acceptedAt: '2020-01-01T00:00:00.000Z' } });
    expect(requirementResponseStore.get(rr)!.acceptedAt).toBe(sdcClock.now());
  });
});

describe('operator ruling 3 — ONE open draft per grain, a second refused by name', () => {
  it('is on the open verb (the flow names it)', () => {
    expect(getTransition('t_publication_open')?.policyHooks).toContain(POLICY_HOOKS.PUB_ONE_OPEN_DRAFT);
  });

  it('KNOWN-BAD: a second month draft is refused naming the open one; KNOWN-GOOD: the other grain, and after a publish', async () => {
    const first = (await open()).entityId!;
    const second = await open();
    expect(second.status).toBe('failed');
    expect(second.reason).toMatch(new RegExp(`PUB_ONE_OPEN_DRAFT: ${first.replace(/[.]/g, '\\.')} is already open for the month grain`));
    // the week grain is its own
    const week = await open({ planVersion: 'PV-SIM-20261028', grain: 'week', horizon: ['2026-W36', '2026-W37'], sourceRef: 'somo-fixture@20261028' });
    expect(week.status, week.reason).toBe('done');
    // publish the month draft → a month draft may be opened again
    await fire(PLANNER, 't_publication_allocate', first, {
      materialCode: 'RM-EMUL-3320', periodBucket: '2026-09', supplierId: 'sup-002', forecastQty: 1000, forecastQtyRaw: '1000', basis: 'planner-split',
    });
    expect((await fire(PLANNER, 't_publication_publish', first)).status).toBe('done');
    expect((await open()).status).toBe('done');
  });
});

describe('operator ruling 4 — carried lines are basis "carried-forward", and only the carry mints it', () => {
  it('every carried line says it was carried; a re-split one says planner-split', async () => {
    const id = (await open({ carryForwardFrom: R2.publicationId })).entityId!;
    expect(new Set(forecastPublicationStore.get(id)!.lines.map((l) => l.allocation.basis))).toEqual(new Set(['carried-forward']));
    await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: 'RM-EMUL-3320', periodBucket: '2026-09', supplierId: 'sup-002', forecastQty: 2000, forecastQtyRaw: '2000', basis: 'planner-split',
    });
    expect(line(forecastPublicationStore.get(id) as unknown as ForecastPublication, 'sup-002', 'RM-EMUL-3320', '2026-09').allocation.basis).toBe('planner-split');
  });

  it('KNOWN-BAD: a planner’s allocate may not CLAIM carried-forward', async () => {
    const id = (await open()).entityId!;
    const r = await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: 'RM-EMUL-3320', periodBucket: '2026-09', supplierId: 'sup-002', forecastQty: 2000, forecastQtyRaw: '2000', basis: 'carried-forward',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PUB_BASIS_KNOWN: basis "carried-forward" is not one of planner-split \| quota \| award-history/);
  });
});

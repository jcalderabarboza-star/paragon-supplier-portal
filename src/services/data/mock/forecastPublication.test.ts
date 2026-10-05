// ────────────────────────────────────────────────────────────────────────────
// B4a · the forecast publication machine (Design 2 §2.1–§2.2, §10), on the REAL
// dispatcher and the REAL store. Every hook is probed both ways on the same
// draft: a known-good input passes before a known-bad refusal means anything.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { publicationVerbFor } from './publicationTarget';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { PUBLICATION_ALLOCATE_FIELDS, PUBLICATION_APPROVE_FIELDS, getTransition } from '../../transitions';
import {
  FORECAST_PUBLICATIONS,
  RESPONSE_DUE_DAYS,
  currentPublication,
  isResponseOverdue,
  sdcClock,
  type ForecastPublication,
} from '../../sdc';
import { SOMO_FIXTURE_EMISSION, SOMO_FIXTURE_PLAN_VERSION } from '../../planning/somoFixture';
import type { QueryScope } from '../types';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';

const commands = new MockCommandService();
const collab = new MockCollaborationService();

const seat = (roles: readonly SystemRoleId[], personId?: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(personId ? { actor: { kind: 'RESOLVED', person: { personId } } } : {}),
});
const BUYER = seat(PERSONA_SYSTEM_ROLES.buyer);
const PLANNER = seat(['planning']);
/** Roster members by ROLE, never by a spelled id (the namespace is policed). */
const personFor = (role: SystemRoleId, ordinal = 1) =>
  SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === ordinal)!.personId;
const PROCUREMENT_NAMED = seat(['procurement'], personFor('procurement'));
const PROCUREMENT_UNNAMED = seat(['procurement']);
const SUP002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const PV = 'PV-2026-08.2';
const OPEN = { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}` };

const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });
const open = async (payload: Record<string, unknown> = OPEN, scope: QueryScope = PLANNER) =>
  commands.dispatch(scope, { transitionId: 't_publication_open', entity: 'forecastPublication', payload });
const allocate = (id: string, supplierId: string, qty: number, over: Record<string, unknown> = {}, material = 'RM-EMUL-3310', bucket = '2026-08') =>
  fire(PLANNER, 't_publication_allocate', id, {
    materialCode: material,
    periodBucket: bucket,
    supplierId,
    forecastQty: qty,
    forecastQtyRaw: String(qty),
    basis: 'planner-split',
    ...over,
  });
const approve = (scope: QueryScope, id: string, supplierId: string, material = 'RM-EMUL-3310', bucket = '2026-08') =>
  fire(scope, 't_publication_approve_firm', id, { materialCode: material, periodBucket: bucket, supplierId });
const draft = (id: string) => forecastPublicationStore.get(id)!;

beforeEach(() => forecastPublicationStore.reset());

describe('the store is seeded from the fixture, and the seeds keep their objects', () => {
  it('the latest seed is Published, the earlier Superseded by it — the dates’ own verdict, now a state', () => {
    expect(forecastPublicationStore.all().map((r) => [r.publicationId, r.state, r.supersededBy ?? null])).toEqual([
      ['PUB-2026-08-RM', 'Superseded', 'PUB-2026-08-RM-R2'],
      ['PUB-2026-08-RM-R2', 'Published', null],
    ]);
  });

  it('readers get the SAME frozen objects the constant held — the move changes the source, not the answer', () => {
    const pubs = forecastPublicationStore.publications();
    expect(pubs).toHaveLength(FORECAST_PUBLICATIONS.length);
    for (const p of FORECAST_PUBLICATIONS) expect(pubs).toContain(p);
  });
});

describe('t_publication_open — a draft from a SOMO plan version', () => {
  it('KNOWN-GOOD: opens a Draft with a store-minted id, SOMO’s totals, and NO supplier split', async () => {
    const r = await open();
    expect(r.status, r.reason).toBe('done');
    // r2, not r1: the seeded PUB-2026-08-RM-R2 IS revision 1 of this plan version.
    expect(r.entityId).toBe('PUB-month-PV-2026-08.2-r2');
    const d = draft(r.entityId!);
    expect(d.state).toBe('Draft');
    expect(d.totals['RM-EMUL-3310|2026-08']).toBe(10000);
    expect(d.lines).toEqual([]);
  });

  it('opens from the generated fixture’s plan version too, with the generated demand as totals', async () => {
    const r = await open({ planVersion: SOMO_FIXTURE_PLAN_VERSION, grain: 'month', horizon: ['2026-08', '2026-09'], sourceRef: SOMO_FIXTURE_EMISSION });
    expect(r.status, r.reason).toBe('done');
    expect(draft(r.entityId!).totals['SIM-RM-0001|2026-08']).toBe(10750);
  });

  it.each([
    [{ horizon: ['2026-08', '2026-W36'] }, /PUB_HORIZON_ONE_GRAIN.*MIXED_GRAIN_IN_HORIZON/],
    [{ grain: 'week' }, /PUB_HORIZON_ONE_GRAIN: the horizon is month-grain but grain says week/],
    [{ planVersion: 'PV-NEVER' }, /PUB_PLANVERSION_KNOWN: SOMO has emitted no plan version "PV-NEVER"/],
    [{ sourceRef: 'somo-emission@PV-2026-08.1' }, /PUB_PLANVERSION_KNOWN: plan version PV-2026-08.2 arrived in somo-emission@PV-2026-08.2/],
  ])('KNOWN-BAD: %j is refused by name', async (over, reason) => {
    const r = await open({ ...OPEN, ...over });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(reason);
  });
});

describe('t_publication_allocate — the planner’s split, within SOMO’s total', () => {
  it('KNOWN-GOOD: splits within the total; the line takes the master’s unit and the period’s class', async () => {
    const id = (await open()).entityId!;
    expect((await allocate(id, 'sup-002', 6000)).status).toBe('done');
    expect((await allocate(id, 'sup-005', 4000)).status).toBe('done');
    expect(draft(id).lines.map((l) => [l.supplierId, l.forecastQty, l.uom, l.commitmentClass, l.allocation.materialPeriodTotal])).toEqual([
      ['sup-002', 6000, 'KG', 'firm', 10000],
      ['sup-005', 4000, 'KG', 'firm', 10000],
    ]);
    expect(draft(id).state).toBe('Draft');
  });

  it('Σ allocation > total is refused (integrity #4) — and a re-allocation replaces, it does not add', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 6000);
    const over = await allocate(id, 'sup-005', 4001);
    expect(over.status).toBe('failed');
    expect(over.reason).toMatch(/PUB_ALLOC_WITHIN_TOTAL: the suppliers would be allocated 10001 of RM-EMUL-3310 in 2026-08, above SOMO's total of 10000/);
    // sup-002 moving 6000 → 10000 is within the total: its OWN old share is not counted twice
    expect((await allocate(id, 'sup-002', 10000)).status).toBe('done');
  });

  it('a zero un-allocates the supplier — an absent line, never a zero line', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 6000);
    await allocate(id, 'sup-002', 0);
    expect(draft(id).lines).toEqual([]);
  });

  it.each([
    [{ periodBucket: '2026-12' }, /PUB_LINE_IN_HORIZON: "2026-12" is not in this publication's horizon/],
    [{ materialCode: 'RM-NEVER-0000' }, /PUB_MATERIAL_KNOWN/],
    [{ materialCode: 'SIM-RM-0001' }, /PUB_LINE_IN_HORIZON: SOMO gave no total for SIM-RM-0001 in 2026-08/],
    [{ forecastQty: -1, forecastQtyRaw: '-1' }, /PUB_QTY_FLOOR/],
    [{ forecastQtyRaw: '600' }, /PUB_QTY_AGREES: '600' reads as 600, but the command allocates 6000/],
    [{ forecastQtyRaw: '6.000' }, /PUB_QTY_AGREES: forecastQtyRaw is unreadable \(AMBIGUOUS_QTY\)/],
    [{ basis: 'gut-feel' }, /PUB_BASIS_KNOWN/],
  ])('KNOWN-BAD: %j is refused by name', async (over, reason) => {
    const id = (await open()).entityId!;
    const r = await allocate(id, 'sup-002', 6000, over);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(reason);
  });

  it('KNOWN-GOOD twin of the convention: "6.000" under a stated ID convention is six thousand', async () => {
    const id = (await open()).entityId!;
    expect((await allocate(id, 'sup-002', 6000, { forecastQtyRaw: '6.000', numberConvention: 'id' })).status).toBe('done');
  });
});

describe('t_publication_approve_firm — signed by procurement, not by the planner (segregation)', () => {
  const withFirmLine = async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 6000);
    return id;
  };

  it('approve by the PLANNING lane is refused — the planner splits, somebody else signs', async () => {
    const id = await withFirmLine();
    const r = await approve(seat(['planning'], personFor('planning')), id, 'sup-002');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(getTransition('t_publication_approve_firm')?.requiredRole).toBe('publication:approve');
  });

  it('approve by an UNATTRIBUTED procurement seat is refused (PUB_ACTOR_ATTRIBUTED)', async () => {
    const id = await withFirmLine();
    const r = await approve(PROCUREMENT_UNNAMED, id, 'sup-002');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PUB_ACTOR_ATTRIBUTED/);
  });

  it('KNOWN-GOOD: a SAMPLE procurement person is admitted, and the stamp carries the personId ONLY', async () => {
    const id = await withFirmLine();
    const r = await approve(PROCUREMENT_NAMED, id, 'sup-002');
    expect(r.status, r.reason).toBe('done');
    const a = draft(id).lines[0].allocation;
    expect(a.approvedBy).toBe(personFor('procurement'));
    expect(a.approvedAt).toBe(sdcClock.now());
  });

  it('an approver in the PAYLOAD is refused — attribution comes from the session', async () => {
    const id = await withFirmLine();
    const r = await fire(PROCUREMENT_NAMED, 't_publication_approve_firm', id, {
      materialCode: 'RM-EMUL-3310',
      periodBucket: '2026-08',
      supplierId: 'sup-002',
      approvedBy: personFor('procurement', 2),
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ACTOR_IN_PAYLOAD/);
  });

  it('a semi-firm line is not signed (PUB_LINE_IS_FIRM) — and a changed split drops its signature', async () => {
    const id = await withFirmLine();
    await allocate(id, 'sup-002', 2000, {}, 'RM-EMUL-3320', '2026-09');
    const semi = await approve(PROCUREMENT_NAMED, id, 'sup-002', 'RM-EMUL-3320', '2026-09');
    expect(semi.reason).toMatch(/PUB_LINE_IS_FIRM: the line is semi-firm/);
    await approve(PROCUREMENT_NAMED, id, 'sup-002');
    await allocate(id, 'sup-002', 5000);
    expect(draft(id).lines.find((l) => l.periodBucket === '2026-08')?.allocation.approvedBy).toBeUndefined();
  });
});

describe('t_publication_publish — the gates, the stamps, and the supersede cascade', () => {
  it('an empty draft is refused (PUB_HAS_LINES)', async () => {
    const id = (await open()).entityId!;
    const r = await fire(PLANNER, 't_publication_publish', id);
    expect(r.reason).toMatch(/PUB_HAS_LINES/);
  });

  it('an unapproved firm line blocks publish, BY NAME', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 6000);
    const r = await fire(PLANNER, 't_publication_publish', id);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PUB_FIRM_LINES_APPROVED: firm lines awaiting approval — RM-EMUL-3310 2026-08 sup-002/);
    expect(draft(id).state).toBe('Draft');
  });

  it('publish stamps publishedAt and responseDueAt, and SUPERSEDES the previous publication of the grain', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 6000);
    await approve(PROCUREMENT_NAMED, id, 'sup-002');
    const r = await fire(PLANNER, 't_publication_publish', id);
    expect(r.status, r.reason).toBe('done');
    const now = sdcClock.now();
    expect(draft(id)).toMatchObject({
      state: 'Published',
      publishedAt: now,
      responseDueAt: new Date(Date.parse(now) + RESPONSE_DUE_DAYS * 86_400_000).toISOString(),
    });
    // the cascade: R2 is retired BY this publication, and R1 was already retired
    expect(draft('PUB-2026-08-RM-R2')).toMatchObject({ state: 'Superseded', supersededBy: id });
    const sup = commandAuditSink.byEvent('t_publication_supersede').filter((e) => e.causationId === r.correlationId);
    expect(sup.length).toBeGreaterThanOrEqual(1);
    // and every reader's "current" is the new one
    expect(currentPublication(forecastPublicationStore.publications(), 'month')?.publicationId).toBe(id);
  });

  it('overdue is DERIVED at read from the stamped deadline — never stored', () => {
    const pub = { publishedAt: '2026-08-01T00:00:00.000Z', responseDueAt: '2026-09-10T00:00:00.000Z' } as Pick<
      ForecastPublication,
      'publishedAt' | 'responseDueAt'
    >;
    expect(isResponseOverdue(pub, '2026-09-09T23:59:59.000Z')).toBe(false);
    expect(isResponseOverdue(pub, '2026-09-10T00:00:01.000Z')).toBe(true);
    // ⚠️ RE-PINNED BY SDC-2 (R-SDC P0 #3). This line read
    // `expect(isResponseOverdue({}, '2030-…')).toBe(false)` — "no stamp, never overdue". That rule
    // is what made the supplier read "No deadline set" while the buyer's chase read the SAME plan
    // as overdue. A plan without a stamp is due by the policy the stamp is written from
    // (`publishedAt + RESPONSE_DUE_DAYS`) — pinned both sides of the instant, as the stamp is.
    const unstamped = { publishedAt: '2026-09-01T00:00:00.000Z' };
    expect(isResponseOverdue(unstamped, '2026-09-07T23:59:59.000Z')).toBe(false);
    expect(isResponseOverdue(unstamped, '2026-09-08T00:00:01.000Z')).toBe(true);
  });
});

describe('t_publication_withdraw — taken back, with the reason on the record', () => {
  it('a blank reason is refused; a stated one withdraws, and the publication leaves every reader', async () => {
    const blank = await fire(PLANNER, 't_publication_withdraw', 'PUB-2026-08-RM-R2', { reason: '   ' });
    expect(blank.reason).toMatch(/PUB_TEXT_AUTHORED/);
    const r = await fire(PLANNER, 't_publication_withdraw', 'PUB-2026-08-RM-R2', { reason: 'SOMO re-ran the plan' });
    expect(r.status, r.reason).toBe('done');
    expect(draft('PUB-2026-08-RM-R2')).toMatchObject({ state: 'Withdrawn', withdrawnReason: 'SOMO re-ran the plan' });
    expect(forecastPublicationStore.publications().map((p) => p.publicationId)).not.toContain('PUB-2026-08-RM-R2');
  });
});

describe('a supplier never acts on a publication', () => {
  it('a supplier scope is denied at SCOPE, before the role gate', async () => {
    await expect(fire(SUP002, 't_publication_withdraw', 'PUB-2026-08-RM-R2', { reason: 'mine' })).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });
});

describe('publication visibility (Design 2 §10) — FLAG-2 is structural', () => {
  it('KNOWN-BAD: a SIMULATED publication is absent from the supplier’s read', async () => {
    const page = await collab.getPublications(SUP002);
    expect(page).toEqual({ items: [], sample: false });
  });

  it('KNOWN-GOOD: a LIVE publication is present — with the supplier’s OWN lines only', async () => {
    const seed = FORECAST_PUBLICATIONS[1];
    forecastPublicationStore.put({
      ...forecastPublicationStore.get(seed.publicationId)!,
      publicationId: 'PUB-TEST-LIVE',
      seed: undefined,
      publishedAt: '2026-08-20T00:00:00.000Z',
      provenance: { ...seed.provenance, liveness: 'LIVE' },
    });
    const page = await collab.getPublications(SUP002, { includeSimulatedSample: true });
    expect(page.sample).toBe(false);
    expect(page.items.map((p) => p.publicationId)).toEqual(['PUB-TEST-LIVE']);
    expect(new Set(page.items[0].lines.map((l) => l.supplierId))).toEqual(new Set(['sup-002']));
    // CONTROL: the unfiltered publication DOES carry another supplier's lines
    expect(seed.lines.some((l) => l.supplierId !== 'sup-002')).toBe(true);
  });

  it('the sample is reached ONLY through includeSimulatedSample — and the page says it is the sample', async () => {
    const page = await collab.getPublications(SUP002, { includeSimulatedSample: true });
    expect(page.sample).toBe(true);
    expect(page.items.map((p) => p.publicationId).sort()).toEqual(['PUB-2026-08-RM', 'PUB-2026-08-RM-R2']);
    for (const p of page.items) for (const l of p.lines) expect(l.supplierId).toBe('sup-002');
  });

  it('the buyer reads every published publication, unfiltered', async () => {
    const page = await collab.getPublications(BUYER);
    expect(page.sample).toBe(false);
    expect(page.items).toEqual(forecastPublicationStore.publications());
  });
});

describe('the supplier hook no longer imports the fixture (source scan, probed both ways)', () => {
  const SRC = join(__dirname, '..', '..', '..');
  // The matcher is an IMPORT STATEMENT (`import { … FORECAST_PUBLICATIONS … } from`),
  // which prose cannot form, so the raw source is scanned — no comment strip.
  const code = (rel: string) => readFileSync(join(SRC, ...rel.split('/')), 'utf8');
  const importsFixture = (rel: string) =>
    /import\s*\{[^}]*\bFORECAST_PUBLICATIONS\b[^}]*\}\s*from/.test(code(rel));

  it('sdcSupplierHooks imports no FORECAST_PUBLICATIONS, and reads through getPublications with the named opt-in', () => {
    expect(importsFixture('services/query/sdcSupplierHooks.ts')).toBe(false);
    expect(code('services/query/sdcSupplierHooks.ts')).toMatch(/getPublications\(scope, \{ includeSimulatedSample: true \}\)/);
  });

  // B4b · the two buyer pages that still imported the constant at B4a read the
  // service now, so the control that named one of them as "where the import
  // really is" lost its premise. It moves to the ONE module whose job is to
  // import the constant — the store it seeds — and must still FIND it there.
  it('B4b · BuyerCollaboration and BuyerChannelTriage import no FORECAST_PUBLICATIONS, and read usePublications', () => {
    for (const page of ['pages-v2/BuyerCollaboration.tsx', 'pages-v2/BuyerChannelTriage.tsx']) {
      expect(importsFixture(page), page).toBe(false);
      expect(code(page), page).toMatch(/\busePublications\(\)/);
    }
  });

  it('CONTROL: the same matcher FINDS the import where it really is — the store the constant seeds', () => {
    expect(importsFixture('services/data/mock/stores/forecastPublicationStore.ts')).toBe(true);
  });
});

describe('allocate and approve are told apart by the field only allocate requires', () => {
  it('the field sets are disjoint on `forecastQty`, and the discriminator reads it', () => {
    expect(PUBLICATION_ALLOCATE_FIELDS).toContain('forecastQty');
    expect(PUBLICATION_APPROVE_FIELDS).not.toContain('forecastQty');
    expect(publicationVerbFor('Draft', { forecastQty: 1 })).toBe('allocate');
    expect(publicationVerbFor('Draft', { materialCode: 'x' })).toBe('approve');
    expect(publicationVerbFor('Published', { forecastQty: 1 })).toBeNull();
  });
});

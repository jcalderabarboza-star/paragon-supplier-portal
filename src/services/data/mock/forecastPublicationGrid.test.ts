// ────────────────────────────────────────────────────────────────────────────
// B4b-1 · publish from the grid (Design 2 §2.3, §10; Design 1 §5.3), on the REAL
// dispatcher and the REAL store: the two hooks B4a left out, the carry-forward
// a revision starts from, the ledger, the buyer-only workspace, and the planning
// seam anchoring the open draft's split. Every hook is probed both ways on the
// same draft — a known-good input passes before a refusal means anything.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { derivePlanningFacts } from './planningFacts';
import { collaboratingSuppliers } from './publicationFeed';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import {
  carriedLines,
  publishBlockers,
  sdcClock,
  type ForecastLine,
} from '../../sdc';
import { allocationAnchor, parseAllocationAnchor } from '../../planning/allocationAnchor';
import { suppliersFor } from '../../planning/somoFixture';
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
// E2E-1 — publishing, discarding and withdrawing need a named person (PUBLICATION_ACTOR_NAMED).
const PLANNER_NAMED = seat(['planning'], personFor('planning'));
const PROCUREMENT_NAMED = seat(['procurement'], personFor('procurement'));
const BUYER = seat(PERSONA_SYSTEM_ROLES.buyer);
const SUP007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const PV = 'PV-2026-08.2';
const OPEN = { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}` };
const CURRENT = 'PUB-2026-08-RM-R2';

const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });
const open = (over: Record<string, unknown> = {}, scope: QueryScope = PLANNER) =>
  commands.dispatch(scope, { transitionId: 't_publication_open', entity: 'forecastPublication', payload: { ...OPEN, ...over } });
const allocate = (id: string, supplierId: string, qty: number, material = 'RM-EMUL-3310', bucket = '2026-08') =>
  fire(PLANNER, 't_publication_allocate', id, {
    materialCode: material,
    periodBucket: bucket,
    supplierId,
    forecastQty: qty,
    forecastQtyRaw: String(qty),
    basis: 'planner-split',
  });
const doc = (id: string) => forecastPublicationStore.get(id)!;
const key = (l: ForecastLine) => `${l.supplierId}|${l.materialCode}|${l.periodBucket}`;

beforeEach(() => forecastPublicationStore.reset());

describe('PUB_SUPPLIER_COLLABORATED — a split goes only to a supplier who already works the material', () => {
  it('is on the allocate verb (the flow names it)', () => {
    expect(getTransition('t_publication_allocate')?.policyHooks).toContain(POLICY_HOOKS.PUB_SUPPLIER_COLLABORATED);
  });

  it.each([
    ['a relationship row', 'sup-002', 'RM-EMUL-3310', '2026-08', 5000],
    ['a prior publication line only (no relationship row)', 'sup-002', 'RM-EMUL-3320', '2026-09', 2000],
  ])('KNOWN-GOOD: %s admits the pair', async (_why, sup, code, bucket, qty) => {
    const id = (await open()).entityId!;
    const r = await allocate(id, sup, qty, code, bucket);
    expect(r.status, r.reason).toBe('done');
  });

  it('KNOWN-GOOD: a synthetic material’s generated sourcing admits its supplier', async () => {
    const id = (await open({ planVersion: 'PV-SIM-20261028', horizon: ['2026-08', '2026-09'], sourceRef: 'somo-fixture@20261028' })).entityId!;
    const sup = suppliersFor('SIM-RM-0001')[0];
    const total = doc(id).totals['SIM-RM-0001|2026-08'];
    const r = await allocate(id, sup, total, 'SIM-RM-0001', '2026-08');
    expect(r.status, r.reason).toBe('done');
  });

  it('KNOWN-BAD: a NEW pairing is refused BY NAME', async () => {
    const id = (await open()).entityId!;
    // CONTROL: sup-007 is a real, collaborating supplier — just not on this material.
    expect(collaboratingSuppliers('PK-PETB-8810').has('sup-007')).toBe(true);
    expect(collaboratingSuppliers('RM-EMUL-3310').has('sup-007')).toBe(false);
    const r = await allocate(id, 'sup-007', 100);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(
      /PUB_SUPPLIER_COLLABORATED: sup-007 has no relationship with RM-EMUL-3310 and has never been allocated it/,
    );
    expect(doc(id).lines).toEqual([]);
  });
});

describe('PUB_CLASS_PROJECTION_PRESENT — every published line carries a class from the vocabulary', () => {
  it('is on the publish verb (the flow names it)', () => {
    expect(getTransition('t_publication_publish')?.policyHooks).toContain(POLICY_HOOKS.PUB_CLASS_PROJECTION_PRESENT);
  });

  it('KNOWN-GOOD: a draft whose lines all carry a class publishes', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 2000, 'RM-EMUL-3320', '2026-09');
    const r = await fire(PLANNER_NAMED, 't_publication_publish', id);
    expect(r.status, r.reason).toBe('done');
  });

  it('KNOWN-BAD: a line without a class is refused BY NAME, and the draft stays a draft', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 2000, 'RM-EMUL-3320', '2026-09');
    const d = doc(id);
    // The one way a classless line can exist is a store write that skipped the
    // target — which is exactly the case the gate is for.
    forecastPublicationStore.put({
      ...d,
      lines: d.lines.map((l) => ({ ...l, commitmentClass: undefined as unknown as ForecastLine['commitmentClass'] })),
    });
    const r = await fire(PLANNER_NAMED, 't_publication_publish', id);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PUB_CLASS_PROJECTION_PRESENT: lines without a commitment class — RM-EMUL-3320 2026-09 sup-002/);
    expect(doc(id).state).toBe('Draft');
  });
});

describe('PUB_CARRY_FROM_CURRENT — a revision starts from the CURRENT publication’s split', () => {
  it('KNOWN-GOOD: carried lines keep quantity and class, lose their signature, and take the new total', async () => {
    const r = await open({ carryForwardFrom: CURRENT });
    expect(r.status, r.reason).toBe('done');
    const d = doc(r.entityId!);
    const prior = doc(CURRENT).lines;
    expect(d.carriedFrom).toBe(CURRENT);
    expect(d.lines.map((l) => [key(l), l.forecastQty, l.commitmentClass])).toEqual(
      prior.map((l) => [key(l), l.forecastQty, l.commitmentClass]),
    );
    // CONTROL: the prior firm lines WERE signed; the carried ones are not.
    expect(prior.filter((l) => l.commitmentClass === 'firm').every((l) => l.allocation.approvedBy)).toBe(true);
    expect(d.lines.some((l) => l.allocation.approvedBy || l.allocation.approvedAt)).toBe(false);
  });

  it('KNOWN-GOOD twin: without a carry the split starts empty (B4a unchanged)', async () => {
    expect(doc((await open()).entityId!).lines).toEqual([]);
  });

  it.each([
    ['PUB-2026-08-RM', /PUB_CARRY_FROM_CURRENT: "PUB-2026-08-RM" is not the current published month publication \(PUB-2026-08-RM-R2 is\)/],
    ['PUB-NEVER', /PUB_CARRY_FROM_CURRENT: "PUB-NEVER" is not the current published month publication/],
  ])('KNOWN-BAD: carrying from %s is refused by name', async (from, reason) => {
    const r = await open({ carryForwardFrom: from });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(reason);
  });

  it('a material-period whose carried split would exceed the NEW total is not carried at all', () => {
    const line = (sup: string, qty: number): ForecastLine => ({
      materialCode: 'RM-EMUL-3310',
      supplierId: sup,
      periodBucket: '2026-08',
      forecastQty: qty,
      uom: 'KG',
      commitmentClass: 'firm',
      allocation: { materialPeriodTotal: 10000, basis: 'planner-split' },
      provenance: { source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' },
    });
    const prev = [line('sup-002', 6000), line('sup-005', 3500)];
    expect(carriedLines(prev, ['2026-08'], { 'RM-EMUL-3310|2026-08': 9500 }).map((l) => l.supplierId)).toEqual(['sup-002', 'sup-005']);
    expect(carriedLines(prev, ['2026-08'], { 'RM-EMUL-3310|2026-08': 9499 })).toEqual([]);
    expect(carriedLines(prev, ['2026-09'], { 'RM-EMUL-3310|2026-08': 10000 })).toEqual([]);
  });
});

describe('publishBlockers — the panel asks the hooks’ own predicates', () => {
  it('names each blocker kind, and an all-good split has none', async () => {
    const id = (await open({ carryForwardFrom: CURRENT })).entityId!;
    const kinds = publishBlockers(doc(id).lines).map((b) => b.kind);
    expect(kinds).toEqual(['UNSIGNED_FIRM']);
    expect(publishBlockers([]).map((b) => b.kind)).toEqual(['NO_LINES']);
    // Sign every firm line → nothing blocks, and the dispatcher agrees.
    for (const l of doc(id).lines.filter((x) => x.commitmentClass === 'firm')) {
      const s = await fire(PROCUREMENT_NAMED, 't_publication_approve_firm', id, {
        materialCode: l.materialCode,
        periodBucket: l.periodBucket,
        supplierId: l.supplierId,
      });
      expect(s.status, s.reason).toBe('done');
    }
    expect(publishBlockers(doc(id).lines)).toEqual([]);
    expect((await fire(PLANNER_NAMED, 't_publication_publish', id)).status).toBe('done');
  });
});

describe('the ledger — opened, published, superseded, withdrawn; the verb and the person, never a stored role', () => {
  it('seeds say they are seeds and name nobody', () => {
    expect(doc(CURRENT).ledger).toEqual([
      { verb: 't_publication_publish', at: '2026-08-15T00:00:00.000Z', seq: 3, personId: null, seeded: true },
    ]);
    // R1's supersede was caused by R2's publish (seq 3), so it comes after it
    expect(doc('PUB-2026-08-RM').ledger.map((e) => [e.verb, e.seq])).toEqual([
      ['t_publication_publish', 1],
      ['t_publication_supersede', 4],
    ]);
  });

  it('a revision records open → publish with the seat’s person, and the superseded one records the cascade with nobody', async () => {
    const id = (await open({ carryForwardFrom: CURRENT }, PLANNER_NAMED)).entityId!;
    for (const l of doc(id).lines.filter((x) => x.commitmentClass === 'firm')) {
      await fire(PROCUREMENT_NAMED, 't_publication_approve_firm', id, {
        materialCode: l.materialCode,
        periodBucket: l.periodBucket,
        supplierId: l.supplierId,
      });
    }
    const pub = await fire(PLANNER_NAMED, 't_publication_publish', id);
    expect(pub.status, pub.reason).toBe('done');
    const now = sdcClock.now();
    expect(doc(id).ledger).toEqual([
      { verb: 't_publication_open', at: now, seq: 5, personId: personFor('planning') },
      { verb: 't_publication_publish', at: now, seq: 6, personId: personFor('planning') },
    ]);
    // the cascade is recorded AFTER the publish that caused it, at the same instant
    expect(doc(CURRENT).ledger[doc(CURRENT).ledger.length - 1]).toEqual({ verb: 't_publication_supersede', at: now, seq: 7, personId: null });
  });

  it('the sequence restarts with the store — `reset` is test isolation, not history', async () => {
    await open();
    forecastPublicationStore.reset();
    expect(forecastPublicationStore.nextSeq()).toBe(5);
  });

  it('an UNATTRIBUTED seat’s act is recorded with no person — never a guessed one', async () => {
    const id = (await open()).entityId!;
    expect(doc(id).ledger).toEqual([{ verb: 't_publication_open', at: sdcClock.now(), seq: 5, personId: null }]);
  });

  it('a withdrawal records its reason', async () => {
    // E2E-1 — publishing, discarding and withdrawing need a named person (PUBLICATION_ACTOR_NAMED).
    // This case withdrew from a seat that named nobody and pinned `personId: null`. That
    // seat is now refused BY NAME and the record is untouched; the named seat's withdrawal
    // records its reason AND the person.
    const before = doc(CURRENT);
    const unnamed = await fire(PLANNER, 't_publication_withdraw', CURRENT, { reason: 'SOMO re-ran the plan' });
    expect(unnamed.status).toBe('failed');
    expect(unnamed.reason).toContain('PUBLICATION_ACTOR_UNATTRIBUTED');
    expect(doc(CURRENT).state).toBe('Published');
    expect(doc(CURRENT).ledger).toEqual(before.ledger);
    const named = await fire(PLANNER_NAMED, 't_publication_withdraw', CURRENT, { reason: 'SOMO re-ran the plan' });
    expect(named.status, named.reason).toBe('done');
    expect(doc(CURRENT).ledger[doc(CURRENT).ledger.length - 1]).toEqual({
      verb: 't_publication_withdraw',
      at: sdcClock.now(),
      seq: 5,
      personId: personFor('planning'),
      reason: 'SOMO re-ran the plan',
    });
  });
});

describe('getPublicationWorkspace — buyer-only: drafts, ledgers, and what a draft may be opened from', () => {
  it('KNOWN-GOOD: the buyer reads every record, a Draft included, and the offers at both grains', async () => {
    const id = (await open()).entityId!;
    const ws = await collab.getPublicationWorkspace(BUYER);
    expect(ws.records.map((r) => [r.publicationId, r.state])).toEqual([
      ['PUB-2026-08-RM', 'Superseded'],
      [CURRENT, 'Published'],
      [id, 'Draft'],
    ]);
    // the seed OBJECT does not leave the store; the document does
    expect(ws.records.some((r) => 'seed' in r)).toBe(false);
    expect(ws.offers.filter((o) => o.grain === 'month').map((o) => o.planVersion)).toEqual([
      'PV-2026-08.1',
      'PV-2026-08.2',
      'PV-SIM-20261028',
    ]);
    // the seeds are monthly: at week grain only the generated fixture is on offer
    expect(ws.offers.filter((o) => o.grain === 'week').map((o) => o.planVersion)).toEqual(['PV-SIM-20261028']);
  });

  it('KNOWN-BAD: a supplier reads an empty workspace — a draft is not a publication', async () => {
    await open();
    expect(await collab.getPublicationWorkspace(SUP007)).toEqual({ records: [], offers: [] });
  });
});

describe('the planning seam anchors the OPEN DRAFT’s split (Design 1 §5.3)', () => {
  const facts = (codes: string[]) => {
    const out = derivePlanningFacts({ horizon: ['2026-08', '2026-09', '2026-10'], measures: ['allocation'], materialCodes: codes });
    if (!out.ok) throw new Error('refused');
    return out.facts;
  };

  it('CONTROL: with no draft open, no allocation fact carries an edit anchor', () => {
    const f = facts(['RM-EMUL-3310']);
    expect(f.length).toBeGreaterThan(0);
    expect(f.some((x) => x.editAnchor)).toBe(false);
  });

  it('with a draft open, each collaborating supplier has ONE planned allocation fact, anchored; the published one is not also emitted', async () => {
    const id = (await open()).entityId!;
    await allocate(id, 'sup-002', 5000);
    const f = facts(['RM-EMUL-3310']).filter((x) => x.periodBucket === '2026-08');
    expect(f.map((x) => [x.supplierId, x.value, x.provenance.planState, x.sourceRef])).toEqual([
      ['sup-002', 5000, 'planned', id],
      // a collaborator with no line reads "no figure", never 0
      ['sup-005', null, 'planned', id],
    ]);
    const anchor = parseAllocationAnchor(f[0].editAnchor!);
    expect(anchor).toEqual({ publicationId: id, supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', periodBucket: '2026-08' });
    expect(f[1].editAnchor).toBe(allocationAnchor({ publicationId: id, supplierId: 'sup-005', materialCode: 'RM-EMUL-3310', periodBucket: '2026-08' }));
  });

  it('parseAllocationAnchor refuses what is not an anchor', () => {
    expect(parseAllocationAnchor('pil-somo-SIM-RM-0001@2026-08')).toBeNull();
    expect(parseAllocationAnchor('alloc::a::b::c')).toBeNull();
    expect(parseAllocationAnchor('alloc::a::::c::d')).toBeNull();
  });
});

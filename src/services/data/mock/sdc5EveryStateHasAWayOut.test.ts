// ────────────────────────────────────────────────────────────────────────────
// SDC-5 · EVERY STATE HAS A WAY OUT (R-SDC P1). On the REAL dispatcher, the REAL
// stores and the REAL services.
//
// Measured on `main` @ 8678c4a:
//  · a line published on a generated sample material (SIM-PM-0002 · 2026-W36 ·
//    5 000 PCS to sup-002) reached the supplier and could not be answered —
//    `t_requirementresponse_submit` refused `UNKNOWN_MATERIAL`, because the plan
//    was split in the planning master and the answer was checked against the
//    real entries alone;
//  · a draft publication had ONE exit, publish, and `PUB_ONE_OPEN_DRAFT` refuses
//    a second draft of the grain — a wrong draft blocked the grain for good;
//  · a to-paragon leg's declared state never leaves Booked/Shipped by the
//    supplier's hand (the ASN tracks it), so coverage counted a delivery Paragon
//    had already received as "incoming" for good.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockCollaborationService } from './MockCollaborationService';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { asnStore } from './stores/asnStore';
import { planVersionOffers } from './publicationFeed';
import { legsStillIncoming } from './incomingLegs';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { getKnownFlows } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import {
  MATERIAL_MASTER,
  buildRequirementResponsePayload,
  isKnownMaterial,
  stillIncoming,
  type IncomingShipment,
  type IncomingShipmentView,
} from '../../sdc';
import {
  isSampleMaterial,
  publishedLabelOf,
  publishedMaterialMaster,
  publishedUomOf,
} from '../../planning/publishedMaterial';
import { DataError, type QueryScope } from '../types';

const commands = new MockCommandService();
const collab = new MockCollaborationService();

const personOf = (role: SystemRoleId) => SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId;
const seat = (roles: readonly SystemRoleId[], role?: SystemRoleId): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  ...(role ? { actor: { kind: 'RESOLVED', person: { personId: personOf(role) } } } : {}),
});
const PLANNER = seat(['planning'], 'planning');
const PROCUREMENT = seat(['procurement'], 'procurement');
const BUYER_NAMED = seat(PERSONA_SYSTEM_ROLES.buyer, 'procurement');
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
});

const SIM = 'SIM-PM-0002';
const fire = (scope: QueryScope, transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  commands.dispatch(scope, { transitionId, entity: 'forecastPublication', entityId, payload });

async function openWeeklyDraft(): Promise<string> {
  const offer = planVersionOffers('week')[0];
  const opened = await commands.dispatch(PLANNER, {
    transitionId: 't_publication_open',
    entity: 'forecastPublication',
    payload: { planVersion: offer.planVersion, grain: 'week', horizon: offer.horizon, sourceRef: offer.sourceRef },
  });
  expect(opened.status, opened.reason).toBe('done');
  return opened.entityId!;
}

/** R-SDC e13: one weekly line on a generated material, signed, published. */
async function publishOneSampleLine(): Promise<string> {
  const id = await openWeeklyDraft();
  const split = await fire(PLANNER, 't_publication_allocate', id, {
    materialCode: SIM,
    periodBucket: '2026-W36',
    supplierId: 'sup-002',
    forecastQty: 5000,
    forecastQtyRaw: '5000',
    basis: 'planner-split',
  });
  expect(split.status, split.reason).toBe('done');
  const signed = await fire(PROCUREMENT, 't_publication_approve_firm', id, {
    materialCode: SIM,
    periodBucket: '2026-W36',
    supplierId: 'sup-002',
  });
  expect(signed.status, signed.reason).toBe('done');
  const published = await fire(PLANNER, 't_publication_publish', id);
  expect(published.status, published.reason).toBe('done');
  return id;
}

beforeEach(() => {
  forecastPublicationStore.reset();
  requirementResponseStore.reset();
  inventoryDeclarationStore.reset();
  incomingShipmentStore.reset();
  asnStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · a published sample material resolves in the master it was published from', () => {
  it('⚠️ the real master is UNTOUCHED — it names no generated material, and the published master names both kinds', () => {
    // The real entries still do not hold the code: every other consumer of the
    // master (receipt gate, halal registry, document lane) sees what it saw.
    expect(isKnownMaterial(SIM)).toBe(false);
    expect(Object.keys(MATERIAL_MASTER).filter(isSampleMaterial)).toEqual([]);
    // …and the master a line is published from names it, beside a real one.
    expect(isKnownMaterial(SIM, publishedMaterialMaster())).toBe(true);
    expect(isKnownMaterial('PK-PETB-8810', publishedMaterialMaster())).toBe(true);
    expect(publishedLabelOf(SIM)).toBe('Sample packaging 0002');
    expect(publishedUomOf(SIM)).toEqual({ ok: true, uom: 'PCS' });
    expect(publishedLabelOf('PK-PETB-8810')).toBe(MATERIAL_MASTER['PK-PETB-8810'].label);
  });

  it('⚠️ SAMPLE IS MEMBERSHIP, NOT THE PREFIX — an invented `SIM-` code is neither sample nor known', () => {
    expect(isSampleMaterial(SIM)).toBe(true);
    expect(isSampleMaterial('PK-PETB-8810')).toBe(false);
    // A prefix test would say yes to all three of these.
    for (const invented of ['SIM-PM-9999', 'SIM-XX-0002', 'SIM-']) {
      expect(isSampleMaterial(invented), invented).toBe(false);
      expect(isKnownMaterial(invented, publishedMaterialMaster()), invented).toBe(false);
      expect(publishedUomOf(invented)).toEqual({ ok: false, reason: 'UNKNOWN_MATERIAL', materialCode: invented });
    }
  });
});

describe('SDC-5 · a supplier answers a published sample line, end to end', () => {
  it('⚠️ submit → send → review → accept all land, and the answer carries the sample material’s own unit', async () => {
    const pubId = await publishOneSampleLine();
    const pub = forecastPublicationStore.publications().find((p) => p.publicationId === pubId)!;
    const line = pub.lines.find((l) => l.materialCode === SIM)!;
    expect(line.uom).toBe('PCS');
    const sup = supplier('sup-002');

    const made = await commands.dispatch(sup, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: buildRequirementResponsePayload(pub, line, 'sup-002', { confirmedQty: 5000, confirmedQtyRaw: '5000' }),
    });
    // On main this was `failed` · POLICY_REJECTED:sdc_material_known:UNKNOWN_MATERIAL.
    expect(made.status, made.reason).toBe('done');
    const id = made.entityId!;
    expect(requirementResponseStore.get(id)).toMatchObject({
      supplierId: 'sup-002',
      materialCode: SIM,
      periodBucket: '2026-W36',
      status: 'Draft',
      forecastConfirmation: { confirmedQty: 5000, uom: 'PCS' },
    });

    const act = (scope: QueryScope, transitionId: string) =>
      commands.dispatch(scope, { transitionId, entity: 'requirementResponse', entityId: id, payload: {} });
    expect((await act(sup, 't_requirementresponse_promote')).status).toBe('done');
    expect((await act(BUYER_NAMED, 't_requirementresponse_review')).status).toBe('done');
    const accepted = await act(BUYER_NAMED, 't_requirementresponse_accept');
    expect(accepted.status, accepted.reason).toBe('done');
    expect(requirementResponseStore.get(id)!.status).toBe('Accepted');

    // The buyer's consolidation joins the line to the answer it was given.
    const row = (await collab.getConsolidation(seat(PERSONA_SYSTEM_ROLES.buyer))).items.find(
      (r) => r.line.materialCode === SIM,
    )!;
    expect(row.state).toMatchObject({ kind: 'confirmed-full', response: { id, status: 'Accepted' } });
  });

  it('…and the same supplier can declare stock of it, in its own unit', async () => {
    await publishOneSampleLine();
    const declared = await commands.dispatch(supplier('sup-002'), {
      transitionId: 't_inventorydeclaration_declare',
      entity: 'inventoryDeclaration',
      payload: { supplierId: 'sup-002', materialCode: SIM, totalQty: 1200, totalQtyRaw: '1200' },
    });
    expect(declared.status, declared.reason).toBe('done');
    expect(inventoryDeclarationStore.get(declared.entityId!)).toMatchObject({ materialCode: SIM, totalQty: 1200, uom: 'PCS' });
  });

  it('⚠️ THE REFUSAL SURVIVES — a code NEITHER master names is still refused by name', async () => {
    // Reach the hook past creation scope: publish the line, then answer it under
    // a payload naming a code no master holds is denied at SCOPE (no such line),
    // so the hook's own refusal is asked through a line that DOES exist in the
    // store but names an unknown code.
    const pubId = await publishOneSampleLine();
    const record = forecastPublicationStore.get(pubId)!;
    const ghost = { ...record.lines[0], materialCode: 'SIM-PM-9999' };
    forecastPublicationStore.put({ ...record, lines: Object.freeze([...record.lines, Object.freeze(ghost)]) });
    const pub = forecastPublicationStore.publications().find((p) => p.publicationId === pubId)!;
    const r = await commands.dispatch(supplier('sup-002'), {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: buildRequirementResponsePayload(pub, ghost, 'sup-002', { confirmedQty: 10, confirmedQtyRaw: '10' }),
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^POLICY_REJECTED:sdc_material_known:UNKNOWN_MATERIAL: 'SIM-PM-9999'/);
    expect(requirementResponseStore.all().some((x) => x.materialCode === 'SIM-PM-9999')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · a draft publication can be discarded', () => {
  const flow = getKnownFlows().find((f) => f.entity === 'forecastPublication')!;

  it('the machine: Draft has TWO user exits, and Discarded is an ending', () => {
    const exits = flow.transitions
      .filter((t) => t.from.includes('Draft') && t.to !== 'Draft')
      .map((t) => `${t.id}→${t.to}`)
      .sort();
    expect(exits).toEqual(['t_publication_discard→Discarded', 't_publication_publish→Published']);
    expect(flow.terminals).toContain('Discarded');
    const discard = flow.transitions.find((t) => t.id === 't_publication_discard')!;
    // E2E-1 — publishing, discarding and withdrawing need a named person (PUBLICATION_ACTOR_NAMED).
    // The opener's own atom, nothing to fill, and ONE thing that can refuse it: a seat
    // that names nobody (this read `[]` — "nothing that can refuse it" — until E2E-1).
    expect([discard.requiredRole, discard.requiredFields, discard.policyHooks, discard.trigger]).toEqual([
      'publication:draft',
      [],
      [POLICY_HOOKS.PUBLICATION_ACTOR_NAMED],
      'user',
    ]);
  });

  it('⚠️ THE DEFECT, THEN THE WAY OUT — a second draft is refused until the first is discarded', async () => {
    const first = await openWeeklyDraft();
    const offer = planVersionOffers('week')[0];
    const again = () =>
      commands.dispatch(PLANNER, {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: offer.planVersion, grain: 'week', horizon: offer.horizon, sourceRef: offer.sourceRef },
      });
    // CONTROL — the block is real while the draft stands.
    const blocked = await again();
    expect(blocked.status).toBe('failed');
    expect(blocked.reason).toContain('POLICY_REJECTED:pub_one_open_draft');
    expect(blocked.reason).toContain('publish it or discard it');

    const discarded = await fire(PLANNER, 't_publication_discard', first);
    expect(discarded.status, discarded.reason).toBe('done');
    const record = forecastPublicationStore.get(first)!;
    expect(record.state).toBe('Discarded');
    expect(record.ledger.map((e) => e.verb)).toEqual(['t_publication_open', 't_publication_discard']);
    expect(record.ledger[1].personId).toBe(personOf('planning'));
    expect(forecastPublicationStore.draftFor('week')).toBeUndefined();

    const second = await again();
    expect(second.status, second.reason).toBe('done');
    expect(second.entityId).not.toBe(first);
    expect(forecastPublicationStore.draftFor('week')?.publicationId).toBe(second.entityId);
  });

  it('a discarded draft is nobody’s plan — no supplier is handed it and the monthly plan is untouched', async () => {
    const before = (await collab.getPublications(seat(PERSONA_SYSTEM_ROLES.buyer))).items.map((p) => p.publicationId).sort();
    const id = await openWeeklyDraft();
    await fire(PLANNER, 't_publication_allocate', id, {
      materialCode: SIM,
      periodBucket: '2026-W36',
      supplierId: 'sup-002',
      forecastQty: 5000,
      forecastQtyRaw: '5000',
      basis: 'planner-split',
    });
    expect((await fire(PLANNER, 't_publication_discard', id)).status).toBe('done');
    const after = (await collab.getPublications(seat(PERSONA_SYSTEM_ROLES.buyer))).items.map((p) => p.publicationId).sort();
    expect(after).toEqual(before);
    expect(forecastPublicationStore.currentFor('week')).toBeUndefined();
    expect(forecastPublicationStore.currentFor('month')?.publicationId).toBe('PUB-2026-08-RM-R2');
    const own = await collab.getPublications(supplier('sup-002'), { includeSimulatedSample: true });
    expect(own.items.some((p) => p.publicationId === id)).toBe(false);
  });

  it('⚠️ ONLY a draft, ONLY the planning lane, NEVER a supplier', async () => {
    const draft = await openWeeklyDraft();
    // a seat that signs but does not open cannot discard
    const wrongLane = await fire(seat(['procurement'], 'procurement'), 't_publication_discard', draft);
    expect(wrongLane.status).toBe('failed');
    expect(wrongLane.reason).toContain('ROLE_NOT_PERMITTED');
    expect(forecastPublicationStore.get(draft)!.state).toBe('Draft');
    // a supplier is denied at scope, before the role gate
    await expect(fire(supplier('sup-002'), 't_publication_discard', draft)).rejects.toBeInstanceOf(DataError);
    expect(forecastPublicationStore.get(draft)!.state).toBe('Draft');
    // E2E-1 — the right lane naming nobody is refused BY NAME, and the draft stands
    const unnamed = await fire(seat(['planning']), 't_publication_discard', draft);
    expect(unnamed.status).toBe('failed');
    expect(unnamed.reason).toContain('PUBLICATION_ACTOR_UNATTRIBUTED');
    expect(forecastPublicationStore.get(draft)!.state).toBe('Draft');
    expect(forecastPublicationStore.get(draft)!.ledger.map((e) => e.verb)).toEqual(['t_publication_open']);
    // a published plan is not discardable — it was sent
    const published = await fire(PLANNER, 't_publication_discard', 'PUB-2026-08-RM-R2');
    expect(published.status).toBe('failed');
    expect(published.reason).toContain('ILLEGAL_TRANSITION');
    expect(forecastPublicationStore.get('PUB-2026-08-RM-R2')!.state).toBe('Published');
    // KNOWN-GOOD — the same draft, the right lane
    expect((await fire(PLANNER, 't_publication_discard', draft)).status).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SDC-5 · a leg Paragon has received is not incoming', () => {
  const leg = (over: Partial<IncomingShipment>): IncomingShipment => ({ ...incomingShipmentStore.get('ish-0001')!, ...over });
  const view = (s: IncomingShipment, asnStatus: IncomingShipmentView['asnTracking']): IncomingShipmentView => ({
    shipment: s,
    asnTracking: asnStatus,
  });

  it('the predicate — declared in flight, and not already delivered to Paragon', () => {
    const asn = (asnStatus: NonNullable<IncomingShipmentView['asnTracking']>['asnStatus']) => ({ asnRef: 'ASN-X', asnStatus });
    // the declared axis alone decides a leg with no ASN observation
    expect(stillIncoming(view(leg({ lifecycle: 'Booked' }), null))).toBe(true);
    expect(stillIncoming(view(leg({ lifecycle: 'Shipped' }), null))).toBe(true);
    expect(stillIncoming(view(leg({ lifecycle: 'Arrived' }), null))).toBe(false);
    expect(stillIncoming(view(leg({ lifecycle: 'Cancelled' }), null))).toBe(false);
    // every ASN word but Delivered leaves an in-flight leg incoming
    for (const s of ['Draft', 'Submitted', 'In Transit', 'Discrepancy'] as const) {
      expect(stillIncoming(view(leg({ lifecycle: 'Booked' }), asn(s))), s).toBe(true);
    }
    expect(stillIncoming(view(leg({ lifecycle: 'Booked' }), asn('Delivered')))).toBe(false);
    expect(stillIncoming(view(leg({ lifecycle: 'Shipped' }), asn('Delivered')))).toBe(false);
    // …and Delivered never revives a leg the supplier called off
    expect(stillIncoming(view(leg({ lifecycle: 'Cancelled' }), asn('In Transit')))).toBe(false);
  });

  it('⚠️ ish-0001 leaves coverage when its ASN is Delivered — and its DECLARED state does not move', async () => {
    const BUYER = seat(PERSONA_SYSTEM_ROLES.buyer);
    const ratioOf = async () => {
      const e = (await collab.getCoverage(BUYER)).items.find((x) => x.supplierId === 'sup-002' && x.materialCode === 'RM-EMUL-3310')!;
      return e.status.kind === 'no-declaration' ? null : e.status.ratio;
    };
    // CONTROL — the fixture leg is to-paragon, in flight, linked, and counted.
    const fixture = incomingShipmentStore.get('ish-0001')!;
    expect([fixture.direction, fixture.lifecycle, fixture.asnRef]).toEqual(['to-paragon', 'Shipped', 'ASN-2025-00301']);
    expect(asnStore.get('ASN-2025-00301')!.status).toBe('In Transit');
    expect(legsStillIncoming().map((s) => s.id)).toContain('ish-0001');
    const before = await ratioOf();
    expect(before).not.toBeNull();

    asnStore.update('ASN-2025-00301', (a) => ({ ...a, status: 'Delivered' }));

    expect(legsStillIncoming().map((s) => s.id)).not.toContain('ish-0001');
    // a p2d leg has no ASN and is untouched by any of this
    expect(legsStillIncoming().map((s) => s.id)).toContain('ish-0002');
    const after = await ratioOf();
    expect(after!).toBeLessThan(before!);
    // the supplier's own word is not rewritten by Paragon's observation
    expect(incomingShipmentStore.get('ish-0001')!.lifecycle).toBe('Shipped');
    const own = (await collab.getOwnIncomingShipments(supplier('sup-002'))).items.find((v) => v.shipment.id === 'ish-0001')!;
    expect(own.shipment.lifecycle).toBe('Shipped');
    expect(own.asnTracking).toEqual({ asnRef: 'ASN-2025-00301', asnStatus: 'Delivered' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F0.4 — the 5 remaining lifecycle machines (census #2/#7/#8/#9/#10).
//
// Author-unwired contract completeness: each flow is registered + structurally
// valid, its `states` carry ONLY event-states (clock projections excluded, law
// 0.5 / census G1), its creation shape is honest, every role is catalog-covered,
// and it is INERT — no CommandTarget, no cascade emission. Dispatching any verb
// fails at target-resolution (`UNKNOWN_ENTITY`), proving nothing is wired.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  getFlow,
  getTransition,
  validateFlow,
  rolesForPersona,
  personaCan,
  AUTOMATION_ATOMS,
  CASCADES,
  cascadesFor,
  shipmentFlow,
  contractFlow,
  obligationFlow,
  purchaseRequisitionFlow,
  supplierDocumentFlow,
} from './index';
import type { FlowDefinition } from './schema';
import { MockCommandService } from '../data/mock/MockCommandService';
import type { QueryScope } from '../data/types';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

const FLOWS: { flow: FlowDefinition; entity: string; initial: string; states: string[] }[] = [
  {
    flow: shipmentFlow,
    entity: 'shipment',
    initial: 'Pending ASN',
    states: ['Pending ASN', 'ASN Received', 'In Transit', 'Arrived at Port', 'Customs Clearance', 'At Dock', 'Unloading', 'Delivered'],
  },
  { flow: contractFlow, entity: 'contract', initial: 'Draft', states: ['Draft', 'Active', 'Renewed', 'Terminated'] },
  { flow: obligationFlow, entity: 'obligation', initial: 'In Progress', states: ['In Progress', 'Completed'] },
  {
    flow: purchaseRequisitionFlow,
    entity: 'purchaseRequisition',
    initial: 'Draft',
    states: ['Draft', 'Pending Approval', 'Approved', 'Sourcing Event', 'PO Created', 'Rejected'],
  },
  { flow: supplierDocumentFlow, entity: 'supplierDocument', initial: 'Awaiting Upload', states: ['Awaiting Upload', 'Under Review', 'Valid'] },
];

// Clock-derived values that MUST NOT be transition-states (law 0.5 / census G1).
const PROJECTIONS_EXCLUDED: Record<string, string[]> = {
  shipment: ['Delayed'],
  contract: ['Expiring', 'Expired'],
  obligation: ['Upcoming', 'Overdue'],
  supplierDocument: ['Expiring Soon', 'Expired'],
  purchaseRequisition: [], // no clock projection — all 6 states are real
};

describe('F0.4 remaining flows — registration + structure', () => {
  for (const { flow, entity, initial, states } of FLOWS) {
    it(`${entity}: registered, valid, correct initial + states`, () => {
      expect(getFlow(entity)).toBe(flow);
      expect(validateFlow(flow)).toEqual({ ok: true, errors: [] });
      expect(flow.initial).toBe(initial);
      expect([...flow.states]).toEqual(states);
    });

    it(`${entity}: excludes clock projections from the transition table (law 0.5)`, () => {
      for (const projected of PROJECTIONS_EXCLUDED[entity]) {
        expect(flow.states).not.toContain(projected);
        for (const t of flow.transitions) expect(t.to).not.toBe(projected);
      }
    });

    it(`${entity}: honest creation shape (exactly one creation → initial)`, () => {
      const creations = flow.transitions.filter((t) => t.trigger === 'creation');
      expect(creations).toHaveLength(1);
      expect(creations[0].from).toEqual([]);
      expect(creations[0].to).toBe(initial);
      // Every non-creation transition names ≥1 declared from-state.
      for (const t of flow.transitions.filter((t) => t.trigger !== 'creation')) {
        expect(t.from.length).toBeGreaterThan(0);
        for (const s of t.from) expect(flow.states).toContain(s);
      }
    });

    it(`${entity}: only non-clock triggers`, () => {
      for (const t of flow.transitions) {
        expect(['user', 'system', 'cascade', 'creation']).toContain(t.trigger);
      }
    });
  }
});

describe('F0.4 remaining flows — roles are catalog-covered', () => {
  // ⚠️ **RESTATED AT THE ROLE SPLIT, AND THE OLD FORM WAS TRUE ONLY BECAUSE
  // THE BUYER HELD EVERYTHING.** `initiable by some PERSONA` passed for 91
  // transitions because one persona spanned all 48 buyer atoms — including the
  // 26 nobody can fire, which S/4HANA, the carrier, the TMS, the bank and the
  // cascade fan-out perform. Those atoms now live in the automation grant,
  // which is deliberately NOT a persona and NOT assignable to a person.
  // The honest invariant is coverage by SOMETHING that can fire it.
  it('every requiredRole across the 5 flows is held by a role or the automation grant', () => {
    const assigned = new Set([
      ...rolesForPersona('buyer'),
      ...rolesForPersona('supplier'),
      ...AUTOMATION_ATOMS,
    ]);
    for (const { flow } of FLOWS) {
      for (const t of flow.transitions) expect(assigned.has(t.requiredRole)).toBe(true);
    }
  });

  it('supplier owns only supplierdoc:submit; the rest are buyer', () => {
    expect(personaCan('supplier', 'supplierdoc:submit')).toBe(true);
    expect(personaCan('buyer', 'supplierdoc:submit')).toBe(false);
    expect(personaCan('buyer', 'contract:activate')).toBe(true);
    expect(personaCan('buyer', 'pr:approve')).toBe(true);
    // ⚠️ NO LONGER A PERSONA'S. `shipment:advance` is required by 7 transitions
    // that are every one `surfaced: false / external-fact` — the TMS moves a
    // shipment, not a buyer. It sits in the automation grant, so the persona
    // does not span it and NOBODY assignable holds it. That is the correction,
    // not a regression: the old `true` was the wildcard answering.
    expect(personaCan('buyer', 'shipment:advance')).toBe(false);
    expect(AUTOMATION_ATOMS).toContain('shipment:advance');
    expect(personaCan('supplier', 'contract:activate')).toBe(false);
  });
});

describe('F0.4 remaining flows — adjudicated trigger shapes', () => {
  it('SupplierDocument verify + reject are system-triggered (single primary trigger)', () => {
    expect(getTransition('t_supplierdoc_verify')!.trigger).toBe('system');
    expect(getTransition('t_supplierdoc_reject')!.trigger).toBe('system');
    expect(getTransition('t_supplierdoc_submit')!.trigger).toBe('user');
  });

  it('PR source/convert carry cascade metadata but NO cascade link (declaration, not emission)', () => {
    expect(getTransition('t_pr_source')!.trigger).toBe('cascade');
    expect(getTransition('t_pr_convert')!.trigger).toBe('cascade');
    // No CASCADES entry targets these transitions — nothing fires them.
    const allTargets = Object.values(CASCADES).flat().map((l) => l.targetTransitionId);
    expect(allTargets).not.toContain('t_pr_source');
    expect(allTargets).not.toContain('t_pr_convert');
    // And the new flows declare no cascade SOURCES either.
    for (const { flow } of FLOWS) {
      for (const t of flow.transitions) expect(cascadesFor(t.id)).toEqual([]);
    }
  });
});

describe('F0.4 remaining flows — inert (author-unwired, no CommandTarget)', () => {
  const svc = new MockCommandService();
  const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };

  // A representative user verb per flow; each must fail at target-resolution
  // because no CommandTarget is registered for the entity (nothing is wired).
  // NOTE: purchaseRequisition GRADUATED out of this inert set at G1.1 — its PR
  // intake CommandTarget is now wired (C7-FIND-01), covered by
  // purchaseRequisitionCommand.test.ts. The other four stay author-unwired.
  const probes: { entity: string; transitionId: string }[] = [
    { entity: 'contract', transitionId: 't_contract_activate' },
    { entity: 'obligation', transitionId: 't_obligation_complete' },
    { entity: 'shipment', transitionId: 't_shipment_asn_received' },
    { entity: 'supplierDocument', transitionId: 't_supplierdoc_verify' },
  ];

  for (const { entity, transitionId } of probes) {
    it(`${entity}: dispatch fails UNKNOWN_ENTITY (no target registered)`, async () => {
      const res = await svc.dispatch(buyer, { transitionId, entity, entityId: 'x' });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(new RegExp(`UNKNOWN_ENTITY:${entity}`));
    });
  }
});

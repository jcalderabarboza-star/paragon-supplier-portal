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

const FLOWS: {
  flow: FlowDefinition;
  entity: string;
  initial: string;
  states: string[];
  /** How many creation transitions this flow declares. Omitted = 1 (the common
   *  shape); pinned so a silently-added second birth still reddens. */
  creations?: number;
}[] = [
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
  {
    flow: supplierDocumentFlow,
    entity: 'supplierDocument',
    initial: 'Awaiting Upload',
    // §82 — `Rejected` joined the machine. It had been a `SupplierDocumentStatus`
    // member and a §80 surface for longer than this flow has existed, while
    // `t_supplierdoc_reject` pointed at `Awaiting Upload`; nothing compared them
    // because the flow had no CommandTarget and no reject could fire.
    states: ['Awaiting Upload', 'Under Review', 'Valid', 'Rejected'],
    // Two births: the buyer REQUESTS one (→ initial), the supplier DECLARES one
    // it was never asked for (→ Under Review). See the creation-shape test.
    creations: 2,
  },
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
  for (const { flow, entity, initial, states, creations: creations_ } of FLOWS) {
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

    it(`${entity}: honest creation shape (every creation empty-from; one reaches initial)`, () => {
      // ⚠️ **THIS ASSERTED "EXACTLY ONE CREATION → INITIAL" UNTIL §82, AND THAT
      // WAS A PROPERTY OF THIS TABLE'S FIVE FLOWS RATHER THAN OF THE SCHEMA.**
      // Derived across every registered flow: `requirementResponse` and
      // `inventoryDeclaration` BOTH ship two creations, and
      // `requirementResponse`'s land on `Draft` AND `Submitted` — a creation
      // that does not reach `initial`, governed and wired since SDC-2b. So a
      // second entry point is precedent, not novelty, and the honest invariant
      // is the one that survives it: a creation is empty-`from` (the schema
      // binds those two), the flow's declared `initial` is genuinely reachable
      // at birth, and the COUNT is pinned per flow so a silently-added creation
      // still reddens.
      const creations = flow.transitions.filter((t) => t.trigger === 'creation');
      expect(creations).toHaveLength(creations_ ?? 1);
      for (const c of creations) expect(c.from).toEqual([]);
      expect(creations.map((c) => c.to)).toContain(initial);
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
  // ⚠️ **THIS PIN INVERTED AT §82, AND THE FLOW HAD ALREADY NAMED THE RULING
  // THAT WOULD INVERT IT.** `t_supplierdoc_verify` carried
  // `because: 'ruled-unsurfaced'` with the note that this was *"the least
  // settled value in the batch"* and that **Track R's operator lane is the
  // ruling most likely to flip it**. It did. A submitted document nobody can
  // see is the dead-end shape in the other direction — unread by the person
  // whose act it awaits — so compliance reviews on a screen, as a `user`.
  it('SupplierDocument supply + review verbs are all user acts, and surfaced', () => {
    for (const id of ['t_supplierdoc_submit', 't_supplierdoc_verify', 't_supplierdoc_reject']) {
      expect(getTransition(id)!.trigger, id).toBe('user');
      expect(getTransition(id)!.surfaceable.surfaced, id).toBe(true);
    }
    // The declaration is a CREATION (empty `from` binds the trigger), and it is
    // the verb `supplierdoc:upload` was ruled to permit at §79e.
    expect(getTransition('t_supplierdoc_declare')!.trigger).toBe('creation');
    expect(getTransition('t_supplierdoc_declare')!.requiredRole).toBe('supplierdoc:upload');
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
  // purchaseRequisitionCommand.test.ts. **supplierDocument GRADUATED at §82**
  // for the same reason — its target is wired and its verbs fire, covered by
  // `supplierDocumentCommand.test.ts`. Three stay author-unwired.
  const probes: { entity: string; transitionId: string }[] = [
    { entity: 'contract', transitionId: 't_contract_activate' },
    { entity: 'obligation', transitionId: 't_obligation_complete' },
    { entity: 'shipment', transitionId: 't_shipment_asn_received' },
  ];

  for (const { entity, transitionId } of probes) {
    it(`${entity}: dispatch fails UNKNOWN_ENTITY (no target registered)`, async () => {
      const res = await svc.dispatch(buyer, { transitionId, entity, entityId: 'x' });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(new RegExp(`UNKNOWN_ENTITY:${entity}`));
    });
  }
});

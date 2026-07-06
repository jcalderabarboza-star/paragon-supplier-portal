import { describe, it, expect } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  rolesForPersona,
  personaCan,
  catalogRoles,
  capabilitiesFor,
  resolvePolicyHook,
  type CommandTarget,
} from './index';
import { DataError } from '../data/types';
import type { QueryScope } from '../data/types';

const supA: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };
const supB: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const buyer: QueryScope = { personaType: 'buyer', supplierId: null };

// A fake PO target (not the real store) so the dispatcher tests stay isolated.
function makePoTarget() {
  const rows = new Map<string, { id: string; supplierId: string; status: string; lineItems: { quantity: number; confirmedQty: number }[] }>();
  rows.set('po-x', { id: 'po-x', supplierId: 'sup-007', status: 'Sent', lineItems: [{ quantity: 10, confirmedQty: 0 }] });
  const target: CommandTarget = {
    readState: (id) => rows.get(id)?.status ?? null,
    readScopeOwner: (id) => rows.get(id)?.supplierId ?? null,
    readEntity: (id) => rows.get(id) ?? null,
    applyTransition: (id, toState, payload) => {
      const e = rows.get(id);
      if (!e) return;
      e.status = toState;
      const q = payload.confirmedQuantities;
      if (Array.isArray(q)) e.lineItems.forEach((li, i) => { if (typeof q[i] === 'number') li.confirmedQty = q[i] as number; });
    },
  };
  return { target, rows };
}

function makeDispatcher(target: CommandTarget) {
  const sink = new InMemoryAuditSink();
  let n = 0;
  const d = createDispatcher({
    resolveRoles: (scope) => rolesForPersona(scope.personaType),
    target: (entity) => (entity === 'purchaseOrder' ? target : undefined),
    resolvePolicyHook,
    sink,
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => '2026-07-06T00:00:00.000Z',
  });
  return { d, sink };
}

const confirm = (entityId: string, qtys: number[]) => ({
  transitionId: 't_po_confirm',
  entity: 'purchaseOrder',
  entityId,
  payload: { confirmedQuantities: qtys },
});

describe('dispatcher — legality, role, fields, scope, policy (Step 3.4)', () => {
  it('confirms a legal PO: status done, event emitted, store mutated', () => {
    const { target, rows } = makePoTarget();
    const { d, sink } = makeDispatcher(target);
    const res = d.dispatch(supA, confirm('po-x', [10]));
    expect(res.status).toBe('done');
    expect(res.transitionId).toBe('t_po_confirm');
    expect(rows.get('po-x')!.status).toBe('Confirmed');
    expect(rows.get('po-x')!.lineItems[0].confirmedQty).toBe(10);
    const events = sink.byEvent('t_po_confirm');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ outcome: 'done', actor: 'supplier:sup-007', correlationId: res.correlationId });
    // Command status is readable back.
    expect(d.getCommandStatus(res.correlationId)?.status).toBe('done');
  });

  it('rejects an illegal transition (wrong from-state)', () => {
    const { target, rows } = makePoTarget();
    rows.get('po-x')!.status = 'Confirmed';
    const { d } = makeDispatcher(target);
    const res = d.dispatch(supA, confirm('po-x', [10]));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('rejects missing requiredFields', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    const res = d.dispatch(supA, { transitionId: 't_po_confirm', entity: 'purchaseOrder', entityId: 'po-x' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:confirmedQuantities/);
  });

  it('rejects a role the persona does not hold (buyer cannot po:confirm)', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    const res = d.dispatch(buyer, confirm('po-x', [10]));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:po:confirm/);
  });

  it('rejects a policy-hook violation (confirmed qty over ordered)', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    const res = d.dispatch(supA, confirm('po-x', [20])); // ordered is 10
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:po_confirm_qty_within_ordered/);
  });

  it('throws SCOPE_DENIED when a supplier commands another supplier’s entity', () => {
    const { target } = makePoTarget(); // po-x owned by sup-007
    const { d } = makeDispatcher(target);
    expect(() => d.dispatch(supB, confirm('po-x', [10]))).toThrow(DataError);
    try {
      d.dispatch(supB, confirm('po-x', [10]));
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });

  it('throws SCOPE_DENIED (not NOT_FOUND) when a supplier targets a non-existent entity', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    expect(() => d.dispatch(supA, confirm('ghost', [10]))).toThrow(DataError);
    try {
      d.dispatch(supA, confirm('ghost', [10]));
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });

  it('throws NOT_FOUND when the buyer targets a non-existent entity', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    // buyer holds no po:confirm role, but NOT_FOUND (scope stage) precedes role.
    try {
      d.dispatch(buyer, confirm('ghost', [10]));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DataError).code).toBe('NOT_FOUND');
    }
  });

  it('reports an unknown transition as failed without touching the entity', () => {
    const { target } = makePoTarget();
    const { d } = makeDispatcher(target);
    const res = d.dispatch(supA, { transitionId: 't_nope', entity: 'purchaseOrder', entityId: 'po-x' });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('UNKNOWN_TRANSITION');
  });
});

describe('roles + capabilities (Step 3.7 + 3.9)', () => {
  it('persona→role mapping covers every role in the catalog', () => {
    const assigned = new Set([...rolesForPersona('buyer'), ...rolesForPersona('supplier')]);
    for (const role of catalogRoles()) {
      expect(assigned.has(role)).toBe(true);
    }
  });

  it('personaCan reflects the mapping', () => {
    expect(personaCan('supplier', 'po:confirm')).toBe(true);
    expect(personaCan('buyer', 'po:confirm')).toBe(false);
    expect(personaCan('buyer', 'po:issue')).toBe(true);
  });

  it('capabilitiesFor derives roles + initiable transitions from the catalog', () => {
    const supplier = capabilitiesFor(supA);
    expect(supplier.roles).toContain('po:confirm');
    expect(supplier.transitions).toContain('t_po_confirm');
    expect(supplier.transitions).not.toContain('t_po_issue');
    const buyerCaps = capabilitiesFor(buyer);
    expect(buyerCaps.transitions).toContain('t_po_issue');
    expect(buyerCaps.transitions).not.toContain('t_po_confirm');
  });
});

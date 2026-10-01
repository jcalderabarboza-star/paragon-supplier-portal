// ────────────────────────────────────────────────────────────────────────────
// G1 · THE EVENT NAMES ITS DOCUMENT (`TransitionEvent.subject`, C3).
//
// The status-history tab on `/buyer/process-flows` reads the audit sink per
// document. Until `subject` existed no event said which entity it was about, so
// that read was unbuildable without a second index beside the ledger. Held here
// in every shape the dispatcher emits: an applied act, a state-preserving one, a
// refusal after the entity is known, a refusal before it is, and a creation.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from '../data/mock/MockCommandService';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import type { QueryScope } from '../data/types';
import './index';

const svc = new MockCommandService();

const supplier = (supplierId: string, ...businessRoles: string[]): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles,
  actor: NO_PERSON,
});
const buyer = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON,
});

/** A `Sent` order owned by `sup-007`, read from the store — never assumed. */
const sentOrder = () => {
  const po = purchaseOrderStore.all().find((p) => p.status === 'Sent' && p.supplierId === 'sup-007');
  if (!po) throw new Error('fixture premise: sup-007 holds a Sent order');
  return po;
};

const last = () => {
  const all = commandAuditSink.all();
  return all[all.length - 1];
};

beforeEach(() => {
  commandAuditSink.clear();
  purchaseOrderStore.reset();
});

describe('TransitionEvent.subject — which document an event is about', () => {
  it('an applied act names the entity, its id, and the edge it moved', async () => {
    const po = sentOrder();
    const r = await svc.dispatch(supplier('sup-007', 'fulfilment'), {
      transitionId: 't_po_acknowledge',
      entity: 'purchaseOrder',
      entityId: po.id,
    });
    expect(r.status).toBe('done');
    expect(last().subject).toEqual({ entity: 'purchaseOrder', entityId: po.id, from: 'Sent', to: 'Acknowledged' });
  });

  it('a refusal AFTER the entity is known still names it, with where it would have landed', async () => {
    const po = purchaseOrderStore.all().find((p) => p.status === 'Closed');
    if (!po) throw new Error('fixture premise: a Closed order exists');
    const r = await svc.dispatch(supplier(po.supplierId, 'fulfilment'), {
      transitionId: 't_po_acknowledge',
      entity: 'purchaseOrder',
      entityId: po.id,
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^ILLEGAL_TRANSITION/);
    expect(last().subject).toEqual({ entity: 'purchaseOrder', entityId: po.id, from: 'Closed', to: 'Acknowledged' });
  });

  it('a refusal BEFORE the entity is known omits it — absent means "no document yet", never a guess', async () => {
    const r = await svc.dispatch(supplier('sup-007', 'fulfilment'), {
      transitionId: 't_po_acknowledge',
      entity: 'purchaseOrder',
    });
    expect(r.reason).toMatch(/^MISSING_ENTITY_ID/);
    expect(last().event).toBe('t_po_acknowledge');
    expect(last()).not.toHaveProperty('subject');
  });

  it('a state-preserving verb names the same state on both sides', async () => {
    const r = await svc.dispatch(buyer('compliance'), {
      transitionId: 't_module_set',
      entity: 'moduleActivation',
      entityId: 'INT',
      payload: { enabled: true, phase: 'Activating', reason: 'G1 subject probe' },
    });
    // The verb's own policy may refuse an unattributed seat; either outcome
    // reads the state first, so the subject is named either way.
    expect(['done', 'failed']).toContain(r.status);
    expect(last().subject).toEqual({ entity: 'moduleActivation', entityId: 'INT', from: 'Governed', to: 'Governed' });
  });

  it('a creation names the id it minted, from no state', async () => {
    purchaseRequisitionStore.reset();
    const r = await svc.dispatch(buyer(...PERSONA_SYSTEM_ROLES.buyer), {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: {
        material: 'Niacinamide B3 USP Grade',
        quantity: 500,
        uom: 'KG',
        category: 'Active Ingredients',
        requiredDate: '2026-08-01',
        estimatedValue: 79_000_000,
        priority: 'High',
        justification: 'G1 subject probe',
      },
    });
    expect(r.status).toBe('done');
    expect(r.entityId).toBeTruthy();
    expect(last().subject).toEqual({ entity: 'purchaseRequisition', entityId: r.entityId, from: null, to: 'Draft' });
    purchaseRequisitionStore.reset();
  });
});

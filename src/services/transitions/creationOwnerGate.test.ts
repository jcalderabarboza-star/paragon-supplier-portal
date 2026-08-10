// ────────────────────────────────────────────────────────────────────────────
// C4b — the buyer-creation ownership gate. `requireCreationOwner` is the per-
// target opt-in that makes the relationship anchor (creationOwner) enforceable
// for a BUYER scope, not just a supplier one. Today a buyer creation's owner is
// computed then DISCARDED (dispatcher.ts): the anchor exists for suppliers only.
// This is the deepest un-falsifiability layer — a creation validated against a
// governed relationship in the world, not against the caller's word — and C4c's
// buyer recording verb needs it so a planner cannot mint a supplier-owned object
// for a supplier the governed data never names.
//
// The contract has TWO halves, both proven here:
//   1. NEW — a target WITH the flag denies a null-owner buyer creation, admits a
//      valid-owner one, and leaves the supplier owner-match check untouched.
//   2. REGRESSION — a target WITHOUT the flag is byte-for-byte unchanged. The
//      real RFQ / PR buyer verbs (creationOwner:()=>null) still pass under a
//      buyer scope and still deny a supplier. This is the whole risk surface of
//      touching shared dispatcher code, asserted explicitly against real targets.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  resolvePolicyHook,
  flowRegistry,
  type CommandTarget,
} from './index';
import { DataError } from '../data/types';
import type { QueryScope } from '../data/types';

// The real buyer-verb creation targets — proven unchanged (flag absent).
import { MockCommandService } from '../data/mock/MockCommandService';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';

// ── A synthetic creation flow on this file's isolated registry singleton. ──────
// `anchored` mirrors a buyer-authored RECORDING verb (C4c's shape): a
// creation whose owner is derived from a parent ref in the payload.
flowRegistry.register({
  entity: 'anchored',
  version: 1,
  states: ['New'],
  initial: 'New',
  terminals: ['New'],
  transitions: [
    {
      id: 't_anchored_create',
      from: [],
      to: 'New',
      trigger: 'creation',
      requiredRole: 'anchored:create',
      requiredFields: ['parentRef'],
      policyHooks: [],
      version: 1,
    },
  ],
});

const supA: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };
const supB: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const buyer: QueryScope = { personaType: 'buyer', supplierId: null };

// A creation target whose owner resolves to sup-007 for a known parent, null
// otherwise. `requireCreationOwner` is parameterised so the SAME target proves
// both the gated and the ungated behaviour.
function makeTarget(requireCreationOwner: boolean) {
  const created: Record<string, unknown>[] = [];
  let seq = 0;
  const target: CommandTarget = {
    readState: () => null,
    readScopeOwner: () => null,
    readEntity: () => null,
    applyTransition: () => {},
    requireCreationOwner,
    creationOwner: (payload) => (payload.parentRef === 'REL-owned-by-A' ? 'sup-007' : null),
    create: (payload) => {
      const entityId = `A-${++seq}`;
      created.push(payload);
      return { entityId };
    },
  };
  return { target, created };
}

function makeDispatcher(target: CommandTarget) {
  let n = 0;
  return createDispatcher({
    resolveRoles: () => ['anchored:create'],
    target: () => target,
    resolvePolicyHook,
    sink: new InMemoryAuditSink(),
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => '2026-07-23T00:00:00.000Z',
  });
}

const createCmd = (parentRef: string) => ({
  transitionId: 't_anchored_create',
  entity: 'anchored',
  payload: { parentRef },
});

describe('C4b — requireCreationOwner: a target WITH the flag gates buyer creation', () => {
  it('DENIES a buyer creation when the owner cannot be resolved (owner null)', () => {
    const { target, created } = makeTarget(true);
    const d = makeDispatcher(target);
    expect(() => d.dispatch(buyer, createCmd('REL-unknown'))).toThrow(DataError);
    try {
      d.dispatch(buyer, createCmd('REL-unknown'));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
    // Push-only-exit: the denied attempt minted nothing.
    expect(created).toHaveLength(0);
  });

  it('ADMITS a buyer creation when the owner resolves to a governed anchor', () => {
    const { target, created } = makeTarget(true);
    const d = makeDispatcher(target);
    const res = d.dispatch(buyer, createCmd('REL-owned-by-A'));
    expect(res.status).toBe('done');
    expect(res.entityId).toBe('A-1');
    expect(created).toHaveLength(1);
  });

  it('leaves the supplier owner-match check UNCHANGED: own anchor passes', () => {
    const { target } = makeTarget(true);
    const d = makeDispatcher(target);
    const res = d.dispatch(supA, createCmd('REL-owned-by-A')); // owner === sup-007
    expect(res.status).toBe('done');
  });

  it('leaves the supplier owner-match check UNCHANGED: foreign anchor ⇒ SCOPE_DENIED', () => {
    const { target } = makeTarget(true);
    const d = makeDispatcher(target);
    // sup-002 against an anchor owned by sup-007.
    expect(() => d.dispatch(supB, createCmd('REL-owned-by-A'))).toThrow(DataError);
    try {
      d.dispatch(supB, createCmd('REL-owned-by-A'));
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });
});

describe('C4b — WITHOUT the flag the buyer path is byte-for-byte unchanged (opt-in)', () => {
  it('a buyer creation with a null owner still PASSES (the pre-C4b behaviour)', () => {
    const { target, created } = makeTarget(false); // flag off — same target otherwise
    const d = makeDispatcher(target);
    const res = d.dispatch(buyer, createCmd('REL-unknown')); // owner === null
    expect(res.status).toBe('done');
    expect(created).toHaveLength(1);
  });
});

// ── Regression against the REAL buyer-verb targets (flag absent by construction).
// These prove the shared-dispatcher change is a no-op for every existing target:
// a buyer still creates with creationOwner()===null, a supplier is still denied.
describe('C4b — REGRESSION: real RFQ / PR buyer verbs (creationOwner:()=>null) unchanged', () => {
  const svc = new MockCommandService();

  beforeEach(() => {
    rfqStore.reset();
    purchaseRequisitionStore.reset();
  });

  const rfqCreate = () => ({
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'C4b regression — RFQ',
      materialCategory: 'Emulsifiers',
      materialIds: ['EM-CETE-2201'],
      invitedSupplierIds: ['sup-002'],
      responseDeadline: '2026-09-10',
      awardDeadline: '2026-09-20',
      totalQty: 3000,
      uom: 'KG',
      estimatedValue: 850_000_000,
      incoterms: 'CIF Jakarta',
      paymentTerms: 'Net 45',
    },
  });

  const prCreate = () => ({
    transitionId: 't_pr_create',
    entity: 'purchaseRequisition',
    payload: {
      material: 'C4b regression — PR',
      quantity: 500,
      uom: 'KG',
      category: 'Active Ingredients',
      requiredDate: '2026-08-01',
      estimatedValue: 79_000_000,
      priority: 'High',
      justification: 'C4b regression',
    },
  });

  it('rfq:create under a BUYER scope still SUCCEEDS with creationOwner()===null', async () => {
    const res = await svc.dispatch(buyer, rfqCreate());
    expect(res.status).toBe('done');
    expect(rfqStore.get(res.entityId!)!.status).toBe('Open');
  });

  it('rfq:create under a SUPPLIER scope still gets SCOPE_DENIED (owner null → denied before the role gate)', async () => {
    await expect(svc.dispatch(supB, rfqCreate())).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(supB, rfqCreate());
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });

  it('pr:create under a BUYER scope still SUCCEEDS (buyer-internal verb, owner null)', async () => {
    const res = await svc.dispatch(buyer, prCreate());
    expect(res.status).toBe('done');
    expect(purchaseRequisitionStore.get(res.entityId!)!.status).toBe('Draft');
  });

  it('pr:create under a SUPPLIER scope still gets SCOPE_DENIED', async () => {
    await expect(svc.dispatch(supA, prCreate())).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(supA, prCreate());
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PR intake command integration (G1.1 — C7 PR intake, closes C7-FIND-01 +
// C7-FIND-01a). The t_pr_create intake verb dispatched through the REAL
// MockCommandService + the real purchaseRequisitionStore, read back through the
// real MockProcurementService. Honest proof of the intake seam:
//   buyer create (buyer-only, creation-shape) → Draft PR, list-visible via store;
//   supplier → SCOPE_DENIED; missing required field → failed; `source` persists;
//   and the DECISION-2 + DECISION-3 BINDING — a source:'SOMO' × SIMULATED line
//   composes to the C7 §4 honest render (never a live procurement instruction).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { DataError } from '../types';
import type { QueryScope, CommandDecision } from '../types';
import {
  isLive,
  liveness,
  awaitsHarvest,
  readinessNote,
} from '../../liveness/registry';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const svc = new MockCommandService();
const reads = new MockProcurementService();

const intake = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_pr_create',
  entity: 'purchaseRequisition',
  // C7 §2.1 — acceptedQty maps to the required `quantity` field.
  payload: {
    material: 'Niacinamide B3 USP Grade',
    quantity: 500,
    uom: 'KG',
    category: 'Active Ingredients',
    requiredDate: '2026-08-01',
    estimatedValue: 79_000_000,
    priority: 'High',
    justification: 'SOMO accepted replenishment requirement',
    ...overrides,
  },
});

beforeEach(() => {
  purchaseRequisitionStore.reset();
});

describe('PR intake — buyer-only creation dispatches (C7-FIND-01)', () => {
  it('a buyer drafts a PR through t_pr_create → Draft, store-assigned number', async () => {
    const res = await svc.dispatch(buyer, intake());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^PR-2026-9\d+$/); // store-assigned, distinct range
    const pr = purchaseRequisitionStore.get(res.entityId!)!;
    expect(pr.status).toBe('Draft'); // lifecycle start (the push already happened)
    expect(pr.material).toBe('Niacinamide B3 USP Grade');
    expect(pr.quantity).toBe(500);
  });

  it('a created PR is LIST-VISIBLE via getRequisitions (store repoint, DECISION-1)', async () => {
    const before = (await reads.getRequisitions(buyer)).items.length;
    const res = await svc.dispatch(buyer, intake());
    const after = await reads.getRequisitions(buyer);
    expect(after.items.length).toBe(before + 1);
    expect(after.items.some((r) => r.prNumber === res.entityId)).toBe(true);
  });

  it('a supplier is denied — PR is buyer-internal (SCOPE_DENIED, before the role gate)', async () => {
    await expect(svc.dispatch(sup007, intake())).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(sup007, intake());
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
  });

  it('rejects a missing required field (material) — no PR minted', async () => {
    const before = purchaseRequisitionStore.all().length;
    const res = await svc.dispatch(buyer, intake({ material: '' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:material/);
    expect(purchaseRequisitionStore.all().length).toBe(before);
  });
});

describe('PR intake — producer provenance persists (C7 §4, DECISION-3)', () => {
  it('persists source:SOMO on the entity', async () => {
    const id = (await svc.dispatch(buyer, intake({ source: 'SOMO' }))).entityId!;
    expect(purchaseRequisitionStore.get(id)!.source).toBe('SOMO');
  });

  it('persists source:INTERNAL_GRID on the entity', async () => {
    const id = (await svc.dispatch(buyer, intake({ source: 'INTERNAL_GRID' }))).entityId!;
    expect(purchaseRequisitionStore.get(id)!.source).toBe('INTERNAL_GRID');
  });

  it('leaves source undefined for an unknown/absent producer (honest, not guessed)', async () => {
    const idNone = (await svc.dispatch(buyer, intake())).entityId!;
    expect(purchaseRequisitionStore.get(idNone)!.source).toBeUndefined();
    const idBad = (await svc.dispatch(buyer, intake({ source: 'MADE_UP' }))).entityId!;
    expect(purchaseRequisitionStore.get(idBad)!.source).toBeUndefined();
  });
});

describe('C6-LOCK — the governed override rides the DR-10 audit (G1.2b)', () => {
  const decision: CommandDecision = {
    field: 'acceptedQty',
    from: 5_000,
    to: 4_500,
    reason: 'MRP net requirement revised down',
    wasAdjusted: true,
  };

  it('forwards the opaque decision VERBATIM onto the t_pr_create event (actor + ts already there)', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'Niacinamide USP', quantity: 4_500, source: 'SOMO' },
      decision,
    });
    expect(res.status).toBe('done');

    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId)!;
    expect(event.event).toBe('t_pr_create');
    // actor + timestamp are already on the DR-10 event…
    expect(event.actor).toBe('buyer:all');
    expect(event.ts).toBeTruthy();
    // …and the governed decision is captured VERBATIM (deep-equal, not reshaped).
    expect(event.decision).toEqual(decision);
    // The persisted quantity is the ACCEPTED value (C7 §2.1), not the suggested.
    expect(purchaseRequisitionStore.get(res.entityId!)!.quantity).toBe(4_500);
  });

  it('the decision is opaque — it is NOT validated and never gates the outcome', async () => {
    // A decision whose numbers are internally inconsistent still forwards verbatim
    // and does not fail the command: the dispatcher treats it as pure provenance.
    const nonsense: CommandDecision = { field: 'acceptedQty', from: 1, to: 1, reason: '', wasAdjusted: true };
    const res = await svc.dispatch(buyer, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: { material: 'PET Bottle', quantity: 200_000 },
      decision: nonsense,
    });
    expect(res.status).toBe('done'); // decision did not affect validation
    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId)!;
    expect(event.decision).toEqual(nonsense); // forwarded as-is
  });

  it('a push WITHOUT a decision emits an event with no decision field (accept-as-suggested)', async () => {
    const res = await svc.dispatch(buyer, intake());
    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId)!;
    expect(event.decision).toBeUndefined();
  });
});

describe('C6 §6 invariants 2-3 — push-only-exit + both-failure-channels mint nothing', () => {
  it('neither failure channel commits a PR (thrown DataError AND status:failed)', async () => {
    const before = purchaseRequisitionStore.all().length;
    // Channel 1 — hard authz failure surfaces as a THROWN DataError.
    await expect(svc.dispatch(sup007, intake())).rejects.toBeInstanceOf(DataError);
    // Channel 2 — domain rejection surfaces as a resolved status:'failed'.
    const failed = await svc.dispatch(buyer, intake({ material: '' }));
    expect(failed.status).toBe('failed');
    // Push-only-exit: nothing left PLANNED via either channel — no PR minted.
    expect(purchaseRequisitionStore.all().length).toBe(before);
  });
});

describe('PR intake — the BINDING: source × liveness compose to an honest render', () => {
  it('a source:SOMO PR × SIMULATED liveness is honestly-marked, NEVER a live instruction', async () => {
    // C7 §4 crosswalk (IBP seed = SIMULATED × PLANNED). The two fields the operator
    // bound together: `source` (persisted producer, DECISION-3) + `liveness`
    // (registry-derived, DECISION-2). They must compose to: producer visible, tier
    // guarded, pill never green — a rehearsed plan that can't read as live procurement.
    const id = (await svc.dispatch(buyer, intake({ source: 'SOMO' }))).entityId!;
    const pr = purchaseRequisitionStore.get(id)!;

    // (1) Producer marked on the entity (honest attribution).
    expect(pr.source).toBe('SOMO');

    // (2) The capability is wired (gate-1 LIVE) but its producer has not landed, so
    //     the two-gate green predicate is FALSE — the render is SIMULATED, not live.
    expect(liveness('purchaseRequisitions')).toBe('LIVE'); // gate-1 (wired)
    expect(awaitsHarvest('purchaseRequisitions')).toBe(true); // gate-2 (no producer)
    expect(isLive('purchaseRequisitions')).toBe(false); // ⇒ never green

    // (3) The honest marker names the missing producer — not a bare "sample".
    expect(readinessNote('purchaseRequisitions')?.source).toBe('SOMO / Grid');
  });
});

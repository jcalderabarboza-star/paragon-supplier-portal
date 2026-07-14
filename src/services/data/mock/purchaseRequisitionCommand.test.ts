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

import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import {
  isLive,
  liveness,
  awaitsHarvest,
  readinessNote,
} from '../../liveness/registry';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };
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

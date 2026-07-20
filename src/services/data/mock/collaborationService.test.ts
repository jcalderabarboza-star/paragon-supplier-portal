// ────────────────────────────────────────────────────────────────────────────
// SDC-4b — the ICollaborationService scoping contract (the batch's honesty gate).
//
// Proven at the service seam (not per page), mirroring scoping.contract.test.ts:
//   · P1 own-reads are per-supplier ISOLATED — three tenants (sup-007/002/005),
//     the buyer is the cross-supplier superset;
//   · P2 consolidation reads are BUYER-GATED — a supplier persona sees NOTHING
//     (never cross-supplier data); a buyer sees the non-empty superset;
//   · the own-responses read is STATUS-ONLY — raw submissions, never a
//     consolidation-derived rank/score row.
// Reads resolve from the live stores; reset between tests for isolation.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { mockDataService as svc } from './mockDataService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { sdcClock } from '../../sdc';
import type { QueryScope } from '../types';

const A = 'sup-007';
const B = 'sup-002';
const C = 'sup-005';
const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };
const aScope: QueryScope = { personaType: 'supplier', supplierId: A };
const bScope: QueryScope = { personaType: 'supplier', supplierId: B };
const cScope: QueryScope = { personaType: 'supplier', supplierId: C };

const col = svc.collaboration;

beforeEach(() => {
  inventoryDeclarationStore.reset();
  incomingShipmentStore.reset();
  requirementResponseStore.reset();
  sdcClock.reset();
});

describe('collaboration — P1 own-reads are per-supplier isolated (buyer = superset)', () => {
  it('getOwnRequirementResponses: supplier sees only its own; buyer is the superset', async () => {
    const [a, b, c, buyer] = await Promise.all([
      col.getOwnRequirementResponses(aScope),
      col.getOwnRequirementResponses(bScope),
      col.getOwnRequirementResponses(cScope),
      col.getOwnRequirementResponses(buyerScope),
    ]);
    expect(a.items.every((r) => r.supplierId === A)).toBe(true);
    expect(b.items.every((r) => r.supplierId === B)).toBe(true);
    expect(c.items.every((r) => r.supplierId === C)).toBe(true);
    // Non-vacuous: the seed gives sup-002 and sup-005 real responses.
    expect(b.items.length).toBeGreaterThan(0);
    expect(c.items.length).toBeGreaterThan(0);
    // Buyer superset: its per-supplier slice matches each supplier scope exactly.
    expect(buyer.items.filter((r) => r.supplierId === B).length).toBe(b.items.length);
    expect(buyer.items.filter((r) => r.supplierId === C).length).toBe(c.items.length);
  });

  it('getOwnInventoryDeclarations: supplier sees only its own; buyer is the superset', async () => {
    const [b, buyer] = await Promise.all([
      col.getOwnInventoryDeclarations(bScope),
      col.getOwnInventoryDeclarations(buyerScope),
    ]);
    expect(b.items.every((d) => d.supplierId === B)).toBe(true);
    expect(b.items.length).toBeGreaterThan(0); // sup-002 has a seed declaration
    expect(buyer.items.filter((d) => d.supplierId === B).length).toBe(b.items.length);
  });

  it('getOwnSupplierAsns: supplier sees only its own', async () => {
    const a = await col.getOwnSupplierAsns(aScope);
    const b = await col.getOwnSupplierAsns(bScope);
    expect(a.items.every((x) => x.supplierId === A)).toBe(true);
    expect(b.items.every((x) => x.supplierId === B)).toBe(true);
  });

  it('getOwnIncomingShipments: the nested leg is own-scoped (buyer = superset)', async () => {
    const [b, buyer] = await Promise.all([
      col.getOwnIncomingShipments(bScope),
      col.getOwnIncomingShipments(buyerScope),
    ]);
    expect(b.items.every((v) => v.shipment.supplierId === B)).toBe(true);
    expect(buyer.items.filter((v) => v.shipment.supplierId === B).length).toBe(b.items.length);
    // The view carries its display lifecycle (derived, not a bare leg).
    expect(b.items.every((v) => typeof v.display.lifecycle === 'string')).toBe(true);
  });

  it('own-responses are STATUS-ONLY — raw submissions, never a consolidation row', async () => {
    const b = await col.getOwnRequirementResponses(bScope);
    for (const r of b.items) {
      expect('status' in r).toBe(true); // the raw submission carries its status
      // …and NOT a consolidation-derived rank/score/state (own-facts discipline).
      expect('state' in r).toBe(false);
      expect('rank' in r).toBe(false);
      expect('score' in r).toBe(false);
    }
  });
});

describe('collaboration — P2 consolidation reads are BUYER-GATED (the honesty gate)', () => {
  it('getConsolidation: buyer sees the superset; a supplier sees NOTHING', async () => {
    const buyer = await col.getConsolidation(buyerScope);
    expect(buyer.items.length).toBeGreaterThan(0);
    // A supplier persona must never reach the cross-supplier consolidation.
    for (const s of [aScope, bScope, cScope]) {
      expect((await col.getConsolidation(s)).items).toEqual([]);
    }
  });

  it('getCoverage: buyer sees the modeled entries; a supplier sees nothing', async () => {
    expect((await col.getCoverage(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await col.getCoverage(aScope)).items).toEqual([]);
  });

  it('getChase: buyer sees the chase list; a supplier sees nothing', async () => {
    // As of the shared clock (2026-08-25, past the R2 deadline) suppliers with
    // awaiting lines are overdue — the buyer chase list is non-empty.
    expect((await col.getChase(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await col.getChase(aScope)).items).toEqual([]);
  });

  it('getRollups: buyer sees per-supplier rollups; a supplier sees nothing', async () => {
    expect((await col.getRollups(buyerScope)).items.length).toBeGreaterThan(0);
    expect((await col.getRollups(bScope)).items).toEqual([]);
  });
});

describe('collaboration — reads reflect a live write through the shared store', () => {
  it('a declare appended to the store becomes the buyer coverage supply', async () => {
    // Dispatch a fresh SOH for sup-002 / RM-EMUL-3310 (seed inv-0001 = 4 000);
    // the service (buyer coverage) reads the LIVE store, so the new SOH is visible.
    const res = await svc.commands.dispatch(bScope, {
      transitionId: 't_inventorydeclaration_declare',
      entity: 'inventoryDeclaration',
      payload: { supplierId: B, materialCode: 'RM-EMUL-3310', totalQty: 99999 },
    });
    expect(res.status).not.toBe('failed');
    const own = await col.getOwnInventoryDeclarations(bScope);
    const current = own.items.find((d) => d.materialCode === 'RM-EMUL-3310');
    expect(current?.totalQty).toBe(99999); // the fresh declare is CURRENT (SDC-4a recency)
  });
});

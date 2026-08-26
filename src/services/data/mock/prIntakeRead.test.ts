// ────────────────────────────────────────────────────────────────────────────
// PR-intake read at the SERVICE seam (Phase A / task 1 — C7 §2 promoted).
//
// FORK-B=(b2): PrIntakeLine is promoted to the service seam via getPrIntake, so
// the review surface is a real consumer (not a page-local const reader). Buyer-
// only, exactly like getRequisitions (suppliers never see PR intake). The lines
// carry the C7 §4 producer provenance (source) and the FORK-D recommend-first
// `deficit` ("the why" a review triages on). Liveness is registry-derived
// (purchaseRequisitions, gate-2 shut → SIMULATED), asserted at the page layer.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { MockProcurementService } from './MockProcurementService';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const reads = new MockProcurementService();
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

describe('getPrIntake — buyer-only PR-intake read (C7 §2, two producers)', () => {
  it('returns the intake lines for a buyer, from both producers', async () => {
    const items = (await reads.getPrIntake(buyer)).items;
    expect(items.length).toBeGreaterThanOrEqual(4);
    const producers = new Set(items.map((l) => l.source));
    expect(producers.has('SOMO')).toBe(true);
    expect(producers.has('INTERNAL_GRID')).toBe(true);
  });

  it('carries the FORK-D recommend-first "why" (deficit) on SOMO recommend-first lines', async () => {
    const items = (await reads.getPrIntake(buyer)).items;
    const somo = items.filter((l) => l.source === 'SOMO');
    expect(somo.length).toBeGreaterThan(0);
    // The point of a review surface: every SOMO recommend-first line explains itself.
    expect(somo.every((l) => typeof l.deficit === 'string' && l.deficit.length > 0)).toBe(true);
  });

  it('carries the three-value quantity provenance (suggested / accepted / wasAdjusted)', async () => {
    const items = (await reads.getPrIntake(buyer)).items;
    const adjusted = items.find((l) => l.wasAdjusted);
    expect(adjusted).toBeDefined();
    expect(adjusted!.acceptedQty).not.toBe(adjusted!.suggestedQty);
    const asSuggested = items.find((l) => !l.wasAdjusted);
    expect(asSuggested!.acceptedQty).toBe(asSuggested!.suggestedQty);
  });

  it('is buyer-only — a supplier scope sees no PR intake (suppliers never see PRs)', async () => {
    const items = (await reads.getPrIntake(sup007)).items;
    expect(items).toEqual([]);
  });
});

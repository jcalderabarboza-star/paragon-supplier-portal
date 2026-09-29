// ────────────────────────────────────────────────────────────────────────────
// PR-intake read at the SERVICE seam (Phase A / task 1 — C7 §2 promoted).
//
// FORK-B=(b2): PrIntakeLine is promoted to the service seam via getIntakeLines, so
// the review surface is a real consumer (not a page-local const reader). Buyer-
// only, exactly like getRequisitions (suppliers never see PR intake). The lines
// carry the C7 §4 producer provenance (source), the A2 triage the `intakeLine`
// machine has recorded, and the FORK-D recommend-first
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

describe('getIntakeLines — buyer-only PR-intake read (C7 §2, two producers)', () => {
  it('returns the intake lines for a buyer, from both producers', async () => {
    const items = (await reads.getIntakeLines(buyer)).items;
    expect(items.length).toBeGreaterThanOrEqual(4);
    const producers = new Set(items.map((l) => l.source));
    expect(producers.has('SOMO')).toBe(true);
    expect(producers.has('INTERNAL_GRID')).toBe(true);
  });

  it('carries the FORK-D recommend-first "why" (deficit) on SOMO recommend-first lines', async () => {
    const items = (await reads.getIntakeLines(buyer)).items;
    const somo = items.filter((l) => l.source === 'SOMO');
    expect(somo.length).toBeGreaterThan(0);
    // The point of a review surface: every SOMO recommend-first line explains itself.
    expect(somo.every((l) => typeof l.deficit === 'string' && l.deficit.length > 0)).toBe(true);
  });

  // ⚠️ **THE STORED `wasAdjusted` IS GONE AND THIS ASSERTS ITS DERIVATION
  // INSTEAD** (A1-R2). The field was a hand-authored fixture boolean beside the
  // two quantities that determine it, and NOTHING CHECKED THE THREE AGREED —
  // no row lied, and the first one to disagree would have done so in silence,
  // in the field that read as the audit signal. This asserts the derivation
  // holds in BOTH directions over the real population, so a row that adjusts
  // without saying so, or says so without adjusting, is now unreachable.
  it('derives the producer adjustment from the two quantities, both ways', async () => {
    const items = (await reads.getIntakeLines(buyer)).items;
    for (const l of items) {
      expect(l.producerAdjusted).toBe(l.acceptedQty !== l.suggestedQty);
    }
    // Anti-vacuity: the population must contain BOTH readings, or the loop
    // above proves nothing about the direction it never met.
    expect(items.some((l) => l.producerAdjusted)).toBe(true);
    expect(items.some((l) => !l.producerAdjusted)).toBe(true);
  });

  // A NAMED MEMBER reached through a VALUE (`DATA-POPULATION-INSTRUMENT-
  // SURVIVES-ITS-CORPUS-01`): an id-only control survives a corpus replacement
  // that keeps the ids and changes every number, which is exactly what a
  // re-anchor does. This spec's CLAIM is about the quantities, so it pins one.
  it('names the producer-adjusted row, and its delta', async () => {
    const items = (await reads.getIntakeLines(buyer)).items;
    expect(items.filter((l) => l.producerAdjusted).map((l) => l.id)).toEqual([
      'pil-somo-002',
      'pil-grid-002',
    ]);
    const somo2 = items.find((l) => l.id === 'pil-somo-002')!;
    expect([somo2.suggestedQty, somo2.acceptedQty]).toEqual([5_000, 4_500]);
  });

  // Nobody has triaged anything, so every line opens `Pending` — the born
  // state, reached by a producer emitting the line rather than by an act.
  it('opens every line Pending, PLANNED, with no requisition', async () => {
    const items = (await reads.getIntakeLines(buyer)).items;
    expect(items.every((l) => l.state === 'Pending')).toBe(true);
    expect(items.every((l) => l.planState === 'PLANNED')).toBe(true);
    expect(items.every((l) => l.prNumber === undefined)).toBe(true);
  });

  it('is buyer-only — a supplier scope sees no PR intake (suppliers never see PRs)', async () => {
    const items = (await reads.getIntakeLines(sup007)).items;
    expect(items).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PR-intake fixtures (C7 §2 — one shape, two producers: internal Grid + SOMO).
//
// Promoted to a seam fixture at Phase A/1 (getPrIntake, FORK-B=b2) — the SINGLE
// source of truth for the intake lines, consumed by the review surface via the
// seam. plan-grid/planGridModel re-exports this as SAMPLE_INTAKE_LINES so the
// Grid keeps rendering the same rows (its seam repoint is a later, opportunistic
// follow-up — not this batch). All rows are pre-commit PLANNED. SOMO lines carry
// lane + segment + the recommend-first `deficit` ("the why"); internal-Grid lines
// omit lane/segment (null) but still carry a deficit rationale. wasAdjusted ===
// (acceptedQty !== suggestedQty). Loudly illustrative — behind the SIMULATED
// registry marker (purchaseRequisitions, gate-2 shut); nothing here is live.
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine } from '../../types';

export const PR_INTAKE_LINES: readonly PrIntakeLine[] = [
  {
    id: 'pil-somo-001',
    material: 'Glycerin USP (Halal)',
    suggestedSource: 'Cikarang DC → Karawang Plant',
    segment: 'AX',
    suggestedQty: 12_000,
    acceptedQty: 12_000,
    wasAdjusted: false,
    uom: 'KG',
    period: '2026-Q3',
    estimatedValue: 534_000_000,
    source: 'SOMO',
    planState: 'PLANNED',
    deficit: 'Projected net requirement below safety stock for Q3 Wardah lines',
  },
  {
    id: 'pil-somo-002',
    material: 'Niacinamide USP',
    suggestedSource: 'Surabaya DC → Karawang Plant',
    segment: 'BY',
    suggestedQty: 5_000,
    acceptedQty: 4_500,
    wasAdjusted: true,
    uom: 'KG',
    period: '2026-08',
    estimatedValue: 990_000_000,
    source: 'SOMO',
    planState: 'PLANNED',
    deficit: 'Aug forecast gap after Emina reformulation; producer trimmed to on-hand cover',
  },
  {
    id: 'pil-grid-001',
    material: 'PET Bottle 200ml',
    suggestedSource: null,
    segment: null,
    suggestedQty: 200_000,
    acceptedQty: 200_000,
    wasAdjusted: false,
    uom: 'PCS',
    period: '2026-08',
    estimatedValue: 256_000_000,
    source: 'INTERNAL_GRID',
    planState: 'PLANNED',
    deficit: 'Packaging plan shortfall for the Make Over launch run',
  },
  {
    id: 'pil-grid-002',
    material: 'Folding Carton',
    suggestedSource: null,
    segment: null,
    suggestedQty: 80_000,
    acceptedQty: 90_000,
    wasAdjusted: true,
    uom: 'PCS',
    period: '2026-Q3',
    estimatedValue: 81_000_000,
    source: 'INTERNAL_GRID',
    planState: 'PLANNED',
    deficit: 'Secondary-packaging buffer raised for the Q3 quarterly build',
  },
];

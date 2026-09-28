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
//
// ⚠️ **EVERY `period` HERE IS A BUCKET `parseBucket` ACCEPTS, AND TWO ROWS WERE
// CHANGED TO MAKE THAT TRUE** (operator ruling, 2026-09-28). `pil-somo-001` and
// `pil-grid-002` both carried `'2026-Q3'`; quarters are refused by ruling, and
// those two rows were the only reason the refused form existed anywhere in the
// product tree. **The grain follows the lane** — monthly for raw materials,
// ISO-weekly for packaging — so the fixture now exercises BOTH grains instead of
// one, which no single-grain fixture could have done.
//
// ⚠️ **MIXED GRAINS ACROSS LINES ARE LEGAL; MIXED GRAINS IN A HORIZON ARE NOT.**
// `pil-grid-001` is packaging on a MONTH, and that is not a defect to tidy: a
// line's bucket is whatever its producer emitted, and the single-grain rule binds
// a HORIZON (`parseHorizon`), which is a view's axis and not this array.
// `DEFAULT_HORIZON_BUCKETS` is the per-grain default for that axis, not a claim
// about any one line.
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
    // A RAW MATERIAL, so the MONTHLY grain (operator ruling, 2026-09-28).
    period: '2026-09',
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
    // PACKAGING, so the ISO-WEEKLY grain — and this row is the fixture's only
    // week, which is the point: it is what makes a week-shaped bucket reachable
    // by a surface at all. `2026-W36` runs 31 Aug → 7 Sep, straddling two
    // months, so anything that quietly treats a week as a month's subdivision
    // has a row that disagrees with it.
    period: '2026-W36',
    estimatedValue: 81_000_000,
    source: 'INTERNAL_GRID',
    planState: 'PLANNED',
    deficit: 'Secondary-packaging buffer raised for the Q3 quarterly build',
  },
];

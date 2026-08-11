// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 1: SIMULATED fixture (the ctr-003 anchor).
//
// ⚠️ HONESTY MARKER — THIS IS SIMULATED DATA, NOT PARAGON DATA. The scheduling
// agreement, its SAP number, quantities, and calendar below are invented to
// exercise the Batch-1 object model + generator. It is NOT a real S/4HANA
// scheduling agreement. Everything renders SIMULATED (liveness = 'SIMULATED').
// Reality is swapped in later (Pattern B: the portal drafts, SAP assigns the real
// numbers back); the SHAPE holds, the specifics get replaced.
//
// Seeded over a REAL header contract: ctr-003 (CTR-2025-018, "PT Sample Packaging PET
// Bottle Supply 2025-2026", sup-007 — the SDC test supplier), validity
// 2025-10-01 → 2026-09-30. Two material items reuse the SDC MATERIAL_MASTER (both
// codes already exist there and sup-007 already carries manufacturer
// relationships for both — a clean anchor). The calendar is MATERIALIZED by the
// generator (spec D2: cadence is the generator at signing), so Σ plannedQty ===
// agreedTotalQty holds by construction and every line is state:'draft'.
//
// Decision C: the seed is BOUND — a SIMULATED sapAgreementNumber is present, yet
// every line stays 'draft' (LPA internal character: the agreement exists in SAP;
// releases are not yet transmitted to the vendor). Item 10 is governed (Case B);
// item 20 is loose (Case C) — one agreement holding a governed + a reference-only
// material (D4). contractDefault === active at seed (no deviation).
// ─────────────────────────────────────────────────────────────────────────────

// CP-2 · B1 — `requireUom`, not a raw index. Two more sites of the same
// author-time crash class the batch census missed (it named demoFixtures /
// demoFixturesScale only). Converted so the split cannot be reintroduced here.
import { requireUom } from '../sdc/materialMaster';
import { generateSchedule } from './generator';
import { DRAWDOWN_PRESET_CASE_B, DRAWDOWN_PRESET_CASE_C } from './ledger';
import type { SchedulingAgreement, SchedulingAgreementItem } from './types';

const CONTRACT_ID = 'ctr-003';
const AGREEMENT_ID = 'sa-0001';
/** The negotiated calendar starts at the contract start (in-window by construction). */
const START_DATE = '2025-10-01';

// Item 10 — PET bottles: 2,000,000 PCS, monthly × 180,000 → 12 releases, the LAST
// carrying the 20,000 remainder (exercises the remainder path). FRC → semi-firm.
const ITEM_10: SchedulingAgreementItem = Object.freeze({
  lineSeq: 10,
  sapItemNumber: '10',
  materialCode: 'PK-PETB-8810',
  uom: requireUom('PK-PETB-8810'),
  agreedTotalQty: 2_000_000,
  cadence: 'monthly',
  qtyPerRelease: 180_000,
  releaseType: 'FRC',
  drawdownPolicy: Object.freeze({
    contractDefault: DRAWDOWN_PRESET_CASE_B,
    active: DRAWDOWN_PRESET_CASE_B,
  }),
  scheduleLines: Object.freeze(
    generateSchedule({
      contractId: CONTRACT_ID,
      agreementId: AGREEMENT_ID,
      lineSeq: 10,
      startDate: START_DATE,
      cadence: 'monthly',
      qtyPerRelease: 180_000,
      agreedTotalQty: 2_000_000,
      releaseType: 'FRC',
    }).map((l) => Object.freeze(l)),
  ),
});

// Item 20 — flip-top caps: 2,000,000 PCS, monthly × 200,000 → 10 releases, evenly
// divisible (exercises the even path). JIT → firm. Case C (reference-only, loose).
const ITEM_20: SchedulingAgreementItem = Object.freeze({
  lineSeq: 20,
  sapItemNumber: '20',
  materialCode: 'PK-CAPF-8820',
  uom: requireUom('PK-CAPF-8820'),
  agreedTotalQty: 2_000_000,
  cadence: 'monthly',
  qtyPerRelease: 200_000,
  releaseType: 'JIT',
  drawdownPolicy: Object.freeze({
    contractDefault: DRAWDOWN_PRESET_CASE_C,
    active: DRAWDOWN_PRESET_CASE_C,
  }),
  scheduleLines: Object.freeze(
    generateSchedule({
      contractId: CONTRACT_ID,
      agreementId: AGREEMENT_ID,
      lineSeq: 20,
      startDate: START_DATE,
      cadence: 'monthly',
      qtyPerRelease: 200_000,
      agreedTotalQty: 2_000_000,
      releaseType: 'JIT',
    }).map((l) => Object.freeze(l)),
  ),
});

/** The one SIMULATED, BOUND scheduling agreement over ctr-003. */
export const SCHEDULING_AGREEMENT_CTR003: SchedulingAgreement = Object.freeze({
  id: AGREEMENT_ID,
  contractId: CONTRACT_ID,
  supplierId: 'sup-007',
  sapAgreementNumber: '5500000123', // SIMULATED SAP-assigned number (Pattern B binds it)
  docType: 'LPA',
  items: Object.freeze([ITEM_10, ITEM_20]),
  liveness: 'SIMULATED',
});

/** All Batch-1 delivery-agreement fixtures. */
export const SCHEDULING_AGREEMENTS: readonly SchedulingAgreement[] = Object.freeze([
  SCHEDULING_AGREEMENT_CTR003,
]);

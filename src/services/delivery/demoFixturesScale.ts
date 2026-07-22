// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the AT-SCALE demo fleet (SIMULATED, honest by derivation).
//
// ⚠️ HONESTY MARKER — SIMULATED DEMO DATA, NOT PARAGON DATA. These SIX extra
// scheduling agreements exist so the dense, exception-first Delivery Overview
// (BuyerDeliveryAgreements) has enough breadth to prove its value: every state
// bucket (missed / late / pending / on-track / draft) and several suppliers, so
// the tabs, supplier/type filters, search, and worst-first sort all have data.
//
// HONESTY GUARDS (identical discipline to demoFixtures.ts — non-negotiable):
//   · Every fulfillment state is DERIVED, never hand-stamped. Lines are RELEASED
//     through Batch-2's real `releaseScheduleLines` (so Σ plannedQty ===
//     agreedTotalQty holds by the generator invariant), and pending/fulfilled/
//     late/missed fall out of the REAL `deriveFulfillment` over the SIMULATED-but-
//     honest shipments below, read against the shared SDC clock (2026-08-25).
//   · `uom` === MATERIAL_MASTER[code].canonicalUom (fixtures-integrity invariant).
//   · Each agreement's `contractId` maps to a REAL, openable mockContracts entry
//     whose `supplierId` matches — so the roll-up's contract deep-link works. The
//     mapping (verified against src/data/mockContracts.ts):
//        sa-1001 → ctr-010 / sup-001 (PT Ecogreen, Raw Material)
//        sa-1002 → ctr-004 / sup-005 (BASF, Active Ingredient)
//        sa-1003 → ctr-006 / sup-008 (PT Indo Karton, Packaging)
//        sa-1004 → ctr-008 / sup-009 (Zhejiang NHU, Active Ingredient)
//        sa-1005 → ctr-002 / sup-003 (Givaudan, Fragrance)
//        sa-1006 → ctr-005 / sup-004 (Firmenich, Fragrance)
//     ctr-001 is deliberately left agreement-free (the scope test's "empty"
//     example). ctr-003 / sa-0001 stays PRISTINE and UNTOUCHED.
//   · All demo shipments are `to-paragon` + `Arrived` (the only drawdown
//     candidates); each carries its agreement's supplierId, so
//     deriveAgreementView isolates them per supplier — no cross-agreement match.
//     The SDC pool's two legs are non-candidates (one Shipped, one
//     principal-to-distributor), so nothing there collides.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER } from '../sdc/fixtures';
import type { IncomingShipment } from '../sdc/types';
import { generateSchedule } from './generator';
import { releaseScheduleLines } from './release';
import { DRAWDOWN_PRESET_CASE_B, DRAWDOWN_PRESET_CASE_C } from './ledger';
import type {
  ReleaseType,
  SchedulingAgreement,
  SchedulingAgreementItem,
  TolerancePolicy,
} from './types';

/** Injected release stamp — a fixed simulated instant, never a wall-clock read. */
const RELEASE_STAMP = '2026-03-15T00:00:00.000Z';

interface AgreementSpec {
  readonly agreementId: string;
  readonly contractId: string;
  readonly supplierId: string;
  readonly sapAgreementNumber: string;
  readonly materialCode: string;
  readonly releaseType: ReleaseType;
  readonly policy: TolerancePolicy;
  readonly startDate: string;
  readonly cadence: 'monthly';
  readonly qtyPerRelease: number;
  readonly agreedTotalQty: number;
  /** Which generated seqs to transmit (draft→released) — the rest stay draft. */
  readonly releaseSeqs: readonly number[];
}

/** Build ONE single-item SIMULATED agreement, releasing the named seqs through the
 *  real transition (honest by construction — no hand-stamped 'released' state). */
function buildAgreement(spec: AgreementSpec): SchedulingAgreement {
  const generated = generateSchedule({
    contractId: spec.contractId,
    agreementId: spec.agreementId,
    lineSeq: 10,
    startDate: spec.startDate,
    cadence: spec.cadence,
    qtyPerRelease: spec.qtyPerRelease,
    agreedTotalQty: spec.agreedTotalQty,
    releaseType: spec.releaseType,
  });
  const draftItem: SchedulingAgreementItem = {
    lineSeq: 10,
    sapItemNumber: '10',
    materialCode: spec.materialCode,
    uom: MATERIAL_MASTER[spec.materialCode].canonicalUom,
    agreedTotalQty: spec.agreedTotalQty,
    cadence: spec.cadence,
    qtyPerRelease: spec.qtyPerRelease,
    releaseType: spec.releaseType,
    drawdownPolicy: { contractDefault: spec.policy, active: spec.policy },
    scheduleLines: generated,
  };
  const item =
    spec.releaseSeqs.length === 0
      ? draftItem
      : (() => {
          const r = releaseScheduleLines(
            draftItem,
            { releaseSeqs: [...spec.releaseSeqs] },
            RELEASE_STAMP,
          );
          if (!r.ok) throw new Error(`scale demo release failed (${spec.agreementId}): ${r.reason}`);
          return r.item;
        })();
  return {
    id: spec.agreementId,
    contractId: spec.contractId,
    supplierId: spec.supplierId,
    sapAgreementNumber: spec.sapAgreementNumber,
    docType: 'LPA',
    items: [item],
    liveness: 'SIMULATED',
  };
}

/** A SIMULATED to-paragon Arrived leg for the given supplier/material. */
function demoShip(
  supplierId: string,
  p: Pick<IncomingShipment, 'id' | 'materialCode' | 'qty' | 'eta'>,
): IncomingShipment {
  return {
    supplierId,
    direction: 'to-paragon',
    lifecycle: 'Arrived',
    uom: MATERIAL_MASTER[p.materialCode].canonicalUom,
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...p,
  };
}

// ── sa-1001 — MISSED. sup-001 (Ecogreen) / ctr-010, RM-EMUL-3310, FRC, Case B.
//    6 monthly from 2026-04-01; seqs 1–3 released, NO shipments → all three miss.
const SA_1001 = buildAgreement({
  agreementId: 'sa-1001',
  contractId: 'ctr-010',
  supplierId: 'sup-001',
  sapAgreementNumber: '5500000501',
  materialCode: 'RM-EMUL-3310',
  releaseType: 'FRC',
  policy: DRAWDOWN_PRESET_CASE_B,
  startDate: '2026-04-01',
  cadence: 'monthly',
  qtyPerRelease: 10_000,
  agreedTotalQty: 60_000,
  releaseSeqs: [1, 2, 3],
});

// ── sa-1002 — LATE. sup-005 (BASF) / ctr-004, AI-NIAC-6601, FRC, Case B.
//    4 monthly from 2026-06-01; seqs 1–2 released. seq1 delivered 4d late, seq2 on time.
const SA_1002 = buildAgreement({
  agreementId: 'sa-1002',
  contractId: 'ctr-004',
  supplierId: 'sup-005',
  sapAgreementNumber: '5500000502',
  materialCode: 'AI-NIAC-6601',
  releaseType: 'FRC',
  policy: DRAWDOWN_PRESET_CASE_B,
  startDate: '2026-06-01',
  cadence: 'monthly',
  qtyPerRelease: 20_000,
  agreedTotalQty: 80_000,
  releaseSeqs: [1, 2],
});

// ── sa-1003 — ON-TRACK. sup-008 (Indo Karton) / ctr-006, PK-PETB-8810, JIT, Case B.
//    3 monthly from 2026-05-01; all released, all delivered on time.
const SA_1003 = buildAgreement({
  agreementId: 'sa-1003',
  contractId: 'ctr-006',
  supplierId: 'sup-008',
  sapAgreementNumber: '5500000503',
  materialCode: 'PK-PETB-8810',
  releaseType: 'JIT',
  policy: DRAWDOWN_PRESET_CASE_B,
  startDate: '2026-05-01',
  cadence: 'monthly',
  qtyPerRelease: 50_000,
  agreedTotalQty: 150_000,
  releaseSeqs: [1, 2, 3],
});

// ── sa-1004 — PENDING (due-soon). sup-009 (Zhejiang) / ctr-008, AI-NIAC-6601, FRC, Case C.
//    4 monthly from 2026-07-01; seqs 1–3 released. 1–2 delivered, seq3 (09-01) still pending.
const SA_1004 = buildAgreement({
  agreementId: 'sa-1004',
  contractId: 'ctr-008',
  supplierId: 'sup-009',
  sapAgreementNumber: '5500000504',
  materialCode: 'AI-NIAC-6601',
  releaseType: 'FRC',
  policy: DRAWDOWN_PRESET_CASE_C,
  startDate: '2026-07-01',
  cadence: 'monthly',
  qtyPerRelease: 25_000,
  agreedTotalQty: 100_000,
  releaseSeqs: [1, 2, 3],
});

// ── sa-1005 — ALL-DRAFT. sup-003 (Givaudan) / ctr-002, RM-EMUL-3320, JIT, Case B.
//    4 monthly from 2026-09-01; nothing released (a freshly-drafted agreement).
const SA_1005 = buildAgreement({
  agreementId: 'sa-1005',
  contractId: 'ctr-002',
  supplierId: 'sup-003',
  sapAgreementNumber: '5500000505',
  materialCode: 'RM-EMUL-3320',
  releaseType: 'JIT',
  policy: DRAWDOWN_PRESET_CASE_B,
  startDate: '2026-09-01',
  cadence: 'monthly',
  qtyPerRelease: 30_000,
  agreedTotalQty: 120_000,
  releaseSeqs: [],
});

// ── sa-1006 — MISSED+LATE mix. sup-004 (Firmenich) / ctr-005, RM-EMUL-3320, FRC, Case B.
//    4 monthly from 2026-06-01; seqs 1–3 released. seq1 late, seq2 missed, seq3 on time.
const SA_1006 = buildAgreement({
  agreementId: 'sa-1006',
  contractId: 'ctr-005',
  supplierId: 'sup-004',
  sapAgreementNumber: '5500000506',
  materialCode: 'RM-EMUL-3320',
  releaseType: 'FRC',
  policy: DRAWDOWN_PRESET_CASE_B,
  startDate: '2026-06-01',
  cadence: 'monthly',
  qtyPerRelease: 15_000,
  agreedTotalQty: 60_000,
  releaseSeqs: [1, 2, 3],
});

/** The six SIMULATED at-scale demo agreements (added to the store SEED). */
export const SCALE_DEMO_AGREEMENTS: readonly SchedulingAgreement[] = [
  SA_1001,
  SA_1002,
  SA_1003,
  SA_1004,
  SA_1005,
  SA_1006,
];

/** The SIMULATED shipments that draw down the released demo lines. Each carries its
 *  agreement's supplierId; deriveAgreementView filters the pool per supplier, so
 *  these only ever match their own agreement's material. */
export const SCALE_DEMO_SHIPMENTS: readonly IncomingShipment[] = [
  // sa-1001 (sup-001, RM-EMUL-3310): NONE — the three released lines all miss.

  // sa-1002 (sup-005, AI-NIAC-6601): seq1 (06-01) 4d late; seq2 (07-01) on time.
  demoShip('sup-005', { id: 'ish-scale-1002-1', materialCode: 'AI-NIAC-6601', qty: 20_000, eta: '2026-06-05' }),
  demoShip('sup-005', { id: 'ish-scale-1002-2', materialCode: 'AI-NIAC-6601', qty: 20_000, eta: '2026-06-29' }),

  // sa-1003 (sup-008, PK-PETB-8810): all three on time.
  demoShip('sup-008', { id: 'ish-scale-1003-1', materialCode: 'PK-PETB-8810', qty: 50_000, eta: '2026-04-29' }),
  demoShip('sup-008', { id: 'ish-scale-1003-2', materialCode: 'PK-PETB-8810', qty: 50_000, eta: '2026-05-30' }),
  demoShip('sup-008', { id: 'ish-scale-1003-3', materialCode: 'PK-PETB-8810', qty: 50_000, eta: '2026-06-28' }),

  // sa-1004 (sup-009, AI-NIAC-6601): seq1/seq2 delivered; seq3 (09-01) still pending (future).
  demoShip('sup-009', { id: 'ish-scale-1004-1', materialCode: 'AI-NIAC-6601', qty: 25_000, eta: '2026-06-30' }),
  demoShip('sup-009', { id: 'ish-scale-1004-2', materialCode: 'AI-NIAC-6601', qty: 25_000, eta: '2026-07-30' }),

  // sa-1006 (sup-004, RM-EMUL-3320): seq1 (06-01) 5d late; seq2 (07-01) MISSED (no ship); seq3 (08-01) on time.
  demoShip('sup-004', { id: 'ish-scale-1006-1', materialCode: 'RM-EMUL-3320', qty: 15_000, eta: '2026-06-06' }),
  demoShip('sup-004', { id: 'ish-scale-1006-3', materialCode: 'RM-EMUL-3320', qty: 15_000, eta: '2026-07-29' }),
];

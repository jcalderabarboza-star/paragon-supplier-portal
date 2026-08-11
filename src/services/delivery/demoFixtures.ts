// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the SURFACE demo scenario (SIMULATED, honest by derivation).
//
// ⚠️ HONESTY MARKER — SIMULATED DEMO DATA, NOT PARAGON DATA. This SECOND agreement
// (sa-0002) exists so the buyer drawdown/compliance surface actually RENDERS the
// fulfillment states (pending / fulfilled / late / missed) + an inferred match +
// a quantity variance. The ctr-003 anchor (sa-0001) deliberately stays PRISTINE —
// all-draft, no shipments, deliveredQty 0 (the honest "freshly-drafted, nothing
// released" case) — so both truthful states show side by side.
//
// HONESTY GUARD (non-negotiable): every rendered state is DERIVED, never
// hand-stamped. The lines are RELEASED through Batch 2's real `releaseScheduleLines`
// (so Σ plannedQty === agreedTotalQty holds by the generator invariant), and the
// fulfillment states fall out of the REAL `deriveFulfillment` over these SIMULATED-
// but-honest shipments:
//   · a 'late' line — its shipment's eta genuinely > releaseDate;
//   · an 'inferred' match — genuinely proximity-matched, NO explicit fulfilledBy;
//   · a 'missed' line — its date genuinely passed with no shipment (past grace);
//   · a 'pending' line — its release date is genuinely still in the future.
// The ONLY hand-authored fulfillment fact is item B seq 1's explicit binding
// (fulfilledBy + a CONFIRMED actualQty) — the "operator confirmed this drawdown"
// correction the model stores; its status is still derived from the bound shipment.
//
// The agreement carries `liveness: 'SIMULATED'` like every fixture. Its contractId
// now points at a REAL fixture contract (ctr-013, PT Sample Packaging) so the nested
// contract-detail surface can open it; the agreement and its drawdown stay
// SIMULATED (the SAP agreement number is assigned for real under Pattern B).
// Read against the shared SDC clock (2026-08-25): the calendar straddles it, so
// the past releases resolve fulfilled/late/missed and the future one stays pending.
// ─────────────────────────────────────────────────────────────────────────────

// CP-2 · B1 — `requireUom`, not a raw index. An author typo here still fails
// LOUD at module load (the correct class of behaviour for a fixture built from
// known literals) — but it now NAMES the code that went missing instead of
// surfacing as an incidental `TypeError: Cannot read properties of undefined`.
import { requireUom } from '../sdc/materialMaster';
import type { IncomingShipment } from '../sdc/types';
import { generateSchedule } from './generator';
import { releaseScheduleLines } from './release';
import { DRAWDOWN_PRESET_CASE_B, DRAWDOWN_PRESET_CASE_C } from './ledger';
import type { SchedulingAgreement, SchedulingAgreementItem } from './types';

// A REAL, openable PT Sample Packaging (sup-007) contract — so the nested contract-detail
// Delivery Agreements tab (/buyer/contracts/ctr-013) actually renders this demo.
// ctr-003 stays the pristine all-draft anchor; this is its active-drawdown sibling.
const CONTRACT_ID = 'ctr-013';
const AGREEMENT_ID = 'sa-0002';
const SUPPLIER_ID = 'sup-007'; // PT Sample Packaging — the genuine PET-bottle + cap supplier
/** Injected release stamp — a fixed simulated instant, never a wall-clock read. */
const RELEASE_STAMP = '2026-03-15T00:00:00.000Z';

/** Release the named draft seqs through Batch 2's real transition (honest by
 *  construction — no hand-stamped 'released' state). */
function releaseOK(item: SchedulingAgreementItem, seqs: number[]): SchedulingAgreementItem {
  const r = releaseScheduleLines(item, { releaseSeqs: seqs }, RELEASE_STAMP);
  if (!r.ok) throw new Error(`demo release failed: ${r.reason}`);
  return r.item;
}

// Item A — PET bottles, FRC (semi-firm), Case B (governed). 6 monthly releases from
// 2026-04-01; releases 3–6 transmitted. Over the 2026-08-25 clock: seq3 fulfilled,
// seq4 late, seq5 missed, seq6 pending (still draft seqs 1–2 carry no fulfillment).
const ITEM_A: SchedulingAgreementItem = releaseOK(
  {
    lineSeq: 10,
    sapItemNumber: '10',
    materialCode: 'PK-PETB-8810',
    uom: requireUom('PK-PETB-8810'),
    agreedTotalQty: 600_000,
    cadence: 'monthly',
    qtyPerRelease: 100_000,
    releaseType: 'FRC',
    drawdownPolicy: {
      contractDefault: DRAWDOWN_PRESET_CASE_B,
      active: DRAWDOWN_PRESET_CASE_B,
    },
    scheduleLines: generateSchedule({
      contractId: CONTRACT_ID,
      agreementId: AGREEMENT_ID,
      lineSeq: 10,
      startDate: '2026-04-01',
      cadence: 'monthly',
      qtyPerRelease: 100_000,
      agreedTotalQty: 600_000,
      releaseType: 'FRC',
    }),
  },
  [3, 4, 5, 6],
);

// Item B — flip-top caps, JIT (firm), Case C (reference-only, not enforced). Two
// monthly releases from 2026-06-01, both transmitted. seq1 is CONFIRMED (an
// explicit binding + stored actualQty → feeds deliveredQty); seq2 is an inferred
// over-delivery.
const ITEM_B_RELEASED = releaseOK(
  {
    lineSeq: 20,
    sapItemNumber: '20',
    materialCode: 'PK-CAPF-8820',
    uom: requireUom('PK-CAPF-8820'),
    agreedTotalQty: 400_000,
    cadence: 'monthly',
    qtyPerRelease: 200_000,
    releaseType: 'JIT',
    drawdownPolicy: {
      contractDefault: DRAWDOWN_PRESET_CASE_C,
      active: DRAWDOWN_PRESET_CASE_C,
    },
    scheduleLines: generateSchedule({
      contractId: CONTRACT_ID,
      agreementId: AGREEMENT_ID,
      lineSeq: 20,
      startDate: '2026-06-01',
      cadence: 'monthly',
      qtyPerRelease: 200_000,
      agreedTotalQty: 400_000,
      releaseType: 'JIT',
    }),
  },
  [1, 2],
);
// seq1 CONFIRMED: the explicit binding + stored actualQty the honesty lock feeds
// to deliveredQty (a real, operator-confirmed drawdown). Its status still derives
// from the bound shipment's eta.
const ITEM_B: SchedulingAgreementItem = {
  ...ITEM_B_RELEASED,
  scheduleLines: ITEM_B_RELEASED.scheduleLines.map((l) =>
    l.releaseSeq === 1
      ? { ...l, fulfilledBy: 'ASN-DEMO-CAP1', actualQty: 200_000, fulfilledDate: '2026-06-01' }
      : l,
  ),
};

/** The SIMULATED demo agreement — the surface's "active drawdown" scenario. */
export const SCHEDULING_AGREEMENT_DEMO: SchedulingAgreement = {
  id: AGREEMENT_ID,
  contractId: CONTRACT_ID,
  supplierId: SUPPLIER_ID,
  sapAgreementNumber: '5500000456', // SIMULATED SAP-assigned number
  docType: 'LPA',
  items: [ITEM_A, ITEM_B],
  liveness: 'SIMULATED',
};

/** SIMULATED to-paragon shipments that draw down the demo releases. All Arrived
 *  (a real drawdown), all sup-007. deriveFulfillment matches them by material +
 *  date proximity — nothing here stamps a status. */
function demoShip(
  p: Pick<IncomingShipment, 'id' | 'materialCode' | 'qty' | 'eta'> &
    Partial<Pick<IncomingShipment, 'asnRef'>>,
): IncomingShipment {
  return {
    supplierId: SUPPLIER_ID,
    direction: 'to-paragon',
    lifecycle: 'Arrived',
    uom: requireUom(p.materialCode),
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...p,
  };
}

export const DELIVERY_DEMO_SHIPMENTS: readonly IncomingShipment[] = [
  // Item A seq3 (2026-06-01): 2 days early, exact qty → fulfilled, inferred, var 0.
  demoShip({ id: 'ish-demo-1', materialCode: 'PK-PETB-8810', qty: 100_000, eta: '2026-05-30' }),
  // Item A seq4 (2026-07-01): 3 days late, short 5k → late, inferred, var −5k.
  demoShip({ id: 'ish-demo-2', materialCode: 'PK-PETB-8810', qty: 95_000, eta: '2026-07-04' }),
  // Item B seq1 (2026-06-01): the explicitly-bound (confirmed) drawdown, on time.
  demoShip({ id: 'ish-demo-3', materialCode: 'PK-CAPF-8820', qty: 200_000, eta: '2026-06-01', asnRef: 'ASN-DEMO-CAP1' }),
  // Item B seq2 (2026-07-01): 3 days early, over 10k → fulfilled, inferred, var +10k.
  demoShip({ id: 'ish-demo-4', materialCode: 'PK-CAPF-8820', qty: 210_000, eta: '2026-06-28' }),
];

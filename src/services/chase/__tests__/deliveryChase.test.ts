import { describe, expect, it } from 'vitest';
import {
  ANTICIPATION_DAYS,
  DRIFT_COUNT,
  deriveDeliveryChase,
  type DeliveryChaseEntry,
} from '../deliveryChase';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import type { IncomingShipment } from '../../sdc/types';
import { generateSchedule } from '../../delivery/generator';
import { releaseScheduleLines } from '../../delivery/release';
import { deriveAgreementView } from '../../delivery/views';
import { DRAWDOWN_PRESET_CASE_B } from '../../delivery/ledger';
import type {
  ReleaseType,
  ScheduleLine,
  SchedulingAgreement,
  SchedulingAgreementItem,
} from '../../delivery/types';
import { SDC_SIMULATED_NOW } from '../../sdc';
import { SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS } from '../../delivery/demoFixtures';
import { SCHEDULING_AGREEMENT_CTR003 } from '../../delivery/fixtures';
import { deriveDrawdownLedger } from '../../delivery/ledger';
import { deriveFulfillment } from '../../delivery/fulfillment';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5a — the pure delivery-chase derivation. Tests read the SAME derived
// fulfillment the surfaces show (via deriveAgreementView) and assert the chase
// classification: the 3 modes, the firm/hard vs semi-firm/soft matrix, the
// worst-wins precedence + deterministic sort, and the honesty guards (no chase on
// a fulfilled/on-track line; the nudge fires only inside the anticipatory window).
// ─────────────────────────────────────────────────────────────────────────────

const NOW = SDC_SIMULATED_NOW; // '2026-08-25T12:00:00.000Z'
const SUP = 'sup-007';
const MAT_FRC = 'PK-PETB-8810';
const MAT_JIT = 'PK-CAPF-8820';

/** A day-offset ISO date (UTC midnight) from NOW's day. */
function dayFromNow(days: number): string {
  const base = Date.parse(NOW.slice(0, 10));
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

/** Build an item, then release the named seqs (draft→released, real transition). */
function buildItem(opts: {
  lineSeq: number;
  materialCode: string;
  releaseType: ReleaseType;
  startDate: string;
  qtyPerRelease: number;
  count: number;
  releaseSeqs: readonly number[];
}): SchedulingAgreementItem {
  const agreedTotalQty = opts.qtyPerRelease * opts.count;
  const item: SchedulingAgreementItem = {
    lineSeq: opts.lineSeq,
    sapItemNumber: String(opts.lineSeq),
    materialCode: opts.materialCode,
    uom: MATERIAL_MASTER[opts.materialCode].canonicalUom,
    agreedTotalQty,
    cadence: 'monthly',
    qtyPerRelease: opts.qtyPerRelease,
    releaseType: opts.releaseType,
    drawdownPolicy: { contractDefault: DRAWDOWN_PRESET_CASE_B, active: DRAWDOWN_PRESET_CASE_B },
    scheduleLines: generateSchedule({
      contractId: 'ctr-test',
      agreementId: 'sa-test',
      lineSeq: opts.lineSeq,
      startDate: opts.startDate,
      cadence: 'monthly',
      qtyPerRelease: opts.qtyPerRelease,
      agreedTotalQty,
      releaseType: opts.releaseType,
    }),
  };
  const r = releaseScheduleLines(item, { releaseSeqs: opts.releaseSeqs }, '2026-01-15T00:00:00.000Z');
  if (!r.ok) throw new Error(`test release failed: ${r.reason}`);
  return r.item;
}

/** Overwrite specific lines' releaseDate (test-only — control the anticipatory
 *  window precisely without depending on the monthly cadence). */
function patchDates(item: SchedulingAgreementItem, dateBySeq: Record<number, string>): SchedulingAgreementItem {
  return {
    ...item,
    scheduleLines: item.scheduleLines.map((l): ScheduleLine =>
      dateBySeq[l.releaseSeq] ? { ...l, releaseDate: dateBySeq[l.releaseSeq] } : l,
    ),
  };
}

/** Wrap items in a SIMULATED agreement + derive the read view (real fulfillment). */
function viewOf(items: SchedulingAgreementItem[], shipments: readonly IncomingShipment[], now = NOW) {
  const agreement: SchedulingAgreement = {
    id: 'sa-test',
    contractId: 'ctr-test',
    supplierId: SUP,
    sapAgreementNumber: '5500000999',
    docType: 'LPA',
    items,
    liveness: 'SIMULATED',
  };
  return deriveAgreementView(agreement, shipments, now, 'Test Supplier');
}

/** A to-paragon Arrived shipment (a real drawdown candidate). */
function ship(p: { id: string; materialCode: string; qty: number; eta: string }): IncomingShipment {
  return {
    supplierId: SUP,
    direction: 'to-paragon',
    lifecycle: 'Arrived',
    uom: MATERIAL_MASTER[p.materialCode].canonicalUom,
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...p,
  };
}

describe('deriveDeliveryChase — the 3 modes', () => {
  it('non-compliance-alert fires on BOTH a missed and a late line', () => {
    // JIT item, 3 monthly releases from 2026-05-01 (all in the past vs NOW):
    //   seq1 (05-01) no shipment → missed; seq2 (06-01) no shipment → missed;
    //   seq3 (07-01) shipment eta 07-05 → late.
    const item = buildItem({
      lineSeq: 10, materialCode: MAT_JIT, releaseType: 'JIT',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 3, releaseSeqs: [1, 2, 3],
    });
    const view = viewOf([item], [ship({ id: 's1', materialCode: MAT_JIT, qty: 100, eta: '2026-07-05' })]);
    const chase = deriveDeliveryChase([view], NOW);

    const alerts = chase.filter((e) => e.mode === 'non-compliance-alert');
    expect(alerts.map((a) => a.releaseSeq).sort()).toEqual([1, 2, 3]);
    // Reads the SAME states the surface shows — seq3 is 'late', seqs 1/2 'missed'.
    const fulfillment = deriveFulfillment(item, [ship({ id: 's1', materialCode: MAT_JIT, qty: 100, eta: '2026-07-05' })], NOW);
    expect(fulfillment.find((f) => f.releaseSeq === 3)?.fulfillment).toBe('late');
    expect(fulfillment.find((f) => f.releaseSeq === 1)?.fulfillment).toBe('missed');
  });

  it('anticipatory-nudge fires ONLY within ANTICIPATION_DAYS of a pending line (not before, not on a past-graced line)', () => {
    // A 4-release FRC item, all released, NO shipments → every line pending. Dates
    // patched to exercise the window boundary precisely around NOW.
    const item0 = buildItem({
      lineSeq: 10, materialCode: MAT_FRC, releaseType: 'FRC',
      startDate: '2026-01-01', qtyPerRelease: 100, count: 4, releaseSeqs: [1, 2, 3, 4],
    });
    const item = patchDates(item0, {
      1: dayFromNow(-1),                 // graced-past (pending, not approaching) → no nudge
      2: dayFromNow(ANTICIPATION_DAYS),  // exactly at the window edge → nudge
      3: dayFromNow(ANTICIPATION_DAYS + 1), // one day past the window → no nudge
      4: dayFromNow(40),                 // far future → no nudge
    });
    const view = viewOf([item], []); // no shipments — all lines pending
    const chase = deriveDeliveryChase([view], NOW);

    const nudges = chase.filter((e) => e.mode === 'anticipatory-nudge');
    expect(nudges).toHaveLength(1);
    expect(nudges[0].releaseSeq).toBe(2);
    expect(nudges[0].dueDate).toBe(dayFromNow(ANTICIPATION_DAYS));
    // A pending line is never a non-compliance alert.
    expect(chase.some((e) => e.mode === 'non-compliance-alert')).toBe(false);
  });

  it('drift fires only at ≥ DRIFT_COUNT late-or-missed lines (a pattern, not a single miss)', () => {
    // One missed line → an alert but NO drift.
    const single = buildItem({
      lineSeq: 10, materialCode: MAT_FRC, releaseType: 'FRC',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 1, releaseSeqs: [1],
    });
    const chaseSingle = deriveDeliveryChase([viewOf([single], [])], NOW);
    expect(chaseSingle.filter((e) => e.mode === 'non-compliance-alert')).toHaveLength(1);
    expect(chaseSingle.some((e) => e.mode === 'drift')).toBe(false);

    // Two missed lines → the pattern earns a drift entry (item grain, no releaseSeq).
    const pair = buildItem({
      lineSeq: 10, materialCode: MAT_FRC, releaseType: 'FRC',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 2, releaseSeqs: [1, 2],
    });
    const chasePair = deriveDeliveryChase([viewOf([pair], [])], NOW);
    const drift = chasePair.filter((e) => e.mode === 'drift');
    expect(drift).toHaveLength(1);
    expect(drift[0].releaseSeq).toBeUndefined();
    expect(drift[0].itemSeq).toBe(10);
    // dueDate = the EARLIEST offending line's date ("behind since").
    expect(drift[0].dueDate).toBe('2026-05-01');
    expect(DRIFT_COUNT).toBe(2);
  });
});

describe('deriveDeliveryChase — the type × severity matrix', () => {
  it('JIT → firm → hard; FRC → semi-firm → soft (uniform across modes)', () => {
    const jit = buildItem({
      lineSeq: 10, materialCode: MAT_JIT, releaseType: 'JIT',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 1, releaseSeqs: [1],
    });
    const frc = buildItem({
      lineSeq: 20, materialCode: MAT_FRC, releaseType: 'FRC',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 1, releaseSeqs: [1],
    });
    const chase = deriveDeliveryChase([viewOf([jit, frc], [])], NOW);

    const firm = chase.find((e) => e.itemSeq === 10)!;
    const semi = chase.find((e) => e.itemSeq === 20)!;
    expect(firm.type).toBe('firm');
    expect(firm.severity).toBe('hard');
    expect(semi.type).toBe('semi-firm');
    expect(semi.severity).toBe('soft');
  });
});

describe('deriveDeliveryChase — precedence, determinism, honesty', () => {
  it('sorts worst-first: hard before soft, alert > drift > nudge, then soonest dueDate', () => {
    // A firm (JIT) drifting item — 2 missed lines (hard alerts + a hard drift).
    const jitDrift = buildItem({
      lineSeq: 10, materialCode: MAT_JIT, releaseType: 'JIT',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 2, releaseSeqs: [1, 2],
    });
    // A semi-firm (FRC) upcoming item — one pending line inside the window (soft nudge).
    const frcNudge0 = buildItem({
      lineSeq: 20, materialCode: MAT_FRC, releaseType: 'FRC',
      startDate: '2026-01-01', qtyPerRelease: 100, count: 1, releaseSeqs: [1],
    });
    const frcNudge = patchDates(frcNudge0, { 1: dayFromNow(3) });
    const chase = deriveDeliveryChase([viewOf([jitDrift, frcNudge], [])], NOW);

    // All hard entries precede the one soft entry.
    const severities = chase.map((e) => e.severity);
    expect(severities).toEqual(['hard', 'hard', 'hard', 'soft']);
    // Within hard: the two alerts precede the drift.
    expect(chase.slice(0, 2).every((e) => e.mode === 'non-compliance-alert')).toBe(true);
    expect(chase[2].mode).toBe('drift');
    expect(chase[3].mode).toBe('anticipatory-nudge');
    // Alerts ordered by soonest dueDate.
    expect(chase[0].dueDate < chase[1].dueDate).toBe(true);
  });

  it('is deterministic — the same views + now yield an identical entry list', () => {
    const item = buildItem({
      lineSeq: 10, materialCode: MAT_JIT, releaseType: 'JIT',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 3, releaseSeqs: [1, 2, 3],
    });
    const views = [viewOf([item], [ship({ id: 's1', materialCode: MAT_JIT, qty: 100, eta: '2026-07-05' })])];
    const a = deriveDeliveryChase(views, NOW);
    const b = deriveDeliveryChase(views, NOW);
    expect(a).toEqual(b);
  });

  it('a fully on-track item yields NO chase (no fabricated urgency)', () => {
    // 2 released lines, both drawn down on time by matching shipments → fulfilled.
    const item = buildItem({
      lineSeq: 10, materialCode: MAT_JIT, releaseType: 'JIT',
      startDate: '2026-05-01', qtyPerRelease: 100, count: 2, releaseSeqs: [1, 2],
    });
    const shipments = [
      ship({ id: 's1', materialCode: MAT_JIT, qty: 100, eta: '2026-05-01' }),
      ship({ id: 's2', materialCode: MAT_JIT, qty: 100, eta: '2026-06-01' }),
    ];
    const view = viewOf([item], shipments);
    // Sanity: the surface sees both as fulfilled.
    const fulfillment = deriveFulfillment(item, shipments, NOW);
    expect(fulfillment.every((f) => f.fulfillment === 'fulfilled')).toBe(true);
    expect(deriveDeliveryChase([view], NOW)).toEqual([]);
  });
});

describe('deriveDeliveryChase — over the SIMULATED fixtures', () => {
  it('sa-0002 (real missed/late/pending) yields the expected chase; item B all-fulfilled yields none', () => {
    const view = deriveAgreementView(SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS, NOW, 'PT Berlina');
    const chase = deriveDeliveryChase([view], NOW);

    // Item A (FRC/semi-firm): seq4 late + seq5 missed → 2 alerts; seq6 pending at
    // exactly ANTICIPATION_DAYS out → 1 nudge; 2 offenders → 1 drift. All soft.
    const itemA = chase.filter((e) => e.itemSeq === 10);
    expect(itemA.filter((e) => e.mode === 'non-compliance-alert').map((e) => e.releaseSeq).sort()).toEqual([4, 5]);
    expect(itemA.filter((e) => e.mode === 'anticipatory-nudge').map((e) => e.releaseSeq)).toEqual([6]);
    expect(itemA.filter((e) => e.mode === 'drift')).toHaveLength(1);
    expect(itemA.every((e) => e.type === 'semi-firm' && e.severity === 'soft')).toBe(true);
    expect(itemA.every((e) => e.materialCode === 'PK-PETB-8810')).toBe(true);

    // Item B (JIT/firm): seq1 confirmed + seq2 inferred, BOTH fulfilled → no chase.
    expect(chase.some((e) => e.itemSeq === 20)).toBe(false);
  });

  it('ctr-003 (sa-0001, all-draft) yields no chase — nothing is released', () => {
    // Sanity: the pristine anchor has an empty ledger drawdown (all draft).
    expect(SCHEDULING_AGREEMENT_CTR003.items.every((i) => deriveDrawdownLedger(i).releasedQty === 0)).toBe(true);
    const view = deriveAgreementView(SCHEDULING_AGREEMENT_CTR003, [], NOW, 'PT Berlina');
    expect(deriveDeliveryChase([view], NOW)).toEqual<DeliveryChaseEntry[]>([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 3: fulfillment-match derivation tests.
//
// Composed OVER Batch 2's release step: each scenario RELEASES lines of the real
// ctr-003 fixture item via `releaseScheduleLines` (pure → new item), then matches
// INLINE shipments against them. The ctr-003 fixture itself is never modified — it
// stays all-draft / no-shipments / deliveredQty 0 (proven in the last block).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { IncomingShipment } from '../../sdc/types';
import { SCHEDULING_AGREEMENT_CTR003 } from '../fixtures';
import { deriveDrawdownLedger } from '../ledger';
import { releaseScheduleLines } from '../release';
import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS, deriveFulfillment } from '../fulfillment';
import type { SchedulingAgreementItem } from '../types';

/** The shared SIMULATED clock's timeline (past most ctr-003 releases). */
const NOW = '2026-08-25T12:00:00.000Z';
const RELEASE_STAMP = '2026-08-25T00:00:00.000Z';

/** ITEM 10 — PK-PETB-8810, monthly from 2025-10-01, all-draft. seq k → release
 *  date 2025-10-01 +(k−1) months; plannedQty 180_000 (seq 1–11), 20_000 (seq 12). */
const ITEM10 = SCHEDULING_AGREEMENT_CTR003.items[0];

function ship(
  p: Partial<IncomingShipment> & Pick<IncomingShipment, 'id' | 'materialCode' | 'qty'>,
): IncomingShipment {
  return {
    supplierId: 'sup-007',
    direction: 'to-paragon',
    lifecycle: 'Arrived',
    uom: 'PCS',
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...p,
  };
}

/** Release the named seqs of ITEM10 through Batch 2's pure transition. Batch 3
 *  matches ONLY what Batch 2 produced; the fixture stays untouched. */
function release(seqs: number[]): SchedulingAgreementItem {
  const r = releaseScheduleLines(ITEM10, { releaseSeqs: seqs }, RELEASE_STAMP);
  if (!r.ok) throw new Error(`fixture release failed: ${r.reason}`);
  return r.item;
}

/** Return a NEW item with a patch applied to one line (never mutates the input). */
function patchLine(
  item: SchedulingAgreementItem,
  seq: number,
  patch: Partial<SchedulingAgreementItem['scheduleLines'][number]>,
): SchedulingAgreementItem {
  return {
    ...item,
    scheduleLines: item.scheduleLines.map((l) => (l.releaseSeq === seq ? { ...l, ...patch } : l)),
  };
}

// ─── Status thresholds (all four) over one released item ──────────────────────

describe('deriveFulfillment — status thresholds', () => {
  const item = release([2, 3, 4, 12]);
  const shipments = [
    // seq3 (2025-12-01): arrival 3 days early → fulfilled, exact qty.
    ship({ id: 'shp-f', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-11-28', asnRef: 'ASN-F' }),
    // seq4 (2026-01-01): arrival 4 days late → late, short by 10k.
    ship({ id: 'shp-l', materialCode: 'PK-PETB-8810', qty: 170_000, eta: '2026-01-05' }),
  ];
  const views = deriveFulfillment(item, shipments, NOW);
  const v = (seq: number) => views.find((x) => x.releaseSeq === seq)!;

  it('returns ONE view per released line, in seq order (draft lines omitted)', () => {
    expect(views.map((x) => x.releaseSeq)).toEqual([2, 3, 4, 12]);
  });

  it('fulfilled: arrival on/before the release date', () => {
    expect(v(3).fulfillment).toBe('fulfilled');
    expect(v(3).matchedRef).toBe('ASN-F'); // asnRef wins over id
    expect(v(3).inferred).toBe(true); // proximity match → flagged, never silent
    expect(v(3).actualQty).toBe(180_000);
    expect(v(3).qtyVariance).toBe(0);
  });

  it('late: arrival after the release date — still a delivery', () => {
    expect(v(4).fulfillment).toBe('late');
    expect(v(4).matchedRef).toBe('shp-l'); // no asnRef → portal id fallback
    expect(v(4).inferred).toBe(true);
    expect(v(4).qtyVariance).toBe(-10_000); // short delivery surfaced
  });

  it('missed: a past release, beyond grace, with no match', () => {
    expect(v(2).fulfillment).toBe('missed'); // 2025-11-01, no candidate in window
    expect(v(2).matchedRef).toBeUndefined();
    expect(v(2).inferred).toBe(false);
  });

  it('pending: a future release, no match — the honest default, NOT missed', () => {
    expect(v(12).fulfillment).toBe('pending'); // 2026-09-01 > now
    expect(v(12).matchedRef).toBeUndefined();
  });
});

// ─── Explicit binding overrides inference ─────────────────────────────────────

describe('deriveFulfillment — explicit binding wins', () => {
  it('a stored fulfilledBy binds its shipment (inferred:false), even OUT of window, and beats a nearer proximity candidate', () => {
    const item = patchLine(release([3]), 3, { fulfilledBy: 'ASN-BOUND' });
    const shipments = [
      // the bound shipment — far from the release date (would NOT infer), over by 5k.
      ship({ id: 'shp-bound', materialCode: 'PK-PETB-8810', qty: 185_000, eta: '2026-03-15', asnRef: 'ASN-BOUND' }),
      // a nearer candidate inference WOULD pick — must be ignored, its shipment untouched.
      ship({ id: 'shp-near', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-12-02', asnRef: 'ASN-NEAR' }),
    ];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.matchedRef).toBe('ASN-BOUND');
    expect(v.inferred).toBe(false); // binding, not proximity
    expect(v.qtyVariance).toBe(5_000); // over-delivery surfaced
    expect(v.fulfillment).toBe('late'); // eta 2026-03-15 > releaseDate 2025-12-01
  });

  it('a binding that names an unseen shipment falls through to the honest unmatched status', () => {
    const item = patchLine(release([2]), 2, { fulfilledBy: 'ASN-GHOST' });
    const [v] = deriveFulfillment(item, [], NOW);
    expect(v.matchedRef).toBeUndefined();
    expect(v.fulfillment).toBe('missed'); // 2025-11-01, past grace
  });
});

// ─── Quantity never gates the match ───────────────────────────────────────────

describe('deriveFulfillment — quantity is surfaced, never a gate', () => {
  it('a wildly-over delivery still matches and surfaces a positive variance', () => {
    const item = release([5]); // 2026-02-01, planned 180k
    const shipments = [ship({ id: 's', materialCode: 'PK-PETB-8810', qty: 500_000, eta: '2026-02-01' })];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.fulfillment).toBe('fulfilled');
    expect(v.qtyVariance).toBe(320_000);
  });
});

// ─── Ambiguity stays honest ───────────────────────────────────────────────────

describe('deriveFulfillment — ambiguity', () => {
  it('>1 in-window candidate → ambiguous:true with a deterministic pick, never silent', () => {
    const item = release([3]); // 2025-12-01, planned 180k
    const shipments = [
      // 1 day away, |variance| 5k.
      ship({ id: 'shp-b', materialCode: 'PK-PETB-8810', qty: 175_000, eta: '2025-11-30', asnRef: 'ASN-B' }),
      // 1 day away, |variance| 0 → wins the tie-break.
      ship({ id: 'shp-a', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-12-02', asnRef: 'ASN-A' }),
    ];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.ambiguous).toBe(true);
    expect(v.matchedRef).toBe('ASN-A'); // tie on distance → smaller |qtyVariance| wins
    expect(v.inferred).toBe(true);
  });

  it('a single candidate is not flagged ambiguous', () => {
    const item = release([3]);
    const shipments = [ship({ id: 's', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-12-01' })];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.ambiguous).toBeUndefined();
  });
});

// ─── Drawdown eligibility guards ──────────────────────────────────────────────

describe('deriveFulfillment — eligibility guards', () => {
  const item = release([3]); // 2025-12-01

  it('a principal-to-distributor shipment never draws down a Paragon release', () => {
    const shipments = [
      ship({ id: 's', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-12-01', direction: 'principal-to-distributor' }),
    ];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.matchedRef).toBeUndefined();
    expect(v.fulfillment).toBe('missed');
  });

  it('a non-Arrived (in-transit) shipment never matches', () => {
    const shipments = [
      ship({ id: 's', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-12-01', lifecycle: 'Shipped' }),
    ];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.matchedRef).toBeUndefined();
  });

  it('a different material never matches', () => {
    const shipments = [ship({ id: 's', materialCode: 'PK-CAPF-8820', qty: 180_000, eta: '2025-12-01' })];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.matchedRef).toBeUndefined();
  });
});

// ─── Grace boundary — pending is never premature-missed ───────────────────────

describe('deriveFulfillment — grace boundary', () => {
  const item = release([11]); // 2026-08-01; grace deadline 2026-08-04

  it('within grace: pending', () => {
    const [v] = deriveFulfillment(item, [], '2026-08-03T00:00:00.000Z');
    expect(v.fulfillment).toBe('pending');
  });

  it('past grace: missed', () => {
    const [v] = deriveFulfillment(item, [], '2026-08-05T00:00:00.000Z');
    expect(v.fulfillment).toBe('missed');
  });
});

// ─── Honesty lock — only CONFIRMED matches feed deliveredQty ──────────────────

describe('deliveredQty honesty lock (ledger.ts UNTOUCHED, reacts to the LINE)', () => {
  it('an inferred-only match does NOT move deliveredQty', () => {
    const item = release([3]);
    const shipments = [ship({ id: 's', materialCode: 'PK-PETB-8810', qty: 180_000, eta: '2025-11-30' })];
    const [v] = deriveFulfillment(item, shipments, NOW);
    expect(v.inferred).toBe(true); // a match IS proposed in the view
    expect(v.actualQty).toBe(180_000); // its qty is observed in the view
    // ...but the LINE carries no actualQty, so the governed total stays 0.
    expect(deriveDrawdownLedger(item).deliveredQty).toBe(0);
  });

  it('a CONFIRMED matched line (stored actualQty) moves deliveredQty via the untouched ledger', () => {
    const confirmed = patchLine(release([3]), 3, {
      actualQty: 180_000,
      fulfilledBy: 'ASN-C',
      fulfilledDate: '2025-11-30',
    });
    expect(deriveDrawdownLedger(confirmed).deliveredQty).toBe(180_000);
  });
});

// ─── Constants + pristine seed ────────────────────────────────────────────────

describe('deriveFulfillment — constants & pristine ctr-003 seed', () => {
  it('exposes the named policy constants', () => {
    expect(MATCH_WINDOW_DAYS).toBe(7);
    expect(DELIVERY_GRACE_DAYS).toBe(3);
  });

  it('the all-draft seed yields NO fulfillment views and stays zero-delivered', () => {
    expect(deriveFulfillment(ITEM10, [], NOW)).toEqual([]);
    expect(deriveDrawdownLedger(ITEM10).deliveredQty).toBe(0);
  });
});

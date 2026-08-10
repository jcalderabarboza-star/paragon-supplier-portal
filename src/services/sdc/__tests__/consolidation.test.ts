// ─────────────────────────────────────────────────────────────────────────────
// SDC-1a — consolidation read-model suite (headless; the batch's verification).
//
// Proves the P2 selectors over the SIMULATED fixtures (the states the planner
// consolidates) plus synthetic SDC-0-typed inputs for the bands the fixtures
// deliberately don't carry (at-risk / uncovered / unbridgeable). Everything is
// pure — inputs are frozen fixtures; nothing here mutates or dispatches.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  FORECAST_PUBLICATIONS,
  REQUIREMENT_RESPONSES,
  INVENTORY_DECLARATIONS,
  INCOMING_SHIPMENTS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
} from '../fixtures';
import {
  RESPONSE_DUE_DAYS,
  COVERAGE_AT_RISK_FLOOR,
  currentPublication,
  consolidationRows,
  supplierRollups,
  chaseList,
  supplierCoverageEntries,
  type ConsolidationRow,
} from '../consolidation';
import type {
  ForecastPublication,
  IncomingShipment,
  InventoryDeclaration,
  Provenance,
  SupplierMaterialRelationship,
} from '../types';

// The fixture clock: after the mid-cycle republication (2026-08-15), before its
// policy deadline (+7d → 2026-08-22).
const NOW_BEFORE_DUE = '2026-08-20T00:00:00.000Z';
const NOW_AFTER_DUE = '2026-08-25T00:00:00.000Z';

const rowById = (rows: readonly ConsolidationRow[], id: string): ConsolidationRow => {
  const row = rows.find((r) => r.id === id);
  expect(row, `row ${id} missing`).toBeDefined();
  return row!;
};

// ─── Synthetic SDC-0-typed inputs (for bands the fixtures don't carry) ────────

const PROV_SOMO: Provenance = { source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' };
const PROV_SUP: Provenance = { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' };

/** One-line firm publication: sup-X owes `demand` KG of RM-T in 2026-09. */
function syntheticPublication(demand: number): ForecastPublication {
  return {
    publicationId: 'PUB-SYN',
    planVersion: 'PV-SYN.1',
    publishedAt: '2026-08-10T00:00:00.000Z',
    horizon: ['2026-09'],
    provenance: PROV_SOMO,
    lines: [
      {
        materialCode: 'RM-T',
        supplierId: 'sup-X',
        periodBucket: '2026-09',
        forecastQty: demand,
        uom: 'KG',
        commitmentClass: 'firm',
        allocation: {
          materialPeriodTotal: demand,
          basis: 'planner-split',
          approvedBy: 'planner',
          approvedAt: '2026-08-09T00:00:00.000Z',
        },
        provenance: PROV_SOMO,
      },
    ],
  };
}

function syntheticDeclaration(qty: number): InventoryDeclaration {
  return {
    id: 'inv-syn',
    supplierId: 'sup-X',
    materialCode: 'RM-T',
    declaredAt: '2026-08-12T00:00:00.000Z',
    // SDC-3a total-first: totalQty is the SOH floor; batch detail agrees with it.
    totalQty: qty,
    uom: 'KG',
    batches: [{ batchNumber: 'SYN-1', qty, uom: 'KG' }],
    provenance: PROV_SUP,
  };
}

const SYNTHETIC_DISTRIBUTOR: SupplierMaterialRelationship = {
  supplierId: 'sup-X',
  materialCode: 'RM-T',
  supplierType: 'distributor',
  principals: [{ principalId: 'PRIN-SYN', principalLeadTimeDays: 45 }],
};

// ─── currentPublication ───────────────────────────────────────────────────────

describe('currentPublication — the latest governed snapshot', () => {
  it('picks the mid-cycle republication (latest publishedAt), not the first', () => {
    const current = currentPublication(FORECAST_PUBLICATIONS);
    expect(current?.publicationId).toBe('PUB-2026-08-RM-R2');
    expect(current?.planVersion).toBe('PV-2026-08.2');
  });

  it('returns null on an empty input', () => {
    expect(currentPublication([])).toBeNull();
  });
});

// ─── consolidationRows — the line-state join ─────────────────────────────────

describe('consolidationRows — demand vs confirmation per line', () => {
  const rows = consolidationRows(FORECAST_PUBLICATIONS, REQUIREMENT_RESPONSES);

  it('derives one row per current-publication line', () => {
    const current = currentPublication(FORECAST_PUBLICATIONS)!;
    expect(rows).toHaveLength(current.lines.length);
  });

  it('carries forward an unchanged-line confirmation as confirmed-full (not voided)', () => {
    // rr-0001 answered PV-2026-08.1; the firm 6 000 kg line republished unchanged
    // → presumed-valid (design §3.2), full, flagged carried.
    const state = rowById(rows, 'sup-002|RM-EMUL-3310|2026-08').state;
    expect(state.kind).toBe('confirmed-full');
    if (state.kind === 'confirmed-full') {
      expect(state.response.id).toBe('rr-0001');
      expect(state.carriedForward).toBe(true);
    }
  });

  it('carries forward a short confirmation with its deficit', () => {
    // rr-0002 confirmed 3 000 of the unchanged firm 3 500 → short 500, carried.
    const state = rowById(rows, 'sup-005|RM-EMUL-3310|2026-08').state;
    expect(state.kind).toBe('short');
    if (state.kind === 'short') {
      expect(state.deficitQty).toBe(500);
      expect(state.carriedForward).toBe(true);
      expect(state.response.rootCause?.level1).toBe('capacity');
    }
  });

  it('⚠️ PF-1b — a Draft is INVISIBLE, not merely unactionable: no hint at all', () => {
    // F-2 said a Draft is not a response and showed a muted hint anyway. The
    // hint carried EXISTENCE, and once creation births every commitment at
    // Draft that became a live signal that a named supplier had started.
    // `awaiting` is now byte-identical whether a draft exists or not — which is
    // what makes the two cases indistinguishable to the buyer.
    const withDraft = rowById(rows, 'sup-002|RM-EMUL-3320|2026-09').state;
    expect(withDraft).toEqual({ kind: 'awaiting' });
  });

  it('flags stale-against-current when the answered line MOVED in the republication', () => {
    // rr-0004 confirmed the superseded 120 000 PCS line; current says 150 000.
    const state = rowById(rows, 'sup-005|PK-PETB-8810|2026-09').state;
    expect(state.kind).toBe('stale-against-current');
    if (state.kind === 'stale-against-current') {
      expect(state.response.id).toBe('rr-0004');
      expect(state.answeredQty).toBe(120000);
      expect(state.currentQty).toBe(150000);
    }
  });

  it('⚠ and a line with NO record is indistinguishable from one being drafted', () => {
    // sup-007's F-1a firm PET line has no response at all — the silent case.
    // Asserted beside the draft case deliberately: the point is not that the
    // hint is absent, it is that the two states are the SAME VALUE.
    const silent = rowById(rows, 'sup-007|PK-PETB-8810|2026-08').state;
    expect(silent).toEqual({ kind: 'awaiting' });
    expect(silent).toEqual(rowById(rows, 'sup-002|RM-EMUL-3320|2026-09').state);
  });

  it('SDC-2b-EXT: a visibility response reads ACKNOWLEDGED — never a commitment state', () => {
    // rr-0005 acknowledged the visibility-only niacinamide line against R2 (fresh).
    const state = rowById(rows, 'sup-007|AI-NIAC-6601|2026-10').state;
    expect(state.kind).toBe('acknowledged');
    if (state.kind === 'acknowledged') {
      expect(state.response.id).toBe('rr-0005');
      expect(state.carriedForward).toBe(false);
      // The honesty lock: an acknowledgment carries NO commitment fields.
      expect(state.response.forecastConfirmation).toBeUndefined();
      expect(state.response.acknowledgment?.note).toMatch(/no concern yet/);
    }
  });

  it('SDC-2b-EXT: an ack against a superseded version carries forward when the line is unmoved', () => {
    // Rebind rr-0005 to R1 (the niacinamide line republished IDENTICAL in R2).
    const ackV1 = REQUIREMENT_RESPONSES.map((r) =>
      r.id === 'rr-0005'
        ? { ...r, publicationId: 'PUB-2026-08-RM', planVersion: 'PV-2026-08.1' }
        : r,
    );
    const state = rowById(
      consolidationRows(FORECAST_PUBLICATIONS, ackV1),
      'sup-007|AI-NIAC-6601|2026-10',
    ).state;
    expect(state).toMatchObject({ kind: 'acknowledged', carriedForward: true });
  });

  it('flags stale (answeredQty null) when the answered snapshot cannot be located', () => {
    // Feed ONLY the current publication: rr-0004's answered snapshot is missing
    // → carry-forward cannot be verified → honest stale, not presumed valid.
    const current = currentPublication(FORECAST_PUBLICATIONS)!;
    const state = rowById(
      consolidationRows([current], REQUIREMENT_RESPONSES),
      'sup-005|PK-PETB-8810|2026-09',
    ).state;
    expect(state.kind).toBe('stale-against-current');
    if (state.kind === 'stale-against-current') expect(state.answeredQty).toBeNull();
  });

  it('is pure — repeated calls over the frozen fixtures agree', () => {
    expect(consolidationRows(FORECAST_PUBLICATIONS, REQUIREMENT_RESPONSES)).toEqual(rows);
  });
});

// ─── supplierRollups — responded / partial / silent ──────────────────────────

describe('supplierRollups', () => {
  const rollups = supplierRollups(consolidationRows(FORECAST_PUBLICATIONS, REQUIREMENT_RESPONSES));
  const bySupplier = new Map(rollups.map((r) => [r.supplierId, r]));

  it('sup-002 is partial (glycerin answered, cetearyl still awaiting)', () => {
    expect(bySupplier.get('sup-002')).toMatchObject({
      rollup: 'partial',
      totalLines: 2,
      answeredLines: 1,
      awaitingLines: 1,
    });
  });

  it('sup-005 is responded — a STALE line was still answered (never silent)', () => {
    expect(bySupplier.get('sup-005')).toMatchObject({
      rollup: 'responded',
      totalLines: 2,
      answeredLines: 2,
      awaitingLines: 0,
    });
  });

  it('sup-007 is partial — the rr-0005 acknowledgment COUNTS as answered (SDC-2b-EXT)', () => {
    expect(bySupplier.get('sup-007')).toMatchObject({
      rollup: 'partial',
      totalLines: 3,
      answeredLines: 1,
      awaitingLines: 2,
    });
  });
});

// ─── chaseList — the pre-scheduler manual chase ───────────────────────────────

describe('chaseList (RESPONSE_DUE_DAYS interim policy)', () => {
  const current = currentPublication(FORECAST_PUBLICATIONS)!;
  const rows = consolidationRows(FORECAST_PUBLICATIONS, REQUIREMENT_RESPONSES);

  it('exposes the named policy constant (pre-SDC-5 interim, not schema)', () => {
    expect(RESPONSE_DUE_DAYS).toBe(7);
  });

  it('before the deadline: partial responders surface, silent ones are not chased yet', () => {
    // sup-007's acknowledgment (SDC-2b-EXT) makes it a PARTIAL responder too —
    // answered one line, two packaging lines still awaiting; it leads on count.
    const entries = chaseList(current, rows, NOW_BEFORE_DUE);
    expect(entries.map((e) => `${e.supplierId}:${e.reason}`)).toEqual([
      'sup-007:partial-response',
      'sup-002:partial-response',
    ]);
    // The deadline derives from publishedAt + RESPONSE_DUE_DAYS.
    expect(entries[0].dueAt).toBe('2026-08-22T00:00:00.000Z');
  });

  it('past the deadline: every supplier with awaiting lines is overdue', () => {
    const entries = chaseList(current, rows, NOW_AFTER_DUE);
    // sup-007 leads: 3 awaiting lines (the F-1a packaging depth + niacinamide)
    // vs sup-002's 1 — the list orders by how much is outstanding.
    expect(entries.map((e) => `${e.supplierId}:${e.reason}`)).toEqual([
      'sup-007:overdue',
      'sup-002:overdue',
    ]);
  });

  it('a fully-responded supplier is never chased', () => {
    for (const now of [NOW_BEFORE_DUE, NOW_AFTER_DUE]) {
      expect(chaseList(current, rows, now).some((e) => e.supplierId === 'sup-005')).toBe(false);
    }
  });
});

// ─── supplierCoverageEntries — the addendum-§6 indicator ─────────────────────

describe('supplier-coverage indicator (the ONE projection that is ours)', () => {
  const entries = supplierCoverageEntries(
    FORECAST_PUBLICATIONS,
    INVENTORY_DECLARATIONS,
    INCOMING_SHIPMENTS,
    SUPPLIER_MATERIAL_RELATIONSHIPS,
    NOW_BEFORE_DUE,
  );
  const byPair = new Map(entries.map((e) => [`${e.supplierId}|${e.materialCode}`, e]));

  it('covers only firm/semi-firm pairs — visibility-only carries no sufficiency read', () => {
    expect(byPair.has('sup-007|AI-NIAC-6601')).toBe(false);
    // 6 committed pairs: 2× glycerin (firm), cetearyl + sup-005 PET (semi-firm),
    // + the SDC-2b F-1a sup-007 packaging pair each class (PET firm, cap semi-firm).
    expect(entries).toHaveLength(6);
    // sup-002 has declared no cetearyl stock → honest blank there too.
    expect(byPair.get('sup-002|RM-EMUL-3320')!.status).toEqual({ kind: 'no-declaration' });
    // SDC-3b — sup-007's PET line carries a TOTAL-ONLY declaration (inv-0003):
    // it covers demand (45 000 ≥ 40 000) so reads "covered", BUT expiryBlind is
    // true (no batch/expiry detail — the EXPIRY-BLIND marker's fixture).
    expect(byPair.get('sup-007|PK-PETB-8810')!.status).toEqual({
      kind: 'covered',
      ratio: 45000 / 40000,
      expiryBlind: true,
    });
    // The cap line still carries no declaration → honest blank, never a zero.
    expect(byPair.get('sup-007|PK-CAPF-8820')!.status).toEqual({ kind: 'no-declaration' });
  });

  it('sup-002 glycerin: SOH 4 000 + shipped 6 000 over firm 6 000 → covered', () => {
    const e = byPair.get('sup-002|RM-EMUL-3310')!;
    expect(e.committedDemandQty).toBe(6000);
    expect(e.uom).toBe('KG');
    expect(e.status.kind).toBe('covered');
    if (e.status.kind === 'covered') expect(e.status.ratio).toBeCloseTo(10000 / 6000);
  });

  it('sup-005 glycerin: SOH 1 500 + booked 4 000 over firm 3 500 → covered', () => {
    expect(byPair.get('sup-005|RM-EMUL-3310')!.status.kind).toBe('covered');
  });

  it('no SOH declaration → the HONEST BLANK, never a fabricated zero', () => {
    // sup-005 owes 150 000 PCS of PET bottles but has declared no PET stock.
    expect(byPair.get('sup-005|PK-PETB-8810')!.status).toEqual({ kind: 'no-declaration' });
  });

  it('bands at-risk between the floor and 1', () => {
    // Demand 1 000, declared 850 → ratio 0.85 ∈ [0.8, 1). Lead 45d > 41d to the
    // 2026-09 bucket end → the shortfall is also unbridgeable.
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(850)],
      [],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    );
    // Batch-grain synthetic declaration → expiry-aware (expiryBlind false).
    expect(e.status).toEqual({ kind: 'at-risk', ratio: 0.85, unbridgeable: true, expiryBlind: false });
  });

  it('bands uncovered below the floor; a short-enough principal lead is bridgeable', () => {
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(500)],
      [],
      [
        {
          ...SYNTHETIC_DISTRIBUTOR,
          principals: [{ principalId: 'PRIN-SYN', principalLeadTimeDays: 30 }],
        },
      ],
      NOW_BEFORE_DUE,
    );
    expect(e.status).toEqual({ kind: 'uncovered', ratio: 0.5, unbridgeable: false, expiryBlind: false });
    expect(COVERAGE_AT_RISK_FLOOR).toBe(0.8);
  });

  it('a manufacturer shortfall is never flagged unbridgeable (no modeled lead time)', () => {
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(500)],
      [],
      [{ supplierId: 'sup-X', materialCode: 'RM-T', supplierType: 'manufacturer' }],
      NOW_BEFORE_DUE,
    );
    expect(e.status).toEqual({ kind: 'uncovered', ratio: 0.5, unbridgeable: false, expiryBlind: false });
  });

  it('Arrived / Cancelled legs never count as incoming', () => {
    const dead: IncomingShipment[] = (['Arrived', 'Cancelled'] as const).map((lifecycle, i) => ({
      id: `ish-syn-${i}`,
      supplierId: 'sup-X',
      materialCode: 'RM-T',
      direction: 'principal-to-distributor',
      lifecycle,
      qty: 10000,
      uom: 'KG',
      provenance: PROV_SUP,
    }));
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(500)],
      dead,
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    );
    // Still only the declared 500 — the dead legs added nothing.
    expect(e.status.kind).toBe('uncovered');
  });

  it('uses only the LATEST declaration by insertion recency, NOT declaredAt (SDC-4a ruling c)', () => {
    // The stale 9 000 was declared LATER on the clock (08-20) but inserted EARLIER
    // (lower id-seq); the current 850 is a fresh declare — an EARLIER stamp (08-01)
    // but a LATER insertion (inv-9001). Recency, not declaredAt, must decide.
    const stale: InventoryDeclaration = {
      ...syntheticDeclaration(9000),
      id: 'inv-0001', // earlier insertion
      declaredAt: '2026-08-20T00:00:00.000Z', // …but a LATER stamp
    };
    const current: InventoryDeclaration = {
      ...syntheticDeclaration(850),
      id: 'inv-9001', // later insertion (a live declare) → the current SOH
      declaredAt: '2026-08-01T00:00:00.000Z', // …but an EARLIER stamp
    };
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [stale, current],
      [],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    );
    // 850/1000 → at-risk. Max-by-declaredAt would have chosen the stale 9 000
    // (covered) — the at-risk verdict proves recency beat the clock.
    expect(e.status.kind).toBe('at-risk');
  });
});

// ─── CP-0 · W1 · PR-2d — the shipment quantity's blast radius ─────────────────
//
// A shipment qty is not a leaf: it sums into `incoming` here and decides the
// sufficiency band a planner acts on. The pair below is engineered so the
// shipment is LOAD-BEARING — SOH alone does not cover demand, and the leg
// closes the gap exactly. That makes the misparse visible as a VERDICT flip,
// which is the thing a planner would actually have seen and chased.
//
// This is the coverage sibling of the 2c false-deficit chain: same shape (a
// mis-read quantity fabricating a shortfall), one object over.

describe('supplier coverage is unperturbed by the corrected shipment quantity (CP-0 · 2d)', () => {
  const shipment = (qty: number): IncomingShipment => ({
    id: 'ish-2d',
    supplierId: 'sup-X',
    materialCode: 'RM-T',
    direction: 'to-paragon',
    lifecycle: 'Booked', // a freshly reported leg enters the sum immediately
    qty,
    uom: 'KG',
    asnRef: 'ASN-2D',
    provenance: PROV_SUP,
  });
  const coverageFor = (qty: number) =>
    supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(940)], // 60 short on SOH alone
      [shipment(qty)],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    )[0];

  it('the READ quantity covers the pair — 940 SOH + 60 in transit meets 1 000', () => {
    const e = coverageFor(60);
    expect(e.status.kind).toBe('covered');
  });

  it('the MISPARSE would have fabricated a shortfall out of a covered pair', () => {
    // "60" typed under the id convention as "6.0"… or any of the collisions this
    // series exists to refuse. The point is not which glyph: it is that ONE
    // wrong reading moves the pair out of `covered` and onto the chase list.
    expect(coverageFor(6).status.kind).not.toBe('covered');
    // And the honest alternative is that nothing is reported at all — a refused
    // quantity never reaches the store, so the pair keeps its real state rather
    // than acquiring a false one.
    const noLeg = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(940)],
      [],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    )[0];
    expect(noLeg.status.kind).not.toBe('covered'); // honestly short, not falsely
  });

  it('a zero-quantity leg reads EXACTLY like no leg at all — why the `|| 0` hid', () => {
    // The fabricated zero never announced itself here: a shipment of 0 sums to
    // the same coverage as no shipment, so the read looked identical to "the
    // supplier reported nothing". The defect produced no visibly wrong number
    // on this surface — which is precisely how it survived four batches.
    const zeroLeg = coverageFor(0);
    const noLeg = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [syntheticDeclaration(940)],
      [],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    )[0];
    expect(zeroLeg.status).toEqual(noLeg.status);
    // Yet a shipment record EXISTS in the store claiming a reported delivery —
    // the two reads agree while the ledger does not. That divergence is the
    // real cost, and it is what the surface refusal now prevents.
    expect(zeroLeg.status.kind).not.toBe('covered');
  });
});

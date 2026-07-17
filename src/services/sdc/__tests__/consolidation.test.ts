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

  it('F-2: a Draft is NOT a response — awaiting, with the draft hint only', () => {
    const state = rowById(rows, 'sup-002|RM-EMUL-3320|2026-09').state;
    expect(state).toEqual({ kind: 'awaiting', draftInProgress: true });
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

  it('a supplier with no record at all is awaiting without the draft hint (silent)', () => {
    const state = rowById(rows, 'sup-007|AI-NIAC-6601|2026-10').state;
    expect(state).toEqual({ kind: 'awaiting', draftInProgress: false });
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

  it('sup-007 is silent', () => {
    expect(bySupplier.get('sup-007')).toMatchObject({ rollup: 'silent', answeredLines: 0 });
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
    const entries = chaseList(current, rows, NOW_BEFORE_DUE);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ supplierId: 'sup-002', reason: 'partial-response' });
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
    // The F-1a sup-007 pairs carry no declaration either → honest blanks, never
    // fabricated zeros (sup-007 is the seeded silent supplier).
    expect(byPair.get('sup-007|PK-PETB-8810')!.status).toEqual({ kind: 'no-declaration' });
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
    expect(e.status).toEqual({ kind: 'at-risk', ratio: 0.85, unbridgeable: true });
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
    expect(e.status).toEqual({ kind: 'uncovered', ratio: 0.5, unbridgeable: false });
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
    expect(e.status).toEqual({ kind: 'uncovered', ratio: 0.5, unbridgeable: false });
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

  it('uses only the LATEST declaration (one true SOH per material, clear as-of)', () => {
    const older: InventoryDeclaration = {
      ...syntheticDeclaration(9000),
      id: 'inv-syn-old',
      declaredAt: '2026-08-01T00:00:00.000Z',
    };
    const [e] = supplierCoverageEntries(
      [syntheticPublication(1000)],
      [older, syntheticDeclaration(850)], // latest (08-12) declares 850
      [],
      [SYNTHETIC_DISTRIBUTOR],
      NOW_BEFORE_DUE,
    );
    expect(e.status.kind).toBe('at-risk'); // 850/1000 — not the stale 9 000
  });
});

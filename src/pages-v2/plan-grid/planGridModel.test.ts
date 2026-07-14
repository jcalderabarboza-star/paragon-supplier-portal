import { describe, it, expect } from 'vitest';
import {
  AWARD_CRITERIA,
  DEFAULT_WEIGHTS,
  whatIfScore,
  buildWhatIfOverlay,
  awardScenarioRows,
  SAMPLE_INTAKE_LINES,
  type WhatIfWeights,
} from './planGridModel';
import { mockQuotations } from '../../data/mockQuotations';

// ────────────────────────────────────────────────────────────────────────────
// planGridModel — the PURE what-if overlay math + the C7 intake sample.
//
// This is the honesty-critical logic of G1.2a: the award what-if is recomputed
// in pure TS (no engine formula), and the C6 §2 invariant — the overlay is a
// client artifact NEVER merged into the seam — is asserted here where it is
// deterministic. The engine (react-datasheet-grid) only renders these values;
// it computes nothing.
// ────────────────────────────────────────────────────────────────────────────

const evenWeights: WhatIfWeights = {
  compliance: 25,
  price: 25,
  leadTime: 25,
  reliability: 25,
};

describe('whatIfScore — pure weighted re-score (formulas-OUT, client TS)', () => {
  it('equal weights → the plain mean of the four sub-scores, rounded', () => {
    const sub = { complianceScore: 90, priceScore: 80, leadTimeScore: 70, reliabilityScore: 60 };
    // (90+80+70+60)/4 = 75
    expect(whatIfScore(sub, evenWeights)).toBe(75);
  });

  it('normalizes by the weight sum — weights need not total 100', () => {
    const sub = { complianceScore: 100, priceScore: 0, leadTimeScore: 0, reliabilityScore: 0 };
    // all weight on compliance → 100, regardless of the raw weight magnitude
    const weights: WhatIfWeights = { compliance: 7, price: 0, leadTime: 0, reliability: 0 };
    expect(whatIfScore(sub, weights)).toBe(100);
  });

  it('re-weighting shifts the score toward the up-weighted criterion', () => {
    const sub = { complianceScore: 100, priceScore: 50, leadTimeScore: 50, reliabilityScore: 50 };
    // compliance-heavy: (100*70 + 50*10 + 50*10 + 50*10)/100 = (7000+1500)/100 = 85
    const complianceHeavy: WhatIfWeights = { compliance: 70, price: 10, leadTime: 10, reliability: 10 };
    expect(whatIfScore(sub, complianceHeavy)).toBe(85);
  });

  it('a zero total weight is guarded (no divide-by-zero) → 0', () => {
    const sub = { complianceScore: 90, priceScore: 80, leadTimeScore: 70, reliabilityScore: 60 };
    const zero: WhatIfWeights = { compliance: 0, price: 0, leadTime: 0, reliability: 0 };
    expect(whatIfScore(sub, zero)).toBe(0);
  });

  it('DEFAULT_WEIGHTS names exactly the four award criteria', () => {
    expect(Object.keys(DEFAULT_WEIGHTS).sort()).toEqual([...AWARD_CRITERIA].map((c) => c.key).sort());
  });
});

describe('buildWhatIfOverlay — C6 §2: overlay is NEVER merged into the seam', () => {
  it('returns an id-keyed score map without mutating the seam rows', () => {
    const rows = awardScenarioRows(mockQuotations, 'rfq-003');
    // snapshot the seam values before overlay
    const seamBefore = rows.map((r) => ({ id: r.id, seam: r.aiCompositeScore }));

    const overlay = buildWhatIfOverlay(rows, {
      compliance: 100, price: 0, leadTime: 0, reliability: 0,
    });

    // the overlay is a SEPARATE id-keyed map (the planned values)
    for (const r of rows) expect(overlay[r.id]).toBeTypeOf('number');
    // …and the seam value on every row is byte-for-byte unchanged: the overlay
    // was not written back. This is the inverse of the extraRfqs merge.
    const seamAfter = rows.map((r) => ({ id: r.id, seam: r.aiCompositeScore }));
    expect(seamAfter).toEqual(seamBefore);
  });

  it('a compliance-only re-weight diverges from the seam composite (proves independence)', () => {
    const rows = awardScenarioRows(mockQuotations, 'rfq-003');
    const overlay = buildWhatIfOverlay(rows, {
      compliance: 100, price: 0, leadTime: 0, reliability: 0,
    });
    // qt-003c (sup-010) has a LOW compliance (72) but the seam composite is 80;
    // an all-compliance re-weight must pull the what-if BELOW the seam value —
    // the overlay is a genuinely different number, not a copy of the seam.
    const low = rows.find((r) => r.id === 'qt-003c')!;
    expect(overlay[low.id]).toBe(72);
    expect(overlay[low.id]).not.toBe(low.aiCompositeScore);
  });
});

describe('awardScenarioRows — reads the seam quotations for one RFQ', () => {
  it('carries the seam aiCompositeScore + the four sub-scores read-only', () => {
    const rows = awardScenarioRows(mockQuotations, 'rfq-003');
    expect(rows.map((r) => r.id).sort()).toEqual(['qt-003a', 'qt-003b', 'qt-003c']);
    const a = rows.find((r) => r.id === 'qt-003a')!;
    expect(a.aiCompositeScore).toBe(93); // the committed seam value
    expect(a.complianceScore).toBe(97);
    expect(a.supplierId).toBe('sup-001');
  });
});

describe('SAMPLE_INTAKE_LINES — the C7 §2 intake shape, two producers', () => {
  it('carries at least one SOMO line with lane + segment (SOMO-authored context)', () => {
    const somo = SAMPLE_INTAKE_LINES.filter((l) => l.source === 'SOMO');
    expect(somo.length).toBeGreaterThan(0);
    for (const l of somo) {
      expect(l.suggestedSource).toBeTruthy(); // lane, SOMO-authored
      expect(l.segment).toBeTruthy(); // ABC-XYZ policy class
    }
  });

  it('an INTERNAL_GRID line omits the SOMO-authored fields (nullable internal)', () => {
    const grid = SAMPLE_INTAKE_LINES.filter((l) => l.source === 'INTERNAL_GRID');
    expect(grid.length).toBeGreaterThan(0);
    for (const l of grid) {
      expect(l.suggestedSource).toBeNull();
      expect(l.segment).toBeNull();
    }
  });

  it('quantity provenance is three values: wasAdjusted iff accepted ≠ suggested (C7 §2.1)', () => {
    for (const l of SAMPLE_INTAKE_LINES) {
      expect(l.wasAdjusted).toBe(l.acceptedQty !== l.suggestedQty);
    }
    // at least one line demonstrates a human adjustment (the audit signal)
    expect(SAMPLE_INTAKE_LINES.some((l) => l.wasAdjusted)).toBe(true);
  });

  it('every sample intake line is pre-commit PLANNED (nothing is committed in 1.2a)', () => {
    // 1.2a is READ-ONLY: no push exists, so no line can be committed. The plan
    // state is the C6 overlay axis (per row); the SIMULATED source tier is the
    // registry authority (asserted in the page test, not fabricated here).
    for (const l of SAMPLE_INTAKE_LINES) expect(l.planState).toBe('PLANNED');
  });
});

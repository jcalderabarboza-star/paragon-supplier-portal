import { describe, it, expect } from 'vitest';
import {
  AWARD_CRITERIA,
  DEFAULT_WEIGHTS,
  whatIfScore,
  buildWhatIfOverlay,
  awardScenarioRows,
  SAMPLE_INTAKE_LINES,
  isQtyAdjusted,
  overrideBlocked,
  buildQtyDecision,
  buildPrCreatePayload,
  applyPushResult,
  selectedLine,
  type WhatIfWeights,
  type PrIntakeLine,
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

// ────────────────────────────────────────────────────────────────────────────
// C6-LOCK — the locked-override rule (G1.2b). The reason-gate, the decision
// provenance, the push payload, and the plan-state fold are pure functions so
// the governance is headless-provable regardless of the virtualized grid.
// ────────────────────────────────────────────────────────────────────────────

const suggestedLine: PrIntakeLine = {
  id: 'pil-test-001',
  material: 'Test Material',
  suggestedSource: null,
  segment: null,
  suggestedQty: 5_000,
  acceptedQty: 5_000,
  wasAdjusted: false,
  uom: 'KG',
  period: '2026-Q3',
  estimatedValue: 100_000_000,
  source: 'SOMO',
  planState: 'PLANNED',
};

describe('C6-LOCK — the reason-gate (§8.3): an override needs a reason to commit', () => {
  it('accept-as-suggested is not an override and is never blocked (no reason needed)', () => {
    expect(isQtyAdjusted(suggestedLine, 5_000)).toBe(false);
    expect(overrideBlocked(suggestedLine, 5_000, '')).toBe(false);
  });

  it('an override WITHOUT a reason is BLOCKED — the load-bearing no-dispatch gate', () => {
    expect(isQtyAdjusted(suggestedLine, 4_500)).toBe(true);
    expect(overrideBlocked(suggestedLine, 4_500, '')).toBe(true);
    expect(overrideBlocked(suggestedLine, 4_500, '   ')).toBe(true); // whitespace ≠ reason
  });

  it('an override WITH a reason is permitted (gate opens)', () => {
    expect(overrideBlocked(suggestedLine, 4_500, 'MRP net-req revised down')).toBe(false);
  });
});

describe('C6-LOCK — the decision provenance is the opaque DR-10 audit carrier', () => {
  it('captures field + suggested→accepted (from→to) + trimmed reason + wasAdjusted', () => {
    const d = buildQtyDecision(suggestedLine, 4_500, '  net requirement revised  ');
    expect(d).toEqual({
      field: 'acceptedQty',
      from: 5_000,
      to: 4_500,
      reason: 'net requirement revised',
      wasAdjusted: true,
    });
  });

  it('an accept-as-suggested decision reads wasAdjusted:false (from === to)', () => {
    const d = buildQtyDecision(suggestedLine, 5_000, '');
    expect(d.wasAdjusted).toBe(false);
    expect(d.from).toBe(d.to);
  });
});

describe('C6-LOCK — the push payload (C7 §2.1: acceptedQty → the required quantity)', () => {
  it('maps accepted qty to `quantity`, period to requiredDate, and carries source', () => {
    const payload = buildPrCreatePayload(suggestedLine, 4_500, 'revised');
    expect(payload.quantity).toBe(4_500); // NOT the suggested 5,000 — the accepted value
    expect(payload.material).toBe('Test Material');
    expect(payload.uom).toBe('KG');
    expect(payload.requiredDate).toBe('2026-Q3');
    expect(payload.source).toBe('SOMO');
    expect(payload.reason).toBe('revised'); // an override persists its reason in the payload
  });

  it('an accept-as-suggested push carries NO reason (nothing was overridden)', () => {
    const payload = buildPrCreatePayload(suggestedLine, 5_000, '');
    expect(payload.quantity).toBe(5_000);
    expect('reason' in payload).toBe(false);
  });
});

describe('C6-LOCK — plan-state fold (C6 §6 invariants 2-3)', () => {
  it('push-only-exit: a row commits ONLY on a successful outcome', () => {
    const committed = applyPushResult({ ok: true, entityId: 'PR-2026-901' });
    expect(committed.planState).toBe('committed');
    expect(committed.prNumber).toBe('PR-2026-901');
    expect(committed.failureReason).toBeUndefined();
  });

  it('both-failure-channels-stay-PLANNED: any ok:false leaves the row PLANNED-with-reason', () => {
    // A thrown DataError (SCOPE_DENIED) and a status:'failed' (MISSING_FIELDS)
    // both normalize to ok:false — both keep the row PLANNED.
    const thrown = applyPushResult({ ok: false, reason: 'SCOPE_DENIED' });
    const failed = applyPushResult({ ok: false, reason: 'MISSING_FIELDS:material' });
    for (const s of [thrown, failed]) {
      expect(s.planState).toBe('PLANNED');
      expect(s.prNumber).toBeUndefined();
    }
    expect(thrown.failureReason).toBe('SCOPE_DENIED');
    expect(failed.failureReason).toBe('MISSING_FIELDS:material');
  });
});

// ── G1.3.2 — working-set selection resolver ──────────────────────────────────
describe('selectedLine — resolve the working-set line the drawer edits', () => {
  it('returns the line whose id matches the selection', () => {
    const target = SAMPLE_INTAKE_LINES[1];
    expect(selectedLine(SAMPLE_INTAKE_LINES, target.id)).toBe(target);
  });

  it('returns null when nothing is selected (null id)', () => {
    expect(selectedLine(SAMPLE_INTAKE_LINES, null)).toBeNull();
  });

  it('returns null when the selected id is not in the set (stale selection)', () => {
    expect(selectedLine(SAMPLE_INTAKE_LINES, 'no-such-id')).toBeNull();
  });
});

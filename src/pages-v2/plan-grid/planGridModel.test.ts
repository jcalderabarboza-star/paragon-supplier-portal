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
  applyPushResult,
  selectedLine,
  type WhatIfWeights,
  type PrIntakeLine,
} from './planGridModel';
import { buildPrCreatePayload } from '../requisitions/prCreatePayload';
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

  // ⚠️ **TWO SPECS RETIRED HERE, AND THE FLOOR FOLLOWS THEM DOWN RATHER THAN
  // BEING TOPPED UP.** They asserted `wasAdjusted === (accepted !== suggested)`
  // and `planState === 'PLANNED'` over the fixture — and BOTH FIELDS HAVE LEFT
  // THE FIXTURE (A1-R2, A2). There is nothing left on a producer row for either
  // to be wrong about, so a guard here could no longer fail, and a guard that
  // can no longer fail is worse than none. The claims did not disappear: the
  // derivation is asserted over the SEAM population, in both directions and
  // with an anti-vacuity control, in `prIntakeRead.test.ts`, which is where the
  // value is now produced.
  it('a producer row carries no triage field at all — the machine owns those', () => {
    // The positive control this replacement needs: the two quantities are still
    // here, so the derivation has operands. What is gone is the ASSERTION about
    // them that a fixture could author.
    for (const l of SAMPLE_INTAKE_LINES) {
      expect(typeof l.suggestedQty).toBe('number');
      expect(typeof l.acceptedQty).toBe('number');
      expect('wasAdjusted' in l).toBe(false);
      expect('planState' in l).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C6-LOCK — the locked-override rule (G1.2b). The reason-gate, the decision
// provenance, the push payload, and the plan-state fold are pure functions so
// the governance is headless-provable regardless of the virtualized grid.
// ────────────────────────────────────────────────────────────────────────────

// A line the producer did NOT adjust: delivered === suggested, so the baseline
// and the suggestion coincide and the two readings of C6-LOCK agree.
const asDeliveredLine: PrIntakeLine = {
  id: 'pil-test-001',
  material: 'Test Material',
  suggestedSource: null,
  segment: null,
  suggestedQty: 5_000,
  acceptedQty: 5_000,
  uom: 'KG',
  periodBucket: '2026-09',
  estimatedValue: 100_000_000,
  source: 'SOMO',
};

// ⚠️ **THE LINE THE RULING IS ABOUT, AND IT IS `pil-somo-002`'S SHAPE.** The
// producer trimmed 5,000 to 4,500. Against `suggestedQty` — the operand this
// gate used until A2 — committing the DELIVERED 4,500 reads as an override and
// the drawer would demand a planner's justification for SOMO's own arithmetic,
// while Intake Review pushed 5,000 for the same requirement. Every assertion
// below that uses this line is the probe firing at a defect the tree really had.
const producerTrimmedLine: PrIntakeLine = {
  ...asDeliveredLine,
  id: 'pil-test-002',
  suggestedQty: 5_000,
  acceptedQty: 4_500,
};

describe('C6-LOCK — the reason-gate (§8.3): an override needs a reason to commit', () => {
  it('accept-as-delivered is not an override and is never blocked (no reason needed)', () => {
    expect(isQtyAdjusted(asDeliveredLine, 5_000)).toBe(false);
    expect(overrideBlocked(asDeliveredLine, 5_000, '')).toBe(false);
  });

  // ── A1-R2: THE BASELINE IS THE PRODUCER'S DELIVERED QUANTITY ───────────
  //
  // These two are the whole ruling, and they are a BILATERAL pair: the first
  // says the producer's delta is not the planner's to justify, the second says
  // the planner's own move still is. Either alone is satisfied by a gate that
  // is simply broken in one direction.
  it('a PRODUCER-trimmed line commits its delivered qty with NO reason (A1-R2)', () => {
    expect(isQtyAdjusted(producerTrimmedLine, 4_500)).toBe(false);
    expect(overrideBlocked(producerTrimmedLine, 4_500, '')).toBe(false);
  });

  it('but the PLANNER leaving that delivered qty still owes one (the gate stands)', () => {
    expect(isQtyAdjusted(producerTrimmedLine, 4_200)).toBe(true);
    expect(overrideBlocked(producerTrimmedLine, 4_200, '')).toBe(true);
    expect(overrideBlocked(producerTrimmedLine, 4_200, 'line yield revised')).toBe(false);
  });

  // The old operand, named so the regression is caught rather than re-argued:
  // committing the producer's SUGGESTION on a trimmed line is the planner
  // moving the number UP, which owes a reason exactly like any other move.
  it('committing the producer\u2019s SUGGESTION on a trimmed line is itself an override', () => {
    expect(isQtyAdjusted(producerTrimmedLine, 5_000)).toBe(true);
    expect(overrideBlocked(producerTrimmedLine, 5_000, '')).toBe(true);
  });

  it('an override WITHOUT a reason is BLOCKED — the load-bearing no-dispatch gate', () => {
    expect(isQtyAdjusted(asDeliveredLine, 4_500)).toBe(true);
    expect(overrideBlocked(asDeliveredLine, 4_500, '')).toBe(true);
    expect(overrideBlocked(asDeliveredLine, 4_500, '   ')).toBe(true); // whitespace ≠ reason
  });

  it('an override WITH a reason is permitted (gate opens)', () => {
    expect(overrideBlocked(asDeliveredLine, 4_500, 'MRP net-req revised down')).toBe(false);
  });
});

describe('C6-LOCK — the decision provenance is the opaque DR-10 audit carrier', () => {
  it('captures field + delivered→committed (from→to) + the trimmed reason', () => {
    const d = buildQtyDecision(asDeliveredLine, 4_500, '  net requirement revised  ');
    expect(d).toEqual({
      field: 'acceptedQty',
      from: 5_000,
      to: 4_500,
      reason: 'net requirement revised',
    });
  });

  // ⚠️ **`wasAdjusted` IS ABSENT BY TYPE AND THIS ASSERTS THE ABSENCE**
  // (A1-R2a). `toEqual` above would pass over an extra key on some matchers and
  // this would not, which is the point: the ruling is that no caller HAS the
  // key, so its presence is the defect rather than its value.
  it('carries NO wasAdjusted — the dispatcher derives it, no caller authors it', () => {
    const d = buildQtyDecision(asDeliveredLine, 4_500, 'revised');
    expect('wasAdjusted' in d).toBe(false);
  });

  // The baseline, pinned. A `from` that still held the SUGGESTION would make
  // the dispatcher faithfully derive the wrong fact onto an append-only ledger.
  it('measures `from` against the PRODUCER’s delivered quantity, not the suggestion', () => {
    const d = buildQtyDecision(producerTrimmedLine, 4_200, 'line yield revised');
    expect(d.from).toBe(4_500);
    expect(d.from).not.toBe(producerTrimmedLine.suggestedQty);
  });
});

describe('C6-LOCK — the push payload (C7 §2.1: acceptedQty → the required quantity)', () => {
  it('maps committed qty to `quantity` and carries source', () => {
    const payload = buildPrCreatePayload(asDeliveredLine, 4_500, 'revised');
    expect(payload.quantity).toBe(4_500); // NOT the delivered 5,000 — the committed value
    expect(payload.material).toBe('Test Material');
    expect(payload.uom).toBe('KG');
    expect(payload.source).toBe('SOMO');
    expect(payload.reason).toBe('revised'); // an override persists its reason in the payload
  });

  // ⚠️ **THE BUCKET NO LONGER RIDES IN `requiredDate`, AND THIS IS THE GUARD
  // THAT KEEPS IT OUT** (A1-R1). The builder read `requiredDate: line.period`,
  // so a date-typed, date-named field held a planning grain — and the one form
  // `Date` parses, a month, rendered as `01 Sept 2026`: a specific day nobody
  // entered, which reads as an answer. A missing figure is honest; a fabricated
  // one is not, and the fabricated one is worse.
  it('claims NO required date — the bucket is not a day and nobody named one', () => {
    const payload = buildPrCreatePayload(asDeliveredLine, 4_500, 'revised');
    expect(payload.requiredDate).toBeUndefined();
    // And the bucket is nowhere in this payload under any name: the CASCADE
    // adds `periodBucket`, because it is the layer that knows the line's id too.
    expect('periodBucket' in payload).toBe(false);
  });

  it('an accept-as-delivered push carries NO reason (nothing was overridden)', () => {
    const payload = buildPrCreatePayload(asDeliveredLine, 5_000, '');
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

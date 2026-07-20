import { describe, it, expect } from 'vitest';
import { SCHEDULING_AGREEMENT_CTR003, SCHEDULING_AGREEMENTS } from '../fixtures';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { mockContracts } from '../../../data/mockContracts';

// Batch-1 fixture integrity: the ctr-003 SIMULATED anchor is honest by
// construction. These assert the invariants the fixture must never violate —
// uom keyed off the master, Σ === envelope per item, NO fabricated fulfillment,
// all-draft, unique releaseRefs, an in-window calendar, and a SIMULATED marker.

const AGREEMENT = SCHEDULING_AGREEMENT_CTR003;
const CTR003 = mockContracts.find((c) => c.id === 'ctr-003')!;

describe('SCHEDULING_AGREEMENT_CTR003 — anchoring + honesty markers', () => {
  it('is a bound (SIMULATED) LPA agreement over ctr-003 / sup-007', () => {
    expect(AGREEMENT.contractId).toBe('ctr-003');
    expect(AGREEMENT.supplierId).toBe('sup-007');
    expect(AGREEMENT.supplierId).toBe(CTR003.supplierId); // matches the real header
    expect(AGREEMENT.docType).toBe('LPA');
    expect(AGREEMENT.sapAgreementNumber).toBeTruthy(); // Decision C — bound
    expect(AGREEMENT.liveness).toBe('SIMULATED');
  });

  it('is the sole Batch-1 fixture', () => {
    expect(SCHEDULING_AGREEMENTS).toEqual([AGREEMENT]);
  });
});

describe('SCHEDULING_AGREEMENT_CTR003 — per-item invariants', () => {
  it('each item uom equals its MATERIAL_MASTER canonicalUom (SDC invariant #2)', () => {
    for (const item of AGREEMENT.items) {
      expect(item.uom).toBe(MATERIAL_MASTER[item.materialCode].canonicalUom);
    }
  });

  it('Σ plannedQty === agreedTotalQty per item', () => {
    for (const item of AGREEMENT.items) {
      const sum = item.scheduleLines.reduce((s, l) => s + l.plannedQty, 0);
      expect(sum).toBe(item.agreedTotalQty);
    }
  });

  it('contractDefault === active at seed (no deviation)', () => {
    for (const item of AGREEMENT.items) {
      expect(item.drawdownPolicy.active).toEqual(item.drawdownPolicy.contractDefault);
    }
  });

  it('exercises both generator paths (12 remainder-tail, 10 even)', () => {
    const item10 = AGREEMENT.items.find((i) => i.lineSeq === 10)!;
    const item20 = AGREEMENT.items.find((i) => i.lineSeq === 20)!;
    expect(item10.scheduleLines).toHaveLength(12);
    expect(item10.scheduleLines[11].plannedQty).toBe(20_000); // remainder
    expect(item20.scheduleLines).toHaveLength(10);
    expect(item20.scheduleLines.every((l) => l.plannedQty === 200_000)).toBe(true); // even
  });
});

describe('SCHEDULING_AGREEMENT_CTR003 — line-level honesty', () => {
  const allLines = AGREEMENT.items.flatMap((i) => i.scheduleLines);

  it('every line is draft', () => {
    expect(allLines.every((l) => l.state === 'draft')).toBe(true);
  });

  it('no fabricated fulfillment anywhere (no actualQty / fulfilledDate / fulfilledBy)', () => {
    for (const l of allLines) {
      expect(l.actualQty).toBeUndefined();
      expect(l.fulfilledDate).toBeUndefined();
      expect(l.fulfilledBy).toBeUndefined();
    }
  });

  it('releaseRef is unique across the whole agreement', () => {
    const refs = allLines.map((l) => l.releaseRef);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('every release date falls inside the ctr-003 validity window', () => {
    for (const l of allLines) {
      expect(l.releaseDate >= CTR003.startDate).toBe(true);
      expect(l.releaseDate <= CTR003.endDate).toBe(true);
    }
  });
});

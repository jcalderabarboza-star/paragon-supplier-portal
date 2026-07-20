import { describe, it, expect, afterEach } from 'vitest';
import { sdcClock, SDC_SIMULATED_NOW } from '../clock';
import { declarationRecency, currentDeclarations } from '../inventory';
import type { InventoryDeclaration, Provenance } from '../types';

// SDC-4a — the shared SIMULATED clock + the seq-order "current declaration"
// helpers, PURE. These lock the two halves of the collision fix independently of
// any React surface or dispatch:
//   · the clock is ONE injectable simulated "now", sitting past the seed cycle;
//   · "current SOH" is by store-insertion recency (id-seq), NOT declaredAt, so a
//     fresh declare wins over a FUTURE-DATED seed even when its stamp is earlier.

const PROV: Provenance = { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' };

/** A minimal declaration — `id` carries the store's insertion-sequence token,
 *  `declaredAt` is deliberately variable so recency can be shown to ignore it. */
function decl(
  id: string,
  overrides: Partial<InventoryDeclaration> = {},
): InventoryDeclaration {
  return {
    id,
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3310',
    declaredAt: '2026-08-03T08:15:00.000Z',
    totalQty: 1000,
    uom: 'KG',
    provenance: PROV,
    ...overrides,
  };
}

afterEach(() => sdcClock.reset());

describe('sdcClock — the ONE shared simulated now', () => {
  it('defaults to SDC_SIMULATED_NOW', () => {
    expect(sdcClock.now()).toBe(SDC_SIMULATED_NOW);
    expect(SDC_SIMULATED_NOW).toBe('2026-08-25T12:00:00.000Z');
  });

  it('sits PAST the latest seed stamp (2026-08-18) and PAST the R2 deadline (2026-08-22)', () => {
    expect(Date.parse(sdcClock.now())).toBeGreaterThan(Date.parse('2026-08-18T07:30:00.000Z'));
    expect(Date.parse(sdcClock.now())).toBeGreaterThan(Date.parse('2026-08-22T00:00:00.000Z'));
  });

  it('is injectable (set) and restorable (reset) — the test seam only', () => {
    sdcClock.set('2026-07-20T00:00:00.000Z');
    expect(sdcClock.now()).toBe('2026-07-20T00:00:00.000Z');
    sdcClock.reset();
    expect(sdcClock.now()).toBe(SDC_SIMULATED_NOW);
  });
});

describe('declarationRecency — the insertion-sequence token (clock-independent)', () => {
  it('parses the id suffix; a live declare (inv-9xxx) outranks a seed (inv-0xxx)', () => {
    expect(declarationRecency(decl('inv-0001'))).toBe(1);
    expect(declarationRecency(decl('inv-0003'))).toBe(3);
    expect(declarationRecency(decl('inv-9001'))).toBe(9001);
    expect(declarationRecency(decl('inv-9001'))).toBeGreaterThan(declarationRecency(decl('inv-0003')));
  });

  it('ignores declaredAt entirely — recency is the id alone', () => {
    const earlyStampHighSeq = decl('inv-9001', { declaredAt: '2026-07-20T00:00:00.000Z' });
    const lateStampLowSeq = decl('inv-0003', { declaredAt: '2026-08-05T00:00:00.000Z' });
    expect(declarationRecency(earlyStampHighSeq)).toBeGreaterThan(declarationRecency(lateStampLowSeq));
  });

  it('an id with no digits sorts oldest (0)', () => {
    expect(declarationRecency(decl('inv-syn'))).toBe(0);
  });
});

describe('currentDeclarations — latest per pair by recency, defeating the collision', () => {
  it('a fresh declare (inv-9xxx, EARLIER stamp) beats a future-dated seed (inv-0xxx)', () => {
    const seed = decl('inv-0003', { totalQty: 45000, declaredAt: '2026-08-05T09:20:00.000Z' });
    const fresh = decl('inv-9001', { totalQty: 50000, declaredAt: '2026-07-20T00:00:00.000Z' });
    // Store order is newest-first, but recency does not depend on array order:
    const current = currentDeclarations([fresh, seed]);
    expect(current).toHaveLength(1);
    expect(current[0].totalQty).toBe(50000); // the fresh declare — NOT the 45 000 seed
    // …and the same holds if the caller passes them oldest-first.
    expect(currentDeclarations([seed, fresh])[0].totalQty).toBe(50000);
  });

  it('keeps one entry per supplier × material pair', () => {
    const out = currentDeclarations([
      decl('inv-0001', { supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', totalQty: 100 }),
      decl('inv-9002', { supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', totalQty: 200 }),
      decl('inv-0005', { supplierId: 'sup-005', materialCode: 'RM-EMUL-3310', totalQty: 300 }),
    ]);
    const byPair = new Map(out.map((d) => [`${d.supplierId}|${d.materialCode}`, d.totalQty]));
    expect(byPair.get('sup-002|RM-EMUL-3310')).toBe(200); // the higher-seq snapshot
    expect(byPair.get('sup-005|RM-EMUL-3310')).toBe(300);
    expect(out).toHaveLength(2);
  });

  it('empty input → empty output (nothing fabricated)', () => {
    expect(currentDeclarations([])).toEqual([]);
  });
});

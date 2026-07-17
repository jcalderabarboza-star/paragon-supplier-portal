import { describe, it, expect } from 'vitest';
import { parseGrid, type DispatchUnit, type GridContext, type GridRow } from '../index';

// SDC-3c-a — the shared ingestion adapter. These tests lock the PURE-CORE
// contract: rows → dispatch units, reusing the proven builders. What they prove:
//   · batch-fold N→1 (the R-4 headline): N batch rows fold into ONE declaration;
//   · TOTAL-FIRST reconciliation: Σ=total passes, Σ≠total fails HONESTLY;
//   · per-row coercion (comma-tolerant) + honest-silence ({ok:false}, no payload);
//   · un-falsifiability INHERITED from the builders: uom absent, supplierId from
//     context (never a cell), materialCode from context in batch-fold;
//   · import 1:1 partial success (each row succeeds/fails alone).

// A batch-fold context for one material with a stated total floor.
const batchFold = (materialCode: string, totalQty: string): GridContext => ({
  supplierId: 'sup-002',
  spec: { kind: 'InventoryDeclaration', mode: 'batch-fold', materialCode, totalQty },
});
const importCtx: GridContext = {
  supplierId: 'sup-002',
  spec: { kind: 'InventoryDeclaration', mode: 'import' },
};

/** Narrow to the ok unit (fails the test loudly if the unit was a failure). */
function okUnit(u: DispatchUnit): Extract<DispatchUnit, { ok: true }> {
  if (!u.ok) throw new Error(`expected ok unit, got failure: ${u.reason}`);
  return u;
}

describe('parseGrid — batch-fold (N batch rows → ONE declaration)', () => {
  it('folds N valid batch rows into one declare payload; rowRefs aggregate', () => {
    const rows: GridRow[] = [
      { batchNumber: 'GLY-24A', qty: '1,800', expiryDate: '2027-06-30' },
      { batchNumber: 'GLY-24B', qty: '2200' },
    ];
    const units = parseGrid(rows, batchFold('RM-EMUL-3310', '4000'));
    expect(units).toHaveLength(1); // atomic — one declaration
    const u = okUnit(units[0]);
    expect(u.kind).toBe('InventoryDeclaration');
    expect(u.rowRefs).toEqual([0, 1]); // both folded rows
    expect(u.payload).toEqual({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      totalQty: 4000,
      batches: [
        { batchNumber: 'GLY-24A', qty: 1800, expiryDate: '2027-06-30' },
        { batchNumber: 'GLY-24B', qty: 2200 },
      ],
    });
    expect('uom' in u.payload).toBe(false); // master owns the unit (invariant #2)
  });

  it('Σ = total passes; Σ ≠ total fails HONESTLY (BATCH_TOTAL_MISMATCH, no payload)', () => {
    const rows: GridRow[] = [
      { batchNumber: 'A', qty: '1000' },
      { batchNumber: 'B', qty: '1500' },
    ];
    // Σ = 2500 vs stated 3000 → the reconciliation gate fails.
    const [fail] = parseGrid(rows, batchFold('RM-EMUL-3310', '3000'));
    expect(fail).toEqual({ ok: false, rowRefs: [0, 1], reason: 'BATCH_TOTAL_MISMATCH' });
    expect('payload' in fail).toBe(false); // never a fabricated payload

    // Correct the total → passes.
    const [pass] = parseGrid(rows, batchFold('RM-EMUL-3310', '2500'));
    expect(pass.ok).toBe(true);
  });

  it('total-only (no itemised batches) is legal and honest — TOTAL-FIRST', () => {
    // Only trailing blank add-rows: a stated total with no batch detail.
    const rows: GridRow[] = [{ batchNumber: '', qty: '', expiryDate: '' }];
    const u = okUnit(parseGrid(rows, batchFold('RM-EMUL-3310', '4000'))[0]);
    expect(u.payload).toEqual({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      totalQty: 4000,
    });
    expect('batches' in u.payload).toBe(false); // no fabricated detail
    expect(u.rowRefs).toEqual([]); // no rows folded
  });

  it('a blank total floor fails EMPTY_TOTAL (total-first requires the floor)', () => {
    const [fail] = parseGrid([{ batchNumber: 'A', qty: '10' }], batchFold('RM-EMUL-3310', '  '));
    expect(fail).toEqual({ ok: false, rowRefs: [], reason: 'EMPTY_TOTAL' });
  });

  it('a data row with a blank batch number fails MISSING_BATCH_NUMBER (that row)', () => {
    const rows: GridRow[] = [
      { batchNumber: 'A', qty: '1000' },
      { batchNumber: '', qty: '3000' }, // qty present, no number → incomplete
    ];
    const [fail] = parseGrid(rows, batchFold('RM-EMUL-3310', '4000'));
    expect(fail).toEqual({ ok: false, rowRefs: [1], reason: 'MISSING_BATCH_NUMBER' });
  });

  it('a non-numeric / negative qty fails INVALID_QTY (never coerced to 0)', () => {
    const bad: GridRow[] = [{ batchNumber: 'A', qty: 'lots' }];
    expect(parseGrid(bad, batchFold('RM-EMUL-3310', '4000'))[0]).toEqual({
      ok: false,
      rowRefs: [0],
      reason: 'INVALID_QTY',
    });
    const neg: GridRow[] = [{ batchNumber: 'A', qty: '-5' }];
    expect(parseGrid(neg, batchFold('RM-EMUL-3310', '4000'))[0]).toMatchObject({
      ok: false,
      reason: 'INVALID_QTY',
    });
  });

  it('trailing blank add-rows are ignored, not errors', () => {
    const rows: GridRow[] = [
      { batchNumber: 'A', qty: '4000' },
      { batchNumber: '', qty: '', expiryDate: '' }, // the grid's empty add-row
    ];
    const u = okUnit(parseGrid(rows, batchFold('RM-EMUL-3310', '4000'))[0]);
    expect(u.rowRefs).toEqual([0]); // only the real row folded
  });

  it('identity + material come from context, NEVER a cell (un-falsifiable)', () => {
    // A malicious grid tries to inject a supplierId AND a materialCode cell.
    const rows: GridRow[] = [
      { batchNumber: 'A', qty: '4000', supplierId: 'sup-EVIL', materialCode: 'RM-SPOOF' },
    ];
    const u = okUnit(parseGrid(rows, batchFold('RM-EMUL-3310', '4000'))[0]);
    expect(u.payload.supplierId).toBe('sup-002'); // from context
    expect(u.payload.materialCode).toBe('RM-EMUL-3310'); // from context, not the cell
  });
});

describe('parseGrid — import (each row → one declaration, 1:1)', () => {
  it('maps N rows to N units with per-row partial success', () => {
    const rows: GridRow[] = [
      { materialCode: 'RM-EMUL-3310', totalQty: '4,000' }, // ok
      { materialCode: '', totalQty: '900' }, // missing material → fails alone
      { materialCode: 'PK-PETB-8810', totalQty: '12000' }, // ok
    ];
    const units = parseGrid(rows, importCtx);
    expect(units).toHaveLength(3);
    expect(okUnit(units[0]).payload).toEqual({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      totalQty: 4000,
    });
    expect(units[1]).toEqual({ ok: false, rowRefs: [1], reason: 'MISSING_MATERIAL' });
    expect(units[2].ok).toBe(true); // a sibling failure never sinks the good rows
  });

  it('an import row with material but no total fails EMPTY_TOTAL', () => {
    const [fail] = parseGrid([{ materialCode: 'RM-EMUL-3310', totalQty: '' }], importCtx);
    expect(fail).toEqual({ ok: false, rowRefs: [0], reason: 'EMPTY_TOTAL' });
  });

  it('a non-numeric total fails INVALID_QTY', () => {
    const [fail] = parseGrid([{ materialCode: 'RM-EMUL-3310', totalQty: 'plenty' }], importCtx);
    expect(fail).toEqual({ ok: false, rowRefs: [0], reason: 'INVALID_QTY' });
  });

  it('an all-blank import is honest silence, NOT a silent empty success (NO_ROWS)', () => {
    const units = parseGrid([{ materialCode: '', totalQty: '' }], importCtx);
    expect(units).toEqual([{ ok: false, rowRefs: [], reason: 'NO_ROWS' }]);
  });

  it('import supplierId comes from context, never a cell', () => {
    const rows: GridRow[] = [
      { materialCode: 'RM-EMUL-3310', totalQty: '4000', supplierId: 'sup-EVIL' },
    ];
    expect(okUnit(parseGrid(rows, importCtx)[0]).payload.supplierId).toBe('sup-002');
  });
});

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
    // CP-0 · PR-2a floor correction: this row read '1,800' and expected 1800 —
    // the EN reading of a token that is 1.8 under id. An unambiguous cell keeps
    // the fold property under test without baking a convention into it; the
    // ambiguous form is asserted as a REFUSAL in its own case below.
    const rows: GridRow[] = [
      { batchNumber: 'GLY-24A', qty: '1800', expiryDate: '2027-06-30' },
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

  // CP-0 · W1 — the convention collision, asserted rather than assumed. "1,800"
  // is 1800 under en and 1.8 under id: a plausible wrong number either way, so
  // it refuses unless the caller states which convention the cell was typed in.
  it('an AMBIGUOUS batch qty REFUSES — never the EN reading, never a guess', () => {
    const rows: GridRow[] = [{ batchNumber: 'A', qty: '1,800' }];
    expect(parseGrid(rows, batchFold('RM-EMUL-3310', '1800'))[0]).toEqual({
      ok: false,
      rowRefs: [0],
      reason: 'AMBIGUOUS_QTY',
    });
  });

  it('an AMBIGUOUS total REFUSES too — the floor is not guessed either', () => {
    const [fail] = parseGrid([{ batchNumber: 'A', qty: '4000' }], batchFold('RM-EMUL-3310', '4.000'));
    expect(fail).toEqual({ ok: false, rowRefs: [], reason: 'AMBIGUOUS_QTY' });
  });

  it('a numberFormatHint resolves a typed ambiguity — id reads "1.800" as 1800', () => {
    const ctx: GridContext = {
      ...batchFold('RM-EMUL-3310', '1.800'),
      numberFormatHint: 'id',
    };
    const u = okUnit(parseGrid([{ batchNumber: 'A', qty: '1.800' }], ctx)[0]);
    // Both the Σ gate and the payload used the SAME parse — 1800, not 1.8.
    expect(u.payload).toMatchObject({ totalQty: 1800, batches: [{ batchNumber: 'A', qty: 1800 }] });
  });

  it('the gate and the payload can never disagree — one parse feeds both', () => {
    // The Σ-reconciliation gate passes only because Σ batches equals the total;
    // whatever number cleared that gate is exactly what the payload carries.
    const rows: GridRow[] = [
      { batchNumber: 'A', qty: '1500' },
      { batchNumber: 'B', qty: '2500' },
    ];
    const u = okUnit(parseGrid(rows, batchFold('RM-EMUL-3310', '4000'))[0]);
    const batches = (u.payload.batches as readonly { qty: number }[]).map((b) => b.qty);
    expect(batches.reduce((s, q) => s + q, 0)).toBe(u.payload.totalQty);
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
  // CP-0 · PR-2a floor REPLACEMENT: row 0 read '4,000' and expected 4000 — the
  // EN reading of a token that is 4 under id. Under the one legal parser that
  // row now REFUSES, which would have made it a second failure and destroyed
  // the property this test exists for. The good row is restated unambiguously so
  // partial success is still proven by a genuine ok/fail/ok mix; the ambiguous
  // row gets its own case below, where the refusal is the point.
  it('maps N rows to N units with per-row partial success', () => {
    const rows: GridRow[] = [
      { materialCode: 'RM-EMUL-3310', totalQty: '4000' }, // ok
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

  // §5a HARDENING — an import row's convention belongs to whoever WROTE the
  // sheet, and we do not know them. So import mode is hint-free by construction:
  // an ambiguous cell refuses on its own row and its siblings still land.
  it('an AMBIGUOUS total refuses that row ALONE — import never hint-resolves', () => {
    const rows: GridRow[] = [
      { materialCode: 'RM-EMUL-3310', totalQty: '4.000' }, // 4000 (id) or 4 (en)
      { materialCode: 'PK-PETB-8810', totalQty: '12000' }, // unambiguous → ok
    ];
    const units = parseGrid(rows, importCtx);
    expect(units[0]).toEqual({ ok: false, rowRefs: [0], reason: 'AMBIGUOUS_QTY' });
    expect(units[1].ok).toBe(true);
  });

  it('a numberFormatHint is IGNORED in import mode — unknown origin, no guessing', () => {
    const hinted: GridContext = { ...importCtx, numberFormatHint: 'id' };
    const [unit] = parseGrid([{ materialCode: 'RM-EMUL-3310', totalQty: '4.000' }], hinted);
    // The same row that an id hint would resolve in a TYPED grid still refuses here.
    expect(unit).toEqual({ ok: false, rowRefs: [0], reason: 'AMBIGUOUS_QTY' });
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

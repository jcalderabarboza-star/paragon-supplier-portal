import { describe, it, expect } from 'vitest';
import { normalizeQty, parseChannelReply } from '../replyParser';
import { parseGrid, type GridContext } from '../../sdc';

describe('C1 — locale-aware quantity normalisation', () => {
  // The four cases the binding constraint names — each resolves CORRECTLY under
  // the right convention, and NEVER produces the catastrophic wrong number.
  it('"2400" is unambiguous under both conventions → 2400', () => {
    const r = normalizeQty('2400');
    expect(r).toEqual({ ok: true, canonical: '2400', value: 2400 });
  });

  it('"2.400" (ID thousands) → 2400 with an id hint', () => {
    const r = normalizeQty('2.400', 'id');
    expect(r).toEqual({ ok: true, canonical: '2400', value: 2400 });
  });

  it('"2,400" (EN thousands) → 2400 with an en hint', () => {
    const r = normalizeQty('2,400', 'en');
    expect(r).toEqual({ ok: true, canonical: '2400', value: 2400 });
  });

  it('"2,4" (ID decimal) → 2.4 — unambiguous, EN comma-thousands is illegal here', () => {
    // No hint needed: "2,4" is only valid as an ID decimal (EN thousands needs 3
    // trailing digits), so it can NEVER be read as 24.
    expect(normalizeQty('2,4')).toEqual({ ok: true, canonical: '2.4', value: 2.4 });
    expect(normalizeQty('2,4', 'id')).toEqual({ ok: true, canonical: '2.4', value: 2.4 });
  });

  it('NEVER produces a plausible wrong number', () => {
    // "2.400" must never become 2.4 under an id reading …
    expect(normalizeQty('2.400', 'id').ok && normalizeQty('2.400', 'id')).toMatchObject({
      value: 2400,
    });
    // … and "2,4" must never become 24.
    const r = normalizeQty('2,4', 'id');
    expect(r.ok && r.value).toBe(2.4);
    expect(r.ok && r.value).not.toBe(24);
  });

  it('refuses genuinely cross-convention-ambiguous values with no hint', () => {
    // "2.400" = 2400 (ID) or 2.4 (EN): both valid, different, no hint → honest refusal.
    expect(normalizeQty('2.400')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
    expect(normalizeQty('2,400')).toEqual({ ok: false, reason: 'AMBIGUOUS_QTY' });
  });

  it('refuses empty / non-numeric tokens honestly', () => {
    expect(normalizeQty('')).toEqual({ ok: false, reason: 'EMPTY_QTY' });
    expect(normalizeQty('abc')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
    expect(normalizeQty('2..4')).toEqual({ ok: false, reason: 'NOT_NUMERIC' });
  });

  it('handles a two-separator value by last-separator-is-decimal', () => {
    expect(normalizeQty('2.400,5', 'id')).toEqual({ ok: true, canonical: '2400.5', value: 2400.5 });
    expect(normalizeQty('2,400.5', 'en')).toEqual({ ok: true, canonical: '2400.5', value: 2400.5 });
  });
});

describe('C1 — reply parser (inference wrapper)', () => {
  it('a structured STOK reply parses to proposedRows + diagnostics', () => {
    const res = parseChannelReply('STOK MAT-10234 2.400 KG', { numberFormatHint: 'id' });
    expect(res.proposedRows).toEqual([{ materialCode: 'MAT-10234', totalQty: '2400' }]);
    expect(res.specHint).toEqual({ kind: 'InventoryDeclaration', mode: 'import' });
    expect(res.diagnostics.matchedTokens).toEqual(['STOK', 'MAT-10234', '2.400', 'KG']);
    expect(res.diagnostics.confidence).toBeGreaterThan(0.5);
  });

  it('the proposed row has NO supplierId slot (un-falsifiability by construction)', () => {
    const res = parseChannelReply('STOK MAT-10234 2400', { numberFormatHint: 'id' });
    const row = res.proposedRows[0];
    expect(Object.keys(row).sort()).toEqual(['materialCode', 'totalQty']);
    expect(row).not.toHaveProperty('supplierId');
    // Even a reply that literally claims an identity cannot inject one.
    const spoof = parseChannelReply('STOK MAT-10234 2400 supplierId=sup-999', {
      numberFormatHint: 'id',
    });
    expect(spoof.proposedRows[0]).not.toHaveProperty('supplierId');
  });

  it('parses uom as a DIAGNOSTIC only — never into a row', () => {
    const res = parseChannelReply('STOK MAT-10234 2400 KG', { numberFormatHint: 'id' });
    expect(res.diagnostics.uom).toBe('KG');
    expect(JSON.stringify(res.proposedRows)).not.toContain('KG');
  });

  it('the wrapper never reaches a payload — the confirm path hands parseGrid bare rows', () => {
    // C2 STRIPS the wrapper and calls parseGrid(proposedRows, context). The
    // supplierId comes from context (the app binding), NOT the message; the
    // locale-correct 2400 flows through; nothing from diagnostics/uom/confidence
    // enters the payload.
    const res = parseChannelReply('STOK MAT-10234 2.400 KG', { numberFormatHint: 'id' });
    const context: GridContext = {
      supplierId: 'sup-005',
      spec: { kind: 'InventoryDeclaration', mode: 'import' },
    };
    const units = parseGrid(res.proposedRows, context);
    expect(units).toEqual([
      {
        ok: true,
        kind: 'InventoryDeclaration',
        payload: { supplierId: 'sup-005', materialCode: 'MAT-10234', totalQty: 2400 },
        rowRefs: [0],
      },
    ]);
  });

  it('honest silence: unparseable text → no rows, null specHint', () => {
    const res = parseChannelReply('halo pak, apa kabar hari ini?');
    expect(res.proposedRows).toEqual([]);
    expect(res.specHint).toBeNull();
    expect(res.diagnostics.confidence).toBe(0);
    expect(res.diagnostics.unparsedRemainder).toBe('halo pak, apa kabar hari ini?');
  });

  it('honest silence: recognised command but an AMBIGUOUS qty → no row, honest reason', () => {
    // "2.400" with no hint is genuinely ambiguous — the parser refuses the row.
    const res = parseChannelReply('STOK MAT-10234 2.400');
    expect(res.proposedRows).toEqual([]);
    expect(res.specHint).toEqual({ kind: 'InventoryDeclaration', mode: 'import' });
    expect(res.diagnostics.qtyReason).toBe('AMBIGUOUS_QTY');
  });

  it('honest silence: recognised command but a missing part → no row', () => {
    const res = parseChannelReply('STOK');
    expect(res.proposedRows).toEqual([]);
    expect(res.specHint).toEqual({ kind: 'InventoryDeclaration', mode: 'import' });
  });

  it('accepts the EN command spelling and an en hint', () => {
    const res = parseChannelReply('STOCK MAT-10234 2,400 KG', { numberFormatHint: 'en' });
    expect(res.proposedRows).toEqual([{ materialCode: 'MAT-10234', totalQty: '2400' }]);
  });
});

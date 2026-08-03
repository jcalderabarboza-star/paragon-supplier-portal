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

// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · B1 — PARSER PRECEDENCE. This is a FABRICATION defect, not silence.
//
// `isCodeLike` (now `isMixedAlnum`) required at least one LETTER, and canonical
// S/4 MATNR is frequently NUMERIC. The material and quantity classifiers ran as
// independent first-match scans with NO precedence, so a numeric code lost the
// race to `isQtyLike` and was captured as the QUANTITY — proposing a plausible
// WRONG ROW into the hub, gated only by a human confirm.
// ─────────────────────────────────────────────────────────────────────────────
describe('C1 — membership-first material classification (CP-2 · B1)', () => {
  const NUMERIC = ['10234'];

  it('THE DEFECT: without membership, a numeric MATNR is read as the QUANTITY', () => {
    // Pinned deliberately — this is the pre-fix behaviour, and it is what the
    // membership set exists to prevent. Shape-only is still the documented
    // fallback when no set is supplied.
    const r = parseChannelReply('STOK 10234 500 KG');
    // No mixed-alphanumeric token ⇒ no material at all, so no row is emitted.
    // The quantity slot ate the material code.
    expect(r.proposedRows).toEqual([]);
    expect(r.diagnostics.matchedTokens).toContain('10234');
    expect(r.diagnostics.materialMatch).toBeUndefined();
  });

  it('THE FIX: a numeric code in the membership set wins the material slot', () => {
    const r = parseChannelReply('STOK 10234 500 KG', { knownMaterials: NUMERIC });
    expect(r.proposedRows).toHaveLength(1);
    expect(Object.values(r.proposedRows[0])).toEqual(['10234', '500']);
    expect(r.diagnostics.materialMatch).toBe('membership');
    expect(r.diagnostics.uom).toBe('KG');
  });

  it('THE WORSE CASE: a decoy mixed-alphanumeric token no longer steals the slot', () => {
    // Pre-fix, "LOT-77" became the material while 10234 stayed the quantity —
    // a row that is entirely plausible and entirely wrong.
    const shapeOnly = parseChannelReply('STOK 10234 LOT-77 500');
    expect(Object.values(shapeOnly.proposedRows[0])).toEqual(['LOT-77', '10234']);

    const withMembership = parseChannelReply('STOK 10234 LOT-77 500', {
      knownMaterials: NUMERIC,
    });
    expect(Object.values(withMembership.proposedRows[0])).toEqual(['10234', '500']);
    expect(withMembership.diagnostics.materialMatch).toBe('membership');
  });

  it('EXPLICIT PRECEDENCE: a master token can NEVER be consumed by isQtyLike', () => {
    // The material index is excluded from the quantity scan by construction, so
    // the qty must come from a LATER token even when the code sorts first.
    const r = parseChannelReply('STOK 8810 8810', { knownMaterials: ['8810'] });
    expect(Object.values(r.proposedRows[0])).toEqual(['8810', '8810']);
    // First occurrence is the material; the second supplies the quantity.
    expect(r.diagnostics.matchedTokens).toEqual(['STOK', '8810', '8810']);
  });

  it('MEMBERSHIP BEATS SHAPE even when a shaped token comes first', () => {
    const r = parseChannelReply('STOK AB-12 10234 500', { knownMaterials: NUMERIC });
    expect(Object.values(r.proposedRows[0])).toEqual(['10234', '500']);
    // The shaped decoy is honestly reported as unconsumed, not silently dropped.
    expect(r.diagnostics.unparsedRemainder).toContain('AB-12');
  });

  it('SHAPE remains the fallback hint when membership finds nothing', () => {
    const r = parseChannelReply('STOK MAT-10234 500 KG', { knownMaterials: NUMERIC });
    expect(Object.values(r.proposedRows[0])).toEqual(['MAT-10234', '500']);
    expect(r.diagnostics.materialMatch).toBe('shape');
  });

  it('an empty / omitted membership set is EXACTLY the previous behaviour', () => {
    const omitted = parseChannelReply('STOK MAT-10234 2.400 KG', { numberFormatHint: 'id' });
    const empty = parseChannelReply('STOK MAT-10234 2.400 KG', {
      numberFormatHint: 'id',
      knownMaterials: [],
    });
    expect(empty).toEqual(omitted);
    expect(Object.values(omitted.proposedRows[0])).toEqual(['MAT-10234', '2400']);
  });

  it('membership does NOT resolve or rewrite — the token is carried verbatim', () => {
    // A classifier input, not a resolver: C2 still confirms the token.
    const r = parseChannelReply('STOK 10234 500', { knownMaterials: ['10234'] });
    expect(Object.values(r.proposedRows[0])[0]).toBe('10234');
  });

  it('a membership hit reports HIGHER confidence than a shape guess', () => {
    const member = parseChannelReply('STOK 10234 500 KG', { knownMaterials: NUMERIC });
    const shaped = parseChannelReply('STOK MAT-10234 500 KG');
    expect(member.diagnostics.confidence).toBeGreaterThan(shaped.diagnostics.confidence);
    // Still a DISPLAY signal, never a gate.
    expect(member.proposedRows).toHaveLength(1);
  });

  it('membership does not rescue an unreadable quantity — honest silence holds', () => {
    // "2.400" with no convention hint is genuinely both-valid (2400 or 2.4) —
    // refused rather than guessed. Winning the material slot must not soften that.
    const r = parseChannelReply('STOK 10234 2.400', { knownMaterials: NUMERIC });
    expect(r.proposedRows).toEqual([]);
    expect(r.diagnostics.qtyReason).toBe('AMBIGUOUS_QTY');
    expect(r.diagnostics.materialMatch).toBe('membership');
  });
});

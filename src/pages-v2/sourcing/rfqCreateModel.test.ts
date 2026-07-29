import { describe, it, expect } from 'vitest';
import {
  buildRfqCreatePayload,
  normalizeRfqCreateDraft,
  type RfqCreateDraft,
} from './rfqCreateModel';

// ────────────────────────────────────────────────────────────────────────────
// rfqCreateModel (Phase A/2 · sourcing spine) — the PURE draft→payload mapping
// behind the RFQ-create dispatch that RETIRES the `extraRfqs` client-fabrication.
//
// CP-0 · W1 · 2e-b-4a — the coercions became a PARSE, and this file's coverage
// changed shape with them. It used to assert that the builder coerced strings,
// with a single fixture ("3000", "850000000") that reads IDENTICALLY under both
// number conventions — so every spec passed no matter which recipe ran, and the
// suite could not tell `Number()` from `normalizeQty`. The specs below are
// chosen to DISCRIMINATE: each one has a different answer under the retired
// implementation than under the current one.
// ────────────────────────────────────────────────────────────────────────────

const draft: RfqCreateDraft = {
  title: '  Q3 Emulsifier Sourcing  ',
  category: 'Emulsifiers',
  materials: ['EM-CETE-2201'],
  totalQty: '3000',
  uom: 'KG',
  budget: '850000000',
  responseDeadline: '2026-09-10',
  awardDeadline: '2026-09-20',
  incoterms: 'CIF Jakarta',
  paymentTerms: 'Net 45',
  invitedSupplierIds: ['sup-002', 'sup-005'],
};

/** Normalise-then-build, the way the surface does it. Throws if the draft
 *  refuses, so a spec that expects a payload cannot silently test a refusal. */
const payloadFor = (d: RfqCreateDraft): Record<string, unknown> => {
  const numbers = normalizeRfqCreateDraft(d);
  if (!numbers.ok) throw new Error(`draft refused: ${numbers.field}/${numbers.reason}`);
  return buildRfqCreatePayload(d, numbers.value);
};

describe('normalizeRfqCreateDraft — the ONE parse of the wizard numbers', () => {
  it('reads an unambiguous quantity and budget', () => {
    const out = normalizeRfqCreateDraft(draft);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.totalQty).toBe(3000);
    expect(out.value.estimatedValue).toBe(850_000_000);
  });

  // THE DEFECT, DIRECTLY. `Number('2.400')` is 2.4 — a buyer sourcing 2,400 KG
  // raised an event for 2.4 KG, and every quote against it totalled 1000× short.
  // Legal under BOTH conventions with different values ⇒ honest refusal, never
  // a guess (the wizard carries no origin convention to hint with).
  it('REFUSES the cross-convention quantity "2.400" — never reads it as 2.4', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '2.400' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
    expect(out.field).toBe('totalQty');
  });

  // `Number('2,400')` is NaN, and `typeof NaN === 'number'` — which is exactly
  // how NaN used to clear the store's own `num()` guard and reach the entity.
  it('REFUSES "2,400" as a reading rather than producing NaN', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '2,400' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    // Legal under BOTH conventions and DISAGREEING: id-ID reads the comma as a
    // decimal (2.4), EN reads it as a thousands group (2400). So it refuses —
    // and the number that never gets produced is the NaN the old `Number()`
    // returned, which `typeof === 'number'` would have waved into the store.
    expect(out.reason).toBe('AMBIGUOUS_QTY');
    expect(out.field).toBe('totalQty');
  });

  it('reads a grouped id-ID quantity that is legal under ONE convention only', () => {
    // "2.400,5" is unreadable as EN (two separators, wrong order) and legal as
    // id-ID → 2400.5. One convention ⇒ no ambiguity ⇒ the value, not a refusal.
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '2.400,5' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.totalQty).toBe(2400.5);
  });

  it('REFUSES an unreadable quantity token — never coerced, never defaulted', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: 'about 2400' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
    expect(out.field).toBe('totalQty');
  });

  // BLANK ≠ ZERO, direction 1: the quantity is REQUIRED, so emptiness refuses.
  it('REFUSES a blank quantity as EMPTY_QTY — a blank is not a zero', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
    expect(out.field).toBe('totalQty');
  });

  it('REFUSES a whitespace-only quantity — trimmed, then refused as empty', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '   ' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('EMPTY_QTY');
  });

  // BLANK ≠ ZERO, direction 2: the budget is OPTIONAL, so emptiness is the
  // ANSWER — and the answer is an absence, not a stated Rp 0.
  it('a blank budget resolves to an ABSENCE, never a fabricated zero', () => {
    const out = normalizeRfqCreateDraft({ ...draft, budget: '' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.estimatedValue).toBeUndefined();
    expect(out.value.estimatedValue).not.toBe(0);
    // The quantity beside it is untouched by the budget's absence.
    expect(out.value.totalQty).toBe(3000);
  });

  it('REFUSES an unreadable budget rather than falling back to zero', () => {
    const out = normalizeRfqCreateDraft({ ...draft, budget: 'TBC' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NOT_NUMERIC');
    expect(out.field).toBe('estimatedValue');
  });

  it('REFUSES a cross-convention budget — "1.500" is not silently 1.5', () => {
    const out = normalizeRfqCreateDraft({ ...draft, budget: '1.500' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('AMBIGUOUS_QTY');
    expect(out.field).toBe('estimatedValue');
  });

  it('the quantity is judged FIRST — its refusal names the quantity, not the budget', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '', budget: 'TBC' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.field).toBe('totalQty');
  });

  // A typed zero is a real statement on both fields — the blank/zero distinction
  // exists to protect it, not to suppress it. (Whether a zero-quantity RFQ
  // should be refused OUTRIGHT is 4a-FIND-02 — a commercial ruling, and the
  // wizard's own step gate still blocks it today.)
  it('preserves a TYPED zero on both fields — emptiness is what is refused, not the value', () => {
    const out = normalizeRfqCreateDraft({ ...draft, totalQty: '0', budget: '0' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.totalQty).toBe(0);
    expect(out.value.estimatedValue).toBe(0);
  });
});

describe('buildRfqCreatePayload — the draft becomes a t_rfq_create payload', () => {
  it('maps the required fields the dispatcher validates (title trimmed, materialCategory)', () => {
    const payload = payloadFor(draft);
    expect(payload.title).toBe('Q3 Emulsifier Sourcing'); // trimmed
    expect(payload.materialCategory).toBe('Emulsifiers');
  });

  it('ships the ALREADY-PARSED numbers — it cannot parse, so it cannot disagree', () => {
    const payload = payloadFor(draft);
    expect(payload.totalQty).toBe(3000); // number, not "3000"
    expect(payload.estimatedValue).toBe(850_000_000);
  });

  // ── CORRECTED SPEC (2e-b-4a) ──────────────────────────────────────────────
  // WAS: 'defaults an empty budget to 0 (honest, never NaN)' — asserting
  //      `estimatedValue === 0`. The title called the `|| 0` honest; it was the
  //      defect. A budget of Rp 0 is a STATEMENT, and the buyer made none.
  // NOW: an unspecified budget is OMITTED from the payload entirely, so the
  //      store can record an absence instead of minting a zero nobody typed.
  it('OMITS an unspecified budget — absence is not a stated Rp 0', () => {
    const payload = payloadFor({ ...draft, budget: '' });
    expect('estimatedValue' in payload).toBe(false);
    expect(payload.estimatedValue).toBeUndefined();
  });

  it('carries a stated zero budget THROUGH — omission is for absence only', () => {
    const payload = payloadFor({ ...draft, budget: '0' });
    expect('estimatedValue' in payload).toBe(true);
    expect(payload.estimatedValue).toBe(0);
  });

  it('carries the arrays + terms through verbatim', () => {
    const payload = payloadFor(draft);
    expect(payload.materialIds).toEqual(['EM-CETE-2201']);
    expect(payload.invitedSupplierIds).toEqual(['sup-002', 'sup-005']);
    expect(payload.uom).toBe('KG');
    expect(payload.incoterms).toBe('CIF Jakarta');
    expect(payload.paymentTerms).toBe('Net 45');
    expect(payload.responseDeadline).toBe('2026-09-10');
    expect(payload.awardDeadline).toBe('2026-09-20');
  });

  it('never carries a client-fabricated id or number (the retired extraRfqs anti-pattern)', () => {
    const payload = payloadFor(draft);
    // The number + id are STORE-assigned on create — the payload must not smuggle
    // a fabricated `rfq-new-…` id or an `RFQ-…` number the way submitWizard did.
    expect('id' in payload).toBe(false);
    expect('rfqNumber' in payload).toBe(false);
    expect('status' in payload).toBe(false);
  });

  it('always carries totalQty when it builds at all — the requiredFields floor', () => {
    // The builder only ever sees a NORMALISED quantity, so every payload it
    // produces satisfies `t_rfq_create.requiredFields`. A refused draft never
    // reaches it — which is why the omission case above is the budget, not the
    // quantity.
    const payload = payloadFor(draft);
    expect(typeof payload.totalQty).toBe('number');
    expect(Number.isNaN(payload.totalQty)).toBe(false);
  });
});

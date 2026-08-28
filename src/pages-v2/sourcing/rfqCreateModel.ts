// ────────────────────────────────────────────────────────────────────────────
// rfqCreateModel (Phase A/2 · sourcing spine) — the PURE draft→payload mapping
// for the RFQ-create dispatch (t_rfq_create) that RETIRES `extraRfqs`.
//
// The sourcing wizard collects everything as strings; this builds the payload the
// dispatcher validates and `rfqTarget.create` mints from. It carries ONLY intake
// fields — never an id, number, or status: those are STORE-assigned on create,
// which is precisely what the retired `extraRfqs` client-fabrication could not
// guarantee (it minted `rfq-new-${Date.now()}` peers and spread them into the
// seam list).
//
// ── CP-0 · W1 · 2e-b-4a — the RFQ quantity stops being three coercions ───────
//
// This was the last bare `Number()` on a typed-entry path in the app, and it sat
// on the highest-leverage number in the sourcing arc. `RFQ.totalQty` is not a
// leaf: `quotationTarget.create` computes EVERY quotation's `totalPrice` as
// `unitPrice × rfq.totalQty`, and the supplier's own total-price preview
// multiplies by it. One misread here silently rewrites every bid against the
// event.
//
// THE RETIRED PATH read `draft.totalQty` FOUR times with three recipes — the
// step gate (`Number(draft.totalQty) > 0`), the review summary
// (`formatNumber(Number(draft.totalQty))`), and this builder (`Number(...)`) —
// and `draft.budget` twice more. Exactly the shape 2e-a retired on the bid
// price. It produced three distinct wrong facts, in silence:
//
//   · "2.400" → `Number` reads 2.4. An Indonesian buyer sourcing 2,400 KG
//     raised an event for 2.4 KG, and every quote against it totalled 1000×
//     short. The catastrophic misreading, on the buyer's side of the same arc.
//   · "2,400" → `Number` reads NaN — and `typeof NaN === 'number'`, so the
//     store's own `num()` guard waved it through. NaN reached the entity, then
//     `unitPrice × NaN` reached every quotation's totalPrice, and the buyer's
//     comparison rendered `Rp NaN` on the surface an award is made from.
//   · a BLANK budget → `Number('') || 0` minted a stated Rp 0 out of a buyer
//     who stated nothing. The last `|| 0` on this path.
//
// SEPARATION OF PARSE FROM ASSEMBLY (the `objectSubmitModels` canon, PR-2a/2d).
// The coercion moved OUT of the builder entirely: `normalizeRfqCreateDraft` is
// the SINGLE parse — routing through `normalizeQty`, the one legal parser, with
// NO convention hint (an internal buyer form carries no origin signal, so a
// token legal under both readings REFUSES instead of being guessed, CP-0 §5a) —
// and `buildRfqCreatePayload` now takes NUMBERS and structurally cannot parse.
// The step gate, the review summary and the payload all read the SAME outcome,
// so none of them can disagree about the quantity being sourced.
//
// BLANK ≠ ZERO, on both fields, in opposite directions:
//   · totalQty  — REQUIRED. A blank refuses (`EMPTY_QTY`) and, belt-and-braces,
//     is OMITTED from the payload so `t_rfq_create.requiredFields` fails it as
//     MISSING_FIELDS even on a hand-crafted dispatch. An RFQ with no quantity
//     is not an incomplete form, it is an unanswerable question.
//   · estimatedValue — OPTIONAL. A blank is the field's own documented answer
//     ("not specified") and resolves to an ABSENCE the payload omits, never a
//     fabricated Rp 0. The `readMoq` precedent, on the buyer's side.
// A TYPED zero on either field is a real statement and is preserved — the point
// of the distinction is that emptiness may never be mistaken for it. Whether a
// zero-quantity RFQ should be refused OUTRIGHT is a commercial question, not a
// parsing one, and is registered as 4a-FIND-02 rather than decided here.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/** The wizard draft fields the create payload is derived from (a structural
 * subset of BuyerSourcing's `DraftRfq`; extra draft fields are ignored). */
export interface RfqCreateDraft {
  title: string;
  category: string;
  materials: string[];
  totalQty: string;
  uom: string;
  budget: string;
  responseDeadline: string;
  awardDeadline: string;
  incoterms: string;
  paymentTerms: string;
  invitedSupplierIds: string[];
  /**
   * C.2 — the requisition this RFQ is being raised FROM, when the buyer started
   * the wizard from one. **Optional, and the ABSENT case is the common one:**
   * most RFQs are not raised from a requisition, and C.1's cascade resolver
   * reads exactly this key to decide whether to fan out at all.
   */
  sourceRequisitionId?: string;
}

/**
 * The draft MINUS its two numeric fields — the builder's ONLY textual input.
 *
 * The omission is the guarantee, not a convenience: the builder cannot see
 * `totalQty` or `budget` as strings, so it cannot re-derive a second,
 * disagreeing reading of either. Same discipline as `QuotationSubmitDraft`
 * (2e-a) and `IncomingShipmentDraft.qty` (PR-2d).
 */
export type RfqCreateTerms = Omit<RfqCreateDraft, 'totalQty' | 'budget'>;

/** Which numeric draft field refused, so a surface can point at the offending
 *  input rather than reject the whole wizard anonymously. Flat (not a wrapper
 *  object) so it works as a DIRECT discriminant — TypeScript narrows a union on
 *  `refusal.field`, but not through a nested `refusal.field.kind`. */
export type RfqNumericField = 'totalQty' | 'estimatedValue';

/**
 * A refusal, DISCRIMINATED BY FIELD — because the two fields disagree about
 * what emptiness means, and the type records that rather than leaving it to a
 * comment.
 *
 * `EMPTY_QTY` is reachable on `totalQty` (required — a blank is a refusal) and
 * is EXCLUDED on `estimatedValue` (optional — a blank is the answer). A surface
 * that narrows on `field.kind` therefore gets an EXACT reason union for each,
 * so its message maps can be total with no unreachable entry and no cast. The
 * `MoqRefusalReason` discipline (2e-b-2), applied across two fields at once.
 */
export type RfqDraftRefusal =
  | { readonly field: 'totalQty'; readonly reason: QtyRefusalReason }
  | {
      readonly field: 'estimatedValue';
      readonly reason: Exclude<QtyRefusalReason, 'EMPTY_QTY'>;
    };

/** A normalisation result — honest silence carries the reason AND the field. */
export type RfqDraftOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | ({ readonly ok: false } & RfqDraftRefusal);

/** A draft whose two numbers have been through the one legal parse. */
export interface NormalizedRfqNumbers {
  /** REQUIRED — a blank never reaches here; it refuses. */
  readonly totalQty: number;
  /** ABSENT when the buyer specified no budget. Absence is NOT Rp 0. */
  readonly estimatedValue?: number;
}

/** One field's read. Exported so a surface can report EACH input independently
 *  — see the note on `readRfqBudget`. */
export type TotalQtyOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

export type BudgetOutcome =
  /** `value: undefined` is the STATED ABSENCE — "not specified" — not a zero. */
  | { readonly ok: true; readonly value?: number }
  | { readonly ok: false; readonly reason: Exclude<QtyRefusalReason, 'EMPTY_QTY'> };

/**
 * Read the total quantity. REQUIRED, so a blank arrives as `EMPTY_QTY` and is
 * refused like any other unreadable quantity — emptiness is not an answer here.
 * (Contrast `readRfqBudget`: the same emptiness, the opposite ruling, each
 * stated where it applies.)
 *
 * No `hint`: a buyer's own form carries no origin convention, so a token legal
 * under both readings ("2.400" = 2400 or 2.4) refuses rather than picking one.
 *
 * Negative input needs no branch: `normalizeQty` rejects a leading `-` as
 * NOT_NUMERIC before any convention is considered.
 */
export function readRfqTotalQty(raw: string): TotalQtyOutcome {
  const parsed = normalizeQty(raw);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, reason: parsed.reason };
}

/**
 * Read the estimated budget. OPTIONAL: a blank is the field's own documented
 * answer and resolves to an ABSENCE, never a fabricated Rp 0.
 *
 * WHY THE TWO FIELDS ARE READ SEPARATELY (2e-b-4b). The composite below is
 * sequential — it reports the FIRST field that refuses — which is right for the
 * gate and the payload, where the only question is "may this proceed". It is
 * wrong for FIELD-LEVEL display: the quantity is blank on a fresh wizard, so a
 * composite-only surface could never show a budget refusal at all, and a buyer
 * who typed an unreadable budget first would be told nothing about it. These
 * per-field reads exist so each input can answer for itself.
 *
 * This is not a second recipe: every read here and in the composite goes through
 * the SAME `normalizeQty` on the SAME string, so no two of them can disagree.
 * What 2e-a retired was three DIFFERENT parsers, not one parser asked twice.
 */
export function readRfqBudget(raw: string): BudgetOutcome {
  const parsed = normalizeQty(raw);
  if (parsed.ok) return { ok: true, value: parsed.value };
  // The one refusal this field converts into a legal answer. A buyer who has
  // not costed the event yet leaves the box alone, and the platform must not
  // invent a budget of nothing for them.
  if (parsed.reason === 'EMPTY_QTY') return { ok: true };
  return { ok: false, reason: parsed.reason };
}

/**
 * Normalise the wizard draft's numbers — the composite the GATE and the PAYLOAD
 * read. Built from the two per-field reads above, so the field-level messages
 * and the dispatch decision can never come from different judgements.
 *
 * Sequential by design: it names the FIRST field that refuses, because its
 * caller only needs to know whether the draft may proceed.
 */
export function normalizeRfqCreateDraft(
  draft: RfqCreateDraft,
): RfqDraftOutcome<NormalizedRfqNumbers> {
  const total = readRfqTotalQty(draft.totalQty);
  if (!total.ok) {
    return { ok: false, reason: total.reason, field: 'totalQty' };
  }

  const budget = readRfqBudget(draft.budget);
  if (!budget.ok) {
    return { ok: false, reason: budget.reason, field: 'estimatedValue' };
  }

  return {
    ok: true,
    value: {
      totalQty: total.value,
      ...(budget.value === undefined ? {} : { estimatedValue: budget.value }),
    },
  };
}

/**
 * Assemble the `t_rfq_create` payload from the wizard's TEXTUAL terms and an
 * ALREADY-NORMALISED pair of numbers. Pure assembly — no coercion, no
 * defaulting, no parse: the number it is given is the number it ships.
 *
 * An unspecified budget is OMITTED rather than zeroed, the same discipline the
 * quotation payload applies to an unstated minimum order quantity (2e-b-2).
 * No id, number, or status — those are STORE-assigned on create.
 */
export function buildRfqCreatePayload(
  terms: RfqCreateTerms,
  numbers: NormalizedRfqNumbers,
): Record<string, unknown> {
  return {
    title: terms.title.trim(),
    materialCategory: terms.category,
    materialIds: terms.materials,
    invitedSupplierIds: terms.invitedSupplierIds,
    responseDeadline: terms.responseDeadline,
    awardDeadline: terms.awardDeadline,
    totalQty: numbers.totalQty,
    uom: terms.uom,
    ...(numbers.estimatedValue === undefined
      ? {}
      : { estimatedValue: numbers.estimatedValue }),
    incoterms: terms.incoterms,
    paymentTerms: terms.paymentTerms,
    // ⚠️ C.2 — EMITTED ONLY WHEN PRESENT, the same conditional shape as
    // `estimatedValue` above and for a sharper reason: C.1's resolver branches on
    // whether this key is a non-empty string, and an RFQ raised from no
    // requisition must cascade onto NOTHING. Spreading `undefined` in would put
    // the key on the payload with no value, which reads as "there is a source"
    // to anything checking presence rather than type.
    ...(terms.sourceRequisitionId
      ? { sourceRequisitionId: terms.sourceRequisitionId }
      : {}),
  };
}

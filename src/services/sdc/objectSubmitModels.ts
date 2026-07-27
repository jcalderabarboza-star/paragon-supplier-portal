// ────────────────────────────────────────────────────────────────────────────
// SDC-3b — the PURE draft→payload mappings for the two additional supplier
// objects (InventoryDeclaration + IncomingShipment). Mirrors `submitModel.ts`
// (requirementResponse) EXACTLY: the page collects text, coercion happens here,
// and the payload carries ONLY honest raw facts. `uom` is deliberately ABSENT
// from every payload — the CommandTarget copies it from the material master
// (integrity invariant #2), never from the caller. `supplierId` comes from the
// current identity (never a form field), so the spoof branch stays SCOPE_DENIED.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type NumberConvention, type QtyRefusalReason } from '../../lib/localeNumber';
import type { ShipmentDirection } from './types';

// ─── InventoryDeclaration (SOH, total-first) ──────────────────────────────────

/** One batch row a supplier may optionally add (all strings — the form collects
 *  text; qty is normalised by `normalizeInventoryDeclarationDraft`). */
export interface InventoryBatchDraft {
  batchNumber: string;
  qty: string;
  expiryDate?: string;
}

/** The SOH declare form fields. `totalQty` is the floor (R-4 ruling (a));
 *  `batches` is OPTIONAL detail — when present the INV_DECLARE_BATCH_TOTAL hook
 *  enforces Σ batch qty = totalQty (the surface validates first, for UX). */
export interface InventoryDeclarationDraft {
  totalQty: string;
  batches?: readonly InventoryBatchDraft[];
}

// ── The ONE parse (CP-0 · W1 · PR-2a) ────────────────────────────────────────
//
// SEPARATION OF PARSE FROM ASSEMBLY. The builder used to coerce its own strings
// (`Number(x.replace(/,/g,'')) || 0`) while the ingest adapter coerced the SAME
// `totalQty` string independently for its Σ-reconciliation gate — two parses,
// two implementations, and only the builder's result reached the payload. A gate
// that validates one number while the payload ships another is not a gate.
//
// So the coercion moved OUT of the builder entirely: `normalizeInventoryDeclaration
// Draft` is the single parse (routing through the one legal `normalizeQty`), and
// `buildInventoryDeclarationPayload` now takes NUMBERS and cannot parse at all.
// Callers normalise ONCE, gate on that result, and assemble from the same value.
//
// The `|| 0` is gone with it: a refusal is not a legal zero. A zero is a
// COMMITMENT ("I hold none"), which must be ENTERED — never defaulted out of a
// blank or an unreadable cell.

/** Which draft field refused, so a surface can point at the offending cell
 *  rather than reject the whole form anonymously. */
export type DeclarationField =
  | { readonly kind: 'totalQty' }
  | { readonly kind: 'batchQty'; readonly index: number; readonly batchNumber: string };

/** A normalisation result — honest silence carries the reason AND the field. */
export type DraftOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: QtyRefusalReason; readonly field: DeclarationField };

/** A batch whose qty has already been through the one legal parse. */
export interface NormalizedInventoryBatch {
  readonly batchNumber: string;
  readonly qty: number;
  readonly expiryDate?: string;
}

/** A declaration draft whose quantities are numbers — the builder's ONLY input. */
export interface NormalizedInventoryDeclaration {
  readonly totalQty: number;
  readonly batches?: readonly NormalizedInventoryBatch[];
}

/**
 * Normalise a declaration draft's quantities — THE single parse for this object.
 *
 * Blank-NUMBERED batch rows are dropped first (a form legitimately carries empty
 * add-rows), so an unfilled row never refuses; every SURVIVING row must then
 * carry a readable qty. `hint` resolves a cross-convention ambiguity for TYPED
 * entry only — callers whose rows come from a sheet or a message of unknown
 * origin pass none, so an ambiguous cell refuses instead of being guessed
 * (CP-0 §5a).
 */
export function normalizeInventoryDeclarationDraft(
  draft: InventoryDeclarationDraft,
  hint?: NumberConvention,
): DraftOutcome<NormalizedInventoryDeclaration> {
  const total = normalizeQty(draft.totalQty, hint);
  if (!total.ok) return { ok: false, reason: total.reason, field: { kind: 'totalQty' } };

  const rows = (draft.batches ?? []).filter((b) => b.batchNumber.trim() !== '');
  const batches: NormalizedInventoryBatch[] = [];
  for (let index = 0; index < rows.length; index++) {
    const b = rows[index];
    const batchNumber = b.batchNumber.trim();
    const qty = normalizeQty(b.qty, hint);
    if (!qty.ok) {
      return { ok: false, reason: qty.reason, field: { kind: 'batchQty', index, batchNumber } };
    }
    batches.push({
      batchNumber,
      qty: qty.value,
      ...(b.expiryDate ? { expiryDate: b.expiryDate } : {}),
    });
  }

  return {
    ok: true,
    value: { totalQty: total.value, ...(batches.length > 0 ? { batches } : {}) },
  };
}

/**
 * Assemble the `t_inventorydeclaration_declare` payload from the supplier
 * identity, the chosen collaborated material, and an ALREADY-NORMALISED
 * declaration. Pure assembly — no coercion, no defaulting, no parse. A
 * declaration with no surviving batch is total-only, the honest minimal form.
 * No id/declaredAt/uom: those are store/master-assigned on create.
 */
export function buildInventoryDeclarationPayload(
  supplierId: string,
  materialCode: string,
  normalized: NormalizedInventoryDeclaration,
): Record<string, unknown> {
  return {
    supplierId,
    materialCode,
    totalQty: normalized.totalQty,
    ...(normalized.batches && normalized.batches.length > 0
      ? { batches: normalized.batches.map((b) => ({ ...b })) }
      : {}),
  };
}

// ─── IncomingShipment (direction-named) ───────────────────────────────────────

/** The report form fields. `asnRef` is present ONLY for a to-paragon leg and is
 *  a SELECTED own-ASN number (never free-typed — the R-4 note: it resolves
 *  server-side against the supplier's own ASNs). A p2d leg never carries it. */
export interface IncomingShipmentDraft {
  qty: string;
  etd?: string;
  eta?: string;
  awb?: string;
  /** to-paragon ONLY — the selected own-ASN number this leg converges on. */
  asnRef?: string;
}

/**
 * Build the `t_incomingshipment_report` payload. The direction is passed
 * explicitly (the surface offers only the legal directions for the material);
 * `asnRef` is included ONLY for a to-paragon leg, so the symmetric guards
 * (ISH_P2D_NO_ASN / ISH_TOPARAGON_ASN_LINKED) can never be tripped by the
 * surface itself. No id/lifecycle/uom — store/master-assigned on create.
 */
export function buildIncomingShipmentPayload(
  supplierId: string,
  materialCode: string,
  direction: ShipmentDirection,
  draft: IncomingShipmentDraft,
): Record<string, unknown> {
  return {
    supplierId,
    materialCode,
    direction,
    qty: Number(draft.qty.replace(/,/g, '')) || 0,
    ...(draft.etd ? { etd: draft.etd } : {}),
    ...(draft.eta ? { eta: draft.eta } : {}),
    ...(draft.awb ? { awb: draft.awb } : {}),
    // to-paragon converges on an ASN; p2d carries none (Paragon isn't consignee).
    ...(direction === 'to-paragon' && draft.asnRef ? { asnRef: draft.asnRef } : {}),
  };
}

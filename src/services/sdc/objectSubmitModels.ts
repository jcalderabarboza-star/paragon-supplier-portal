// ────────────────────────────────────────────────────────────────────────────
// SDC-3b — the PURE draft→payload mappings for the two additional supplier
// objects (InventoryDeclaration + IncomingShipment). Mirrors `submitModel.ts`
// (requirementResponse) EXACTLY: the page collects text, coercion happens here,
// and the payload carries ONLY honest raw facts. `uom` is deliberately ABSENT
// from every payload — the CommandTarget copies it from the material master
// (integrity invariant #2), never from the caller. `supplierId` comes from the
// current identity (never a form field), so the spoof branch stays SCOPE_DENIED.
// ────────────────────────────────────────────────────────────────────────────

import type { ShipmentDirection } from './types';

// ─── InventoryDeclaration (SOH, total-first) ──────────────────────────────────

/** One batch row a supplier may optionally add (all strings — the form collects
 *  text; qty is coerced here, comma-tolerant). */
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

/**
 * Build the `t_inventorydeclaration_declare` payload from the supplier identity,
 * the chosen collaborated material, and the draft. Blank-numbered batch rows are
 * dropped here (the form can carry empty rows); a declaration with no surviving
 * batch is total-only — the honest minimal form. No id/declaredAt/uom: those are
 * store/master-assigned on create.
 */
export function buildInventoryDeclarationPayload(
  supplierId: string,
  materialCode: string,
  draft: InventoryDeclarationDraft,
): Record<string, unknown> {
  const batches = (draft.batches ?? [])
    .filter((b) => b.batchNumber.trim() !== '')
    .map((b) => ({
      batchNumber: b.batchNumber.trim(),
      qty: Number(b.qty.replace(/,/g, '')) || 0,
      ...(b.expiryDate ? { expiryDate: b.expiryDate } : {}),
    }));
  return {
    supplierId,
    materialCode,
    totalQty: Number(draft.totalQty.replace(/,/g, '')) || 0,
    ...(batches.length > 0 ? { batches } : {}),
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

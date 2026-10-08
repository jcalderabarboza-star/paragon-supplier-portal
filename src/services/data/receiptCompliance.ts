// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b · WHAT STOPS A RECEIPT — ONE PREDICATE, READ BY THE FORM AND BY THE
// DISPATCHER.
//
// OPS-2 made a missing halal certificate, an unruled BPOM applicability and the
// two unanswered regulatory checks stop the receiving form's quality step. The
// stop lived in the form only: a dispatch made by hand walked past all four. The
// operator's ruling (2026-10-08): *"the halal-certificate, BPOM, seal and lot
// blocks become policy hooks on the receipt verbs; the form previews the same
// predicate."*
//
// This is that predicate. The form calls it to decide whether the quality step
// is passable; `gr_receipt_compliant` calls it on the two verbs that ACCEPT
// goods (`t_gr_approve`, `t_gr_partial_approve`). Neither re-states a clause.
//
// ⚠️ PURE, AND THE CLOCK IS AN ARGUMENT. `at` is supplied by the caller, and
// every caller supplies the DECLARED PRESENT (operator ruling: one clock in the
// sample world, receiving included). Nothing here reads a clock.
//
// ⚠️ WHAT A MODE MAY RELAX, AND WHAT IT MAY NOT (E4, unchanged). `stops` carries
// the three governed checks' answers off the enforcement ledger. It relaxes the
// CONSEQUENCE of an answer — an unanswered seal check, an unanswered lot check,
// a certificate that does not satisfy. It cannot relax the two UNRULED blocks: a
// question nobody could pose has no answer whose consequence a mode could relax.
// ─────────────────────────────────────────────────────────────────────────────

import { bpomAtReceipt, halalAtReceipt, type MaterialRuling } from '../sdc/materialRuling';
import type { BpomRefusalReason } from '../sdc/bpom';
import type { HalalRefusalReason } from '../sdc/halal';
import type { MaterialMaster } from '../sdc/types';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import {
  verifyHalalAtReceipt,
  type HalalNotSatisfiedReason,
} from './halalVerification';
import type { ComplianceRegistryEntry } from './types';

/** The five ways a receipt line is stopped, in the order a line is read. */
export const RECEIPT_BLOCK_KINDS = [
  'HALAL_UNRULED',
  'HALAL_SEAL_UNANSWERED',
  'HALAL_CERTIFICATE_NOT_VALID',
  'BPOM_UNRULED',
  'BPOM_LOT_UNANSWERED',
] as const;
export type ReceiptBlockKind = (typeof RECEIPT_BLOCK_KINDS)[number];

/** One stop on one line. `detail` is the lookup's own reason where it has one. */
export type ReceiptBlock =
  | { readonly materialCode: string; readonly kind: 'HALAL_UNRULED'; readonly detail: HalalRefusalReason }
  | { readonly materialCode: string; readonly kind: 'HALAL_SEAL_UNANSWERED' }
  | { readonly materialCode: string; readonly kind: 'HALAL_CERTIFICATE_NOT_VALID'; readonly detail: HalalNotSatisfiedReason }
  | { readonly materialCode: string; readonly kind: 'BPOM_UNRULED'; readonly detail: BpomRefusalReason }
  | { readonly materialCode: string; readonly kind: 'BPOM_LOT_UNANSWERED' };

/** What the predicate reads off a line: the material and the two answers. */
export interface ReceiptLineChecks {
  readonly materialCode: string;
  readonly halalSealCheck?: unknown;
  readonly bpomLotCheck?: unknown;
}

/** Whether each governed check STOPS (`blocks(mode)`), read off the ledger. */
export interface ReceiptCheckStops {
  readonly seal: boolean;
  readonly lot: boolean;
  readonly certificate: boolean;
}

export interface ReceiptComplianceInput {
  readonly supplierId: string;
  readonly lines: readonly ReceiptLineChecks[];
  readonly rulings: readonly MaterialRuling[];
  readonly registry: readonly ComplianceRegistryEntry[];
  /** The instant validity is judged at — the declared present, never a clock. */
  readonly at: string;
  readonly stops: ReceiptCheckStops;
  readonly master?: MaterialMaster;
}

/** A regulatory check is ANSWERED by Pass or Fail. A placeholder is not one. */
export const checkAnswered = (v: unknown): boolean => v === 'Pass' || v === 'Fail';

/**
 * Every stop on every line, in line order and, within a line, in
 * `RECEIPT_BLOCK_KINDS` order. Empty means the receipt may be accepted.
 */
export function receiptComplianceBlocks(input: ReceiptComplianceInput): readonly ReceiptBlock[] {
  const { supplierId, lines, rulings, registry, at, stops } = input;
  const master = input.master ?? MATERIAL_MASTER;
  const found: ReceiptBlock[] = [];
  for (const line of lines) {
    const materialCode = line.materialCode;
    const halal = halalAtReceipt(materialCode, rulings, master);
    if (!halal.ok) {
      found.push({ materialCode, kind: 'HALAL_UNRULED', detail: halal.reason });
    } else if (halal.required) {
      if (!checkAnswered(line.halalSealCheck) && stops.seal) {
        found.push({ materialCode, kind: 'HALAL_SEAL_UNANSWERED' });
      }
      const verdict = verifyHalalAtReceipt(supplierId, materialCode, registry, at);
      if (verdict.verdict === 'NOT_SATISFIED' && stops.certificate) {
        found.push({
          materialCode,
          kind: 'HALAL_CERTIFICATE_NOT_VALID',
          detail: verdict.reason,
        });
      }
    }
    const bpom = bpomAtReceipt(materialCode, rulings, master);
    if (!bpom.ok) {
      found.push({ materialCode, kind: 'BPOM_UNRULED', detail: bpom.reason });
    } else if (bpom.applicable && !checkAnswered(line.bpomLotCheck) && stops.lot) {
      found.push({ materialCode, kind: 'BPOM_LOT_UNANSWERED' });
    }
  }
  return found;
}

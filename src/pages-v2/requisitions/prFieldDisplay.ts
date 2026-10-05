// ────────────────────────────────────────────────────────────────────────────
// PLN-4 · R3 · WHAT A REQUISITION ROW SAYS WHEN A FIELD IS EMPTY, AND WHERE IT
// CAME FROM.
//
// A requisition raised from an intake line arrives with what the line and the
// material master can answer — material, quantity, bucket, value, category,
// the lane that raised it — and NOTHING for the fields no producer of this
// portal supplies: a required day, a cost centre, a source of supply, a header
// text. The list rendered those as blanks (and the source column as "None", a
// claim nobody made), so an approver could not tell "nobody said" from "the
// answer is nothing". Each such field now reads "Set in SAP": where it is set.
//
// ⚠️ THE LIST IS THE FIELDS NO PRODUCER HERE WRITES, NOT EVERY OPTIONAL FIELD.
// `priority` and `approvalLevel` keep their own honest labels ("Not set", "Not
// assigned") because those name a choice nobody made yet, in this portal; and
// `estimatedValue` keeps its dash because a line without a price is an absent
// value, not one SAP fills in.
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseRequisition } from '../../services/data/types';

/** The fields a requisition carries that no producer in this portal supplies. */
export const SET_IN_SAP_FIELDS = ['requiredDate', 'costCenter', 'sourceOfSupply', 'justification', 'category'] as const;
export type SetInSapField = (typeof SET_IN_SAP_FIELDS)[number];

/** Is this field empty on this requisition — so the page says where it is set? */
export const isSetInSap = (pr: Pick<PurchaseRequisition, SetInSapField>, field: SetInSapField): boolean =>
  (pr[field] ?? '').trim() === '';

/** Where a requisition came from: an intake line the planning lane committed, or the New PR form. */
export type PrOrigin = 'intake' | 'manual';

export const prOrigin = (pr: Pick<PurchaseRequisition, 'intakeLineId'>): PrOrigin =>
  pr.intakeLineId ? 'intake' : 'manual';

/** The two states a bulk act may take a requisition out of — one verb each. */
export const BULK_VERB_OF_STATUS = Object.freeze({
  Draft: 't_pr_submit',
  'Pending Approval': 't_pr_approve',
} as const);
export type BulkStatus = keyof typeof BULK_VERB_OF_STATUS;

export const isBulkEligible = (pr: Pick<PurchaseRequisition, 'status'>): pr is { status: BulkStatus } =>
  pr.status in BULK_VERB_OF_STATUS;

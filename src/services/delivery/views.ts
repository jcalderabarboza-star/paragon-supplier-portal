// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the read view-model (pure, DERIVED).
//
// The ONE pure join the delivery surface reads: per agreement → per item, the
// drawdown ledger (deriveDrawdownLedger) + the per-released-line fulfillment
// (deriveFulfillment). Same data-in / view-out discipline as the SDC selectors —
// `now` is injected (the shared SIMULATED clock at the caller), never a wall-clock
// read here. The service (MockDeliveryService) calls this internally and scopes
// the result; the page renders it and derives nothing.
//
// `supplierName` is a display join the SERVICE resolves (reference data) and
// passes in — this pure module takes no dependency on the supplier fixtures.
// ─────────────────────────────────────────────────────────────────────────────

import type { IncomingShipment } from '../sdc/types';
import { deriveDrawdownLedger } from './ledger';
import { deriveFulfillment } from './fulfillment';
import type { ReleaseFulfillmentView } from './fulfillment';
import type { ReleaseReason } from './release';
import type { ConfirmReason } from './confirm';
import type { EditPolicyReason } from './policy';
import type {
  DrawdownLedger,
  SchedulingAgreement,
  SchedulingAgreementItem,
} from './types';

/** One item joined with its drawdown ledger + the fulfillment of its released
 *  lines. The full calendar lives on `item.scheduleLines`; `fulfillment` covers
 *  only the released lines (a draft has no fulfillment). */
export interface DeliveryItemView {
  readonly item: SchedulingAgreementItem;
  readonly ledger: DrawdownLedger;
  readonly fulfillment: readonly ReleaseFulfillmentView[];
}

/** An agreement joined with its display supplier name + per-item drawdown views. */
export interface DeliveryAgreementView {
  readonly agreement: SchedulingAgreement;
  readonly supplierName: string | null;
  readonly items: readonly DeliveryItemView[];
}

/** Why a release was refused at the SERVICE seam: Batch-2's pure domain reasons
 *  PLUS `SCOPE_DENIED` (the house scope-refusal term) — release is buyer-only, so
 *  a supplier scope is denied here, a concern the pure domain never models. */
export type ReleaseCommandReason = ReleaseReason | 'SCOPE_DENIED';

/**
 * The delivery lane's write result (the release action). `ok` returns the
 * RE-DERIVED agreement view (so the caller renders the post-release state without
 * a second read); `!ok` carries an honest reason so a refusal is surfaced, never
 * a silent no-op. Mirrors the pure `ReleaseResult`, resolved to the view-model at
 * the service seam and widened with the scope refusal.
 */
export type ReleaseCommandResult =
  | { readonly ok: true; readonly view: DeliveryAgreementView }
  | { readonly ok: false; readonly reason: ReleaseCommandReason; readonly detail?: string };

/** Why a confirm-match was refused at the SERVICE seam: the pure `ConfirmReason`
 *  arms PLUS `SCOPE_DENIED` (confirm is buyer-only) and `NOTHING_TO_CONFIRM` — the
 *  latter needs the shipment pool (there is no INFERRED proposal to accept), so it
 *  lives here, not in the pure domain. */
export type ConfirmCommandReason = ConfirmReason | 'SCOPE_DENIED' | 'NOTHING_TO_CONFIRM';

/**
 * The confirm-match write result (the SECOND write). Same shape as
 * `ReleaseCommandResult` — `ok` returns the RE-DERIVED view (the proposal now
 * confirmed: inferred:false, `deliveredQty` climbed), `!ok` an honest reason so a
 * refusal is surfaced, never a silent no-op.
 */
export type ConfirmCommandResult =
  | { readonly ok: true; readonly view: DeliveryAgreementView }
  | { readonly ok: false; readonly reason: ConfirmCommandReason; readonly detail?: string };

/** Why a policy-edit was refused at the SERVICE seam: the pure `EditPolicyReason`
 *  arms PLUS `SCOPE_DENIED` (policy-edit is buyer-only governance) and
 *  `UNKNOWN_ITEM` (no such agreement / item) — neither is a pure-domain concern
 *  (the pure layer is handed a resolved item and never sees scope). */
export type EditPolicyCommandReason = EditPolicyReason | 'SCOPE_DENIED' | 'UNKNOWN_ITEM';

/**
 * The policy-edit write result (the THIRD write). Same shape as the release /
 * confirm pairs — `ok` returns the RE-DERIVED view (the ledger now marks
 * `policyDeviation` and re-derives `enforced` / `exceptions` against the new
 * `active`), `!ok` an honest reason so a refusal is surfaced, never a silent no-op.
 */
export type EditPolicyCommandResult =
  | { readonly ok: true; readonly view: DeliveryAgreementView }
  | { readonly ok: false; readonly reason: EditPolicyCommandReason; readonly detail?: string };

/**
 * Derive the read view for ONE agreement. PURE — data in, view-model out, no
 * mutation, no clock read. Shipments are filtered to the agreement's supplier
 * before matching (a drawdown is the agreement supplier's own delivery);
 * deriveFulfillment then applies the material / direction / lifecycle / window
 * gates internally.
 */
export function deriveAgreementView(
  agreement: SchedulingAgreement,
  shipments: readonly IncomingShipment[],
  now: string,
  supplierName: string | null,
): DeliveryAgreementView {
  const ownShipments = shipments.filter((s) => s.supplierId === agreement.supplierId);
  return {
    agreement,
    supplierName,
    items: agreement.items.map((item) => ({
      item,
      ledger: deriveDrawdownLedger(item),
      fulfillment: deriveFulfillment(item, ownShipments, now),
    })),
  };
}

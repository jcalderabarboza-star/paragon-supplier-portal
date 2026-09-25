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

/**
 * Why a release was refused.
 *
 * ⚠️ **THE VOCABULARY IS NOW THE DISPATCHER'S TOO (call-off step 1), AND THAT
 * IS WIDENING A TYPE RATHER THAN LOOSENING A RULE.** The pure arms still occur
 * — the service seam still answers `NO_LINES_SELECTED` and
 * `UNKNOWN_RELEASE_SEQ` for selections it can resolve nothing from — but every
 * rule that used to live in a predicate on `MockDeliveryService` is now a
 * dispatcher gate, so a refusal can also arrive as `ROLE_NOT_PERMITTED`,
 * `SCOPE_DENIED` or `POLICY_REJECTED:<hook>:<HEAD>: <sentence>`.
 *
 * Those are not enumerable here without restating the dispatcher's own closed
 * vocabulary in a second place (`FLOOR-IN-PROSE-01`'s shape, applied to a
 * union), so the arm is `string` and the SURFACE is what owns the reader-facing
 * copy — keyed on the refusal HEAD, `pslRefusal.ts`'s ratified pattern. See
 * `components/delivery/deliveryRefusal.ts`, which is gated in both directions
 * against the heads `policies.ts` actually emits.
 */
export type ReleaseCommandReason = ReleaseReason | 'SCOPE_DENIED' | (string & {});

/** One line of a multi-line release that did not go through, with the
 *  dispatcher's own reason. A PARTIAL release is a real outcome — three
 *  transmitted and two refused as already past is the truth of the act — so it
 *  is reported rather than collapsed into a single boolean. */
export interface ReleaseLineRefusal {
  readonly releaseSeq: number;
  readonly reason: string;
}

/**
 * The delivery lane's release result. `ok` returns the RE-DERIVED agreement view
 * (so the caller renders the post-release state without a second read) plus
 * EXACTLY which lines went and which did not; `!ok` carries an honest reason so
 * a refusal is surfaced, never a silent no-op.
 *
 * `ok: true` with a non-empty `refusals` is the PARTIAL case and is deliberately
 * expressible: the entity is the schedule LINE, so a horizon release is many
 * independent commands and some of them can fail on their own merits.
 */
export type ReleaseCommandResult =
  | {
      readonly ok: true;
      readonly view: DeliveryAgreementView;
      /** Lines actually transmitted, ascending. */
      readonly releasedSeqs: readonly number[];
      /** Lines the dispatcher refused, with its reason for each. */
      readonly refusals: readonly ReleaseLineRefusal[];
      /** Set only by `adjustLine` — which line was adjusted. */
      readonly adjustedSeq?: number;
    }
  | { readonly ok: false; readonly reason: ReleaseCommandReason; readonly detail?: string };

/** Why a confirm-match was refused at the SERVICE seam: the pure `ConfirmReason`
 *  arms PLUS `SCOPE_DENIED` (confirm is buyer-only) and `NOTHING_TO_CONFIRM` — the
 *  latter needs the shipment pool (there is no INFERRED proposal to accept), so it
 *  lives here, not in the pure domain. */
export type ConfirmCommandReason =
  | ConfirmReason
  | 'SCOPE_DENIED'
  | 'NOTHING_TO_CONFIRM'
  // The dispatcher's vocabulary — see `ReleaseCommandReason` for why this is
  // not enumerated here and where the reader-facing copy lives instead.
  | (string & {});

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
export type EditPolicyCommandReason =
  | EditPolicyReason
  | 'SCOPE_DENIED'
  | 'UNKNOWN_ITEM'
  // The dispatcher's vocabulary — see `ReleaseCommandReason`.
  | (string & {});

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

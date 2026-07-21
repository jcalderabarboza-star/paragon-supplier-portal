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

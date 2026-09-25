// ─────────────────────────────────────────────────────────────────────────────
// THE SHIPMENT POOL — ONE definition, three readers.
//
// The fulfillment match is derived against a pool of `IncomingShipment` rows:
// the LIVE store (post-F1, real shipments flow straight in) plus the SIMULATED
// demo shipments that draw down the demo agreements.
//
// ⚠️ **IT IS LIFTED OUT OF `MockDeliveryService` BECAUSE A THIRD READER NOW
// EXISTS, AND A SECOND COPY WOULD BE THE BUG.** `MockDeliveryService.viewOf`
// derives the view; the `deliveryRelease` policy hook decides whether a confirm
// has anything to accept; and the CommandTarget writes the accepted `(ref, qty)`.
// If those three resolved DIFFERENT pools, the surface would offer a match the
// gate refuses, or — worse — the target would write a qty the surface never
// showed. They read this function, so they cannot.
// ─────────────────────────────────────────────────────────────────────────────

import { incomingShipmentStore } from '../data/mock/stores/incomingShipmentStore';
import { DELIVERY_DEMO_SHIPMENTS } from './demoFixtures';
import { SCALE_DEMO_SHIPMENTS } from './demoFixturesScale';

/** The live store + the SIMULATED demo shipments, in that order. */
export function deliveryShipmentPool() {
  return [...incomingShipmentStore.all(), ...DELIVERY_DEMO_SHIPMENTS, ...SCALE_DEMO_SHIPMENTS];
}

/** The pool narrowed to one supplier — what a match may legitimately see. */
export function deliveryShipmentPoolFor(supplierId: string) {
  return deliveryShipmentPool().filter((s) => s.supplierId === supplierId);
}

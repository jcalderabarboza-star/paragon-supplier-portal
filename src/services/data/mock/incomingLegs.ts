// ────────────────────────────────────────────────────────────────────────────
// SDC-5 · the reported legs joined with the ASN axis, and the ones still on
// their way — ONE join, so the supplier's own-shipments read and the buyer's
// coverage cannot resolve a leg's ASN two different ways.
// ────────────────────────────────────────────────────────────────────────────

import { asnTrackingFor, stillIncoming, type IncomingShipment, type IncomingShipmentView } from '../../sdc';
import { asnStore } from './stores/asnStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';

/** One leg with Paragon's inbound observation beside the supplier's declared state. */
export const incomingShipmentView = (shipment: IncomingShipment): IncomingShipmentView => {
  // THE TWO AXES. `shipment` carries the supplier's DECLARED lifecycle
  // untouched; `asnTracking` carries Paragon's inbound observation. The second
  // never overwrites the first — see `sdc/shipment.ts`.
  const asnStatus =
    shipment.direction === 'to-paragon' && shipment.asnRef
      ? (asnStore.get(shipment.asnRef)?.status ?? null)
      : null;
  return { shipment, asnTracking: asnTrackingFor(shipment, asnStatus) };
};

/** Every reported leg that is still on its way (`stillIncoming`). */
export const legsStillIncoming = (): readonly IncomingShipment[] =>
  incomingShipmentStore
    .all()
    .map(incomingShipmentView)
    .filter(stillIncoming)
    .map((v) => v.shipment);

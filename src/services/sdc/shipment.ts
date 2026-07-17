// ────────────────────────────────────────────────────────────────────────────
// SDC-3b — IncomingShipment DISPLAY-lifecycle (the drift-honesty rule).
//
// A to-paragon leg LINKS an ASN (design §2.3 — link, never duplicate the
// tracker); the ASN machine is the SoR for that leg's real movement. So the
// leg's DISPLAYED lifecycle is DERIVED from the linked ASN's state, NOT the
// shipment's own stored `lifecycle` field — the stored value is authoritative
// ONLY for a principal-to-distributor leg (which has no ASN). Rendering the
// stored value on a to-paragon leg could DRIFT from the ASN it points at; this
// selector is the single place that keeps them honest.
//
// PURE: the caller resolves the linked ASN's status string (from the ASN store)
// and passes it in — this module takes no dependency on the data layer, matching
// the SDC selector convention. A null status (to-paragon whose asnRef doesn't
// resolve — shouldn't happen post-guard, but honest if it does) falls back to
// the stored lifecycle rather than inventing a state.
// ────────────────────────────────────────────────────────────────────────────

import type { IncomingShipment, ShipmentLifecycle } from './types';

/**
 * Map an ASN status (Draft | Submitted | In Transit | Delivered | Discrepancy)
 * onto the shipment lifecycle vocabulary (Booked | Shipped | Arrived). A
 * Discrepancy ASN has physically arrived (the discrepancy is a GR-side flag), so
 * it reads Arrived. An unknown status falls through to null (⇒ stored fallback).
 */
export function asnStatusToLifecycle(asnStatus: string): ShipmentLifecycle | null {
  switch (asnStatus) {
    case 'Draft':
    case 'Submitted':
      return 'Booked';
    case 'In Transit':
      return 'Shipped';
    case 'Delivered':
    case 'Discrepancy':
      return 'Arrived';
    default:
      return null;
  }
}

export interface ShipmentDisplayLifecycle {
  readonly lifecycle: ShipmentLifecycle;
  /** True when the value was DERIVED from the linked ASN (to-paragon), so the
   *  surface can mark it "tracked via ASN" rather than a stored supplier claim. */
  readonly derivedFromAsn: boolean;
}

/**
 * The lifecycle to DISPLAY for a shipment leg. For a to-paragon leg with a
 * resolvable linked-ASN status, the ASN's mapped state wins (derivedFromAsn);
 * for a p2d leg — or a to-paragon leg whose ASN can't be resolved/mapped — the
 * stored lifecycle stands.
 */
export function shipmentDisplayLifecycle(
  shipment: IncomingShipment,
  linkedAsnStatus: string | null,
): ShipmentDisplayLifecycle {
  if (shipment.direction === 'to-paragon' && linkedAsnStatus) {
    const derived = asnStatusToLifecycle(linkedAsnStatus);
    if (derived) return { lifecycle: derived, derivedFromAsn: true };
  }
  return { lifecycle: shipment.lifecycle, derivedFromAsn: false };
}

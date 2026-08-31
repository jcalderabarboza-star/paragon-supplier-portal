// ────────────────────────────────────────────────────────────────────────────
// IncomingShipment — THE TWO AXES, KEPT APART.
//
// ⚠️ **THIS MODULE USED TO COLLAPSE THEM, AND THE COLLAPSE WAS THE DEFECT.**
// `shipmentDisplayLifecycle` returned ONE `ShipmentLifecycle` — the linked ASN's
// mapped state for a to-paragon leg, the stored value otherwise — and the
// surface rendered that one value as "the state". Because `asnStatusToLifecycle`
// mapped ALL FIVE ASN statuses, the derived value ALWAYS won on a to-paragon
// leg, so the stored `lifecycle` was never displayed there at all.
//
// Measured with the real dispatcher before this batch (Wave D):
//
//     after report    stored Booked      displayed Booked
//     after _ship     stored Shipped     displayed Booked
//     after _arrive   stored Arrived     displayed Booked
//     after _cancel   stored Cancelled   displayed Booked
//
// Three successful dispatches; the card never moved. And not inert —
// `consolidation.ts` counts a leg as incoming only while `Booked || Shipped`,
// so those acts moved the BUYER's coverage while the supplier saw nothing.
// `Cancelled` is not even in the old map's range, so a cancelled leg could
// never be rendered as cancelled.
//
// ── THE SHAPE IS `services/delivery`'s DECISION A, NOT A NEW ONE ────────────
// `delivery/types.ts:24-26` locks: *"STORE ReleaseLifecycle ('draft'|'released');
// DERIVE ReleaseFulfillment ('pending'|'fulfilled'|'late'|'missed') at read —
// never store the latter (storing 'missed' as a literal is fabricated
// fulfillment)."*
//
// ⚠️ **AND THE PRECEDENT IS THE RIGHT SHAPE WHILE BEING SILENT ON THE DEFECT,
// WHICH IS WORTH SAYING RATHER THAN GLOSSING.** Decision A's stated reason is
// about NOT STORING a derived value — a rule this module never broke, because
// nothing here was ever stored. What it demonstrates STRUCTURALLY is the part
// that applies: two axes live as two differently-typed values that COEXIST
// (`DeliveryItemView` carries `item` beside `fulfillment`), so neither can
// stand in for the other and a write to the stored one is never invisible.
//
// ── WHY THE TYPES NOW MAKE THE COLLAPSE UNEXPRESSIBLE ───────────────────────
// The derived axis is no longer a `ShipmentLifecycle`. It is an OBJECT carrying
// the ASN's OWN word, unmapped. An `AsnTracking` cannot be assigned where a
// `ShipmentLifecycle` is expected, so the substitution that caused this is a
// type error rather than a judgement call — and `asnStatusToLifecycle`, the
// translator that made the two vocabularies interchangeable, is DELETED. A
// mapping that exists is a mapping somebody will use.
// ────────────────────────────────────────────────────────────────────────────

// Type-only, and erased at build — the same discipline `delivery/types.ts` uses
// for `Tier`, and the same direction `sdc/types.ts` already takes for
// `IntakePlanState`. No runtime dependency on the data layer.
import type { AsnStatus } from '../data/types';
import type { IncomingShipment } from './types';

/**
 * AXIS 2 — **Paragon's inbound tracking of the ASN a to-paragon leg converges
 * on.** Present ONLY for a to-paragon leg with a resolvable link; `null`
 * otherwise, because a principal-to-distributor leg has no ASN and never will
 * (Paragon is not the consignee).
 *
 * ⚠️ **IT CARRIES `AsnStatus` VERBATIM, DELIBERATELY UNMAPPED.** The old code
 * translated it into leg words, and that translation is precisely what let it
 * pass for the leg's own state. The ASN says `'In Transit'`; this says
 * `'In Transit'`. Two of its five members (`'In Transit'`, `'Discrepancy'`)
 * are not `ShipmentLifecycle` members at all, so the vocabularies no longer
 * overlap enough to be confused by a reader either.
 *
 * This is an OBSERVATION by Paragon, not a claim by the supplier — which is the
 * whole reason it is a separate axis from `IncomingShipment.lifecycle`.
 */
export interface AsnTracking {
  /** The linked ASN's number (`IncomingShipment.asnRef`), carried so the
   *  surface can name what it is reporting on. */
  readonly asnRef: string;
  /** The ASN's own status, exactly as the ASN store holds it. */
  readonly asnStatus: AsnStatus;
}

/**
 * One reported leg joined with the ASN axis — the shape the P1 own-shipments
 * read returns.
 *
 * ⚠️ **THERE IS NO LONGER A FIELD MEANING "THE LIFECYCLE TO DISPLAY", AND ITS
 * ABSENCE IS THE FIX.** A consumer that wants the leg's state reads
 * `shipment.lifecycle` — the SUPPLIER'S DECLARED state, the only axis on which
 * `Cancelled` exists and the field `readState` resolves for the dispatcher. A
 * consumer that wants Paragon's inbound progress reads `asnTracking`. Neither
 * is reachable by asking for the other.
 */
export interface IncomingShipmentView {
  readonly shipment: IncomingShipment;
  readonly asnTracking: AsnTracking | null;
}

/**
 * Build the ASN axis for one leg. PURE: the caller resolves the linked ASN's
 * status from the ASN store and passes it in, matching the SDC selector
 * convention — this module takes no runtime dependency on the data layer.
 *
 * `null` in three honest cases, kept distinct in the code rather than collapsed:
 * a p2d leg (no ASN by construction), a to-paragon leg with no `asnRef`, and a
 * link that did not resolve. All three mean "Paragon has nothing to say about
 * this leg", which is different from "the leg has not moved" — and the old
 * fallback conflated them by returning the stored lifecycle dressed as a
 * derived one.
 */
export function asnTrackingFor(
  shipment: IncomingShipment,
  linkedAsnStatus: AsnStatus | null,
): AsnTracking | null {
  if (shipment.direction !== 'to-paragon') return null;
  if (!shipment.asnRef || linkedAsnStatus === null) return null;
  return { asnRef: shipment.asnRef, asnStatus: linkedAsnStatus };
}

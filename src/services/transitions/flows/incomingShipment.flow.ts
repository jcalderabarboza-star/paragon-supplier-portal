// ────────────────────────────────────────────────────────────────────────────
// IncomingShipment flow — SDC-3a (long-lived, direction-named, design v2 §2.3
// + addendum §2).
//
// Linear lifecycle + Cancelled: Booked → Shipped → Arrived, with Cancelled
// reachable from either in-flight state. There is deliberately NO `ETARevised`
// state — `eta` is a FIELD (addendum §2); an ETA revision is a repeatable,
// DR-10-audited field event that preserves the true lifecycle state. The
// revision VERB is NAMED-DEFERRED (adjudication ④, mirroring SDC-2a's draft
// promotion): the transition schema's single-`to` edges cannot express one
// state-preserving multi-state verb, so it lands as its own follow-up rather
// than being force-fitted here. SDC-3a wires the report (creation) verb only;
// ship / arrive / cancel are AUTHORED-UNWIRED (FORK-2 hybrid — wire per
// Stage-2 surface).
//
// DIRECTION ruling (design §2.3): 'principal-to-distributor' is the
// distributor's supply-assurance leg, carried natively (Paragon is not the
// consignee — no ASN exists or ever will). 'to-paragon' is what the already-
// built ASN machine is for — such a line LINKS to an ASN (`asnRef`), never
// duplicating the tracker. The symmetric guards below make direction ⟺
// linkage exactly 1:1 (the SDC-2b-EXT class-guard discipline).
//
// ── R-4 CHANNEL-EXPRESSIBILITY NOTE (Comm Hub Skeleton §1 R-4) ──────────────
// Minimal honest channel reply, principal-to-distributor leg: TOKEN (material
// context) + QTY + ETA (+ optional ETD/AWB) — three template slots, cleanly
// channel-expressible over WhatsApp. The to-paragon leg is DIFFERENT by
// design: its floor requires a resolvable asnRef, and a supplier cannot (and
// must never be asked to) type an internal ASN number into a chat — over
// channel, a to-paragon report anchors on the AWB, and asnRef is OUR-side
// resolution (AWB/PO → existing ASN), or the reply routes to the ASN motion
// itself. Coherent, not lossy: to-paragon converges on ASN everywhere.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const incomingShipmentFlow: FlowDefinition = {
  entity: 'incomingShipment',
  version: 1,
  states: ['Booked', 'Shipped', 'Arrived', 'Cancelled'],
  initial: 'Booked',
  transitions: [
    {
      // Supplier reports an incoming shipment. Creation-shape (store-assigned
      // id), births at 'Booked'. WIRED (SDC-3a). Floor = material + direction
      // + the one quantity; etd/eta/awb are optional facts; uom is NEVER a
      // payload field (master-owned, invariant #2). Membership (collaborated
      // material; to-paragon additionally: the linked ASN is the supplier's
      // OWN) folds into creationOwner — a foreign ASN is a spoof, SCOPE_DENIED.
      id: 't_incomingshipment_report',
      from: [],
      to: 'Booked',
      trigger: 'creation',
      requiredRole: 'incomingshipment:report',
      requiredFields: ['materialCode', 'direction', 'qty'],
      policyHooks: [
        POLICY_HOOKS.ISH_TOPARAGON_ASN_LINKED,
        POLICY_HOOKS.ISH_P2D_NO_ASN,
        POLICY_HOOKS.ISH_P2D_DISTRIBUTOR_ONLY,
      ],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — the leg departs (supplier updates its own report).
      id: 't_incomingshipment_ship',
      from: ['Booked'],
      to: 'Shipped',
      trigger: 'user',
      requiredRole: 'incomingshipment:ship',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — the leg arrives. For a to-paragon leg the linked
      // ASN machine is the tracker of record; read-side reconciliation of the
      // two states is a NAMED 3b display question (link, don't duplicate).
      id: 't_incomingshipment_arrive',
      from: ['Shipped'],
      to: 'Arrived',
      trigger: 'user',
      requiredRole: 'incomingshipment:arrive',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // AUTHORED-UNWIRED — an in-flight leg is called off.
      id: 't_incomingshipment_cancel',
      from: ['Booked', 'Shipped'],
      to: 'Cancelled',
      trigger: 'user',
      requiredRole: 'incomingshipment:cancel',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

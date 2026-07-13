// ────────────────────────────────────────────────────────────────────────────
// Shipment flow (F0.4 — census #2). Author-unwired.
//
// The inbound-logistics tracking machine: a shipment is born (creation-shape,
// ← PO/ASN) at `Pending ASN` and advances through the physical-arrival milestones
// via `system` events. Its logistics lifecycle belongs to the TMS Control Tower
// (the Odyssey sibling) — see INT-TMS-01 — so every advance is `system`-triggered
// (system/cascade transitions map to the buyer role, roles.ts convention) and
// NO verb is wired this stage. The cross-entity "created by PO confirm" coupling
// is a cascade LINK deferred to wiring (none authored here); `t_shipment_create`
// is the creation shape it will target.
//
// `Delayed` (ETA < clock) is a read-time PROJECTION (law 0.5, census G1), NOT a
// transition-state — it is deliberately absent from `states`.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const shipmentFlow: FlowDefinition = {
  entity: 'shipment',
  version: 1,
  states: [
    'Pending ASN',
    'ASN Received',
    'In Transit',
    'Arrived at Port',
    'Customs Clearance',
    'At Dock',
    'Unloading',
    'Delivered',
  ],
  initial: 'Pending ASN',
  transitions: [
    {
      // Creation-shape (← PO/ASN). The "created by PO confirm" cascade is a
      // deferred link (not authored) — this is the target creation transition.
      id: 't_shipment_create',
      from: [],
      to: 'Pending ASN',
      trigger: 'creation',
      requiredRole: 'shipment:create',
      requiredFields: ['poNumber', 'supplierId'],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_asn_received',
      from: ['Pending ASN'],
      to: 'ASN Received',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_depart',
      from: ['ASN Received'],
      to: 'In Transit',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_arrive_port',
      from: ['In Transit'],
      to: 'Arrived at Port',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_customs',
      from: ['Arrived at Port'],
      to: 'Customs Clearance',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_dock',
      from: ['Customs Clearance'],
      to: 'At Dock',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_unload',
      from: ['At Dock'],
      to: 'Unloading',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_shipment_deliver',
      from: ['Unloading'],
      to: 'Delivered',
      trigger: 'system',
      requiredRole: 'shipment:advance',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

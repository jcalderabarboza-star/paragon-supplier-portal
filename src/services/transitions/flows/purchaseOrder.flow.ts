// ────────────────────────────────────────────────────────────────────────────
// Purchase-order flow (v2.2 Step 3.1 seed machine).
//
// The one flow authored at 3.1: PO is fully unambiguous (no DR-7 dependency) and
// is the target of the Step 3.10 PO-confirm end-to-end proof. It exercises every
// non-clock trigger class — creation (issue), user (view/acknowledge/confirm),
// system (delivery/close) — and carries the `t_po_confirm` transition the proof
// drives (requiredFields qty payload + a registered policy hook).
//
// The remaining 14 machines are authored as their verbs land in Phase 2.2′; this
// file is the pattern they follow. `states` lists TRANSITION-states only —
// `daysOverdue` and any Expiring/Expired display state are read-time projections
// (law 0.5), never members of the transition table.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POStatus } from '../../data/types';
import { POLICY_HOOKS } from '../policyHooks';

export const purchaseOrderFlow: FlowDefinition = {
  entity: 'purchaseOrder',
  version: 1,
  states: [
    POStatus.SENT,
    POStatus.VIEWED,
    POStatus.ACKNOWLEDGED,
    POStatus.CONFIRMED,
    POStatus.PARTIALLY_DELIVERED,
    POStatus.DELIVERED,
    POStatus.CLOSED,
  ],
  initial: POStatus.SENT,
  /** PF-0 · D-2 — a closed PO is the end of the order lifecycle. */
  terminals: [POStatus.CLOSED],
  transitions: [
    {
      id: 't_po_issue',
      from: [],
      to: POStatus.SENT,
      trigger: 'creation',
      requiredRole: 'po:issue',
      requiredFields: ['supplierId', 'lineItems'],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_po_view',
      from: [POStatus.SENT],
      to: POStatus.VIEWED,
      trigger: 'user',
      requiredRole: 'po:view',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_po_acknowledge',
      from: [POStatus.SENT, POStatus.VIEWED],
      to: POStatus.ACKNOWLEDGED,
      trigger: 'user',
      requiredRole: 'po:acknowledge',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      // The Step 3.10 proof transition. A supplier confirms an actionable PO —
      // legal from any pre-confirm state the "needs action" workspace surfaces
      // (Sent / Viewed / Acknowledged), landing it in Confirmed.
      id: 't_po_confirm',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.CONFIRMED,
      trigger: 'user',
      requiredRole: 'po:confirm',
      requiredFields: ['confirmedQuantities'],
      policyHooks: [POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED],
      version: 1,
    },
    {
      id: 't_po_partial_deliver',
      from: [POStatus.CONFIRMED],
      to: POStatus.PARTIALLY_DELIVERED,
      trigger: 'system',
      requiredRole: 'po:fulfil',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_po_deliver',
      from: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED],
      to: POStatus.DELIVERED,
      trigger: 'system',
      requiredRole: 'po:fulfil',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
    {
      id: 't_po_close',
      from: [POStatus.DELIVERED],
      to: POStatus.CLOSED,
      trigger: 'system',
      requiredRole: 'po:close',
      requiredFields: [],
      policyHooks: [],
      version: 1,
    },
  ],
};

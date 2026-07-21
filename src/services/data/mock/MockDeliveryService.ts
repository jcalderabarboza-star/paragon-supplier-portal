// ────────────────────────────────────────────────────────────────────────────
// MockDeliveryService — the Delivery Agreement read seam's mock implementation.
//
// Mirrors MockCollaborationService: scope moves INTO the service, the pure
// derivations run HERE (data-in / view-out), and the shared sdcClock supplies
// "now" so the service and the pure fulfillment selector agree on the timeline.
//
//   · SCOPING: SchedulingAgreement carries `supplierId`, so applySupplierScope
//     gives buyer = the cross-supplier superset, a supplier = its OWN agreements
//     only, a scopeless call = [] (defence in depth). No cross-supplier leak.
//   · SHIPMENT POOL: the LIVE incomingShipmentStore (the real seam — post-F1 real
//     shipments flow straight in) PLUS the SIMULATED demo shipments that draw down
//     the demo agreement. deriveAgreementView filters the pool to each agreement's
//     supplier before matching. The pristine ctr-003 anchor is all-draft, so it
//     matches nothing and reads deliveredQty 0 honestly.
//   · Nothing here dispatches or mutates — read-only.
// ────────────────────────────────────────────────────────────────────────────

import { applySupplierScope } from '../scoping';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { sdcClock } from '../../sdc';
import { mockSuppliers } from '../../../data/mockSuppliers';
import {
  SCHEDULING_AGREEMENTS,
  SCHEDULING_AGREEMENT_DEMO,
  DELIVERY_DEMO_SHIPMENTS,
  deriveAgreementView,
} from '../../delivery';
import type { DeliveryAgreementView } from '../../delivery';
import type { IDeliveryService, Page, QueryScope } from '../types';

// The pristine ctr-003 anchor + the SIMULATED demo scenario. Kept as one list so
// the buyer superset shows both the "freshly-drafted" zero-state and the "active
// drawdown" demo; a supplier persona sees only its own via applySupplierScope.
const ALL_AGREEMENTS = [...SCHEDULING_AGREEMENTS, SCHEDULING_AGREEMENT_DEMO];

/** Display join — resolve the agreement supplier's name from reference data. */
function supplierNameOf(supplierId: string): string | null {
  return mockSuppliers.find((s) => s.id === supplierId)?.name ?? null;
}

export class MockDeliveryService implements IDeliveryService {
  /** The scoped delivery-agreement views (drawdown ledger + per-line fulfillment,
   *  derived internally as of the shared SDC clock). Buyer = superset; supplier =
   *  own agreements only. */
  async getAgreements(scope: QueryScope): Promise<Page<DeliveryAgreementView>> {
    const scoped = applySupplierScope(scope, ALL_AGREEMENTS);
    const now = sdcClock.now();
    const pool = [...incomingShipmentStore.all(), ...DELIVERY_DEMO_SHIPMENTS];
    return {
      items: scoped.map((agreement) =>
        deriveAgreementView(agreement, pool, now, supplierNameOf(agreement.supplierId)),
      ),
    };
  }
}

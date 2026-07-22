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
//   · WRITE (the ONE mutation): `releaseLines` — the draft→released transmit
//     moment. BUYER-ONLY. Applies Batch-2's pure `releaseScheduleLines` to the
//     STORED item and persists it; the next read re-derives over the mutated
//     store. NO command dispatcher, NO CommandTarget → deliveryAgreements stays
//     SIMULATED by construction (a portal release, never a SAP posting).
// ────────────────────────────────────────────────────────────────────────────

import { applySupplierScope } from '../scoping';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { sdcClock } from '../../sdc';
import { mockSuppliers } from '../../../data/mockSuppliers';
import {
  DELIVERY_DEMO_SHIPMENTS,
  SCALE_DEMO_SHIPMENTS,
  confirmFulfillment,
  deriveAgreementView,
  deriveFulfillment,
  releaseScheduleLines,
} from '../../delivery';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type {
  ConfirmCommandResult,
  DeliveryAgreementView,
  ReleaseCommandResult,
  ReleaseSelection,
  SchedulingAgreement,
} from '../../delivery';
import type { DeliveryQuery, IDeliveryService, Page, QueryScope } from '../types';

/** Display join — resolve the agreement supplier's name from reference data. */
function supplierNameOf(supplierId: string): string | null {
  return mockSuppliers.find((s) => s.id === supplierId)?.name ?? null;
}

/** The buyer gate for the release write: release is a BUYER action (transmit to a
 *  vendor) — a supplier (or a scopeless call) can never release. */
const buyerOnly = (scope: QueryScope): boolean => scope.personaType === 'buyer';

export class MockDeliveryService implements IDeliveryService {
  /** The scoped delivery-agreement views (drawdown ledger + per-line fulfillment,
   *  derived internally as of the shared SDC clock). Buyer = superset; supplier =
   *  own agreements only. `query.contractId` narrows to one contract's agreements
   *  (the nested contract-detail DA tab) — applied AFTER supplier scoping, so it
   *  never widens what a supplier can see. */
  async getAgreements(
    scope: QueryScope,
    query?: DeliveryQuery,
  ): Promise<Page<DeliveryAgreementView>> {
    const supplierScoped = applySupplierScope(scope, schedulingAgreementStore.all());
    const scoped = query?.contractId
      ? supplierScoped.filter((a) => a.contractId === query.contractId)
      : supplierScoped;
    return { items: scoped.map((agreement) => this.viewOf(agreement)) };
  }

  /** Release the selected DRAFT lines of ONE item. BUYER-ONLY. Applies the pure
   *  `releaseScheduleLines` to the STORED item, persists the new agreement, and
   *  returns the re-derived view (or an honest ReleaseReason on refusal). NO
   *  dispatcher, NO CommandTarget — SIMULATED by construction. `now` is the shared
   *  SIMULATED clock (keeps `releasedAt` in the fixture timeline). */
  async releaseLines(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    selection: ReleaseSelection,
  ): Promise<ReleaseCommandResult> {
    // Buyer-only, and the agreement must be in this scope's superset (a supplier
    // is refused before touching the store — release is a buyer verb).
    if (!buyerOnly(scope)) {
      return { ok: false, reason: 'SCOPE_DENIED', detail: 'release is a buyer action' };
    }
    const agreement = schedulingAgreementStore.get(agreementId);
    if (!agreement) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no agreement ${agreementId}` };
    }
    const item = agreement.items.find((i) => i.lineSeq === itemSeq);
    if (!item) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no item ${itemSeq}` };
    }

    const result = releaseScheduleLines(item, selection, sdcClock.now());
    if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };

    // Persist: swap the released item into a new agreement (immutable throughout).
    schedulingAgreementStore.update(agreementId, (a) => ({
      ...a,
      items: a.items.map((i) => (i.lineSeq === itemSeq ? result.item : i)),
    }));
    const updated = schedulingAgreementStore.get(agreementId)!;
    return { ok: true, view: this.viewOf(updated) };
  }

  /** Confirm the fulfillment of ONE released line (the delivery lane's SECOND
   *  write — accept an INFERRED proximity proposal as a confirmed fact). BUYER-ONLY.
   *  Re-derives the observed match, ACCEPTS-AS-OBSERVED (writes `fulfilledBy` +
   *  the observed `actualQty` via the pure `confirmFulfillment`), persists, and
   *  returns the re-derived view — the proposal now binds authoritatively
   *  (inferred:false) and `deliveredQty` has climbed. NO dispatcher, NO
   *  CommandTarget — SIMULATED by construction (a portal confirm, never a SAP GR). */
  async confirmMatch(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    releaseSeq: number,
  ): Promise<ConfirmCommandResult> {
    // Buyer-only — accepting a delivery against a released commitment is a buyer
    // judgment (a supplier is refused before touching the store).
    if (!buyerOnly(scope)) {
      return { ok: false, reason: 'SCOPE_DENIED', detail: 'confirm is a buyer action' };
    }
    const agreement = schedulingAgreementStore.get(agreementId);
    if (!agreement) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no agreement ${agreementId}` };
    }
    const item = agreement.items.find((i) => i.lineSeq === itemSeq);
    if (!item) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no item ${itemSeq}` };
    }

    // Re-derive the observed match over the SAME supplier-scoped pool viewOf uses,
    // so the accepted (ref, qty) is exactly what the surface proposed.
    const ownShipments = this.shipmentPool().filter((s) => s.supplierId === agreement.supplierId);
    const fv = deriveFulfillment(item, ownShipments, sdcClock.now()).find(
      (f) => f.releaseSeq === releaseSeq,
    );
    // Nothing to accept unless there IS a match carrying an observed qty. An
    // already-CONFIRMED line (inferred:false) is caught by the pure guard below;
    // an unmatched line (no ref / no qty) is NOTHING_TO_CONFIRM here.
    if (!fv || fv.matchedRef === undefined || fv.actualQty === undefined) {
      return {
        ok: false,
        reason: 'NOTHING_TO_CONFIRM',
        detail: `line ${releaseSeq} has no matched delivery to confirm`,
      };
    }

    const result = confirmFulfillment(item, releaseSeq, {
      fulfilledBy: fv.matchedRef,
      actualQty: fv.actualQty, // ACCEPT-AS-OBSERVED — line.actualQty === s.qty (no split).
      now: sdcClock.now(),
    });
    if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };

    schedulingAgreementStore.update(agreementId, (a) => ({
      ...a,
      items: a.items.map((i) => (i.lineSeq === itemSeq ? result.item : i)),
    }));
    const updated = schedulingAgreementStore.get(agreementId)!;
    return { ok: true, view: this.viewOf(updated) };
  }

  /** The live shipment pool: the real store + the SIMULATED demo shipments (the
   *  demo + the at-scale fleet). Shared by `viewOf` and `confirmMatch` so a read
   *  and a confirm resolve the identical match. */
  private shipmentPool() {
    return [
      ...incomingShipmentStore.all(),
      ...DELIVERY_DEMO_SHIPMENTS,
      ...SCALE_DEMO_SHIPMENTS,
    ];
  }

  /** Derive one agreement's view-model as of the shared SIMULATED clock, over the
   *  live shipment pool (real store + the SIMULATED demo shipments). */
  private viewOf(agreement: SchedulingAgreement): DeliveryAgreementView {
    return deriveAgreementView(
      agreement,
      this.shipmentPool(),
      sdcClock.now(),
      supplierNameOf(agreement.supplierId),
    );
  }
}

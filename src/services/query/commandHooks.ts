// ────────────────────────────────────────────────────────────────────────────
// Command hooks (v2.2 Step 3.6 + 3.10) — the write side of the query layer.
//
// The canonical mutation pattern: dispatch a command through the service seam →
// on a non-failed outcome, targeted invalidateQueries by scopeKey (procurement,
// current scope only) → the page re-derives from the mutated store. Pages hold
// NO local seeded copy.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { scopeKey } from './useServiceQuery';
import type {
  CommandResult,
  CommandStatus,
  QueryScope,
  InspectionResult,
} from '../data/types';

function useScope(): QueryScope {
  const { identity } = useCurrentIdentity();
  return { personaType: identity.personaType, supplierId: identity.supplierId };
}

// Targeted invalidation: only the current scope's procurement reads (the last
// key element is the scopeKey), so a command never disturbs another supplier's
// cache and every derivation of THIS scope re-derives together.
function useInvalidateProcurement() {
  const qc = useQueryClient();
  return (scope: QueryScope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'procurement' && q.queryKey[q.queryKey.length - 1] === key,
    });
  };
}

export interface PoConfirmVars {
  poId: string;
  confirmedQuantities: number[];
}

/**
 * Confirm a purchase order (fires `t_po_confirm`). On a non-failed outcome,
 * invalidates the current scope's procurement reads so the PO list/detail
 * re-derive with the new Confirmed status.
 */
export function usePurchaseOrderConfirm() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, PoConfirmVars>({
    mutationFn: ({ poId, confirmedQuantities }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: poId,
        payload: { confirmedQuantities },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnCreateVars {
  poReference: string;
  carrier?: string;
  trackingNumber?: string;
  eta?: string;
}

/**
 * Draft an ASN from a confirmed PO (fires the `creation` verb `t_asn_create`).
 * No entityId — the store assigns the ASN number, returned on the result. On a
 * non-failed outcome the ASN list AND the "awaiting ASN" panel re-derive.
 */
export function useAdvanceShipNoticeCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnSubmitVars {
  asnNumber: string;
  carrier: string;
  trackingNumber: string;
  eta: string;
}

/** Submit a Draft ASN (fires `t_asn_submit`, Draft → Submitted). */
export function useAdvanceShipNoticeSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnSubmitVars>({
    mutationFn: ({ asnNumber, carrier, trackingNumber, eta }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_submit',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: { carrier, trackingNumber, eta },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Goods receipt (Step 4 batch ii) ────────────────────────────────────────
// The GR is a buyer/warehouse document, so these dispatch under the buyer scope.
// Create records the finalized inspection results; the header disposition is a
// ROLLUP the dispatcher re-derives from those stored lines (the UI cannot claim
// "Approved" a line rollup contradicts). Post is the first real sapBoundary verb.

export interface GrCreateVars {
  /** The parent shipment's ASN number (or a manual ASN ref). */
  asnReference: string;
  inspectionResults: InspectionResult[];
  receivedDate: string;
  receivedBy: string;
  notes?: string;
}

/**
 * Receive a GR from an arrived shipment (fires the `creation` verb
 * `t_gr_create`). No entityId — the store assigns the GR number, returned on
 * the result. Records the inspection results at create.
 */
export function useGoodsReceiptCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, GrCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_create',
        entity: 'goodsReceipt',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface GrFinalizeVars {
  grId: string;
  /** The rolled-up header verb: t_gr_approve | t_gr_partial_approve | t_gr_reject. */
  headerVerb: string;
  /** Required by t_gr_reject; ignored otherwise. */
  dispositionReason?: string;
}

/**
 * Finalize inspection: advance Pending → Under Inspection (best-effort — a GR
 * already Under Inspection stays put) then fire the rolled-up header verb. The
 * verb's rollup policy hook re-derives the disposition from the stored lines, so
 * the header is provably derived. A reject/partial cascades an ASN discrepancy.
 */
export function useGoodsReceiptFinalize() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, GrFinalizeVars>({
    mutationFn: async ({ grId, headerVerb, dispositionReason }) => {
      // Move into inspection if still Pending; ignore an illegal-from-here result.
      await svc.commands.dispatch(scope, {
        transitionId: 't_gr_start_inspection',
        entity: 'goodsReceipt',
        entityId: grId,
      });
      return svc.commands.dispatch(scope, {
        transitionId: headerVerb,
        entity: 'goodsReceipt',
        entityId: grId,
        payload: dispositionReason ? { dispositionReason } : {},
      });
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Post an Approved / Partially Approved GR to SAP (fires the sapBoundary verb
 * `t_gr_post`). Resolves `submitted`: the GR moves to the interim 'Posting to
 * SAP' with NO material document yet — the caller settles to finalize.
 */
export function useGoodsReceiptPost() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { grId: string }>({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_post',
        entity: 'goodsReceipt',
        entityId: grId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Settle a submitted `t_gr_post` (the async SAP callback): advances 'Posting to
 * SAP' → 'Posted to SAP' and assigns the real material document under the same
 * correlationId. Idempotent.
 */
export function useGoodsReceiptSettle() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandStatus | null, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) => svc.commands.settle(scope, correlationId),
    onSuccess: () => invalidate(scope),
  });
}

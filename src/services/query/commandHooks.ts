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
import type { CommandResult, QueryScope } from '../data/types';

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

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
  const qc = useQueryClient();

  return useMutation<CommandResult, Error, PoConfirmVars>({
    mutationFn: ({ poId, confirmedQuantities }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: poId,
        payload: { confirmedQuantities },
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      const key = scopeKey(scope);
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          q.queryKey[q.queryKey.length - 1] === key,
      });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Delivery Agreement read hooks — the buyer drawdown/compliance surface's reads.
//
// Mirrors sdcBuyerHooks: a thin `useServiceQuery` over `svc.delivery.*`, scope
// derived from the current identity inside the wrapper, `.items` unwrapped so the
// page reads a plain array. Buyer scope resolves the cross-supplier superset; a
// supplier persona resolves only its own agreements (applySupplierScope in the
// service). The derivations run in the service — the page renders, never derives.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServiceQuery, scopeKey } from './useServiceQuery';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import type {
  ConfirmCommandResult,
  DeliveryAgreementView,
  EditPolicyCommandResult,
  EditPolicyPatch,
  ReleaseCommandResult,
  ReleaseSelection,
} from '../delivery';
import type { QueryScope } from '../data/types';

/** The scoped delivery-agreement views (drawdown ledger + per-line fulfillment).
 *  Buyer-scoped superset; a supplier persona resolves only its own. Pass a
 *  `contractId` to scope to one contract's agreements (the nested contract-detail
 *  DA tab) — the id enters the query key so per-contract reads cache in isolation
 *  from the cross-contract roll-up. */
export function useDeliveryAgreements(contractId?: string) {
  return useServiceQuery<readonly DeliveryAgreementView[]>(
    ['delivery', 'agreements', contractId ?? 'all'],
    async (svc, scope) =>
      (await svc.delivery.getAgreements(scope, contractId ? { contractId } : undefined))
        .items,
  );
}

/** The variables a release mutation carries — one item of one agreement, and
 *  which of its draft lines to transmit (horizon or explicit seqs). */
export interface ReleaseLinesVars {
  agreementId: string;
  itemSeq: number;
  selection: ReleaseSelection;
}

// The buyer superset scopeKey — every delivery read the writer or the affected
// supplier holds is keyed under one of these two (SDC-4d cross-scope shape).
const BUYER_SCOPE_KEY = scopeKey({ personaType: 'buyer', supplierId: null });

/** Release draft schedule lines (the delivery lane's FIRST write). BUYER-ONLY at
 *  the service; on a successful release it invalidates the ['delivery'] reads for
 *  the buyer superset AND the affected supplier's own scope (SDC-4d cross-scope
 *  invalidation) so both the per-contract DA tab and the roll-up re-derive —
 *  a warm supplier mirror in the same session refreshes too, no other supplier's
 *  cache is disturbed. */
export function useReleaseLines() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  };
  const qc = useQueryClient();

  return useMutation<ReleaseCommandResult, Error, ReleaseLinesVars>({
    mutationFn: ({ agreementId, itemSeq, selection }) =>
      svc.delivery.releaseLines(scope, agreementId, itemSeq, selection),
    onSuccess: (result) => {
      if (!result.ok) return; // an honest refusal changed nothing — no invalidation.
      const supplierKey = scopeKey({
        personaType: 'supplier',
        supplierId: result.view.agreement.supplierId,
      });
      qc.invalidateQueries({
        predicate: (q) => {
          if (q.queryKey[0] !== 'delivery') return false;
          const last = q.queryKey[q.queryKey.length - 1];
          return last === BUYER_SCOPE_KEY || last === supplierKey;
        },
      });
    },
  });
}

/** The variables a confirm-match mutation carries — one released line of one item
 *  of one agreement, accepted AS-OBSERVED (v1 writes no override qty). */
export interface ConfirmMatchVars {
  agreementId: string;
  itemSeq: number;
  releaseSeq: number;
}

/** Confirm an inferred fulfillment match (the delivery lane's SECOND write).
 *  BUYER-ONLY at the service; on success it invalidates the ['delivery'] reads for
 *  the buyer superset AND the affected supplier's own scope (the same SDC-4d
 *  cross-scope shape release uses), so both the per-contract DA tab and the roll-up
 *  re-derive with the now-confirmed match + climbed `deliveredQty`. An honest
 *  refusal changes nothing → no invalidation. */
export function useConfirmMatch() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  };
  const qc = useQueryClient();

  return useMutation<ConfirmCommandResult, Error, ConfirmMatchVars>({
    mutationFn: ({ agreementId, itemSeq, releaseSeq }) =>
      svc.delivery.confirmMatch(scope, agreementId, itemSeq, releaseSeq),
    onSuccess: (result) => {
      if (!result.ok) return;
      const supplierKey = scopeKey({
        personaType: 'supplier',
        supplierId: result.view.agreement.supplierId,
      });
      qc.invalidateQueries({
        predicate: (q) => {
          if (q.queryKey[0] !== 'delivery') return false;
          const last = q.queryKey[q.queryKey.length - 1];
          return last === BUYER_SCOPE_KEY || last === supplierKey;
        },
      });
    },
  });
}

/** The variables a policy-edit mutation carries — one item of one agreement, and
 *  the new tolerance patch (two knobs + the required reason). */
export interface EditPolicyVars {
  agreementId: string;
  itemSeq: number;
  patch: EditPolicyPatch;
}

/** Re-point an item's active drawdown tolerance (the delivery lane's THIRD write —
 *  the governance write). BUYER-ONLY at the service; on success it invalidates the
 *  ['delivery'] reads for the buyer superset AND the affected supplier's own scope
 *  (the same SDC-4d cross-scope shape release / confirm use), so both the
 *  per-contract DA tab and the roll-up re-derive with the new `active`
 *  (the deviation marker + re-derived `enforced` / `exceptions`). An honest refusal
 *  changes nothing → no invalidation. */
export function useEditPolicy() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  };
  const qc = useQueryClient();

  return useMutation<EditPolicyCommandResult, Error, EditPolicyVars>({
    mutationFn: ({ agreementId, itemSeq, patch }) =>
      svc.delivery.editPolicy(scope, agreementId, itemSeq, patch),
    onSuccess: (result) => {
      if (!result.ok) return;
      const supplierKey = scopeKey({
        personaType: 'supplier',
        supplierId: result.view.agreement.supplierId,
      });
      qc.invalidateQueries({
        predicate: (q) => {
          if (q.queryKey[0] !== 'delivery') return false;
          const last = q.queryKey[q.queryKey.length - 1];
          return last === BUYER_SCOPE_KEY || last === supplierKey;
        },
      });
    },
  });
}

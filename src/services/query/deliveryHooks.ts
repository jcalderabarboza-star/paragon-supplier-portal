// ────────────────────────────────────────────────────────────────────────────
// Delivery Agreement read hooks — the buyer drawdown/compliance surface's reads.
//
// Mirrors sdcBuyerHooks: a thin `useServiceQuery` over `svc.delivery.*`, scope
// derived from the current identity inside the wrapper, `.items` unwrapped so the
// page reads a plain array. Buyer scope resolves the cross-supplier superset; a
// supplier persona resolves only its own agreements (applySupplierScope in the
// service). The derivations run in the service — the page renders, never derives.
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type { DeliveryAgreementView } from '../delivery';

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

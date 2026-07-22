// ────────────────────────────────────────────────────────────────────────────
// SDC-5d — the unified chase read hook.
//
// Mirrors sdcBuyerHooks / deliveryHooks: a thin `useServiceQuery` over
// `svc.chase.getUnifiedChase`, scope derived from the current identity inside the
// wrapper, `.items` unwrapped so the page reads a plain array. BUYER-GATED by
// construction — the service resolves [] for a supplier persona (a supplier does
// not chase itself), so on a supplier route this hook returns an empty list.
// The composition runs in the service; the page renders, never derives.
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type { SupplierChaseView } from '../chase';

/** The unified per-supplier chase list (data staleness + delivery commitment),
 *  worst-first. Buyer-scoped; a supplier persona resolves to []. */
export function useUnifiedChase() {
  return useServiceQuery<readonly SupplierChaseView[]>(
    ['chase', 'unified'],
    async (svc, scope) => (await svc.chase.getUnifiedChase(scope)).items,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SDC-4d — the P2 buyer-consolidation hooks.
//
// The planner-consolidation reads, moved OFF BuyerCollaboration's module-scope
// fixture consts onto buyer-scoped `useServiceQuery` over `svc.collaboration.*`
// (SDC-4b). They read the LIVE stores through the shared sdcClock (SDC-4a), so a
// P1 supplier write (declare / confirm) is reflected in the buyer's consolidation
// — the P1→P2 loop, closed on fixtures.
//
// BUYER-GATED by construction: the service returns the cross-supplier superset
// ONLY for a buyer scope and [] for a supplier scope (the honesty gate). The
// scope is derived from the current identity inside useServiceQuery, so on the
// #/buyer/* route these resolve the superset and on a supplier persona they
// resolve empty — a supplier can never see the consolidation.
//
// Publications themselves stay the frozen SOMO fixtures (their producer is the
// F2 C8 feed, not a supplier write) — BuyerCollaboration keeps reading those
// directly for the period bar; only the supplier-WRITTEN derivations live here.
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type {
  ConsolidationRow,
  SupplierCoverageEntry,
  SupplierRollup,
  ChaseEntry,
} from '../sdc';

/** The consolidation rows (every current-publication line + its response state).
 *  Buyer-scoped; a supplier persona resolves to []. */
export function useConsolidationRows() {
  return useServiceQuery<readonly ConsolidationRow[]>(
    ['sdc', 'consolidation'],
    async (svc, scope) => (await svc.collaboration.getConsolidation(scope)).items,
  );
}

/** The per-supplier coverage entries (the ONE modeled projection). Buyer-scoped. */
export function useCoverageEntries() {
  return useServiceQuery<readonly SupplierCoverageEntry[]>(
    ['sdc', 'coverage'],
    async (svc, scope) => (await svc.collaboration.getCoverage(scope)).items,
  );
}

/** The pre-scheduler chase list (overdue / partial), as of the shared clock.
 *  Buyer-scoped. */
export function useChaseEntries() {
  return useServiceQuery<readonly ChaseEntry[]>(
    ['sdc', 'chase'],
    async (svc, scope) => (await svc.collaboration.getChase(scope)).items,
  );
}

/** The per-supplier response rollups (responded / partial / silent). Buyer-scoped. */
export function useSupplierRollups() {
  return useServiceQuery<readonly SupplierRollup[]>(
    ['sdc', 'rollups'],
    async (svc, scope) => (await svc.collaboration.getRollups(scope)).items,
  );
}

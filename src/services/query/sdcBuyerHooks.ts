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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServiceQuery, scopeKey } from './useServiceQuery';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import type {
  ConsolidationRow,
  SupplierCoverageEntry,
  SupplierRollup,
  ChaseEntry,
} from '../sdc';
import type { ChannelMessage } from '../channel/types';
import type { CommandResult, QueryScope } from '../data/types';

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

// ─── C4c — the buyer RECORDING write (ruled option (d)) ───────────────────────
// A planner records an SOH assertion a supplier made over an ungoverned channel,
// firing the DISTINCT buyer verb `t_inventorydeclaration_record` under the BUYER
// scope (so the DR-10 actor is honestly the buyer). Authored + WIRED here; its
// in-place confirm SURFACE is the C4c follow-on (FORK-2). NB the SUPPLIER-side
// self-submit stays `useInventoryDeclare` (sdcSupplierHooks) — a different verb,
// a different actor, permanently distinguishable in the event stream.

const BUYER_SCOPE_KEY = scopeKey({ personaType: 'buyer', supplierId: null });

/**
 * C4c INVALIDATION CARVE-OUT. A normal command never disturbs another supplier's
 * cache (commandHooks / sdcSupplierHooks both say so). A buyer-recorded write is
 * the deliberate exception: it is ABOUT a SUBJECT supplier, so it MUST invalidate
 * (a) that subject supplier's OWN 'sdc' reads — else their portal SOH goes stale
 * in-session — and (b) the buyer consolidation (the recorded SOH feeds the P2
 * view). NO OTHER supplier is touched. Exported as a pure predicate so the
 * carve-out is unit-tested without a render.
 */
export function isRecordedDeclarationInvalidation(
  queryKey: readonly unknown[],
  subjectSupplierId: string,
): boolean {
  if (queryKey[0] !== 'sdc') return false;
  const last = queryKey[queryKey.length - 1];
  return (
    last === scopeKey({ personaType: 'supplier', supplierId: subjectSupplierId }) ||
    last === BUYER_SCOPE_KEY
  );
}

export interface InventoryRecordVars {
  /**
   * The captured inbound message. Its `supplierId` is the SUBJECT binding —
   * app-resolved once at capture (C1a), NEVER parsed from the text — and the SOLE
   * source of the recorded declaration's supplierId. The operator never
   * free-picks a supplier at dispatch time (C4c point 2): everything derives from
   * this single auditable ChannelMessage record.
   */
  message: ChannelMessage;
  /**
   * The confirmed declared facts (materialCode + totalQty, optional batches) — the
   * operator's triaged reply. supplierId is intentionally NOT here: it is bound
   * from `message`, and any supplierId a caller slips in is overridden.
   */
  facts: Record<string, unknown>;
  /** SDC-3b — the SubmissionSession audit anchor (commands 2..n of one visit). */
  causationId?: string;
}

/**
 * Record a channel-asserted SOH declaration (fires the buyer `creation` verb
 * `t_inventorydeclaration_record`). The subject supplierId is taken from the
 * message binding, never the operator; on a non-failed outcome it invalidates the
 * SUBJECT supplier's reads AND the buyer consolidation (the C4c carve-out).
 */
export function useInventoryRecord() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const qc = useQueryClient();

  return useMutation<CommandResult, Error, InventoryRecordVars>({
    mutationFn: ({ message, facts, causationId }) =>
      svc.commands.dispatch(
        scope,
        {
          transitionId: 't_inventorydeclaration_record',
          entity: 'inventoryDeclaration',
          // Subject supplierId is message-bound (C4c point 2) — placed LAST so a
          // stray supplierId in `facts` can never override the conversation binding.
          payload: { ...facts, supplierId: message.supplierId },
        },
        causationId,
      ),
    onSuccess: (result, { message }) => {
      if (result.status !== 'failed') {
        qc.invalidateQueries({
          predicate: (q) => isRecordedDeclarationInvalidation(q.queryKey, message.supplierId),
        });
      }
    },
  });
}

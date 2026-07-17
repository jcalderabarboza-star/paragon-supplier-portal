// ────────────────────────────────────────────────────────────────────────────
// SDC-2b — the P1 supplier-surface hooks (reads + the ONE governed write).
//
// READS (scoped react-query over the SDC module, keyed under 'sdc' + scopeKey):
//   · useOwnForecastLines — the current publication's lines fanned to THIS
//     supplier, read THROUGH the FLAG-2 gate: `supplierVisiblePublications()`
//     admits only LIVE publications, so the governed lane is EMPTY today (every
//     fixture is SIMULATED) and the page falls back to the explicitly-marked
//     sample path. When F1 real identities + a LIVE feed land, the gate is
//     already in this read path — the demo exemption collapses by construction.
//   · useOwnRequirementResponses — the supplier's OWN submissions from
//     `requirementResponseStore` (own-facts-only, FORK-3b-C: status ONLY, no
//     rank/score/consolidation — those need sibling data scoping hides).
//
// SCOPING NOTE (named deferral → SDC-4): the own-filter here is PAGE-LEVEL
// enforcement — these hooks read the fixture/store modules directly, not a
// service read. SDC-4 repoints P1+P2 onto useDataService() with SERVICE-LEVEL
// per-supplier scoping (the scoping-contract guarantee the procurement reads
// already have); the hook signatures don't change.
//
// WRITE: useRequirementResponseSubmit — dispatches t_requirementresponse_submit
// (the SHARED channel-agnostic write-path, DEC-COMMS-PRIMARY) through the
// command seam; on a non-failed outcome it invalidates THIS scope's 'sdc'
// reads so My-responses re-derives from the mutated store.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useServiceQuery, scopeKey } from './useServiceQuery';
import { requirementResponseStore } from '../data/mock/stores/requirementResponseStore';
import {
  FORECAST_PUBLICATIONS,
  currentPublication,
  supplierVisiblePublications,
} from '../sdc';
import type { ForecastLine, ForecastPublication, RequirementResponse } from '../sdc';
import type { CommandResult, QueryScope } from '../data/types';

export interface OwnForecastLinesRead {
  /** The current governed snapshot rendered (null when nothing to show). */
  publication: ForecastPublication | null;
  /** ONLY this supplier's fanned lines of that publication. */
  lines: readonly ForecastLine[];
  /**
   * FLAG-2 verdict for the render path: true only when the publication came
   * through `supplierVisiblePublications()` (a LIVE feed). False = the sample
   * fallback — the page MUST render its honest sample marking.
   */
  liveFeed: boolean;
}

/** The supplier's own fanned lines of the current publication, read through
 *  the FLAG-2 gate (LIVE-only governed lane; SIMULATED sample fallback). */
export function useOwnForecastLines() {
  return useServiceQuery<OwnForecastLinesRead>(
    ['sdc', 'ownForecastLines'],
    async (_svc, scope) => {
      // The governed lane: only LIVE publications may reach a supplier at all.
      const live = supplierVisiblePublications(FORECAST_PUBLICATIONS);
      const liveFeed = live.length > 0;
      // Sample fallback (operator-demo path): the SIMULATED fixtures render
      // ONLY under the page's explicit sample marking — never as if real.
      const publication = currentPublication(liveFeed ? live : FORECAST_PUBLICATIONS);
      const lines =
        publication && scope.supplierId
          ? publication.lines
              .filter((l) => l.supplierId === scope.supplierId)
              .slice()
              .sort(
                (a, b) =>
                  a.periodBucket.localeCompare(b.periodBucket) ||
                  a.materialCode.localeCompare(b.materialCode),
              )
          : [];
      return { publication, lines, liveFeed };
    },
  );
}

/** The supplier's OWN requirement responses, latest first (own-facts-only). */
export function useOwnRequirementResponses() {
  return useServiceQuery<readonly RequirementResponse[]>(
    ['sdc', 'ownRequirementResponses'],
    async (_svc, scope) =>
      requirementResponseStore
        .all()
        .filter((r) => r.supplierId === scope.supplierId)
        .slice()
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')),
  );
}

// Targeted invalidation, mirroring useInvalidateProcurement: only THIS scope's
// 'sdc' reads re-derive; another supplier's cache is never disturbed.
function useInvalidateSdc() {
  const qc = useQueryClient();
  return (scope: QueryScope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'sdc' && q.queryKey[q.queryKey.length - 1] === key,
    });
  };
}

export interface RequirementResponseSubmitVars {
  /** The t_requirementresponse_submit payload (built by
   *  `buildRequirementResponsePayload` — never hand-assembled in a page). */
  payload: Record<string, unknown>;
}

/** Confirm a published forecast line (fires the `creation` verb
 *  `t_requirementresponse_submit` — supplier-owned, line-grain scoped). */
export function useRequirementResponseSubmit() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const invalidate = useInvalidateSdc();

  return useMutation<CommandResult, Error, RequirementResponseSubmitVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_requirementresponse_submit',
        entity: 'requirementResponse',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

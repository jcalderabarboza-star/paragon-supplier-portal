// ────────────────────────────────────────────────────────────────────────────
// B2 · planning read hooks — the grid reads the SEAM (`getPlanningFacts`), never
// the fixture or the derivation. At F1 `httpDataService` answers the same call
// and nothing here changes (the D3 promise, kept by consuming the interface).
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type { PlanningFactsPage } from '../data/types';
import type { BucketId } from '../planning/bucket';
import type { MeasureId } from '../planning/measures';

/** Long-form facts for one horizon and measure set. Keyed by both, so two
 *  views never share a cache entry they did not ask for. */
export function usePlanningFacts(horizon: readonly BucketId[], measures: readonly MeasureId[]) {
  return useServiceQuery<PlanningFactsPage>(
    ['planning', 'facts', horizon.join(','), measures.join(',')],
    (svc, scope) => svc.planning.getPlanningFacts(scope, { horizon, measures }),
  );
}

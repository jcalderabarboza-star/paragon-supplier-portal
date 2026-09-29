// ────────────────────────────────────────────────────────────────────────────
// B1 · MockPlanningService — the planning read seam over the mock derivation.
//
// The derivation (`planningFacts.ts`) is scope-blind by design; the TENANCY
// answer lives here, at the seam, where every other service applies it.
// ────────────────────────────────────────────────────────────────────────────

import type { IPlanningService, PlanningFactsPage, PlanningFactsQuery, QueryScope } from '../types';
import { derivePlanningFacts } from './planningFacts';

export class MockPlanningService implements IPlanningService {
  async getPlanningFacts(scope: QueryScope, q: PlanningFactsQuery): Promise<PlanningFactsPage> {
    const outcome = derivePlanningFacts(q);
    if (!outcome.ok) {
      return { items: [], horizonRefusal: { reason: outcome.reason, raw: outcome.raw } };
    }
    if (scope.personaType === 'buyer') return { items: [...outcome.facts] };
    // ⚠️ A SUPPLIER SEES ITS OWN SUPPLIER-GRAIN FACTS AND NOTHING ELSE. A
    // material-grain fact (`supplierId: null`) is Paragon's plan, and a fact
    // naming another supplier is another tenancy. A supplier scope with no
    // supplier id reads empty — the quieter answer, never a refusal.
    const own = scope.supplierId;
    if (!own) return { items: [] };
    return { items: outcome.facts.filter((f) => f.supplierId === own) };
  }
}

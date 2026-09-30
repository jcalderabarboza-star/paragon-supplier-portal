// ────────────────────────────────────────────────────────────────────────────
// B4b · the SOMO plan feed a publication is opened from, and who collaborates
// on what — the two things both the target's hooks and the buyer read ask.
//
// Moved out of `publicationTarget.ts` (which binds the hooks and so imports
// the transitions layer) so the collaboration service and the planning facts
// can read them without importing a module whose job is to register policy.
// ────────────────────────────────────────────────────────────────────────────

import { FORECAST_PUBLICATIONS, SUPPLIER_MATERIAL_RELATIONSHIPS, totalKey, type Provenance } from '../../sdc';
import { parseHorizon, type BucketGrain } from '../../planning/bucket';
import { somoHorizon } from '../../planning/facts';
import {
  PLANNING_MATERIALS,
  SOMO_FIXTURE_EMISSION,
  SOMO_FIXTURE_PLAN_VERSION,
  generatedDemand,
  isGeneratedMaterial,
  suppliersFor,
} from '../../planning/somoFixture';
import type { PlanVersionOffer } from '../types';
import { forecastPublicationStore } from './stores/forecastPublicationStore';

export interface PlanFeedEntry {
  /** The emission the plan version arrived in — what `sourceRef` must name. */
  readonly sourceRef: string;
  readonly provenance: Provenance;
  /** SOMO's material-period totals for a horizon, keyed `material|bucket`. */
  totalsFor(horizon: readonly string[]): Record<string, number>;
  /** The horizon SOMO emitted this version over at a grain, or null — none at that grain. */
  horizonAt(grain: BucketGrain): readonly string[] | null;
}

const SIMULATED_SOMO: Provenance = Object.freeze({ source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' });

/**
 * The plan versions SOMO has emitted, as far as this mock knows: every seed
 * publication's version (its totals are the seed lines' own, over its own
 * monthly horizon), and the generated fixture's (its totals are the generated
 * demand, at either grain). All SIMULATED.
 */
export function somoPlanFeed(): ReadonlyMap<string, PlanFeedEntry> {
  const feed = new Map<string, PlanFeedEntry>();
  for (const p of FORECAST_PUBLICATIONS) {
    const parsed = parseHorizon(p.horizon);
    feed.set(p.planVersion, {
      sourceRef: `somo-emission@${p.planVersion}`,
      provenance: p.provenance,
      totalsFor: (horizon) => {
        const inH = new Set(horizon);
        const out: Record<string, number> = {};
        for (const l of p.lines) {
          if (inH.has(l.periodBucket)) out[totalKey(l.materialCode, l.periodBucket)] = l.allocation.materialPeriodTotal;
        }
        return out;
      },
      horizonAt: (grain) => (parsed.ok && parsed.grain === grain ? p.horizon : null),
    });
  }
  feed.set(SOMO_FIXTURE_PLAN_VERSION, {
    sourceRef: SOMO_FIXTURE_EMISSION,
    provenance: SIMULATED_SOMO,
    totalsFor: (horizon) => {
      const parsed = parseHorizon(horizon);
      const out: Record<string, number> = {};
      if (!parsed.ok) return out;
      const fixture = new Set(somoHorizon(parsed.grain));
      for (const code of PLANNING_MATERIALS) {
        if (!isGeneratedMaterial(code)) continue;
        for (const b of horizon) {
          if (!fixture.has(b)) continue;
          const d = generatedDemand(code, b);
          if (d !== null) out[totalKey(code, b)] = d;
        }
      }
      return out;
    },
    horizonAt: (grain) => somoHorizon(grain),
  });
  return feed;
}

/** What a planner may open a draft from at a grain — every feed version that has a horizon there. */
export function planVersionOffers(grain: BucketGrain): readonly PlanVersionOffer[] {
  const out: PlanVersionOffer[] = [];
  for (const [planVersion, entry] of somoPlanFeed()) {
    const horizon = entry.horizonAt(grain);
    if (horizon) out.push({ planVersion, grain, horizon, sourceRef: entry.sourceRef, liveness: entry.provenance.liveness });
  }
  return out;
}

/**
 * Who collaborates on a material (Design 2 §2.1 `PUB_SUPPLIER_COLLABORATED`):
 * a relationship row, a line in any publication that left Draft, or — for a
 * SYNTHETIC material only — the generated fixture's sourcing, which is the one
 * relationship record the fixture has. The same union `ownCollaboratedMaterials`
 * takes from the supplier's side (relationships ∪ ever-fanned).
 *
 * A draft's own lines are NOT counted: every one of them either passed this
 * rule when it was allocated or was carried from a publication that counts.
 */
export function collaboratingSuppliers(materialCode: string): ReadonlySet<string> {
  return collaborationIndex()(materialCode);
}

/**
 * The same rule, read ONCE over the relationships and the store, for a caller
 * that asks it of many materials (the planning facts over a whole draft).
 */
export function collaborationIndex(): (materialCode: string) => ReadonlySet<string> {
  const known = new Map<string, Set<string>>();
  const add = (code: string, sup: string) => {
    const s = known.get(code) ?? new Set<string>();
    known.set(code, s);
    s.add(sup);
  };
  for (const r of SUPPLIER_MATERIAL_RELATIONSHIPS) add(r.materialCode, r.supplierId);
  for (const rec of forecastPublicationStore.all()) {
    if (rec.state === 'Draft') continue;
    for (const l of rec.lines) add(l.materialCode, l.supplierId);
  }
  return (code) => {
    const out = new Set(known.get(code) ?? []);
    if (isGeneratedMaterial(code)) for (const s of suppliersFor(code)) out.add(s);
    return out;
  };
}

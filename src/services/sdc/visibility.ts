// ────────────────────────────────────────────────────────────────────────────
// FLAG-2 — the publication visibility gate, as TESTED CODE (SDC-2a).
//
// "A SIMULATED publication must NEVER be supplier-visible at all — publishing
// to a real supplier requires LIVE plan data." (FLAGS.md / addendum §8.)
//
// This predicate IS the supplier read-path gate: the P1 surface reads
// publications THROUGH it, so its governed path renders the honest empty state
// today (every fixture publication is SIMULATED → the LIVE set is empty) and
// the SIMULATED fixtures render only under explicit sample marking. When F1
// real identities land, the gate already sits in the read path — the demo
// exemption collapses by construction, not by remembering.
//
// Layer 3 (vocabulary) rides the surface, not this module: the supplier-facing
// class vocabulary is `commitmentClass` ONLY — never Tier / plan-state terms.
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastPublication } from './types';

/**
 * The publications a real supplier may see AT ALL: only LIVE plan data
 * (FLAG-2). Every SDC fixture publication is SIMULATED, so this is empty today
 * — by design, and asserted by the visibility test.
 */
export function supplierVisiblePublications(
  publications: readonly ForecastPublication[],
): readonly ForecastPublication[] {
  return publications.filter((p) => p.provenance.liveness === 'LIVE');
}

// ────────────────────────────────────────────────────────────────────────────
// B2 · which of a view's measures the grid may render.
//
// ⚠️ A SPEC MEASURE IS NEVER RENDERED — not as an empty row either. Its
// capability has no producer, and a row of dashes would read as "nothing is
// due" rather than "nobody can tell you". Availability is ASKED of the liveness
// registry at render, never stored on the measure (B1).
//
// Kept out of `planGridModel.ts` on purpose: that module sits on the service
// side's import graph, and the registry must not be imported from there (see the
// note on `buildPlanBlocks`).
// ────────────────────────────────────────────────────────────────────────────

import { liveness } from '../../services/liveness/registry';
import { measureOf, type MeasureId } from '../../services/planning/measures';

export const visibleMeasures = (measures: readonly MeasureId[]): readonly MeasureId[] =>
  measures.filter((m) => liveness(measureOf(m).capability) !== 'SPEC');

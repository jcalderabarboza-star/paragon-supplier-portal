// ────────────────────────────────────────────────────────────────────────────
// B3 · ONE ANSWER TO "WHICH INTAKE LINE IS THIS?" for the mock layer.
//
// Two producers emit intake lines: the four hand-authored rows in
// `fixtures/prIntake.ts`, and the generated SOMO proposals behind the planning
// grid (`planning/somoIntake.ts`). The dispatcher, the cascade resolver and the
// triage store all ask the same question, so they ask it HERE — three separate
// `PR_INTAKE_LINES.find` calls were three places a generated line would have
// been refused as a line nobody emitted.
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine } from '../types';
import { PR_INTAKE_LINES } from './fixtures/prIntake';
import { crossGrainCommitment, generatedIntakeLine, parseSomoIntakeLineId } from '../../planning/somoIntake';
import { bindPolicyHook, POLICY_HOOKS } from '../../transitions';
import { intakeLineStore } from './stores/intakeLineStore';

/** The producer's line for an id, from either producer, or null. */
export function intakeLineById(id: string): PrIntakeLine | null {
  return PR_INTAKE_LINES.find((l) => l.id === id) ?? generatedIntakeLine(id);
}

/** Did a producer emit this line? The store's membership predicate. */
export const isKnownIntakeLine = (id: string): boolean => intakeLineById(id) !== null;

/**
 * ⚠️ PLN-2 · `INTAKE_ONE_GRAIN` — bound HERE, beside the triage store it reads,
 * because the question is about OTHER lines' acts and only the mock layer holds
 * them (the B4a publication hooks' precedent, `publicationTarget.ts`). The rule
 * itself is `crossGrainCommitment`, which reads line ids only.
 *
 * The refusal names the material, both periods and the committed line, so a
 * planner is told WHICH commitment already speaks for this requirement.
 */
bindPolicyHook(POLICY_HOOKS.INTAKE_ONE_GRAIN, ({ entityId }) => {
  const committed = intakeLineStore
    .all()
    .filter((r) => r.state === 'Committed')
    .map((r) => r.lineId);
  const clash = crossGrainCommitment(entityId, committed);
  if (clash === null) return { ok: true };
  const self = parseSomoIntakeLineId(entityId)!;
  const other = parseSomoIntakeLineId(clash)!;
  return {
    ok: false,
    reason:
      `INTAKE_ONE_GRAIN: ${self.materialCode} ${self.bucket} overlaps ${other.bucket}, already committed ` +
      `on intake line '${clash}' — one material and period commits once, at one grain`,
  };
});

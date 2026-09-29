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
import { generatedIntakeLine } from '../../planning/somoIntake';

/** The producer's line for an id, from either producer, or null. */
export function intakeLineById(id: string): PrIntakeLine | null {
  return PR_INTAKE_LINES.find((l) => l.id === id) ?? generatedIntakeLine(id);
}

/** Did a producer emit this line? The store's membership predicate. */
export const isKnownIntakeLine = (id: string): boolean => intakeLineById(id) !== null;

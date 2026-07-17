// ────────────────────────────────────────────────────────────────────────────
// requirementResponse submitModel (SDC-2a) — the PURE draft→payload mapping
// for the supplier's `t_requirementresponse_submit` dispatch. Mirrors
// `quotationSubmitModel` (Task 3b).
//
// The snapshot binding is STRUCTURAL here: publicationId / planVersion /
// materialCode / periodBucket are copied from the RENDERED publication + line
// objects — never from form inputs — so the payload can only ever claim the
// exact snapshot the supplier was shown (design §4 "binds planVersion").
// `supplierId` comes from the current identity, never the form. The payload
// carries ONLY honest raw facts; `uom` is deliberately ABSENT — the target
// copies it from the material master (invariant #2), never from the caller.
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastLine, ForecastPublication, RootCause } from './types';

/** Build the `t_requirementresponse_acknowledge` payload (SDC-2b-EXT) from the
 * rendered publication + visibility-only line + the supplier's optional note.
 * Same structural snapshot binding as the submit builder; deliberately NO
 * confirmedQty key — an acknowledgment commits nothing (invariant #11). */
export function buildRequirementAcknowledgePayload(
  publication: ForecastPublication,
  line: ForecastLine,
  supplierId: string,
  note?: string,
): Record<string, unknown> {
  return {
    publicationId: publication.publicationId,
    planVersion: publication.planVersion,
    materialCode: line.materialCode,
    periodBucket: line.periodBucket,
    supplierId,
    acknowledgment: note && note.trim() ? { note: note.trim() } : {},
  };
}

/** The confirm-form fields the submit payload is derived from (all strings —
 *  the form collects text; coercion happens here, comma-tolerant). */
export interface RequirementResponseDraft {
  confirmedQty: string;
  committedDate?: string;
  capacityConstraint?: string;
  /** The deviation explanation — required by UX when short (form-level rule). */
  rootCause?: RootCause;
}

/** Build the `t_requirementresponse_submit` payload from the rendered
 * publication + line + the supplier's form draft. An empty qty resolves to 0 —
 * a LEGAL "cannot supply" short confirmation (F-2), never NaN. No id, version,
 * status, or uom — those are STORE/master-assigned on create. */
export function buildRequirementResponsePayload(
  publication: ForecastPublication,
  line: ForecastLine,
  supplierId: string,
  draft: RequirementResponseDraft,
): Record<string, unknown> {
  return {
    publicationId: publication.publicationId,
    planVersion: publication.planVersion,
    materialCode: line.materialCode,
    periodBucket: line.periodBucket,
    supplierId,
    confirmedQty: Number(draft.confirmedQty.replace(/,/g, '')) || 0,
    ...(draft.committedDate ? { committedDate: draft.committedDate } : {}),
    ...(draft.capacityConstraint ? { capacityConstraint: draft.capacityConstraint } : {}),
    ...(draft.rootCause ? { rootCause: draft.rootCause } : {}),
  };
}

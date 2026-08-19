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

// ── CP-0 · W1 · PR-2c — the builder does not parse (the §4 pattern) ──────────
//
// `confirmedQty` used to arrive here as a STRING and be coerced in place:
//
//     confirmedQty: Number(draft.confirmedQty.replace(/,/g, '')) || 0
//
// while the SURFACE independently coerced the SAME string with its own copy of
// that formula to decide `isShort` and to gate the submit. Two parses of one
// fact — the defect 2a killed on the declaration path, alive here.
//
// The doc above this function used to describe the `|| 0` as a feature: "an
// empty qty resolves to 0 — a LEGAL 'cannot supply' short confirmation (F-2)."
// That sentence conflated two different things. F-2 is real and survives: a
// supplier who TYPES 0 is making a binding statement ("I cannot supply any of
// this"), and that must be recorded. But a supplier who typed NOTHING has made
// no statement at all, and manufacturing the strongest possible commitment out
// of an untouched field is the opposite of honest. The prose was the bug
// notarized, so it is corrected here with the code.
//
// The builder now takes a NUMBER. It cannot parse, so it cannot disagree with
// the gate; callers normalise ONCE (via `normalizeQty`) and gate and ship the
// same value. Blank and ambiguous never reach here — they refuse upstream.

/** The confirm-form fields the submit payload is derived from. `confirmedQty`
 *  is ALREADY NORMALISED — the caller ran the one legal parse and refused
 *  anything unreadable, so no coercion happens here (CP-0 §4). */
export interface RequirementResponseDraft {
  confirmedQty: number;
  committedDate?: string;
  capacityConstraint?: string;
  /** The deviation explanation — required by UX when short (form-level rule). */
  rootCause?: RootCause;
}

/**
 * Build the `t_requirementresponse_submit` payload from the rendered
 * publication + line + the supplier's ALREADY-NORMALISED draft. Pure assembly:
 * the number it is given is the number it ships.
 *
 * Quantity honesty (three distinct states, none collapsed):
 *  · a TYPED 0 is a legal "cannot supply at all" short confirmation (F-2) and
 *    is recorded as the commitment it is;
 *  · a BLANK field is not a zero — it refuses at the surface and never arrives;
 *  · an AMBIGUOUS token ("2.400" = 2400 or 2.4) refuses too, rather than
 *    shipping one plausible reading of two.
 *
 * No id, version, status, or uom — those are STORE/master-assigned on create.
 */
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
    confirmedQty: draft.confirmedQty,
    ...(draft.committedDate ? { committedDate: draft.committedDate } : {}),
    ...(draft.capacityConstraint ? { capacityConstraint: draft.capacityConstraint } : {}),
    ...(draft.rootCause ? { rootCause: draft.rootCause } : {}),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// R1b — THE BUYER'S DRAFTS. Two acts on the dispute seam, two drafts.
//
// ⚠️ **THE DTO FIELD IS THE ANSWER; THE DRAFT FIELD IS WHAT THE ACTOR WROTE TO
// PRODUCE IT** (operator ruling). They are not the same thing and collapsing
// them is how a stored record starts being edited like a form field:
// `RequirementResponse.disputeResponse` is an APPEND-ONLY ledger the store owns
// and nothing rewrites; a draft is transient, per-act, and belongs to whoever is
// typing. The supplier lane already has this shape — `RequirementResponseDraft`
// above is what the supplier wrote, `forecastConfirmation` is what got stored —
// so these are the buyer's half of a pattern the lane already keeps.
//
// ⚠️ **AND THE SPLIT IS THE POINT: TWO ACTS, TWO DRAFTS, TWO NAMES.** The ruling
// that produced these rejected reusing ONE field across two jobs, on the ground
// that a field carrying two jobs cannot be given an honest name and cannot be
// made required without breaking the job it was not named for. That argument is
// applied here rather than only cited: `disputeReason` names an objection and
// `resolutionReason` names its answer, because naming the RAISE a "resolution"
// would re-collapse at the draft layer exactly what the split just separated.
//
// NO SURFACE CONSUMES THESE YET — the action cell is R1b proper and waits. They
// are the model layer the surface will build against, landing first on purpose
// so the surface has a typed thing to fill rather than inventing a payload shape.
// ────────────────────────────────────────────────────────────────────────────

/** What a planner wrote to RAISE a dispute (`t_requirementresponse_dispute`). */
export interface DisputeRaiseDraft {
  /** The objection. NOT optional: a reply cannot be optional-shaped, and an
   *  optional field is what makes a required thing silently unwritten. */
  disputeReason: string;
}

/** What a planner wrote to CLOSE one (`t_requirementresponse_resolve`). */
export interface DisputeResolutionDraft {
  /** The answer beside the question — it JOINS the raise in the ledger, never
   *  replaces it. Required for the same reason the raise is. */
  resolutionReason: string;
}

/**
 * Build the `t_requirementresponse_dispute` payload. Pure assembly, exactly as
 * `buildRequirementResponsePayload`: the words it is given are the words it
 * ships. Substance is proven at the TRANSITION (`rr_dispute_text_authored`) —
 * `requiredFields` runs `isEmpty`, and `isEmpty('   ')` is false, so a builder
 * that trimmed here would put the real guard in the one layer a hand-crafted
 * dispatch skips.
 */
export function buildRequirementDisputePayload(
  draft: DisputeRaiseDraft,
): Record<string, unknown> {
  return { disputeReason: draft.disputeReason };
}

/** Build the `t_requirementresponse_resolve` payload. Same discipline. */
export function buildRequirementResolutionPayload(
  draft: DisputeResolutionDraft,
): Record<string, unknown> {
  return { resolutionReason: draft.resolutionReason };
}

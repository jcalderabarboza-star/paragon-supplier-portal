// ────────────────────────────────────────────────────────────────────────────
// SubmissionSession envelope helper (SDC-2a — addendum §5).
//
// The session is an ENVELOPE: a single visit's grouping id + shared audit
// correlation. Each object dispatches its OWN command with INDEPENDENT
// validation; partial success is per-object; the session has NO lifecycle
// (structurally status-less — integrity invariant #9).
//
// SDC-2 dispatches ONE object (the forecast confirmation), so the envelope is
// degenerate but SHAPE-CORRECT: the recorder collects each attempted object +
// its dispatch correlationId, and `envelope()` folds them into the SDC-0
// SubmissionSession. SDC-3's additional objects (InventoryDeclaration,
// IncomingShipment) join by calling `attempt` more times — nothing re-couples.
//
// NAMED SDC-3 SEAM (flagged, not built): with 3 commands there are 3
// dispatcher-minted correlationIds but ONE `auditCorrelationId` field; the
// candidate mechanic is the dispatcher's causationId passthrough carrying the
// sessionId. Until then the FIRST attempt's correlationId is the envelope's
// audit anchor (exact for the single-command case).
// ────────────────────────────────────────────────────────────────────────────

import type { SdcObjectKind, SubmissionObjectRef, SubmissionSession } from './types';

export interface SubmissionSessionRecorder {
  readonly sessionId: string;
  /** Record one attempted object dispatch (kind + minted id + correlationId). */
  attempt(kind: SdcObjectKind, objectId: string, correlationId: string): void;
  /** The immutable SDC-0 envelope for what was attempted together. */
  envelope(): SubmissionSession;
}

/**
 * Open a submission-session recorder for one supplier visit. `openedAt` is
 * injected (the SDC selector convention — no ambient clock), as is the
 * sessionId (store/page-assigned).
 */
export function openSubmissionSession(
  sessionId: string,
  supplierId: string,
  openedAt: string,
): SubmissionSessionRecorder {
  const attempted: SubmissionObjectRef[] = [];
  let auditCorrelationId = '';

  return {
    sessionId,
    attempt(kind, objectId, correlationId) {
      attempted.push({ kind, objectId });
      // The first command's correlationId anchors the envelope's audit trail
      // (single-command exact; the 3-command mechanic is the named SDC-3 seam).
      if (!auditCorrelationId) auditCorrelationId = correlationId;
    },
    envelope(): SubmissionSession {
      return Object.freeze({
        sessionId,
        supplierId,
        openedAt,
        auditCorrelationId,
        attempted: Object.freeze([...attempted]),
      });
    },
  };
}

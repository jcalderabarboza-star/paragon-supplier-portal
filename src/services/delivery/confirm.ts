// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the SECOND write: confirm-match (pure).
//
// Release (Batch 2) turned a draft plan into a transmitted commitment. This is the
// write that turns an INFERRED fulfillment proposal into a CONFIRMED fact: it
// stamps `fulfilledBy` + `actualQty` onto a RELEASED line, so the next read binds
// the shipment authoritatively (deriveFulfillment Pass 1 → inferred:false) and the
// governed `deliveredQty` (deriveDrawdownLedger, which sums exactly `line.actualQty`)
// finally counts it. B3 built inference READ-ONLY on purpose; this completes it.
//
// PURE and IMMUTABLE — data in, a NEW item out. Never mutates its input, never
// reads a clock (`now` is injected last, the SDC selector convention), never
// dispatches, never touches the ledger. It writes ONLY the fulfillment fields
// (`fulfilledBy` / `actualQty` / `confirmedAt`) — NEVER `plannedQty` / `releaseDate`
// / `state`, so the release-freeze law (a transmitted commitment's qty + date stay
// frozen) is fully preserved. It is deliberately NOT routed through
// `adjustDraftLine` (release.ts), which REFUSES a released line: confirm is the one
// write that is legal ONLY on a released line.
//
// ── HONESTY (spec §6.2) ──────────────────────────────────────────────────────
//   `fulfilledDate` is NOT written here — that is the SAP GR posting date, which
//   arrives with the F2 feed (Pattern B), exactly like `sapReleaseNumber`. The
//   portal never mints a competing delivery timestamp (honesty guard 6). A confirm
//   is a PORTAL record, not a SAP goods-receipt. `confirmedAt` is the portal audit
//   stamp (mirrors `releasedAt` / `adjustedAt`) — when the buyer accepted, not when
//   SAP received.
//
//   v1 is ACCEPT-AS-OBSERVED: the caller writes the OBSERVED shipment qty as
//   `actualQty` (the service passes `fv.actualQty`), so `line.actualQty === s.qty`
//   and the derived fulfillment view (which reads `s.qty`) stays consistent with the
//   ledger (which reads `line.actualQty`) with NO change to fulfillment.ts. A
//   corrected/overridden qty is a deferred follow-up (it forces the view to prefer
//   the stored qty) and is intentionally NOT accepted here.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScheduleLine, SchedulingAgreementItem } from './types';

// ─── Rejection vocabulary ─────────────────────────────────────────────────────

/**
 * Why a confirm was refused — every arm an HONEST refusal, never a silent no-op.
 * `NOTHING_TO_CONFIRM` (no inferred proposal to accept) is NOT here: it needs the
 * shipment pool to decide, so it is a SERVICE-seam reason, not a pure-domain one.
 */
export type ConfirmReason =
  /** No line carries this releaseSeq. */
  | 'UNKNOWN_RELEASE_SEQ'
  /** The line is still 'draft' — nothing fulfills an untransmitted plan (the dual
   *  of "deriveFulfillment omits draft lines"). Confirm is legal ONLY on a released
   *  line. */
  | 'NOT_RELEASED'
  /** The line already carries a confirmed binding (`fulfilledBy` / `actualQty`).
   *  A second confirm is an idempotent repeat, surfaced rather than double-counted. */
  | 'ALREADY_CONFIRMED';

/** What the caller commits onto the line: the shipment ref that fulfilled it, the
 *  ACCEPTED (observed, v1) delivered qty, and the injected confirm stamp. */
export interface ConfirmInput {
  readonly fulfilledBy: string;
  readonly actualQty: number;
  readonly now: string;
}

export type ConfirmResult =
  | {
      readonly ok: true;
      /** A NEW item — the input is never mutated. */
      readonly item: SchedulingAgreementItem;
      readonly confirmedSeq: number;
    }
  | { readonly ok: false; readonly reason: ConfirmReason; readonly detail?: string };

// ─── Helper (the same immutable swap release uses) ────────────────────────────

/** Replace exactly the named line, preserving order. Returns a NEW item with a
 *  NEW lines array — every untouched line object is reused by reference, never
 *  mutated. (Local twin of release.ts's `withLines`, kept private per module.) */
function withLine(
  item: SchedulingAgreementItem,
  releaseSeq: number,
  next: ScheduleLine,
): SchedulingAgreementItem {
  return {
    ...item,
    scheduleLines: item.scheduleLines.map((l) => (l.releaseSeq === releaseSeq ? next : l)),
  };
}

// ─── The confirm transition ───────────────────────────────────────────────────

/**
 * Confirm the fulfillment of ONE released line: stamp `fulfilledBy` + `actualQty`
 * (+ `confirmedAt`) so the shipment binds authoritatively on the next read and
 * `deliveredQty` counts it.
 *
 * PURE: no mutation, no clock read, no dispatch, no ledger touch. Writes ONLY
 * fulfillment fields — the freeze law is preserved (state/plannedQty/releaseDate
 * untouched). `fulfilledDate` is never written (reserved for the SAP GR date).
 */
export function confirmFulfillment(
  item: SchedulingAgreementItem,
  releaseSeq: number,
  input: ConfirmInput,
): ConfirmResult {
  const line = item.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
  if (!line) {
    return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no schedule line ${releaseSeq}` };
  }
  if (line.state !== 'released') {
    return {
      ok: false,
      reason: 'NOT_RELEASED',
      detail: `line ${releaseSeq} is draft; nothing fulfills an untransmitted plan`,
    };
  }
  if (line.fulfilledBy !== undefined || line.actualQty !== undefined) {
    return {
      ok: false,
      reason: 'ALREADY_CONFIRMED',
      detail: `line ${releaseSeq} already carries a confirmed match (${line.fulfilledBy ?? 'qty'})`,
    };
  }

  const next: ScheduleLine = {
    ...line,
    fulfilledBy: input.fulfilledBy,
    actualQty: input.actualQty,
    confirmedAt: input.now,
  };
  return { ok: true, item: withLine(item, releaseSeq, next), confirmedSeq: releaseSeq };
}

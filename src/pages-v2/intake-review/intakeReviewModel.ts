// ────────────────────────────────────────────────────────────────────────────
// intakeReviewModel (Phase A/1 · sourcing spine) — the PURE triage model behind
// the intake-review surface (FORK-C=c2).
//
// Review introduces NO mutation of its own. The only write it can reach is the
// EXISTING governed push (t_pr_create via usePurchaseRequisitionCreate), and
// only in its weakest form: accept-as-suggested — quantity IS the suggestion,
// no reason, no DR-10 decision (nothing is overridden; overrides live in the
// plan-grid drawer, C6-LOCK). Dismiss/restore are pure set operations on
// ephemeral client state: they never touch a line, a payload, or the seam —
// which is exactly why the UI must label a dismissal "this session only".
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine } from '../../services/data/types';
import { buildPrCreatePayload, type PushRowState } from '../plan-grid/planGridModel';

/** The accept-as-suggested push: the existing payload builder at qty=suggested,
 * reason empty — so it can never contain `reason` — and NO decision. */
export interface AcceptPush {
  readonly payload: Record<string, unknown>;
  /** Always undefined: accept-as-suggested overrides nothing (FORK-C c2). */
  readonly decision: undefined;
}

export function buildAcceptPush(line: PrIntakeLine): AcceptPush {
  return {
    payload: buildPrCreatePayload(line, line.suggestedQty, ''),
    decision: undefined,
  };
}

/** Dismiss = add to the ephemeral set. Pure — returns a NEW set. */
export function dismissLine(
  dismissed: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(dismissed);
  next.add(id);
  return next;
}

/** Restore = the exact inverse of dismiss. Pure — returns a NEW set. */
export function restoreLine(
  dismissed: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(dismissed);
  next.delete(id);
  return next;
}

export type TriageStatus = 'pending' | 'accepted' | 'dismissed';

/**
 * The per-line triage reading: committed > dismissed > pending. A commit is the
 * ONLY exit from PLANNED (C6 §3), so it outranks a stale dismissal; a failed
 * push leaves the line PLANNED — still pending triage (C6 §6 invariant 3).
 */
export function triageStatus(
  line: PrIntakeLine,
  pushState: PushRowState | undefined,
  dismissed: ReadonlySet<string>,
): TriageStatus {
  if (pushState?.planState === 'committed') return 'accepted';
  if (dismissed.has(line.id)) return 'dismissed';
  return 'pending';
}

export interface TriageCounts {
  readonly total: number;
  readonly pending: number;
  readonly accepted: number;
  readonly dismissed: number;
}

/** The review-queue summary: a full partition of the inbound set. */
export function triageCounts(
  lines: readonly PrIntakeLine[],
  pushStates: Record<string, PushRowState>,
  dismissed: ReadonlySet<string>,
): TriageCounts {
  const counts = { total: lines.length, pending: 0, accepted: 0, dismissed: 0 };
  for (const line of lines) counts[triageStatus(line, pushStates[line.id], dismissed)]++;
  return counts;
}

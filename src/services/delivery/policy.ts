// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the THIRD write: policy-edit (pure).
//
// Release (Batch 2) turned a draft plan into a transmitted commitment; confirm
// (the second write) turned an inferred fulfillment into a confirmed fact. This is
// the GOVERNANCE write: it re-points an item's ACTIVE drawdown tolerance
// ({tolerancePct, enforcement}) and stamps the who/when/why triple, so the ledger
// (which already reads `active` and marks `policyDeviation = active ≠ contractDefault`)
// re-derives the deviation on the next read. D4 built the read side; this is the
// write that sets `active`.
//
// PURE and IMMUTABLE — data in, a NEW item out. Never mutates its input, never
// reads a clock (`now` is injected last, the SDC selector convention), never
// dispatches, never touches the ledger.
//
// ── IMMUTABILITY LAW (spec D4 · honesty guard 4) ─────────────────────────────
//   `contractDefault` is the seeded audit reference and is NEVER touched: it is
//   spread through by reference (`{ ...item.drawdownPolicy, active, … }` never
//   names contractDefault on the left), so `next.contractDefault === prev` holds
//   referentially — a test proves it. A deviation is therefore always measured
//   against the ORIGINAL contract value, never a moved goalpost.
//
//   `activeChangedBy` is deliberately NOT written here — no actor is threaded to
//   any delivery write today (release/confirm take only `now`); attribution rides
//   the Stage-F dispatcher (Decision A). The SIMULATED cut records when + why (an
//   honest partial attribution), never a fabricated who.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DrawdownEnforcement,
  SchedulingAgreementItem,
  TolerancePolicy,
} from './types';

// ─── Rejection vocabulary ─────────────────────────────────────────────────────

/**
 * Why a policy-edit was refused at the pure layer — every arm an HONEST refusal,
 * never a silent no-op. Scope refusal (`SCOPE_DENIED`) and the missing target
 * (`UNKNOWN_ITEM`) live at the SERVICE seam, not here (the pure domain is handed a
 * resolved item and never sees scope).
 */
export type EditPolicyReason =
  /** A policy change carries no reason (blank / whitespace). A deviation must be
   *  attributable (honesty guard 4), so an unattributable edit is refused. */
  | 'REASON_REQUIRED'
  /** Both knobs already equal the current `active` — nothing to write. Surfaced
   *  rather than persisted as a no-op stamp (which would fabricate a change event). */
  | 'NO_CHANGE';

/** What the caller commits onto `active`: the two knobs + the required reason +
 *  the injected stamp. `tolerancePct` null = unlimited (Case C). */
export interface EditPolicyInput {
  readonly tolerancePct: number | null;
  readonly enforcement: DrawdownEnforcement;
  readonly reason: string;
  readonly now: string;
}

/** The service-facing patch — the input WITHOUT the injected clock (`now` is added
 *  at the service seam, the SDC convention). The hook/UI carry exactly this. */
export type EditPolicyPatch = Omit<EditPolicyInput, 'now'>;

export type EditPolicyResult =
  | {
      readonly ok: true;
      /** A NEW item — the input is never mutated; `contractDefault` unchanged. */
      readonly item: SchedulingAgreementItem;
    }
  | { readonly ok: false; readonly reason: EditPolicyReason; readonly detail?: string };

// ─── The policy-edit transition ───────────────────────────────────────────────

/**
 * Re-point an item's ACTIVE drawdown tolerance and stamp when + why.
 *
 * Writes ONLY `{ active, activeChangedAt, activeChangeReason }` onto the policy —
 * `contractDefault` is spread through UNTOUCHED (immutable by construction) and
 * `activeChangedBy` is never written (deferred to the Stage-F dispatcher). The
 * ledger re-derives `policyDeviation` / `enforced` / `exceptions` against the new
 * `active` on the next read — this function never touches the ledger.
 *
 * PURE: no mutation, no clock read, no dispatch.
 */
export function setActivePolicy(
  item: SchedulingAgreementItem,
  input: EditPolicyInput,
): EditPolicyResult {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    return {
      ok: false,
      reason: 'REASON_REQUIRED',
      detail: 'a drawdown-policy change must carry a reason (it is an attributable deviation)',
    };
  }

  const current = item.drawdownPolicy.active;
  if (current.tolerancePct === input.tolerancePct && current.enforcement === input.enforcement) {
    return {
      ok: false,
      reason: 'NO_CHANGE',
      detail: 'the active policy already carries these values',
    };
  }

  const active: TolerancePolicy = {
    tolerancePct: input.tolerancePct,
    enforcement: input.enforcement,
  };
  const next: SchedulingAgreementItem = {
    ...item,
    drawdownPolicy: {
      // contractDefault is carried through by reference — NEVER named on the left,
      // so it stays referentially identical (the immutability law).
      ...item.drawdownPolicy,
      active,
      activeChangedAt: input.now,
      activeChangeReason: reason,
    },
  };
  return { ok: true, item: next };
}

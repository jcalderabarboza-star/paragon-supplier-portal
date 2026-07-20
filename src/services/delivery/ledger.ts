// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 1: the drawdown ledger (pure, DERIVED).
//
// The ledger is COMPUTED from an Item + its lines + its policy — never a stored
// object with fabricated numbers (honesty by construction). Over the all-draft
// seed it honestly reports releasedQty 0 / deliveredQty 0 / remainingQty = the
// full envelope: nothing has been released or delivered, and the ledger says so.
//
// The two named tolerance presets live here, co-located with the derivation that
// reads them — the same idiom as MATCH_TOLERANCE in invoiceRollup.ts and
// RESPONSE_DUE_DAYS in consolidation.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DrawdownException,
  DrawdownLedger,
  SchedulingAgreementItem,
  TolerancePolicy,
} from './types';

// ─── The two policy presets (spec Decision D4) ────────────────────────────────

/** Case B — a soft envelope: flag drawdown beyond 10% over the agreed total. */
export const DRAWDOWN_PRESET_CASE_B: TolerancePolicy = Object.freeze({
  tolerancePct: 0.1,
  enforcement: 'flag',
});

/** Case C — reference-only: unlimited tolerance, unenforced (a "reference
 *  envelope, not a governed commitment" — the ledger reads enforced:false). */
export const DRAWDOWN_PRESET_CASE_C: TolerancePolicy = Object.freeze({
  tolerancePct: null,
  enforcement: 'ignore',
});

/** True when two tolerance policies differ in either knob. */
function policiesDiffer(a: TolerancePolicy, b: TolerancePolicy): boolean {
  return a.tolerancePct !== b.tolerancePct || a.enforcement !== b.enforcement;
}

/**
 * Derive the drawdown ledger for one Item. PURE — data in, view-model out, zero
 * mutation, nothing stored.
 *
 *  · releasedQty  = Σ plannedQty of lines in state 'released' (0 over all-draft).
 *  · deliveredQty = Σ actualQty actually recorded (0 in Batch 1 — no fulfillment
 *    is ever seeded; fulfillment rides a later batch).
 *  · remainingQty = agreedTotalQty − releasedQty (Decision D).
 *  · activePolicy is always surfaced (honesty guard 3 — policy mode is visible).
 *  · enforced     = the active enforcement is not 'ignore' (Case C reads false →
 *    "reference envelope, not enforced").
 *  · policyDeviation = active ≠ contractDefault (honesty guard 4 — a visible,
 *    later-attributable deviation).
 *  · exceptions   = the derived over-envelope breaches (empty over all-draft).
 */
export function deriveDrawdownLedger(item: SchedulingAgreementItem): DrawdownLedger {
  const { agreedTotalQty, uom, drawdownPolicy } = item;
  const active = drawdownPolicy.active;

  let releasedQty = 0;
  let deliveredQty = 0;
  for (const line of item.scheduleLines) {
    if (line.state === 'released') releasedQty += line.plannedQty;
    if (line.actualQty !== undefined) deliveredQty += line.actualQty;
  }

  const enforced = active.enforcement !== 'ignore';
  const exceptions: DrawdownException[] = [];
  // Cumulative over-envelope: only meaningful when enforced with a finite
  // tolerance (Case C — unlimited/ignore — never breaches). Over the all-draft
  // seed releasedQty is 0, so no exception fires.
  if (enforced && active.tolerancePct !== null) {
    const ceiling = agreedTotalQty * (1 + active.tolerancePct);
    if (releasedQty > ceiling) {
      exceptions.push({
        kind: 'over-envelope',
        overageQty: releasedQty - agreedTotalQty,
        detail: `released ${releasedQty} exceeds agreed ${agreedTotalQty} beyond ${
          active.tolerancePct * 100
        }% tolerance`,
      });
    }
  }

  return {
    agreedTotalQty,
    releasedQty,
    deliveredQty,
    remainingQty: agreedTotalQty - releasedQty,
    uom,
    activePolicy: active,
    policyDeviation: policiesDiffer(active, drawdownPolicy.contractDefault),
    enforced,
    exceptions,
  };
}

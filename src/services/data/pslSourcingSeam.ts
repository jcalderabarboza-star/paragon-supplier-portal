// ─────────────────────────────────────────────────────────────────────────────
// THE P2 SEAM — the one function a sourcing policy hook will call.
//
// ⚠️ **P1 SHIPS THIS AND GATES NOTHING WITH IT.** `t_rfq_publish` and
// `t_rfq_award` carry `policyHooks: []` today (`flows/rfq.flow.ts:82`, `:118`)
// and this batch does not change that. The gate is P2. What P1 owes P2 is a
// reader that a `PolicyHookFn` can actually call — and that is a harder
// constraint than it looks, which is the whole reason this module exists
// separately rather than as a page helper.
//
// ── ⚠️ WHY IT MUST BE PURE, SYNCHRONOUS AND STORE-FREE ──────────────────────
//   A `PolicyHookFn` receives ONE ctx (`{entityId, currentState, toState,
//   payload, target, scope}`) and returns a verdict. It has no React context,
//   no `useDataService()`, no query client and no `await`. A PSL reader that
//   could only be reached through a react-query hook would be unusable from a
//   hook and P2 would have to rebuild it — so the dependency direction is fixed
//   HERE, before anything depends on the wrong one.
//
//   The shape is `verifyHalalAtReceipt`'s, deliberately: a pure function over a
//   corpus passed as a DEFAULTED PARAMETER. That makes the production call
//   `pslStatusFor(id, scope, now)` and the test call
//   `pslStatusFor(id, scope, now, syntheticRows)`, with no module mocking and
//   no store in either.
//
// ── ⚠️ PUBLICATION IS DELIBERATELY IGNORED HERE — DO NOT ADD IT ─────────────
//   **THE SOURCING GATE DEPENDS ON WHETHER A LISTING IS IN FORCE, NEVER ON
//   WHETHER THE SUPPLIER HAS BEEN TOLD.** Publication (`publishedAt`) decides
//   who may SEE a designation; being in force decides what it GRANTS. They are
//   independent axes by operator ruling, and conflating them here would be the
//   expensive direction of that conflation: an unpublished-but-in-force listing
//   would stop suspending competitive bidding, so a buyer would be invited to
//   run an event against a Sole Source supplier because nobody had pressed
//   publish. That is a governance failure caused by a notification setting.
//
//   `pslSourcingSeam.test.ts` asserts this by construction — the same row
//   published and unpublished must return the SAME verdict — so P2 cannot
//   inherit the wrong premise by reading a stale sentence.
// ─────────────────────────────────────────────────────────────────────────────

import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import {
  bestPslStatus,
  hasMaterialScope,
  isPslInForce,
  type PslStatus,
} from './pslProjection';
import type { PslListing } from './pslListing';

/**
 * WHAT A SOURCING GATE ASKS ABOUT ONE SUPPLIER.
 *
 * Named members, never a bare boolean: *"this supplier is not listed"* and
 * *"this supplier's listing lapsed"* lead to different sentences in a refusal,
 * and a boolean cannot carry the difference. The `EnforcementModeSource`
 * discipline — a provenance that overstates is worse than an absent one.
 */
export type PslStanding =
  /** At least one listing is in force. `status` is the most restrictive. */
  | { readonly kind: 'IN_FORCE'; readonly status: PslStatus; readonly listings: readonly PslListing[] }
  /** This supplier holds listings, but none is in force right now. */
  | { readonly kind: 'LAPSED'; readonly listings: readonly PslListing[] }
  /** This supplier holds no listing at all, at any scope. */
  | { readonly kind: 'NOT_LISTED' };

/**
 * The PSL standing of one supplier, optionally narrowed to a material scope.
 *
 * @param supplierId  the roster id.
 * @param scope       `null` = any scope; a material code = only listings that
 *                    cover that code. ⚠️ Only `kind: 'material'` listings can be
 *                    narrowed — `'group'` and `'category'` have no producer in
 *                    P1 (`pslListing.ts`) and are EXCLUDED from a narrowed
 *                    query rather than guessed at. A listing whose scope this
 *                    build cannot interpret must never silently widen a grant.
 * @param nowIso      the instant, injected. Never read from the wall clock —
 *                    a gate must be able to ask "as of when?".
 * @param rows        the corpus. Defaulted so a hook needs no wiring; passed
 *                    explicitly by tests so no module mocking is involved.
 */
export function pslStatusFor(
  supplierId: string,
  scope: { readonly materialCode: string } | null,
  nowIso: string,
  rows: readonly PslListing[] = PSL_LISTINGS,
): PslStanding {
  const held = rows.filter((r) => r.supplierId === supplierId);
  const relevant =
    scope === null
      ? held
      : held.filter(
          (r) => hasMaterialScope(r) && r.scope.materialCodes.includes(scope.materialCode),
        );
  if (relevant.length === 0) return { kind: 'NOT_LISTED' };

  // ⚠️ `bestPslStatus` runs stage 1 (the clock) before the ladder, so a lapsed
  // Mandatory can never outrank a live Validated here either. The two callers
  // share ONE definition of "in force" rather than two that agree today.
  const status = bestPslStatus(relevant, nowIso);
  if (status === null) return { kind: 'LAPSED', listings: relevant };
  return {
    kind: 'IN_FORCE',
    status,
    listings: relevant.filter((r) => isPslInForce(r, nowIso)),
  };
}

/**
 * Does a PSL standing SUSPEND competitive bidding?
 *
 * The policy's own split: `Sole Source` and `Mandatory` remove the event;
 * `Validated` is pre-qualification that STILL COMPETES. P2's gate is expected
 * to read this rather than re-derive it from the status union, so the rule
 * lives in one place.
 */
export function suspendsCompetitiveBidding(standing: PslStanding): boolean {
  if (standing.kind !== 'IN_FORCE') return false;
  return standing.status === 'Sole Source' || standing.status === 'Mandatory';
}

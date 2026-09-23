// ─────────────────────────────────────────────────────────────────────────────
// THE RESTRICTIVE-DESIGNATION CHECK — ONE EXPRESSION OF THE RULE, TWO READERS.
//
// The policy: *"a Mandatory or Sole Source status must be justified and
// approved by a Lead."* `Validated` is exempt — it is pre-qualification that
// STILL COMPETES, so it removes nothing and needs no extra sign-off.
//
// ── ⚠️ WHAT IS BUILDABLE HERE, AND WHAT IS NOT. READ THIS BEFORE THE CODE ───
//
// **THE SENIORITY HALF IS UNBUILDABLE AND IS NOT BUILT.** There is no `Lead`
// role in this tree and one may not be minted: C10 §3.4 refuses a role per
// band, and `businessRoles.test.ts` asserts bilaterally that every bundle names
// only atoms some transition requires — so a `lead` bundle holding nothing is a
// checkable defect rather than a plausible-looking string. §69's approval
// ladder is the same shape one document over and is deferred for the same
// reason: *"WHO MAY APPROVE needs seniority roles that do not exist."*
//
// **THE BUILDABLE HALF IS SEAT SEGREGATION, AND THIS MODULE IS DELIBERATELY
// HONEST ABOUT BEING THAT RATHER THAN SENIORITY.** A restrictive designation
// may not be decided by a seat that ALSO holds the raising authority. It is a
// real gate with a real effect today, it is a pure function of the seat's own
// atoms, and its refusal names what it actually requires — narrow the seat —
// instead of claiming a Lead exists. **The code never says "Lead".**
//
// ⚠️ **IT IS THE OTHER HALF OF `PSL_DECIDER_NOT_PROPOSER`, NOT A DUPLICATE OF
// IT.** That hook is per-DOCUMENT (*this person raised this listing*) and
// CANNOT FIRE while every actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION`. This
// one is per-SEAT (*this seat holds both authorities*) and fires today. The two
// together are what the policy asks for; neither alone is, and saying so is
// what stops the pair being read as one check written twice.
//
// ⚠️ **AND IT IS WHERE §76d ACTUALLY BINDS FOR THE FIRST TIME.** The default
// buyer seat holds all six lane bundles (derived: `SEEDED_SEAT_ROLES.buyer`),
// so it holds `psl:propose` AND `psl:decide` — and is therefore REFUSED from
// granting a Mandatory or Sole Source listing until somebody narrows it on the
// identity panel. Nothing here claims the platform prevents self-approval in
// general. It prevents it on the two designations that suspend competitive
// bidding, which is where the policy puts the bar.
//
// ── ⚠️ WHY A PURE FUNCTION AND NOT A HOOK BODY (the precedent, cited) ───────
//   An authorisation decision taken INSIDE a policy hook is invisible to
//   `getCapabilities`, `catalogView` and `useVerbAvailability` — so a surface
//   trusting the role gate alone would offer the verb and the dispatcher would
//   refuse it, which is the false-affordance shape R1 swept out of this tree.
//
//   The remedy is the one this lane already uses twice: ONE expression, two
//   readers. `handlePinConfirm` disables its own button on the refusal
//   `rfq_fx_pin_well_formed` will give — *"the dialog's own button is already
//   disabled on a refusal; this is the structural twin"* — and `PslGateNotice`
//   renders the same `SourcingDecision` the publish hooks act on. Here the hook
//   asks the function below and so does the panel, off the same call.
//
// ── ⚠️ IT TAKES ATOMS, NOT ROLE IDS, AND THAT IS NOT A STYLE CHOICE ────────
//   A check keyed on the STRING `'procurement'` would wave through a custom
//   role that copies `procurement` under another id — the `buyer:all` lesson
//   exactly: *the wildcard was the SHAPE of the grant, not a token in it.*
//   Callers resolve through `atomsForSeat` (never `atomsFor`, which does not
//   honour a custom role's parent reference), and passing atoms rather than
//   resolving them here keeps this module pure and out of the transitions
//   layer's import graph.
// ─────────────────────────────────────────────────────────────────────────────

import type { PslStatus } from './pslListing';

/**
 * THE DESIGNATIONS THAT NEED THE EXTRA SIGN-OFF — derived from what they DO,
 * never hand-listed as a second ladder.
 *
 * `suspendsCompetitiveBidding` (`pslSourcingSeam.ts`) answers the same question
 * for a STANDING — a supplier's best LIVE designation, after the clock has run.
 * This answers it for a bare status, which is what a verb judging a payload
 * has. They name the same two members for the same stated reason, and
 * `pslLeadCheck.test.ts` asserts the agreement across the whole vocabulary so
 * the two cannot drift.
 */
export function suspendsBidding(status: PslStatus): boolean {
  return status === 'Sole Source' || status === 'Mandatory';
}

/** The two atoms whose CO-HOLDING is what this check refuses. Named once so the
 *  hook, the surface mirror and the specs cannot drift onto different strings. */
export const PSL_PROPOSE_ATOM = 'psl:propose';
export const PSL_DECIDE_ATOM = 'psl:decide';

/**
 * WHY A RESTRICTIVE DECISION IS OR IS NOT AVAILABLE TO THIS SEAT.
 *
 * Named members rather than a boolean, for `PslStanding`'s reason: *"this
 * designation needs no extra sign-off"* and *"this seat holds both
 * authorities"* lead to different sentences on a surface, and a boolean cannot
 * carry the difference.
 */
export type RestrictiveDecisionVerdict =
  /** `Validated` — it competes, so nothing extra applies. */
  | { readonly kind: 'NOT_RESTRICTIVE'; readonly status: PslStatus }
  /** Restrictive, and this seat decides without also raising. Allowed. */
  | { readonly kind: 'SEGREGATED'; readonly status: PslStatus }
  /** Restrictive, and this seat holds BOTH authorities. Refused — and the
   *  remedy is in the member's own name: narrow the seat. */
  | { readonly kind: 'SEAT_HOLDS_BOTH'; readonly status: PslStatus };

/**
 * Judge one designation against one seat's resolved atoms.
 *
 * @param status the designation being granted, changed to, or renewed.
 * @param atoms  the acting seat's atoms, from `atomsForSeat(scope.businessRoles)`.
 *
 * ⚠️ **AN EMPTY `atoms` IS NOT THE PERMISSIVE CASE BY ACCIDENT — IT CANNOT
 * REACH HERE FROM A DISPATCH.** A command scope without `businessRoles` is
 * refused at the ROLE gate with `ROLE_NOT_PERMITTED` before any hook runs
 * (there is no persona fallback, by ruling: *a fallback is the wildcard with
 * better manners*), and a seat that reaches this hook has already been proven
 * to hold `psl:decide`. So the only way to arrive with neither atom is a
 * SURFACE asking in advance about a seat that could not fire the verb anyway,
 * and `SEGREGATED` is the right answer to give it: the mirror must not print a
 * seat-segregation warning at a seat whose real problem is that it holds no
 * deciding authority at all. `useVerbAvailability` is what says that.
 */
export function restrictiveDecisionVerdict(
  status: PslStatus,
  atoms: readonly string[] | undefined,
): RestrictiveDecisionVerdict {
  if (!suspendsBidding(status)) return { kind: 'NOT_RESTRICTIVE', status };
  const held = new Set(atoms ?? []);
  if (held.has(PSL_PROPOSE_ATOM) && held.has(PSL_DECIDE_ATOM)) {
    return { kind: 'SEAT_HOLDS_BOTH', status };
  }
  return { kind: 'SEGREGATED', status };
}

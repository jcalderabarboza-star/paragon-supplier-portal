// ────────────────────────────────────────────────────────────────────────────
// THE CROSS-ROLE HANDOFF — DERIVED, NEVER AUTHORED.
//
// ⚠️ **THE BINDING CONSTRAINT THIS FILE EXISTS TO HOLD (operator ruling):**
//
//   > EVERY CROSS-ROLE HANDOFF RENDERS THE WAIT, NOT A GAP. A verb a user's
//   > role does not hold shows as PENDING WITH AN OWNER — "Awaiting Finance" —
//   > NEVER AS AN ABSENT AFFORDANCE.
//
// That is the difference between a clean process boundary and finance being an
// invisible bottleneck, and it is a build constraint rather than a nicety.
//
// ── WHY DERIVED AND NOT AUTHORED, AND WHY R1a DOES NOT GENERALISE ───────────
// R1a put "Awaiting Paragon" on the supplier's responses list by AUTHORING one
// i18n key per outcome, and that was correct for its context: two personas, a
// closed union, and a ruling that every RR exit belongs to the buyer.
//
// **It does not generalise, and the operator's argument is the one that decides
// it:** `requiredRole` is per-verb AND per-state, so the derivation yields an
// owner without a second vocabulary — and that is what stays true when a verb
// moves. An authored `Record<Status, Owner>` beside the pill is the
// `BuyerInvoices` footer-verb defect in a new costume (`invoiceActionModel.ts`
// header): a display concern answering a question only the machine can answer.
// Move `invoice:pay` from `finance` to `treasury` tomorrow and every authored
// map silently keeps saying "Awaiting Finance"; this file changes with it,
// because it reads `rolesHolding(t.requiredRole)`.
//
// ⚠️ **THE ONE AUTHORED THING IS THE LABEL PER ROLE, AND IT IS BOUND
// EXHAUSTIVELY.** `SystemRoleId` is a closed union and `ROLE_LABEL_KEY` is a
// total `Record` over it, so seeding a seventh role is a `tsc` error here
// rather than a role that renders blank. THE LIVE TRAP THIS REPLACES: the R1a
// consumer keyed on a two-arm ternary — `personas.includes('supplier') ? … :
// 'awaiting buyer'` — which is TOTAL ONLY BECAUSE `PersonaType` HAS TWO
// MEMBERS. A third actor would have fallen through to "Awaiting Paragon" over
// a finance-owned verb: the exact mislabel the constraint above forbids,
// produced by the mechanism meant to prevent it.
// ────────────────────────────────────────────────────────────────────────────

import type { TransitionDef, TransitionRole } from './schema';
import type { SystemRoleId, BusinessRoleId } from './businessRoles';
import { atomsFor, rolesHolding } from './businessRoles';

/**
 * WHETHER THIS SEAT MAY FIRE A VERB, AND IF NOT, WHOSE IT IS.
 *
 * Three arms, kept apart for the same reason `NextActor` keeps `ended` and
 * `stranded` apart: a caller must never be able to render "someone else is
 * handling it" over an act NOBODY can perform.
 *
 * · `held`     — the seat holds the atom. Render the affordance.
 * · `withheld` — a DIFFERENT assignable role holds it. Render the wait, naming
 *                the owner. **This is the arm the constraint is about.**
 * · `unowned`  — no assignable role holds it. A machine act, or a gap. NEVER
 *                copy: "Awaiting <nobody>" is worse than silence, and an
 *                `unowned` verb on a human surface is a FINDING.
 */
export type VerbAvailability =
  | { readonly kind: 'held' }
  | { readonly kind: 'withheld'; readonly owners: readonly SystemRoleId[] }
  | { readonly kind: 'unowned' };

/** Does `seatRoles` grant `atom`, and if not, who does? */
export function availabilityOfAtom(
  atom: TransitionRole,
  seatRoles: readonly BusinessRoleId[],
): VerbAvailability {
  if (atomsFor(seatRoles).includes(atom)) return { kind: 'held' };
  const owners = rolesHolding(atom);
  return owners.length > 0 ? { kind: 'withheld', owners } : { kind: 'unowned' };
}

/** The same question asked of a transition. */
export function availabilityOf(
  transition: TransitionDef,
  seatRoles: readonly BusinessRoleId[],
): VerbAvailability {
  return availabilityOfAtom(transition.requiredRole, seatRoles);
}

/**
 * The i18n key naming each role, for the "Awaiting …" line. A TOTAL record over
 * the closed union — see the header: this totality is the compile-time bind
 * that the two-arm ternary it replaces did not have.
 */
export const ROLE_LABEL_KEY: Readonly<Record<SystemRoleId, string>> = Object.freeze({
  procurement: 'roles.owner.procurement',
  receiving: 'roles.owner.receiving',
  finance: 'roles.owner.finance',
  compliance: 'roles.owner.compliance',
  planning: 'roles.owner.planning',
  requisitioner: 'roles.owner.requisitioner',
  supplier: 'roles.owner.supplier',
});

/**
 * The label keys for a withheld verb's owners, in a stable order.
 *
 * ⚠️ **STABLE BY THE UNION'S DECLARATION ORDER, NOT BY `rolesHolding`'s.**
 * `rolesHolding` derives from `Object.keys(SYSTEM_ROLES)`, which is stable
 * today and is not a contract; sorting here on a declared order means the line
 * cannot re-order itself under a refactor of the bundle literal.
 */
const ROLE_ORDER: readonly SystemRoleId[] = [
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
  'supplier',
];

export function ownerLabelKeys(owners: readonly SystemRoleId[]): readonly string[] {
  return ROLE_ORDER.filter((r) => owners.includes(r)).map((r) => ROLE_LABEL_KEY[r]);
}

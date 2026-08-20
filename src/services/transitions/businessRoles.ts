// ────────────────────────────────────────────────────────────────────────────
// BUSINESS ROLES — assignable bundles of `TransitionRole` atoms (C10 §3.4).
//
// ⚠️ **THE ATOM IS `requiredRole`. THIS FILE MINTS NO PERMISSION VOCABULARY.**
// C10 §3.3 is explicit: a second `Permission` table would restate the flow
// catalog as prose data — the `FLOOR-IN-PROSE-01` shape. Every atom named below
// must be required by at least one registered transition, and
// `businessRoles.test.ts` DERIVES that from `catalogRoles()` rather than
// restating it. A bundle naming an atom no transition requires is a checkable
// defect, not a plausible-looking string.
//
// ── WHAT THIS REPLACES, AND WHY IT IS NOT "EDITING 44 ROWS" ─────────────────
// Before this module, `resolveRoles` was `(scope) => rolesForPersona(scope.
// personaType)` — ONE line — and `PersonaType` is `'buyer' | 'supplier'`. So
// EVERY buyer session held all 48 buyer atoms unconditionally: award,
// post-to-SAP, release-payment and enforcement-mode-setting were one
// undifferentiated seat. The role gate discriminated at the TENANCY boundary
// and nowhere else, and every `ROLE_NOT_PERMITTED` assertion in the tree is
// buyer↔supplier — not one is buyer↔buyer, and by construction none could be.
//
// **That persona-wide grant IS the wildcard.** There was never a literal
// `buyer:all` in the role path (`buyer:all` is the DR-10 AUDIT ACTOR string,
// `events.ts:actorKey`, and is a `requiredRole` on 0 of 91 transitions); the
// role check is a plain `Array.includes` with no short-circuit. The wildcard
// was the SHAPE of the grant, not a token in it — which is why retiring it is
// a change to ONE resolution line plus this data, and not 44 row-edits.
//
// ── THE SHAPE IS DATA, DELIBERATELY (operator ruling, non-foreclosure) ──────
// `SYSTEM_ROLES` is a SEEDED RECORD, never six branches in a function, because
// the ruled successor is a role catalogue where **a custom role is a COPY of a
// system role's atoms plus additions**. Copying a bundle is data; copying a
// hardcoded check is a fork. Nothing here is built for custom roles and
// nothing here forecloses them:
//   · a bundle is `readonly TransitionRole[]` — copyable as a value;
//   · `SystemRoleId` is a closed union so a `tsc` error names every consumer
//     the day a seventh role is seeded;
//   · `BusinessRoleId` is DELIBERATELY WIDER than `SystemRoleId` (a bare
//     `string`), so a custom id can exist at the record level WITHOUT this
//     file changing — the operator's second constraint: "they held a role
//     someone invented last Tuesday" and "they held the standard procurement
//     role" must be different answers. `isSystemRole()` is the predicate that
//     keeps them distinguishable. THE DISTINCTION IS NOT BUILT HERE; only the
//     room for it is.
// Additive-only narrowing (a custom role copies and ADDS, never subtracts) is
// the successor's rule and is recorded in C10, not enforced here — there is no
// custom role to enforce it against yet.
// ────────────────────────────────────────────────────────────────────────────

import type { TransitionRole } from './schema';

/**
 * The SIX system roles, derived from the catalog's 41 human-owned buyer verbs,
 * plus the supplier side — NOT imported from a market vocabulary. C10 §5.4's
 * twelve-role Ariba list (D-ID-6) stays PROVISIONAL and unbuilt: a bundle that
 * no atom backs is the thing §3.4 calls a checkable defect.
 */
export type SystemRoleId =
  | 'procurement'
  | 'receiving'
  | 'finance'
  | 'compliance'
  | 'planning'
  | 'requisitioner'
  | 'supplier'
  | 'admin';

/**
 * ⚠️ **`automation` IS NOT A BUSINESS ROLE AND MUST NEVER BECOME ONE.**
 *
 * 26 of the 73 buyer transitions are `surfaced: false` for `external-fact` (15)
 * or `computed` (11) — S/4HANA, the carrier, the TMS, the bank, and the cascade
 * fan-out. **They have no human owner by construction**, and C10 §6.4 already
 * rules the shape: *attribution absent = a machine act, never dressed as
 * UNATTRIBUTED*. Folding these atoms into a business role would make "a person
 * held this" and "the platform did this" indistinguishable at the record level
 * — the exact merge §3.6 refuses for delegation-vs-assignment, one layer down.
 *
 * It is kept OUT of `SystemRoleId` so it can never be assigned to a person: no
 * `SYSTEM_ROLES` entry, no catalogue row, no assignment. The dispatcher reaches
 * it only through the automation grant on a synthetic scope.
 */
export const AUTOMATION_ROLE = 'automation';

/**
 * A role id at the RECORD level. Wider than `SystemRoleId` on purpose — see the
 * header's non-foreclosure note. Today every value in the tree is a
 * `SystemRoleId`; `isSystemRole` is what keeps that checkable when it is not.
 */
export type BusinessRoleId = string;

/**
 * THE SEEDED BUNDLES. Every atom here is asserted ∈ `catalogRoles()` by
 * `businessRoles.test.ts`, and the union of every bundle plus the automation
 * grant is asserted EQUAL to `catalogRoles()` — so an atom belonging to no
 * bundle (unreachable by anyone) and a bundle naming a non-existent atom are
 * both red, in both directions. The bilateral assertion is the point; a
 * one-sided one would ship looking like a working gate (§39).
 */
const LANE_BUNDLES = Object.freeze({
    // Sourcing, orders and contracting — operator ruling: "award, sourcing,
    // orders stay procurement". Holds `pr:approve`/`pr:reject` because C10 §3.4
    // FORBIDS an `approver` role that carries approve-anything: approval
    // authority comes from the policy ledger's threshold bands, and a role that
    // carried it would put the threshold back inside the role, where it cannot
    // vary by value, plant, category or date without minting a role per band.
    procurement: Object.freeze([
      'rfq:create', 'rfq:publish', 'rfq:award', 'rfq:fx-pin', 'rfq:cancel', 'rfq:reopen',
      'quotation:review',
      'contract:draft', 'contract:activate', 'contract:renew', 'contract:terminate',
      'obligation:track', 'obligation:complete',
      'pr:approve', 'pr:reject',
      // ⚠️ RULED TO MOVE TO `compliance`, AND DELIBERATELY NOT MOVED IN THIS
      // BATCH. The operator's ruling stands and is booked: if procurement can
      // set the halal enforcement mode, procurement can lower the bar it is
      // measured against, and the same party cannot both set the mode and be
      // governed by it. Its PRECONDITION is a caller — `useEnforcementSet` does
      // not exist (measured), no shipped site dispatches `t_enforcement_set`,
      // and the verb is `surfaced: false / ruled-unsurfaced`. Retiring the
      // persona-wide grant AND moving the atom in one batch would leave the
      // enforcement lane unreachable with no consumer to catch it. Sequencing:
      // retire the grant first, move the atom once a caller exists.
      'enforcement:set',
    ]),
    // The dock. 13 of the 41 human-owned buyer verbs — the largest single lane,
    // and a dock clerk is not a category manager. `asn:flag` is shared with the
    // automation grant: `t_asn_resolve_discrepancy` is the clerk's act and
    // `t_asn_discrepancy` is the GR cascade's, on the SAME atom.
    receiving: Object.freeze([
      'gr:receive', 'gr:inspect', 'gr:disposition', 'gr:post',
      'asn:flag',
    ]),
    // Operator ruling, explicit: procurement does NOT hold
    // `t_invoice_release_payment`; finance does.
    finance: Object.freeze([
      'invoice:pay', 'invoice:approve', 'invoice:dispute',
    ]),
    // ⚠️ HOLDS NO VERB A HUMAN CAN FIRE ON A SCREEN TODAY, and that is honest
    // rather than empty: all five atoms sit on `ruled-unsurfaced` or system
    // verbs, in flows with no CommandTarget. It is the contract surface the
    // enforcement atom lands on when its caller exists.
    compliance: Object.freeze([
      'supplierdoc:request', 'supplierdoc:verify', 'supplierdoc:reject',
      'compliance:verify', 'compliance:reject',
    ]),
    // The SDC / P2 planning lane. `inventorydeclaration:record` is the C4c
    // buyer RECORDING verb — a distinct authority from the supplier's
    // `:declare`, which is why widening `:declare` onto the buyer was refused.
    planning: Object.freeze([
      'requirementresponse:review', 'requirementresponse:accept',
      'requirementresponse:dispute',
      'inventorydeclaration:record',
    ]),
    // Raising and revising a requisition — split from approving one, which is
    // the segregation `pr:approve` living in `procurement` expresses.
    requisitioner: Object.freeze([
      'pr:create', 'pr:submit', 'pr:revise',
    ]),
    // The supplier side is ONE role. Splitting it would model a tenant we do
    // not administer: supplier-side person identity is UNPROCURED (D-ID-2,
    // OPEN), so there is nobody to assign a narrower bundle to.
    supplier: Object.freeze([
      'po:view', 'po:acknowledge', 'po:confirm',
      'asn:create', 'asn:submit',
      'invoice:submit',
      'quotation:submit',
      'supplierdoc:submit',
      'compliance:submit',
      'requirementresponse:submit', 'requirementresponse:acknowledge',
      'inventorydeclaration:declare',
      'incomingshipment:report', 'incomingshipment:ship',
      'incomingshipment:arrive', 'incomingshipment:cancel',
    ]),
  });

/**
 * ⚠️ **THE SUPER ADMIN, AND IT IS DERIVED — THE UNION OF EVERY LANE BUNDLE.**
 *
 * Hand-listing these 52 atoms would put a copy of every other bundle in a place
 * nothing checks, and it would go stale the first time a lane gains an atom.
 * Composing it means **`admin` cannot drift by construction**: add `rfq:cancel`
 * to `procurement` tomorrow and `admin` holds it in the same commit, with no
 * edit here and none on the page.
 *
 * ⚠️ **AND THE EXCLUSION IS WHAT MAKES THE BUNDLE RIGHT.** It is the union of
 * what PEOPLE hold — 36 buyer-side atoms plus 16 supplier atoms, disjoint — and
 * it deliberately does NOT include the 12 machine-only atoms in
 * `AUTOMATION_ATOMS`. **A super admin cannot fire S/4HANA's or the TMS's acts,
 * because those have no human owner by construction** (operator ruling), and
 * that is precisely the thing a super admin should not be able to override
 * invisibly either. A super admin bounded by what a human can legitimately do is
 * a role; one bounded by nothing is the wildcard with a name.
 *
 * ⚠️ **AND `buyer:all` WAS NEVER TOTAL, MEASURED.** The retired persona grant
 * reached 48 atoms — 36 assignable plus the 12 now in the automation grant — and
 * **touched zero supplier atoms**: the two sides are disjoint and the tenancy
 * boundary always held. "Wildcard" was accurate about its SHAPE (unconditional
 * breadth within a side) and loose about its REACH. So `admin` is genuinely
 * wider than the thing this arc retired, which is why it is named on the
 * catalogue rather than quietly granted.
 */
const ADMIN_ATOMS: readonly TransitionRole[] = Object.freeze([
  ...new Set(Object.values(LANE_BUNDLES).flat()),
]);

/**
 * THE SEEDED BUNDLES, `admin` included. Ordered with `admin` last so the
 * catalogue reads lanes first and the universal role at the end.
 */
export const SYSTEM_ROLES: Readonly<Record<SystemRoleId, readonly TransitionRole[]>> =
  Object.freeze({ ...LANE_BUNDLES, admin: ADMIN_ATOMS });

/**
 * The machine grant. Every atom required by a buyer transition that is
 * `surfaced: false` for `external-fact` or `computed`.
 *
 * ⚠️ **THE FOUR THAT LOAD-BEAR ARE THE CASCADE TARGETS** — `asn:flag`,
 * `invoice:match`, `quotation:award`, `quotation:reject`. The dispatcher's
 * fan-out re-dispatches under a synthetic scope INSIDE A `catch {}`, so a
 * cascade refused at the role gate fails SILENTLY and best-effort. Narrowing
 * the buyer grant without this list is exactly how "a currently-reachable act
 * becomes unreachable" happens with nothing to catch it.
 *
 * ⚠️ **`invoice:pay` APPEARS HERE AND IN `finance`, AND THAT IS AN ATOM
 * COLLISION WORTH ITS OWN ROW** — `t_invoice_release_payment` (human, finance's
 * reserved commit) and `t_invoice_remit` (system, the bank's remittance) share
 * ONE `requiredRole`. Granting it here is what keeps the remit reachable;
 * splitting the atom is a FLOW change and is not this batch. Filed.
 */
export const AUTOMATION_ATOMS: readonly TransitionRole[] = Object.freeze([
  'po:issue', 'po:fulfil', 'po:close',
  'asn:carry', 'asn:flag',
  'invoice:match', 'invoice:pay',
  'rfq:close',
  'quotation:award', 'quotation:reject',
  'pr:source', 'pr:convert',
  'shipment:create', 'shipment:advance',
  'supplierdoc:verify', 'supplierdoc:reject',
  'compliance:verify', 'compliance:reject',
]);

/** Is this id one of the seeded system roles, or something someone invented? */
export function isSystemRole(id: BusinessRoleId): id is SystemRoleId {
  return Object.prototype.hasOwnProperty.call(SYSTEM_ROLES, id);
}

/** The atoms a set of role ids grants, deduped. Unknown ids contribute nothing. */
export function atomsFor(roles: readonly BusinessRoleId[]): readonly TransitionRole[] {
  const atoms = new Set<TransitionRole>();
  for (const r of roles) {
    if (r === AUTOMATION_ROLE) {
      for (const a of AUTOMATION_ATOMS) atoms.add(a);
    } else if (isSystemRole(r)) {
      for (const a of SYSTEM_ROLES[r]) atoms.add(a);
    }
  }
  return [...atoms];
}

/**
 * The system roles that belong to a persona — the ONE place the sides split.
 *
 * ⚠️ **`admin` IS ABSENT HERE ON PURPOSE, AND IT IS NOT AN OVERSIGHT.** It spans
 * BOTH tenancies, so listing it under `buyer` would make `PERSONA_ROLES.buyer`
 * span supplier atoms — and `personaCan('buyer', 'po:confirm')` would become
 * true, collapsing the tenancy answer that `nextActorFrom`, `catalogView` and
 * the `surfaceable` per-persona invariant all read. A persona is a SIDE; admin
 * is not on a side. It is a catalogue role, not a seat-picker option.
 */
export const PERSONA_SYSTEM_ROLES: Readonly<
  Record<'buyer' | 'supplier', readonly SystemRoleId[]>
> = Object.freeze({
  buyer: Object.freeze([
    'procurement',
    'receiving',
    'finance',
    'compliance',
    'planning',
    'requisitioner',
  ] as readonly SystemRoleId[]),
  supplier: Object.freeze(['supplier'] as readonly SystemRoleId[]),
});

/**
 * Which system roles grant `atom`. Empty ⇒ nobody assignable holds it.
 *
 * ⚠️ **`admin` IS DELIBERATELY EXCLUDED, AND THIS IS THE UNIVERSALITY PROBLEM
 * IN ITS SECOND FORM.** The operator filed the first: *a derivation keyed on
 * usage cannot see a member defined by universality.* This is its inverse — **a
 * member defined by universality POLLUTES every usage-keyed answer.** `admin`
 * holds every assignable atom, so an unfiltered `rolesHolding` names it on all
 * 52, and the cross-role handoff would read *"Awaiting Finance / Admin"* on
 * every withheld verb in the portal.
 *
 * The two statements are different and only one is an OWNER: **finance owns
 * `invoice:pay`; admin can also do it.** A handoff names the owner, so it must
 * name finance. `SYSTEM_ROLES.admin` is where admin's reach is stated — plainly,
 * in full, on its own catalogue row — which is the operator's requirement that a
 * super admin be named rather than hidden.
 */
export function rolesHolding(atom: TransitionRole): readonly SystemRoleId[] {
  return (Object.keys(SYSTEM_ROLES) as SystemRoleId[])
    .filter((r) => r !== 'admin')
    .filter((r) => SYSTEM_ROLES[r].includes(atom));
}

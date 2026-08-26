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
  | 'buyer_all'
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
    // ⚠️ **IT NOW HOLDS EXACTLY ONE VERB A HUMAN CAN FIRE ON A SCREEN, AND IT IS
    // THE ONE THAT EDITS ROLES.** The other five atoms still sit on
    // `ruled-unsurfaced` or system verbs in flows with no CommandTarget — that
    // half of the comment that stood here is unchanged and still honest.
    //
    // `role:grant` is here rather than in `procurement` because WHOEVER CAN EDIT
    // ROLES CAN GRANT THEMSELVES ANY VERB (operator ruling, D5). Procurement
    // cannot lower the bar it is measured against, and a role editor in the
    // procurement bundle is that bar-lowering with one extra step: `rfq:award`
    // and `invoice:pay` are one grant away from anybody who can mint a role
    // holding them. This is the same ruling booked-and-deferred for
    // `enforcement:set` below — executed here rather than deferred, because
    // `role:grant` has no pre-existing caller whose lane would go dark.
    compliance: Object.freeze([
      'supplierdoc:request', 'supplierdoc:verify', 'supplierdoc:reject',
      'compliance:verify', 'compliance:reject',
      'role:grant',
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
 * The six buyer lane bundles, named once so both derived roles below compose
 * from the SAME list. Two literals would be two things to keep in step, and the
 * second one is always the one that drifts.
 */
const BUYER_LANE_IDS = Object.freeze([
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
] as const satisfies readonly (keyof typeof LANE_BUNDLES)[]);

/**
 * ⚠️ **THE MANAGER'S SEAT — EVERY BUYER ACT A LANE PERFORMS, AND NOTHING ELSE.**
 *
 * Derived, never hand-listed, for `admin`'s reason: a lane that gains an atom
 * tomorrow gives it to the manager in the same commit.
 *
 * ⚠️ **IT IS NOT A SMALLER `admin`, AND THE TWO EXCLUSIONS ARE THE WHOLE
 * DISTINCTION** (operator ruling). `admin` is **the IT seat** — both tenancies,
 * plus authority over the role system itself. `buyer_all` is **the manager's
 * seat** — one side, no authority over roles. *A department head who can do
 * everything their team does is not an IT administrator who can do everything
 * anyone does*, and collapsing them would hand a manager reach into the supplier
 * side and into the role catalogue, neither of which the job needs.
 *
 * ⚠️ **`role:grant` IS SUBTRACTED BY NAME, AND IT IS THE ONE SUBTRACTION.** It
 * is authority OVER the role system rather than an act within a lane, and §66
 * put it in `compliance` alone precisely because whoever can edit roles can
 * grant themselves any verb. A broad OPERATING seat that could also rewrite the
 * catalogue is `admin` — which already exists — so minting a second one here
 * would be the wildcard arriving through the door marked *operating
 * convenience*. **A manager operates the lane; IT administers the platform.**
 *
 * The subtraction is asserted BOTH ways in `buyerAll.test.ts`: `role:grant` is
 * absent, AND every other atom the six lanes hold is present. A one-sided
 * assertion would pass on an empty bundle (§39).
 */
const BUYER_ALL_ATOMS: readonly TransitionRole[] = Object.freeze(
  [...new Set(BUYER_LANE_IDS.flatMap((id) => LANE_BUNDLES[id]))].filter(
    (a) => a !== 'role:grant',
  ),
);

/**
 * ⚠️ **THE SUPER ADMIN, AND IT IS DERIVED — THE UNION OF EVERY LANE BUNDLE.**
 *
 * Hand-listing them would put a copy of every other bundle in a place
 * nothing checks, and it would go stale the first time a lane gains an atom.
 * Composing it means **`admin` cannot drift by construction**: add `rfq:cancel`
 * to `procurement` tomorrow and `admin` holds it in the same commit, with no
 * edit here and none on the page.
 *
 * ⚠️ **AND THE EXCLUSION IS WHAT MAKES THE BUNDLE RIGHT.** It is the union of
 * what PEOPLE hold — the buyer side plus the supplier side, disjoint, derived at
 * read rather than restated here (the figures that stood in this sentence were
 * measured stale by one the day `role:grant` landed, §77f) — and
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
 * THE SEEDED BUNDLES, the two supersets included. Ordered with the lanes first,
 * then the manager's seat, then the IT seat — so the catalogue reads narrow to
 * wide and a reader meets the two wide roles adjacently, which is where the
 * distinction between them is easiest to see.
 */
export const SYSTEM_ROLES: Readonly<Record<SystemRoleId, readonly TransitionRole[]>> =
  Object.freeze({ ...LANE_BUNDLES, buyer_all: BUYER_ALL_ATOMS, admin: ADMIN_ATOMS });

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
 * **This is what a persona MAY HOLD**: the identity panel's enumeration, the
 * storage allowlist, and the tenancy boundary `sideOfSystemRole` reads.
 *
 * ⚠️ **IT IS NOT THE SEED. SEE `SEEDED_SEAT_ROLES` BELOW, AND THE SPLIT IS THE
 * POINT.** One constant answered both questions until `buyer_all` landed, and
 * they are different questions: *what may this seat hold* and *what does it hold
 * on the day it opens*. Left merged, adding a role to the panel would have
 * GRANTED it to every seat in the portal — the ruling's own instruction was
 * **make it holdable, do not seed it**, and a single constant cannot express
 * both halves of that sentence.
 *
 * ⚠️ **`admin` IS ABSENT HERE ON PURPOSE, AND IT IS NOT AN OVERSIGHT.** It spans
 * BOTH tenancies, so listing it under `buyer` would make `PERSONA_ROLES.buyer`
 * span supplier atoms — and `personaCan('buyer', 'po:confirm')` would become
 * true, collapsing the tenancy answer that `nextActorFrom`, `catalogView` and
 * the `surfaceable` per-persona invariant all read. A persona is a SIDE; admin
 * is not on a side. It is a catalogue role, not a seat-picker option.
 *
 * ⚠️ **`buyer_all` IS PRESENT FOR THE MIRROR-IMAGE REASON.** It is on a side —
 * one side, by construction — so it collapses nothing: its atoms are a SUBSET of
 * what the six lanes already contribute, and `PERSONA_ROLES.buyer` is unchanged
 * by its presence (asserted in `buyerAll.test.ts`). Holdable, and inert to every
 * tenancy answer.
 */
export const PERSONA_SYSTEM_ROLES: Readonly<
  Record<'buyer' | 'supplier', readonly SystemRoleId[]>
> = Object.freeze({
  buyer: Object.freeze([...BUYER_LANE_IDS, 'buyer_all'] as readonly SystemRoleId[]),
  supplier: Object.freeze(['supplier'] as readonly SystemRoleId[]),
});

/**
 * ⚠️ **WHAT A SEAT HOLDS WHEN IT OPENS — AND `buyer_all` IS DELIBERATELY NOT IN
 * IT** (operator ruling). *A role is holdable and unheld until somebody grants
 * it, and that is the correct state for a manager's seat*: it exists to be
 * given to a manager, not to be everybody's default.
 *
 * The demo seat still opens holding every LANE on its side, which is the
 * pre-existing ruling and is unchanged — seeding narrower would delete
 * affordances from a portal nobody asked to change. What changed is only that
 * the seed is now stated separately from the offer, so the two can differ.
 *
 * ⚠️ **A NARROWING GATE GUARDS THIS PAIR**: `buyerAll.test.ts` asserts the seed
 * is a PROPER SUBSET of what the persona may hold, in both directions — every
 * seeded role is offerable (a seat cannot open holding something the panel would
 * refuse to give back), and at least one offerable role is unseeded (otherwise
 * the split is decorative and the next edit quietly re-merges it).
 */
export const SEEDED_SEAT_ROLES: Readonly<
  Record<'buyer' | 'supplier', readonly SystemRoleId[]>
> = Object.freeze({
  buyer: Object.freeze([...BUYER_LANE_IDS] as readonly SystemRoleId[]),
  supplier: Object.freeze(['supplier'] as readonly SystemRoleId[]),
});

/**
 * Which system roles grant `atom`. Empty ⇒ nobody assignable holds it.
 *
 * ⚠️ **THE SUPERSET ROLES ARE DELIBERATELY EXCLUDED, AND THIS IS THE
 * UNIVERSALITY PROBLEM IN ITS SECOND FORM.** The operator filed the first: *a
 * derivation keyed on usage cannot see a member defined by universality.* This
 * is its inverse — **a member defined by universality POLLUTES every usage-keyed
 * answer.** Each of them holds every assignable atom on its reach, so an
 * unfiltered `rolesHolding` would name them on all of it and the cross-role
 * handoff would read *"Awaiting Finance / Super Admin"* — or *"/ Buyer
 * Operations"* — on every withheld verb in the portal.
 *
 * ⚠️ **A ROLE THAT HOLDS EVERYTHING IS NOT AN OWNER, IT IS A SUPERSET**
 * (operator ruling). The two statements are different and only one is an OWNER:
 * **finance owns `invoice:pay`; admin and buyer_all can also do it.** A handoff
 * answers *whose act is next*, so naming a superset tells a withheld seat
 * nothing it can act on. `SYSTEM_ROLES[…]` is where each superset's reach is
 * stated — plainly, in full, on its own catalogue row — which is the operator's
 * requirement that a wide role be named rather than hidden.
 *
 * ⚠️ **IT IS A SET RATHER THAN A SPECIAL CASE, ON PURPOSE.** The single
 * `!== 'admin'` this replaces was correct while there was one such role and
 * silently wrong the moment there were two — the shape that ships looking like a
 * working filter. `SUPERSET_ROLES` is asserted in `buyerAll.test.ts` to be
 * exactly the roles whose atoms are a superset of another role's, DERIVED, so a
 * third one cannot be added without either joining the set or failing the gate.
 */
export const SUPERSET_ROLES: ReadonlySet<SystemRoleId> = new Set<SystemRoleId>([
  'admin',
  'buyer_all',
]);

export function rolesHolding(atom: TransitionRole): readonly SystemRoleId[] {
  return (Object.keys(SYSTEM_ROLES) as SystemRoleId[])
    .filter((r) => !SUPERSET_ROLES.has(r))
    .filter((r) => SYSTEM_ROLES[r].includes(atom));
}

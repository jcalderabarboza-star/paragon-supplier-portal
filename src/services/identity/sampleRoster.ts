// ─────────────────────────────────────────────────────────────────────────────
// THE SAMPLE ROSTER — C10 §6.3's fixture people, and the PERSON REGISTRY that
// D-ID-7 / §8.2 requires.
//
// ⚠️ **ONE MODULE, TWO JOBS, AND THAT IS DELIBERATE RATHER THAN LAZY.** §8.2
// narrows `ActingPerson` to `{ personId }` and rules that a label is *resolved
// at read from the person registry and never copied into the record*. This tree
// has exactly one population of people — the sample roster — so the roster IS
// the registry. Splitting them would create a registry with no rows and a
// roster nothing resolves against, which is two files agreeing to be empty.
//
// ⚠️ **ZERO RUNTIME IMPORTS, AND THE REASON IS A CYCLE THAT WOULD OTHERWISE
// EXIST.** `lib/enforcement.ts` reads `isSampleActor` to keep the override lane
// shut (R2), and `enforcement.ts` is imported across the service layer. A
// runtime import from here into `services/transitions` would close the loop.
// The `SystemRoleId` import below is TYPE-ONLY and is erased at build, so this
// module has no runtime dependency on anything.
//
// ⚠️ **NO PERSONAL NAMES. EVER. ROLES ONLY** (operator standing rule I3). A row
// carries a ROLE and an ORDINAL, never a name — and it carries the role as a
// `SystemRoleId`, so the label is DERIVED from `ROLE_LABEL_KEY`, the vocabulary
// the handoff line and the roles catalogue already read. Storing a label string
// here would be a SECOND ROLE VOCABULARY, which is the defect
// `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01` names: it would keep saying
// "Procurement" the day the atom moved to another bundle.
//
// ⚠️ **AND THE ROSTER IS NOT A ROLE DEFINITION.** `roles` is typed
// `readonly SystemRoleId[]`, so a row claiming a role this platform does not
// have is a `tsc` error, and a row claiming a cross-persona role is stripped by
// the filter `identitySources.ts` already applies. This is C10 §3.6's
// `AssignmentAct` in fixture form — it NAMES roles, it does not MINT them.
// ─────────────────────────────────────────────────────────────────────────────

import type { SystemRoleId } from '../transitions/businessRoles';

/**
 * The reserved namespace, re-declared here as the SHAPE every row must carry.
 *
 * ⚠️ **THE AUTHORITY IS `context/noPerson.ts`'s `FIXTURE_PERSON_PREFIX`, AND
 * THIS IS ASSERTED EQUAL TO IT** (`sampleRoster.test.ts`) rather than imported —
 * importing it would give this module a runtime edge into `context/`, which is
 * the one direction the zero-import rule above exists to prevent. Two constants
 * pinned equal by a test is the honest form of that trade, and the pin is what
 * stops them drifting.
 */
export const SAMPLE_PERSON_PREFIX = 'sim-usr-';

/**
 * A demonstration person. **Not a person.**
 *
 * `role` is the NAMING role — what this seat is called — and `roles` is what it
 * HOLDS. They are separate fields because they answer different questions, and
 * because collapsing them would force a multi-lane seat to be nameless. For
 * every buyer row `role ∈ roles`, asserted rather than assumed.
 */
export interface SamplePerson {
  /** `sim-usr-<role>-<ordinal>`. Permanent, portal-minted, never an IdP subject (D-ID-1). */
  readonly personId: string;
  /** The role this seat is NAMED for. Its label is `ROLE_LABEL_KEY[role]`. */
  readonly role: SystemRoleId;
  /** Disambiguates two seats of the same role. Rendered as "Procurement 2". */
  readonly ordinal: number;
  /** Which side of the tenancy line this seat sits on. */
  readonly personaType: 'buyer' | 'supplier';
  /** The tenant, on the supplier side only. `null` for every buyer seat, which
   *  reads the cross-supplier superset by construction. */
  readonly supplierId: string | null;
  /** What the seat HOLDS when this person is selected. Seeds `businessRoles`;
   *  the panel may narrow it afterwards, and says so when it has (R3). */
  readonly roles: readonly SystemRoleId[];
}

/**
 * ⚠️ **THE BUYER ROSTER REACHES BOTH DIRECTIONS OF BOTH FOUR-EYES CHECKS, AND
 * THAT IS THE PROPERTY IT WAS SIZED FOR — NOT COVERAGE OF THE LANE LIST.**
 *
 * Both predicates span TWO lanes, derived from `LANE_BUNDLES`:
 *
 *   · `PSL_DECIDER_NOT_PROPOSER`              `psl:propose` (procurement)
 *                                           → `psl:decide`  (compliance)
 *   · `MATERIALREQUEST_DECIDER_NOT_REQUESTER` `materialrequest:submit` (procurement)
 *                                           → `materialrequest:review|decide` (planning)
 *
 * So the REFUSED direction needs one person holding both sides — that is
 * `buyer_all`, which is why the manager's seat is on the roster rather than
 * being decorative — and the ADMITTED direction needs a second, distinct person
 * on the deciding side. `sampleRoster.test.ts` derives both populations from
 * `SYSTEM_ROLES` and fails if either direction becomes unreachable, so moving a
 * lane atom cannot quietly strand a check.
 *
 * ⚠️ **TWO `procurement` SEATS, DELIBERATELY.** One proposer is enough to fire a
 * refusal and not enough to fire an admit without borrowing a decider from
 * another lane. Two makes the admitted direction reachable inside the lane that
 * raises the document, which is the shape a real procurement team has.
 */
const BUYER_ROSTER = Object.freeze([
  { personId: 'sim-usr-procurement-1', role: 'procurement', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['procurement'] },
  { personId: 'sim-usr-procurement-2', role: 'procurement', ordinal: 2, personaType: 'buyer', supplierId: null, roles: ['procurement'] },
  { personId: 'sim-usr-receiving-1', role: 'receiving', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['receiving'] },
  { personId: 'sim-usr-finance-1', role: 'finance', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['finance'] },
  { personId: 'sim-usr-compliance-1', role: 'compliance', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['compliance'] },
  { personId: 'sim-usr-planning-1', role: 'planning', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['planning'] },
  { personId: 'sim-usr-requisitioner-1', role: 'requisitioner', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['requisitioner'] },
  // The seat that CROSSES the segregation, and it is on the roster precisely so
  // `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` becomes demonstrable instead of only
  // filed: this person can raise a designation and rule on it, and the four-eyes
  // check is what refuses them.
  { personId: 'sim-usr-buyer-all-1', role: 'buyer_all', ordinal: 1, personaType: 'buyer', supplierId: null, roles: ['buyer_all'] },
] as const satisfies readonly SamplePerson[]);

/**
 * ⚠️ **ONE PER SAMPLE SUPPLIER, NAMED BY THE ANCHOR ROLE, HOLDING THE WHOLE
 * SUPPLIER SEAT — and each clause of that is a decision.**
 *
 * NAMED BY `supplier`: the three supplier lanes are held TOGETHER by the seeded
 * seat, so naming a row "Supplier Commercial" while it also holds fulfilment and
 * back-office would be a label that overstates its own authority — the
 * `label-names-wrong-verb` defect with a person attached.
 *
 * HOLDING THE WHOLE SEAT: these roles are `SEEDED_SEAT_ROLES.supplier`'s
 * members, so selecting a sample supplier user changes WHO acts and nothing
 * about WHAT is reachable. A narrower supplier seat would delete affordances
 * from a portal nobody asked to change, which is the argument
 * `identitySources.ts` already makes for the seeded default.
 *
 * ⚠️ **NEITHER FOUR-EYES PREDICATE IS SUPPLIER-SIDE** — both `psl` and
 * `materialRequest` are buyer lanes — so these rows exist for ATTRIBUTION, not
 * for segregation. What they sign is an inventory declaration and a document
 * submission (`declaredBy`, `MockCommandService`).
 */
const SUPPLIER_ROSTER = Object.freeze([
  { personId: 'sim-usr-supplier-1', role: 'supplier', ordinal: 1, personaType: 'supplier', supplierId: 'sup-002', roles: ['supplier', 'commercial', 'fulfilment', 'back_office'] },
  { personId: 'sim-usr-supplier-2', role: 'supplier', ordinal: 2, personaType: 'supplier', supplierId: 'sup-005', roles: ['supplier', 'commercial', 'fulfilment', 'back_office'] },
  { personId: 'sim-usr-supplier-3', role: 'supplier', ordinal: 3, personaType: 'supplier', supplierId: 'sup-007', roles: ['supplier', 'commercial', 'fulfilment', 'back_office'] },
] as const satisfies readonly SamplePerson[]);

/** The whole roster. The ONE population; every lookup below derives from it. */
export const SAMPLE_PEOPLE: readonly SamplePerson[] = Object.freeze([
  ...BUYER_ROSTER,
  ...SUPPLIER_ROSTER,
]);

/** The roster for one side of the tenancy line — what the switcher offers. */
export function samplePeopleFor(
  persona: 'buyer' | 'supplier',
): readonly SamplePerson[] {
  return SAMPLE_PEOPLE.filter((p) => p.personaType === persona);
}

/**
 * Resolve a `personId` to its row, or `undefined`.
 *
 * ⚠️ **`undefined` IS THE ANSWER FOR AN UNKNOWN ID, AND CALLERS MUST NOT GUESS
 * PAST IT.** A caller that fell back to "some person" would manufacture the
 * provenance C10 §6.3 exists to forbid, and it would do so on exactly the input
 * a tampered `localStorage` row supplies.
 */
export function resolveSamplePerson(
  personId: string,
): SamplePerson | undefined {
  return SAMPLE_PEOPLE.find((p) => p.personId === personId);
}

/**
 * Is this `personId` a SAMPLE identity?
 *
 * ⚠️ **MEMBERSHIP, NOT A STRING PREFIX — AND THE DISTINCTION IS THE RULE THE
 * OPERATOR SET.** The `sim-usr-` prefix may be read as a string to DECIDE
 * something in exactly one place: `simUsrNamespace.test.ts`, the C10 §6.3 pin,
 * whose whole job is to police the spelling. Everywhere else — the loosening
 * gate, the override gate — the question is *is this one of OUR fixture
 * people?*, and the honest answer to that is a lookup in the roster.
 *
 * The difference is not stylistic. A prefix check says yes to
 * `sim-usr-anything-at-all`, including a value a caller invented; this says yes
 * only to a row this module ships. A prefix nobody checks is a naming habit
 * (C10 §6.3), and a prefix everybody checks is a naming habit with more call
 * sites.
 */
export function isSampleActor(personId: string): boolean {
  return resolveSamplePerson(personId) !== undefined;
}

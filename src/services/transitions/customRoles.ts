// ────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES — DUPLICATE-AND-NARROW, AS A PARENT REFERENCE (D1).
//
// A custom role is a COPY of one system role plus additions. It is stored as
// **`{ parent, adds }`, never as a snapshot of atoms**, and the difference is
// the whole ruling:
//
//   > A SNAPSHOT SILENTLY KEEPS YESTERDAY'S TRUTH.
//
// The instance is live in this tree — the invoice surface hardcoded a
// terminality the flow declared while the machine moved underneath it. A
// snapshot of `SYSTEM_ROLES.procurement` is that defect with a store: add
// `rfq:split` to `procurement` next quarter and every custom copy silently
// fails to gain it, which is the SILENT DROP the additive-only ruling exists to
// forbid, arriving by the other door. A parent reference gains it in the same
// commit, with no edit here and none on the page.
//
// It also inherits the gate. `businessRoles.test.ts` asserts BOTH directions of
// (bundle atoms ⊆ catalog) and (catalog ⊆ bundles ∪ automation), and both
// iterate `SYSTEM_ROLES`. A snapshot stored out here would be **outside that
// population** — free to hold a retired atom forever, invisible to the one gate
// built for exactly this question. A parent reference is checked by that gate
// every run, because it resolves through `SYSTEM_ROLES` at read.
//
// ── ⚠️ THE EXCEPTION, AND IT IS THE SAME SHAPE ONE LAYER DOWN (D1) ──────────
// **IF A PARENT ATOM IS EVER REMOVED, THE CHILD MUST NOT SILENTLY LOSE IT.**
// So the grant records `parentAtomsAtGrant` — a baseline that is NEVER the
// resolution source — and anything the parent has since dropped is RETAINED and
// NAMED (`retainedFromParent`). The child keeps what it was granted; the fact
// that the parent no longer carries it becomes a stated difference rather than
// a quiet subtraction. Exactly the additive rule, applied to the parent's own
// movement instead of to the child's.
//
// ⚠️ **THE RETAINED SET IS UNREACHABLE TODAY AND HAS NO SURFACE, DELIBERATELY.**
// `LANE_BUNDLES` is a frozen module constant and a grant lives for one session
// (D2), so a parent CANNOT lose an atom while a child exists — the state is
// impossible at runtime, not merely rare. Building a notice for it would invent
// a surface for a fact that cannot occur, which is the class this project
// spends its time removing. The RULE is built and pinned by tests; the notice
// becomes owed the day a grant outlives a deploy.
//
// ── ⚠️ SESSION-SCOPED, AND THAT IS A RULING RATHER THAN A LIMITATION (D2) ───
// `rows` is a module-level array — the shape every store in `data/mock/stores/`
// already has, and it does NOT survive a reload. Nothing is written to
// `localStorage`, and the reason is not that it would be hard: **this platform
// cannot name the person who granted a role.** `CurrentIdentity.actor` is
// always `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so every grant is recorded
// against an explicit absence. A privilege grant nobody can be named for is
// exactly the record that must not outlive the act, and `paragon.identity` —
// the one durable key in the tree — holds a SEAT PREFERENCE, not a governed
// record. The counter-precedent is on the record too: `paragon_gr_posted` was a
// localStorage overlay for domain state and was DELETED as dishonest
// (INV-SEED-01 → INV-GR-OVERLAY-01).
//
// The page states this precisely rather than omitting it — see
// `roles.page.readOnlyBody`.
// ────────────────────────────────────────────────────────────────────────────

import type { TransitionRole } from './schema';
import type { ActorAttribution } from '../../lib/enforcement';
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  AUTOMATION_ROLE,
  atomsFor,
  isSystemRole,
  type BusinessRoleId,
  type SystemRoleId,
} from './businessRoles';

/** The side a role sits on. `admin` is the ONE role that spans; see below. */
export type RoleSide = 'buyer' | 'supplier';

/**
 * A granted custom role. `parent` + `adds` is the definition; everything else
 * is provenance the store assigns.
 *
 * ⚠️ **`parentAtomsAtGrant` AND `grantedAt` ARE STORE-ASSIGNED, NEVER PAYLOAD
 * FIELDS** — the `pinnedAt` / `setAt` discipline. A caller that could set
 * `grantedAt` could backdate its own audit entry; a caller that could set the
 * baseline could fake the drift check into silence, which is the one thing the
 * baseline exists to prevent.
 */
export interface CustomRoleDefinition {
  readonly id: BusinessRoleId;
  readonly parent: SystemRoleId;
  /** User text. NOT an i18n key and NOT translated — see `roleModel.ts`. */
  readonly displayName: string;
  readonly description: string;
  /** Atoms added on top of the parent. Always a widening (additive-only). */
  readonly adds: readonly TransitionRole[];
  /** The parent's atoms at the moment of the grant. The DRIFT BASELINE ONLY. */
  readonly parentAtomsAtGrant: readonly TransitionRole[];
  readonly grantedBy: ActorAttribution;
  readonly grantedAt: string;
}

// ── THE SESSION STORE ───────────────────────────────────────────────────────

const SEED: readonly CustomRoleDefinition[] = Object.freeze([]);

let rows: CustomRoleDefinition[] = [...SEED];

export const customRoleStore = {
  /** Every granted role, oldest first. */
  all(): readonly CustomRoleDefinition[] {
    return rows;
  },
  /** One granted role, or undefined. */
  byId(id: string): CustomRoleDefinition | undefined {
    return rows.find((r) => r.id === id);
  },
  /** APPEND ONLY — there is no update path, so there is none to guard. A new
   *  array reference so a memoised read genuinely recomputes. */
  append(def: CustomRoleDefinition): void {
    rows = [...rows, def];
  },
  /** Restore the (empty) seed — test isolation, and the reload story in one
   *  function: a session ends and the grants are gone. */
  reset(): void {
    rows = [...SEED];
  },
};

// ── TENANCY ─────────────────────────────────────────────────────────────────

/**
 * The side a SYSTEM role sits on, or `null` for `admin`.
 *
 * ⚠️ **`admin` RETURNS `null` BECAUSE IT IS NOT ON A SIDE**, and that is the
 * reason it cannot be a parent. A copy of `admin` would span both tenancies by
 * construction — see `assertCopyableParent`.
 */
export function sideOfSystemRole(id: SystemRoleId): RoleSide | null {
  if ((PERSONA_SYSTEM_ROLES.buyer as readonly string[]).includes(id)) return 'buyer';
  if ((PERSONA_SYSTEM_ROLES.supplier as readonly string[]).includes(id)) return 'supplier';
  return null;
}

/** Every atom any assignable role on `side` can hold. The tenancy boundary. */
export function atomsOfSide(side: RoleSide): readonly TransitionRole[] {
  return atomsFor(PERSONA_SYSTEM_ROLES[side]);
}

// ── RESOLUTION ──────────────────────────────────────────────────────────────

/**
 * What the parent held at grant time and no longer holds — RETAINED by the
 * child, and named (D1's exception). Empty in every reachable state today; see
 * the header.
 */
export function retainedFromParent(
  def: CustomRoleDefinition,
): readonly TransitionRole[] {
  const live = new Set<string>(SYSTEM_ROLES[def.parent]);
  return def.parentAtomsAtGrant.filter((a) => !live.has(a));
}

/**
 * THE MERGE RULE, AND IT IS THE UNION (D4): the parent's atoms AS THEY ARE NOW,
 * plus the additions, plus anything the parent has dropped since the grant.
 * Deduped, and it can only ever be a superset of the parent.
 */
export function atomsOfCustomRole(
  def: CustomRoleDefinition,
): readonly TransitionRole[] {
  return [
    ...new Set([...SYSTEM_ROLES[def.parent], ...def.adds, ...retainedFromParent(def)]),
  ];
}

/**
 * ⚠️ **THE ATOMS A SEAT HOLDS — AND THIS, NOT `atomsFor`, IS WHAT A SEAT
 * RESOLVES THROUGH.**
 *
 * `atomsFor` knows the SYSTEM vocabulary (the seeded bundles plus the automation
 * grant) and, by its own contract, contributes NOTHING for an id it does not
 * recognise. That silence is correct for the tenancy questions `PERSONA_ROLES`
 * asks and catastrophic for a seat: a session holding a custom role would
 * resolve to ZERO atoms and be refused `ROLE_NOT_PERMITTED` on every act, with
 * nothing to say why.
 *
 * So every SEAT resolution goes through here — the dispatcher's `resolveRoles`,
 * `capabilitiesFor`, and the cross-role handoff. `businessRoles.test.ts` pins
 * that there are no others.
 */
export function atomsForSeat(
  roles: readonly BusinessRoleId[],
): readonly TransitionRole[] {
  const atoms = new Set<TransitionRole>(atomsFor(roles));
  for (const r of roles) {
    const custom = customRoleStore.byId(r);
    if (custom) for (const a of atomsOfCustomRole(custom)) atoms.add(a);
  }
  return [...atoms];
}

// ── THE GRANT'S PRECONDITIONS, AS PREDICATES ────────────────────────────────
//
// These are read by the policy hook (`policies.ts`), which is where a refusal
// gets its wording. They live here so the RULE and the STORE cannot drift, and
// so a test can probe each one without going through a dispatch.

/** A custom role id: lowercase slug, and distinguishable from a system one. */
export const CUSTOM_ROLE_ID = /^[a-z0-9][a-z0-9-]{1,47}$/;

/**
 * Display text a custom role may carry: 2–80 characters, no leading or trailing
 * space.
 *
 * ⚠️ **IT DOES NOT FORBID `:` OR `.`, AND THAT IS A MEASUREMENT RATHER THAN
 * AN OVERSIGHT.** `roleModel.ts` passes a custom role's display name through
 * `t()` as its own key, so i18next's missing-key fallback renders it verbatim —
 * which is the honest answer for user text nobody has translated. The obvious
 * fear is that i18next reads `:` as a namespace separator and `.` as a key
 * separator and would TRUNCATE such a name. **Probed against this app's own
 * i18n instance before the rule was written: `t('Night: Jakarta')` and
 * `t('The dock, after hours.')` both come back whole**, because neither prefix
 * names a loaded namespace. Banning both characters would have made a
 * description unable to end in a full stop, to prevent a truncation that does
 * not happen.
 *
 * The ONE prefix that genuinely resolves is this app's only loaded namespace,
 * and it is refused by name below rather than by banning a character class.
 */
export const CUSTOM_ROLE_TEXT = /^\S(?:.{0,78}\S)?$/;

/** The only namespace prefix i18next would actually resolve here. */
export const I18N_NAMESPACE_PREFIX = /^translation:/i;

/** Why a parent cannot be copied, or `null` if it can. */
export function copyableParentRefusal(parent: string): string | null {
  if (!isSystemRole(parent)) {
    return `'${parent}' is not a system role (${Object.keys(SYSTEM_ROLES).join(', ')})`;
  }
  if (sideOfSystemRole(parent) === null) {
    // The `admin` arm, and it is the tenancy ruling at the verb.
    return (
      `'${parent}' spans both tenancies and cannot be copied — a custom role ` +
      'may not span tenancies, and a copy of it would by construction'
    );
  }
  return null;
}

/**
 * Why an atom may not be added to a child of `parent`, or `null` if it may.
 *
 * ⚠️ **THE TENANCY ARM IS THE ONE THAT MATTERS AND IT REFUSES BY NAME.** The
 * buyer and supplier atom sets are DISJOINT and have been since the beginning —
 * `businessRoles.test.ts` pins it, and the retired persona grant never crossed
 * it either. Nothing in a FORM can be trusted to keep it that way: a surface can
 * prevent the gesture, only the verb can prevent the act.
 */
export function addableAtomRefusal(
  parent: SystemRoleId,
  atom: string,
  catalog: readonly string[],
): string | null {
  if (!catalog.includes(atom)) {
    return `'${atom}' is not a permission any registered transition requires`;
  }
  const side = sideOfSystemRole(parent);
  if (side === null) return `'${parent}' is not on a side`;
  const assignable = new Set<string>([...atomsOfSide('buyer'), ...atomsOfSide('supplier')]);
  if (!assignable.has(atom)) {
    // Machine-only: in the catalog, in `AUTOMATION_ATOMS`, in no bundle a person
    // can hold. A super admin cannot fire these either — a custom role must not
    // be the door that reintroduces them.
    return `'${atom}' has no human owner and is held only by the automation grant`;
  }
  if (!(atomsOfSide(side) as readonly string[]).includes(atom)) {
    const other: RoleSide = side === 'buyer' ? 'supplier' : 'buyer';
    return (
      `'${atom}' is a ${other}-side permission and '${parent}' is ${side}-side — ` +
      'a custom role may not span tenancies'
    );
  }
  return null;
}

/** Why an id may not be granted, or `null` if it may. */
export function grantableIdRefusal(id: string): string | null {
  if (!CUSTOM_ROLE_ID.test(id)) {
    return `'${id}' is not a role id (lowercase letters, digits and hyphens, 2–48 characters)`;
  }
  if (isSystemRole(id)) return `'${id}' is already a system role`;
  if (id === AUTOMATION_ROLE) return `'${id}' is the machine grant and is never assignable`;
  if (customRoleStore.byId(id)) return `'${id}' has already been granted`;
  return null;
}

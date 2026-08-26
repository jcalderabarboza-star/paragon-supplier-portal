// ────────────────────────────────────────────────────────────────────────────
// Role flow — DUPLICATE-AND-NARROW. THE RECORDING VERB FOR A PRIVILEGE GRANT.
//
// ⚠️ **THROUGH THE DISPATCHER, AND THIS IS THE FINDING THAT DECIDED IT (D3):**
//
//   > `t_role_grant` WRITING OUTSIDE THE DISPATCHER WOULD BE THE ONLY
//   > PRIVILEGE-GRANTING ACT IN THE PLATFORM WITH NO `TransitionEvent`.
//
// An act that grants privilege and leaves no audit record is the shape this
// project has closed four times. A store write would have been shorter by a
// file and would have left "who granted this role, when, and were they named?"
// answerable only by inspecting the grant it produced — which is the question
// the DR-10 trail exists for.
//
// ── THE PRECEDENT IS `t_enforcement_set`, AND IT IS FOLLOWED, NOT ADAPTED ────
// A GOVERNANCE ACT, NO DOCUMENT, `statePreserving`. Every structural choice
// below is that flow's, for that flow's stated reason:
//
//   · A DEGENERATE SINGLE-STATE MACHINE. A system role does not have a
//     lifecycle — it has a LEDGER of what has been copied from it. `Defined` is
//     the one state and nothing ever leaves it.
//   · THE ENTITY IS THE PARENT SYSTEM ROLE. `entityId` IS the `SystemRoleId`
//     being copied, exactly as enforcement's `entityId` IS the `GovernedCheckId`
//     — so the entity commanded and the parent recorded cannot disagree, and
//     there is no `parent` payload field to disagree with it. `readState`
//     answers `Defined` for a known role and `null` for anything else, which
//     makes an unknown parent `NOT_FOUND` rather than a silently-minted one.
//   · `statePreserving`. Copying a role does not change the role copied.
//   · `applyTransition` APPENDS to a ledger and writes no state.
//   · `grantedAt` AND `parentAtomsAtGrant` ARE STORE-ASSIGNED, so neither is a
//     payload field — the `pinnedAt` discipline. A caller that could set the
//     baseline could fake the drift check into silence.
//
// ── ⚠️ `role:grant` IS A `compliance` ATOM, NOT A `procurement` ONE (D5) ────
// WHOEVER CAN EDIT ROLES CAN GRANT THEMSELVES ANY VERB. Procurement cannot
// lower the bar it is measured against, and a role editor in the procurement
// bundle is precisely that bar-lowering with an extra step: award and
// release-payment are two atoms away from anybody who can mint a role holding
// them. This is the same ruling already booked for `enforcement:set` — and
// unlike that one it is executed here rather than deferred, because there is no
// pre-existing caller whose lane would go dark.
//
// ── ⚠️ WHAT THE POLICY REFUSES, AND WHY IT IS THE VERB THAT REFUSES ─────────
// A CUSTOM ROLE MAY NOT SPAN TENANCIES. `admin` is the ONE cross-tenancy role
// in this platform and it was ruled, deliberately, with its reach stated on its
// own catalogue row. The buyer and supplier atom sets are DISJOINT and have
// been since the beginning — the retired persona-wide grant never crossed the
// line either. **A boundary that has held by construction would fall to a
// form**, so the refusal lives in `role_grant_governed`, by name, per atom: a
// surface can prevent the gesture, only the verb can prevent the act.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const roleFlow: FlowDefinition = {
  entity: 'role',
  version: 1,
  // ONE state. A system role does not have a lifecycle — it has a ledger.
  states: ['Defined'],
  initial: 'Defined',
  /** `t_role_grant` is statePreserving, so nothing ever leaves it. */
  terminals: ['Defined'],
  transitions: [
    {
      // WIRED. A compliance seat copies one system role and adds to it.
      id: 't_role_grant',
      from: ['Defined'],
      to: 'Defined',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'role:grant',
      // `roleId` / `displayName` / `description` / `adds` are the definition;
      // `grantedBy` is the attribution it is recorded under (a discriminated
      // `ActorAttribution` — resolved, or unattributed WITH THE REASON).
      //
      // ⚠️ **AN EMPTY `adds` IS REFUSED, AND BY RULE 5 RATHER THAN BY A POLICY.**
      // The dispatcher's `isEmpty` treats `[]` as absent, so `MISSING_FIELDS:adds`
      // is the refusal a caller gets — measured, not assumed. That is the right
      // answer here: duplicate-AND-NARROW is an act that adds something, and a
      // child identical to its parent is a second name for the parent with a
      // grant record attached. The merge rule itself handles an empty set fine
      // (`atomsOfCustomRole`); nothing in this verb produces one.
      requiredFields: ['roleId', 'displayName', 'description', 'adds', 'grantedBy'],
      policyHooks: [POLICY_HOOKS.ROLE_GRANT_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Flow version — FB-1 (operator ruling, 12 October 2026: the Flow Builder is
// built here; it was SE-16), completed at FB-3 and FB-4.
//
// A CHANGE TO A PROCESS IS ITSELF A DOCUMENT WITH A LIFECYCLE, and an ordinary
// registered flow with a command target — so every act on a change goes through
// the dispatcher and leaves an event, like every other governed act.
//
//   Draft → In Review → Approved → Active → Retired        Rejected (the ending)
//
// ⚠️ APPROVING AND ACTIVATING ARE TWO ACTS (operator ruling, decision 6).
// Approving says the change is right; activating says it is in force now. Kept
// apart, rollback is the same switch thrown back: RETIRE returns the process to
// the shipped default, RESTORE brings an earlier change back.
//
// ⚠️ THREE PERMISSIONS, ALL `compliance` ATOMS (decision 3): `flow:draft`
// writes and proposes, `flow:decide` approves, returns and rejects,
// `flow:activate` switches. Admin and Super Admin hold them as they hold every
// buyer-side permission. `flow:supersede` is the automation grant's: nobody
// declares that a version was replaced, the activation that replaced it does.
//
// ⚠️ CONTENT IS IMMUTABLE FROM `In Review` ONWARD. The save act is legal in
// `Draft` only, so a version that was reviewed is the version that runs.
//
// ⚠️ A CHANGE NEVER REACHES THE REGISTRY. No flow-builder module calls
// `flowRegistry.register`; the shipped catalogue stays what the code declares
// (`noRegistryDoor` in `validateVersion.test.ts` holds it). An active version
// is applied BESIDE the catalogue, by the dispatcher (`flowOverlay`).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition, TransitionDef } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const FLOW_VERSION_STATES = Object.freeze([
  'Draft',
  'In Review',
  'Approved',
  'Active',
  'Retired',
  'Rejected',
] as const);

const H = POLICY_HOOKS;

/** An act a named person takes with a stated reason. */
const reasoned = (
  def: Pick<TransitionDef, 'id' | 'from' | 'to' | 'requiredRole'> & { hooks: readonly string[] },
): TransitionDef => ({
  id: def.id,
  from: def.from,
  to: def.to,
  trigger: 'user',
  requiredRole: def.requiredRole,
  requiredFields: ['reason'],
  policyHooks: [...def.hooks, H.FLOWVERSION_REASON_AUTHORED],
  surfaceable: { surfaced: true },
  version: 1,
});

export const flowVersionFlow: FlowDefinition = {
  entity: 'flowVersion',
  version: 1,
  states: [...FLOW_VERSION_STATES],
  initial: 'Draft',
  /** A rejected change is copied into a new draft if it is wanted again. */
  terminals: ['Rejected'],
  transitions: [
    {
      // A new draft against one process. The id, the label and the stamps are
      // minted by the store; `flow` and `title` are all a caller says.
      id: 't_flowversion_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'flow:draft',
      requiredFields: ['flow', 'title'],
      policyHooks: [H.FLOWVERSION_AUTHOR_NAMED, H.FLOWVERSION_PROCESS_WRITABLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Replace a draft's content. State-preserving: saving is not deciding.
      id: 't_flowversion_save',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'flow:draft',
      requiredFields: ['content'],
      policyHooks: [H.FLOWVERSION_AUTHOR_NAMED, H.FLOWVERSION_CONTENT_WELL_FORMED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    // Propose: the rules are obeyed, every warning is acknowledged, and the
    // process is still the one the change was written against.
    reasoned({
      id: 't_flowversion_propose',
      from: ['Draft'],
      to: 'In Review',
      requiredRole: 'flow:draft',
      hooks: [H.FLOWVERSION_AUTHOR_NAMED, H.FLOWVERSION_OBEYS_RULES],
    }),
    // The author takes it back to work on it.
    reasoned({
      id: 't_flowversion_withdraw',
      from: ['In Review', 'Approved'],
      to: 'Draft',
      requiredRole: 'flow:draft',
      hooks: [H.FLOWVERSION_AUTHOR_NAMED],
    }),
    // The reviewer sends it back. No four-eyes rule: the safe direction stays
    // reachable by any one named holder.
    reasoned({
      id: 't_flowversion_return',
      from: ['In Review'],
      to: 'Draft',
      requiredRole: 'flow:decide',
      hooks: [H.FLOWVERSION_DECIDER_NAMED],
    }),
    // Approve: validated again, by a different person than the proposer.
    reasoned({
      id: 't_flowversion_approve',
      from: ['In Review'],
      to: 'Approved',
      requiredRole: 'flow:decide',
      hooks: [
        H.FLOWVERSION_DECIDER_NAMED,
        H.FLOWVERSION_OBEYS_RULES,
        H.FLOWVERSION_APPROVER_NOT_PROPOSER,
        H.FLOWVERSION_NOT_SAMPLE_IN_PROD,
      ],
    }),
    reasoned({
      id: 't_flowversion_reject',
      from: ['In Review'],
      to: 'Rejected',
      requiredRole: 'flow:decide',
      hooks: [H.FLOWVERSION_DECIDER_NAMED],
    }),
    // Activate: validated a third time, against the world as it is then. The
    // version of the same process that was in force is retired by cascade.
    reasoned({
      id: 't_flowversion_activate',
      from: ['Approved'],
      to: 'Active',
      requiredRole: 'flow:activate',
      hooks: [H.FLOWVERSION_DECIDER_NAMED, H.FLOWVERSION_OBEYS_RULES, H.FLOWVERSION_NOT_SAMPLE_IN_PROD],
    }),
    {
      id: 't_flowversion_supersede',
      from: ['Active'],
      to: 'Retired',
      trigger: 'cascade',
      requiredRole: 'flow:supersede',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'Raised by the activate and restore cascades. Another version of the same ' +
          'process came into force and replaced this one; nobody declares it.',
      },
      version: 1,
    },
    // ROLLBACK TO THE SHIPPED DEFAULT. No four-eyes rule and no validation: it
    // only ever removes what the change added.
    reasoned({
      id: 't_flowversion_retire',
      from: ['Active'],
      to: 'Retired',
      requiredRole: 'flow:activate',
      hooks: [H.FLOWVERSION_DECIDER_NAMED],
    }),
    // ROLLBACK TO AN EARLIER CHANGE. Validated again: the process may have
    // moved since the change was last in force.
    reasoned({
      id: 't_flowversion_restore',
      from: ['Retired'],
      to: 'Active',
      requiredRole: 'flow:activate',
      hooks: [H.FLOWVERSION_DECIDER_NAMED, H.FLOWVERSION_OBEYS_RULES, H.FLOWVERSION_NOT_SAMPLE_IN_PROD],
    }),
  ],
};

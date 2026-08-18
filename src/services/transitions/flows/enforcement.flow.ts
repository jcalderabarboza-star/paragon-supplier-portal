// ────────────────────────────────────────────────────────────────────────────
// Enforcement flow — CP-3 · E2. The RECORDING VERB for a governed relaxation.
//
// A DEGENERATE SINGLE-STATE machine (the `inventoryDeclaration` precedent) and
// a STATE-PRESERVING verb (the `t_rfq_fx_pin` precedent). Both choices are
// forced, and by the same law.
//
// ⚠️ WHY THE MODES ARE NOT THE STATES — LAW 0.5, AND IT IS NOT CLOSE.
//   The obvious machine is `OBSERVE → BLOCK_OVERRIDABLE → BLOCK`, and it is
//   FORBIDDEN. The ratchet (D-ENF-3) tightens a relaxation when its `reviewBy`
//   passes; if the modes were states, that lapse would be A TRANSITION FIRED BY
//   THE CLOCK — precisely the `clock` trigger this schema makes a compile error.
//   So the mode is a RECORDED VALUE on an append-only ledger and the mode in
//   force is DERIVED AT READ (`effectiveEnforcement`), exactly as every other
//   clock-projected state in this codebase is derived rather than stored.
//
//   The entity, therefore, is THE GOVERNED CHECK ITSELF, and it has one state:
//   `Governed`. `readState` answers it for any id in `GOVERNED_CHECK_IDS` and
//   `null` for anything else (so an unknown check is `NOT_FOUND`, not a silently
//   created one). `applyTransition` APPENDS a setting; it never writes a state.
//
// ⚠️ A DISPATCHED VERB RATHER THAN A STORE WRITE, for the D-1 reason: every
//   recorded relaxation must land in the DR-10 trail. "Who relaxed the halal
//   certificate check, when, until when, and were they named?" is exactly the
//   kind of question an audit asks later, and a governed fact recorded outside
//   the trail is what the trail exists to prevent.
//
// ⚠️ `reviewBy` IS NOT IN `requiredFields`, DELIBERATELY. `requiredFields` rules
//   on ABSENCE, unconditionally — and `reviewBy` is required below `BLOCK` and
//   legitimately absent at `BLOCK`. A conditional requirement is a POLICY, and
//   it lives in `enforcement_set_governed` with the direction rule it belongs
//   beside.
//
// THE DIRECTION RULE (operator dispatch): TIGHTENING IS ALWAYS LEGAL; LOOSENING
// REQUIRES `reviewBy` AND A NAMED ACTOR. Which means the safest act — setting a
// check to full rigour — is available to anybody, with no review date and no
// resolved identity. Failing in that direction costs a blocked dock; failing in
// the other costs an anonymous unlock.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const enforcementFlow: FlowDefinition = {
  entity: 'enforcement',
  version: 1,
  // ONE state. A governed check does not have a lifecycle — it has a LEDGER.
  states: ['Governed'],
  initial: 'Governed',
  /** PF-0 · D-2 — one state, and `t_enforcement_set` is statePreserving, so
   *  nothing ever leaves it. The ledger machine rests here by design. */
  terminals: ['Governed'],
  transitions: [
    {
      // WIRED (E2). A buyer records how hard one check bites. The entityId IS
      // the `GovernedCheckId` — there is no `checkId` payload field, so the
      // entity commanded and the check recorded cannot disagree.
      id: 't_enforcement_set',
      from: ['Governed'],
      to: 'Governed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'enforcement:set',
      // `mode` is the decision; `setBy` is the attribution the decision is
      // recorded under (a discriminated `ActorAttribution` — resolved, or
      // unattributed WITH THE REASON). `setAt` is store-assigned and therefore
      // never a payload field: a caller that could set it could backdate its own
      // audit entry (the `pinnedAt` discipline).
      requiredFields: ['mode', 'setBy'],
      policyHooks: [POLICY_HOOKS.ENFORCEMENT_SET_GOVERNED],
      surfaceable: {
        surfaced: false,
        because: 'ruled-unsurfaced',
        why:
          'C10 · ENF-NO-PERSON-IN-IDENTITY-01 — relaxing a governed check is ' +
          'an attributable act and the platform cannot name a person, so an ' +
          'anonymous relaxation is refused rather than offered. The same ' +
          'ruling that blocks the GR override-hold blocks this.',
      },
      version: 1,
    },
  ],
};

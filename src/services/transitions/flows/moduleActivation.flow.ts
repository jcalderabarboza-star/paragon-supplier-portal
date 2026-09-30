// ────────────────────────────────────────────────────────────────────────────
// Module activation flow — M1 · Design 5 §A.4. THE RECORDING VERB FOR SWITCHING
// A PART OF THE PLATFORM ON OR OFF.
//
// ── THE PRECEDENT IS `t_enforcement_set`, AND IT IS FOLLOWED, NOT ADAPTED ────
//   · A DEGENERATE SINGLE-STATE MACHINE. A module does not have a lifecycle — it
//     has a LEDGER of who switched it, when, why. `Governed` is the one state.
//   · THE ENTITY IS THE SUBJECT. `entityId` IS the module code (or the side), so
//     the entity commanded and the switch recorded cannot disagree — there is no
//     `code` payload field to disagree with it. An unknown code is `NOT_FOUND`
//     at the target, never a silently-minted module.
//   · `statePreserving`. Switching a module does not move the module's machine.
//   · `setBy`, `setAt` and `seq` are STORE-MINTED — `setBy` from the session
//     (C10 §6.2; the dispatcher refuses an actor key in the payload), `setAt`
//     from the clock at the act (the `pinnedAt` discipline).
//
// ⚠️ **A DISPATCHED VERB, NOT A STORE WRITE, for D-1's reason**: switching a
//   module changes what every seat in the platform may do, so "who switched off
//   invoices, when, and why?" must be answerable from the DR-10 trail.
//
// ⚠️ **`module:set` IS A `compliance` ATOM (D2, ruled).** The platform's
//   governance atoms already live there — `role:grant`, `psl:cap-set`,
//   `delivery:policy-set` — for one sentence: the same party cannot both set
//   the bar and be governed by it. `admin` is not offered to a seat, and a
//   governance act should not require it.
//
// ⚠️ **WHAT IT IS NOT: A LOOSENING OF A GOVERNED CHECK.** Switching a module ON
//   widens what the platform will do; OFF narrows it. Neither relaxes a check
//   the two sample-actor locks guard, so those locks are untouched and a sample
//   person may switch modules in the demo (D3). Production requires a real
//   person — `MODULE_SET_NOT_SAMPLE_IN_PROD`, gated on the deployment badge.
//   FOUR-EYES waits for the IdP: two unattributed actors would satisfy any
//   proposer ≠ decider template, so it would be a rule that cannot fail.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const moduleActivationFlow: FlowDefinition = {
  entity: 'moduleActivation',
  version: 1,
  // ONE state. A module does not have a lifecycle — it has a ledger.
  states: ['Governed'],
  initial: 'Governed',
  /** `t_module_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Governed'],
  transitions: [
    {
      id: 't_module_set',
      from: ['Governed'],
      to: 'Governed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'module:set',
      // `phase` is NOT here: a side has no phase, so its requirement is
      // conditional — a POLICY (`MODULE_PHASE_CONSISTENT`), on the
      // `enforcement.reviewBy` reasoning. `parts` is optional: omitted, the
      // module keeps the parts it has.
      requiredFields: ['enabled', 'reason'],
      policyHooks: [
        POLICY_HOOKS.MODULE_KNOWN,
        POLICY_HOOKS.MODULE_PHASE_CONSISTENT,
        POLICY_HOOKS.MODULE_PARTS_KNOWN,
        POLICY_HOOKS.MODULE_REASON_AUTHORED,
        POLICY_HOOKS.MODULE_ACTUALLY_CHANGES,
        POLICY_HOOKS.MODULE_NO_ACTIVE_HARD_DEPENDANTS,
        POLICY_HOOKS.MODULE_DEPENDENCIES_ENABLED,
        POLICY_HOOKS.MODULE_SET_ATTRIBUTED,
        POLICY_HOOKS.MODULE_SET_NOT_SAMPLE_IN_PROD,
      ],
      // INTENDED, not yet built: the admin page that dispatches it is batch M2
      // (Design 5 §A.5.2). `surfaced: true` means a screen is intended, never
      // that one exists (schema.ts) — so M1 is the truthful gap, not a ruling.
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// THE PORTAL-WIDE PSL VALIDITY CAP — P3 · THE SETTING VERB (R2).
//
// A DEGENERATE SINGLE-STATE machine and a STATE-PRESERVING verb, on
// `enforcement.flow.ts`'s shape verb for verb. `pslProjection.ts` named this
// file before it existed: *"The setting VERB (`t_psl_cap_set`, on the
// `t_enforcement_set` pattern) is P3. When it lands, `effectiveCap` gains a
// ledger lookup ahead of this constant and `NO_SETTING_RECORDED` starts meaning
// what it says."*
//
// ── ⚠️ ITS OWN FLOW RATHER THAN A WIDENED `enforcement` ────────────────────
//   `t_enforcement_set`'s payload is `{ mode, setBy }` where `mode` is an
//   `EnforcementMode`. A cap is a NUMBER OF DAYS, not a mode, so riding that
//   verb would mean widening a closed union to carry a different kind of value.
//   `role.flow.ts` is the precedent for what to do instead: mint a new
//   degenerate flow rather than stretch an existing one. Two ledgers, two
//   vocabularies, no union doing double duty.
//
// ── ⚠️ WHY THE CAP IS NOT A STATE — LAW 0.5, THE SAME ARGUMENT ─────────────
//   The setting in force is DERIVED at read from an append-only ledger
//   (`effectiveCap`), never stored as a current-value record. Overwriting would
//   make the history unauditable: you could see which cap bites and never which
//   decision put it there. The entity is THE SETTING ITSELF and it has one
//   state, `Governed`.
//
// ── ⚠️ ONE SETTING KEY, AND `entityId` IS IT ───────────────────────────────
//   There is no `settingId` payload field, so the entity commanded and the
//   setting recorded cannot disagree — `t_enforcement_set`'s rule and
//   `t_role_grant`'s. `readState` answers the single state for the one known
//   key and `null` for anything else, so an unknown key is `NOT_FOUND` rather
//   than a silently created setting.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

// ⚠️ **THE SETTING-ID VOCABULARY LIVES IN THE STORE, NOT HERE, AND THE
// DIRECTION IS THE REASON.** `effectiveCap` (`services/data/pslProjection.ts`)
// must read the key to look the ledger up, and a flow file is in the
// TRANSITIONS layer — so declaring it here would give the data layer a runtime
// edge on the transitions layer for one string. `GovernedCheckId` sits in
// `lib/enforcement.ts` rather than in `enforcement.flow.ts` for exactly this
// reason. See `mock/stores/pslCapSettingStore.ts`.

export const pslCapSettingFlow: FlowDefinition = {
  entity: 'pslCapSetting',
  version: 1,
  // ONE state. A governed setting does not have a lifecycle — it has a LEDGER.
  states: ['Governed'],
  initial: 'Governed',
  /** `t_psl_cap_set` is statePreserving, so nothing ever leaves. The ledger
   *  machine rests here by design — `enforcement`'s own declaration. */
  terminals: ['Governed'],
  transitions: [
    {
      // ⚠️ `days` IS THE DECISION; `setBy` IS THE ATTRIBUTION IT IS RECORDED
      // UNDER. `setAt` is store-assigned and therefore never a payload field —
      // the `pinnedAt` discipline, and here it is also the ledger's ordering
      // key, so a forgeable one would let a caller insert itself ahead of a
      // decision it did not know about.
      //
      // ⚠️ **`psl:cap-set` IS A `compliance` ATOM AND `procurement` MUST NOT
      // HOLD IT.** This is `role:grant`'s ruling transferred, not re-argued:
      // *whoever can edit roles can grant themselves any verb, so procurement
      // cannot hold it.* Whoever sets the portal default can extend the
      // validity of every designation they proposed. Same shape, same lane.
      id: 't_psl_cap_set',
      from: ['Governed'],
      to: 'Governed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'psl:cap-set',
      requiredFields: ['days', 'setBy'],
      policyHooks: [POLICY_HOOKS.PSL_DEFAULT_CAP_WITHIN_CEILING],
      surfaceable: {
        surfaced: false,
        because: 'ruled-unsurfaced',
        why:
          'P3 builds the WRITE PATH and no portal-settings surface exists to ' +
          'host it. The verb is reachable and gated; what is missing is a ' +
          'screen, and declaring `surfaced: true` for an act with no screen ' +
          'is how a truthful backlog turns into a false claim. Raising the ' +
          'settings surface is what changes this value.',
      },
      version: 1,
    },
  ],
};

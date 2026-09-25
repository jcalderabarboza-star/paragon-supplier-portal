// ────────────────────────────────────────────────────────────────────────────
// Delivery drawdown-policy flow — the GOVERNED SETTING, not a lifecycle.
//
// A DEGENERATE SINGLE-STATE machine and a STATE-PRESERVING verb, on the
// `enforcement` pattern and for the same reason that flow gives: **a governed
// setting has no lifecycle; it has a ledger.** An item's drawdown tolerance is
// a value somebody chose, with a who / when / why beside it — `active`,
// `activeChangedBy`, `activeChangedAt`, `activeChangeReason`, all four already
// on the model. The entity is THE ITEM'S GOVERNED TOLERANCE, and it has one
// state: `Governed`.
//
// The entityId is `agreementId#lineSeq`. `readState` answers `Governed` for an
// item that exists and `null` for anything else, so an unknown address is
// `NOT_FOUND` rather than a silently created setting — `enforcementTarget`'s
// shape, verb for verb.
//
// ── ⚠️ THE ATOM IS `compliance`'s, NOT `procurement`'s, AND THIS IS THE
//    `role:grant` / `psl:cap-set` RULING TRANSFERRED ────────────────────────
// Procurement releases the schedules. The drawdown ledger is what FLAGS a
// procurement release that runs past its envelope. **If procurement could also
// set the tolerance, procurement could relax the very check it is measured
// against** — and that is the exact sentence that moved `role:grant` out of the
// procurement bundle (*"whoever can edit roles can grant themselves any verb"*)
// and kept `psl:cap-set` out of it (*"whoever sets the cap can extend every
// designation they proposed"*). The same party cannot both set the bar and be
// governed by it.
//
// `compliance` is where those two landed and it is the right home for a third:
// that lane already decides what a supplier's paperwork must satisfy and rules
// on whether an applicant becomes a supplier at all. A commercial
// over-delivery tolerance is the same kind of authority over the same
// relationship.
//
// ⚠️ **AND IT IS NOT `procurement`'s "obvious candidate" BY OVERSIGHT.** The
// dispatch named procurement as obvious for release / adjust / confirm and
// asked for this one to be argued. It is argued above, and the answer is the
// other lane. **NO ROLE IS MINTED** — one atom joins an existing bundle.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/** The one state a governed tolerance rests in. */
export const DELIVERY_POLICY_STATE = 'Governed';

export const deliveryPolicyFlow: FlowDefinition = {
  entity: 'deliveryPolicy',
  version: 1,
  states: [DELIVERY_POLICY_STATE],
  initial: DELIVERY_POLICY_STATE,
  // One state, and the verb is statePreserving, so nothing ever leaves it. The
  // ledger machine rests here by design (`enforcement`'s PF-0 · D-2 note).
  terminals: [DELIVERY_POLICY_STATE],
  transitions: [
    {
      id: 't_delivery_policy_set',
      from: [DELIVERY_POLICY_STATE],
      to: DELIVERY_POLICY_STATE,
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'delivery:policy-set',
      // `reason` is required UNCONDITIONALLY — a deviation from the contract
      // default must be attributable in words as well as in a name (honesty
      // guard 4). The two knobs are NOT here: `tolerancePct: null` is the legal
      // "unlimited", and `requiredFields` rules on absence, so listing it would
      // refuse the one value it is meant to permit.
      requiredFields: ['reason'],
      policyHooks: [
        POLICY_HOOKS.DELIVERY_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.DELIVERY_POLICY_GOVERNED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Delivery release flow — the SCHEDULE LINE's lifecycle.
//
// ⚠️ **THE LANE HAD WRITES AND NO VERBS, AND THAT IS WHAT THIS CLOSES.** Three
// governed acts — release, adjust, confirm — ran as direct store writes on
// `MockDeliveryService`, gated by ONE predicate (`scope.personaType ===
// 'buyer'`). No atom, no policy hook, no `TransitionEvent`, no actor. The
// lane's own headers said so in plain terms: *"NO command dispatcher, NO
// CommandTarget."* One unaudited click by the default seat released three
// back-dated lines and the supplier mirror immediately read five overdue
// deliveries it had never been asked about.
//
// ── WHY THE SCHEDULE LINE IS THE ENTITY ─────────────────────────────────────
// Because it is the thing that actually has a lifecycle. SAP LPA gives a
// schedule line INTERNAL CHARACTER while it is `draft` — freely adjustable, not
// transmitted — and an explicit release is what makes it a commitment the
// vendor has been given. That is a real state edge (`draft` → `released`), not
// a clock projection, so it is modelled as one. Law 0.5 is untouched: nothing
// here fires on a date.
//
// **The entityId is the `releaseRef`** — `contractId/agreementId/lineSeq/
// releaseSeq`, the portal join-chain the generator has minted since the lane
// was authored, and DELIBERATELY DISTINCT from `sapReleaseNumber` (honesty
// guard 6). So addressing a command mints nothing: the identity already
// existed, and it is ours. There is no `agreementId` or `releaseSeq` payload
// field, so the entity commanded and the row written cannot disagree —
// `t_enforcement_set` and `t_role_grant`'s shape, one lane over.
//
// ⚠️ **AND THE DRAWDOWN POLICY IS NOT IN THIS MACHINE.** A tolerance belongs to
// the ITEM and has no lifecycle — it has a ledger. It is `deliveryPolicy.flow`,
// a degenerate single-state machine on the `enforcement` pattern, for the
// reason that flow states in its own header. Two entities, two machines, the
// `goodsReceipt` / `goodsReceiptLine` and `psl` / `pslCapSetting` precedent.
//
// ── THE ATOMS, AND WHERE THEY SIT ───────────────────────────────────────────
// `delivery:release` · `delivery:adjust` · `delivery:confirm` are all
// `procurement`'s. Transmitting a delivery schedule, adjusting one before it is
// transmitted, and accepting that a delivery drew it down are three moments in
// the life of ONE contractual commitment, and `procurement` already holds every
// contract verb in the tree (`contract:draft` / `:activate` / `:renew` /
// `:terminate`) plus `obligation:track` / `:complete`.
//
// ⚠️ **THE RIVAL READING FOR `delivery:confirm` IS `receiving`'s, AND IT IS
// RECORDED RATHER THAN ARGUED AWAY** (the `inventorydeclaration:declare` house
// style). The dock is who knows whether goods arrived. What decided it the
// other way: a confirm is not an observation of arrival — it accepts an
// INFERRED proximity match as an authoritative drawdown against a commitment,
// and `deliveredQty` on the contract-consumption ledger is what moves. That is
// a category manager's instrument, and `receiving`'s own bundle says *"a dock
// clerk is not a category manager."* The real observation of arrival is
// `gr:receive`, which stays exactly where it is.
//
// ⚠️ **NO ROLE IS MINTED.** Three atoms join an existing bundle; `SystemRoleId`
// is untouched.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/** The two states a schedule line occupies. `draft`/`released` on the model are
 *  lower-case; the transition states are the flow's own vocabulary, mapped by
 *  the target's `readState`. */
export const DELIVERY_LINE_STATES = Object.freeze({
  DRAFT: 'Draft',
  RELEASED: 'Released',
} as const);

export const deliveryReleaseFlow: FlowDefinition = {
  entity: 'deliveryRelease',
  version: 1,
  states: [DELIVERY_LINE_STATES.DRAFT, DELIVERY_LINE_STATES.RELEASED],
  initial: DELIVERY_LINE_STATES.DRAFT,
  // `Released` is terminal: `t_delivery_confirm` is statePreserving, so nothing
  // leaves it. An amendment to a released line is a NEW release document and is
  // deliberately not offered (release.ts states the same rule at the freeze).
  terminals: [DELIVERY_LINE_STATES.RELEASED],
  transitions: [
    {
      // THE HONESTY BOUNDARY. Before it a line is an internal plan; after it, a
      // promise the vendor has been given — and the chase engine pushes on it.
      id: 't_delivery_release',
      from: [DELIVERY_LINE_STATES.DRAFT],
      to: DELIVERY_LINE_STATES.RELEASED,
      trigger: 'user',
      requiredRole: 'delivery:release',
      // NOTHING. The address carries the coordinates and the session carries the
      // actor, so there is no field for a caller to supply — which is also why
      // this verb cannot mint a document number: there is nowhere to put one.
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.DELIVERY_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.DELIVERY_RELEASE_NOT_BACKDATED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **THE LPA ADJUSTABILITY, WHICH IS WHAT LPA WAS CHOSEN FOR, AND WHICH
      // HAD NO DOOR.** `adjustDraftLine` shipped built, freeze-enforced and
      // specced, with ZERO product call sites — the release calendar offered
      // `Release` and nothing else. The design spec chose doc type LPA over LP
      // precisely because *"releases [must be] individually adjustable after
      // generation, which is LPA-only"*, so the capability that motivated the
      // model was unreachable. This is its first entrance.
      //
      // statePreserving: adjusting a draft leaves it a draft. The freeze law is
      // unchanged and still enforced in the pure verb — a released line refuses
      // every adjustment, and `from: ['Draft']` now says so at the schema too,
      // so a released line is `ILLEGAL_TRANSITION` before the pure guard runs.
      id: 't_delivery_adjust',
      from: [DELIVERY_LINE_STATES.DRAFT],
      to: DELIVERY_LINE_STATES.DRAFT,
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'delivery:adjust',
      // ⚠️ **NOT `['plannedQty', 'releaseDate']`, DELIBERATELY.**
      // `requiredFields` rules on ABSENCE unconditionally, and an adjustment
      // legitimately carries EITHER knob alone. "At least one of" is a policy,
      // and it lives in `DELIVERY_ADJUST_PATCH_VALID` beside the bounds it is
      // checked with — `t_enforcement_set`'s `reviewBy` reasoning, verbatim.
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.DELIVERY_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.DELIVERY_ADJUST_PATCH_VALID,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Accept an INFERRED proximity match as an authoritative drawdown. A
      // PORTAL record, never a goods receipt — `fulfilledDate` (the SAP posting
      // date) is not written here and never will be by this portal.
      id: 't_delivery_confirm',
      from: [DELIVERY_LINE_STATES.RELEASED],
      to: DELIVERY_LINE_STATES.RELEASED,
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'delivery:confirm',
      // The accepted `(ref, qty)` is DERIVED from the shipment pool, never
      // supplied: a caller who could state the quantity could state one the
      // surface never showed, and `deliveredQty` is a governed total.
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.DELIVERY_ACTOR_ATTRIBUTED,
        POLICY_HOOKS.DELIVERY_CONFIRM_HAS_MATCH,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

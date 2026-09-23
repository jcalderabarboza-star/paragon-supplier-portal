// ────────────────────────────────────────────────────────────────────────────
// THE PREFERRED SUPPLIER LIST — P3 · THE GOVERNANCE VERBS.
//
// P1 shipped the record and its projection and said so in its own header:
// *"P1 IS READ-ONLY DATA PLUS SURFACES. THERE IS NO VERB HERE."* This file is
// the machine that sentence was waiting for, and **its target ships in the same
// commit** (the standing rule: the target-less set is a real population and
// every member is a machine whose verbs cannot fire).
//
// ── ⚠️ FOUR LIFECYCLES, AND `Under Review` IS REFUSED (operator ruling) ─────
//   `supplierApplication` and `materialRequest` both earn a `Under Review`
//   state on one ground: *"with two states, 'nobody has looked at this yet' and
//   'somebody is looking at it' are the same row"* — the question a queue of
//   EXTERNAL submissions exists to answer. **A PSL proposal is raised by
//   procurement FOR compliance**; there is no pile of arrivals and no such
//   question, so `PSL_LIFECYCLES` stays frozen at four and this machine has no
//   start-review edge. The precedent was re-derived rather than copied.
//
// ── ⚠️ FOUR STATE EDGES AND FOUR `statePreserving` APPENDS ─────────────────
//   Real transitions: propose (birth) · grant · reject · withdraw. They are the
//   only four the frozen union can express.
//
//   Appends on `Listed`: change status · renew · publish · cap override. The
//   policy's own sentence is *"status is dynamic: suppliers move between
//   statuses over time"*, and making a DESIGNATION into a state would put a
//   value in the lifecycle and multiply the union by three. `statusHistory`
//   already carries `from` and `to` designations precisely so it does not have
//   to. The precedent set is small and real — derived: `t_rfq_fx_pin`,
//   `t_enforcement_set`, `t_role_grant`, and now these four.
//
//   ⚠️ **AND `expectedState` PROTECTS NONE OF THEM, WHICH IS STATED HERE SO NO
//   LATER SPEC ASSERTS A REFUSAL THAT CANNOT HAPPEN.** The optional
//   compare-and-set was dispatched as catching the `statePreserving` cases and
//   MEASURED to be blind to exactly those (§87). Two seats changing a
//   designation concurrently both succeed and the ledger records both.
//
// ── ⚠️ PUBLICATION IS AN APPEND, NEVER A STATE, AND NEVER UNDONE ───────────
//   `pslListing.ts` ruled it a FIELD PAIR so "published and expired" and "in
//   force and unpublished" are both expressible; a lifecycle member would
//   collapse the two axes at the type level. So `t_psl_publish` is
//   `statePreserving` and writes `publishedAt` / `publishedBy` and nothing else.
//
//   **`from: ['Listed']` ties publication to the LIFECYCLE, never to the
//   clock** — which is exactly how R5's independence survives. A `Proposed`
//   listing cannot be published (nothing has been decided to disclose); a
//   listing whose validity has lapsed still can, because `Expired` is a
//   projection and the stored lifecycle is still `Listed`.
//
//   ⚠️ **OPERATOR RULING (c), RECORDED AT THE VERB BECAUSE THIS IS WHERE A
//   READER WILL LOOK FOR IT: ONCE PUBLISHED, THE SUPPLIER SEES THE CURRENT
//   STATUS.** The team controls the FIRST disclosure; after that the truth
//   propagates. So a status change does NOT re-require publication and does NOT
//   touch `publishedAt` — and there is therefore **no "published but stale"
//   condition to represent**, which is why no freshness projection exists. A
//   buyer surface shows Published / Internal and nothing may imply the supplier
//   is looking at an older designation.
//
//   ⚠️ **AND THERE IS NO UNPUBLISH VERB (ruling b).** `publishedAt` is
//   write-once history: it records that the supplier was told, and un-telling
//   is not a thing that happens. A listing that must stop is WITHDRAWN. Every
//   comparable fact here is write-once — the enforcement ledger appends,
//   `statusHistory` appends, `SupplierDocument`'s refusal triple is never
//   un-set — and an unpublish would also turn `isPublished` from a fact about
//   history into a fact about the present under the same name.
//
// ── ⚠️ BOTH ENDINGS TERMINAL — RE-DERIVED, NOT COPIED (ruling f) ───────────
//   `supplierApplication` rests its terminals on two limbs, and only one
//   transfers:
//     · **limb 1 — "no slot persists"** DOES NOT TRANSFER. A listing is a grant
//       over a `(supplier × scope)` pair and the pair survives withdrawal. The
//       policy's own sentence is that suppliers MOVE between statuses.
//     · **limb 2 — "no re-submitter holds a verb"** TRANSFERS EXACTLY. Every
//       atom below is buyer-side; no supplier seat can reach this machine.
//   And there is a third consideration neither precedent had, pointing the
//   OTHER way: `statusHistory` is per-row, so a return raised as a new record
//   splits one supplier-scope's history across two rows.
//
//   **Segregation decides it.** A `Withdrawn → Listed` edge would be a cheaper
//   route to a designation than propose/grant — and it would be held entirely
//   by `psl:decide`, the lane that already decides. A return goes back through
//   `t_psl_propose`, which is the segregated path. Continuity is recovered on
//   the surface by grouping a supplier's listings by scope, not in the machine.
//
// ── ⚠️ THE LANES, AND WHAT THEY DO NOT BUY ─────────────────────────────────
//   `psl:propose` / `psl:publish` → `procurement`; `psl:decide` /
//   `psl:cap-set` → `compliance`. No lane holds both the proposing and the
//   deciding of one listing, and **no role is minted** — every atom below is
//   asserted ∈ `catalogRoles()` and ∈ some bundle, bilaterally.
//
//   **The default buyer seat holds ALL SIX buyer lanes** (derived:
//   `SEEDED_SEAT_ROLES.buyer`), so out of the box one seat holds both ends.
//   That is §76d in a third lane. The queue page keeps proposing and deciding
//   out of one panel; that is a SURFACE mitigation and it is not enforcement.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * What a proposal must carry. Deliberately SHORT, and every member is a fact
 * about the DESIGNATION rather than about the decision.
 *
 * ⚠️ **`status` IS HERE AND IS ALSO CHECKED FOR MEMBERSHIP BY A HOOK.**
 * `requiredFields` proves PRESENCE only, so an off-list token would reach
 * `create` and be stored as a designation nothing recognises — the
 * `QUOTATION_SUBMIT_CURRENCY_PERMITTED` lesson, and the third lane to learn it.
 *
 * ⚠️ **`validUntil` IS REQUIRED AND IS NOT CHECKED AGAINST THE CLOCK.** A
 * verb that refused a validity already in the past would be a clock test inside
 * a transition, which law 0.5 forbids and which the policy does not ask for: a
 * governance team loading an existing list into Paragon on day one is recording
 * designations that already ran, and that is a BACKFILL rather than a defect.
 * The ledger `at` says when Paragon learned of it; `validFrom`/`validUntil` say
 * when it applies. They are different axes and they are legitimately different.
 */
export const PSL_PROPOSE_FIELDS = Object.freeze([
  'supplierId',
  'materialCodes',
  'status',
  'validFrom',
  'validUntil',
  'justification',
  'reason',
] as const);

export const pslFlow: FlowDefinition = {
  entity: 'psl',
  version: 1,
  states: ['Proposed', 'Listed', 'Withdrawn', 'Rejected'],
  initial: 'Proposed',
  /** See the header — re-derived, and segregation is what decides it. */
  terminals: ['Withdrawn', 'Rejected'],
  transitions: [
    {
      // The listing comes into existence. ONE birth edge: a half-typed proposal
      // is not a fact about the world, and there is no `Draft` for the same
      // reason `supplierApplication` has none.
      id: 't_psl_propose',
      from: [],
      to: 'Proposed',
      trigger: 'creation',
      requiredRole: 'psl:propose',
      requiredFields: [...PSL_PROPOSE_FIELDS],
      policyHooks: [
        POLICY_HOOKS.PSL_SUPPLIER_RESOLVED,
        POLICY_HOOKS.PSL_SCOPE_WELL_FORMED,
        POLICY_HOOKS.PSL_STATUS_KNOWN,
        POLICY_HOOKS.PSL_VALIDITY_ORDERED,
        POLICY_HOOKS.PSL_JUSTIFICATION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ THE GRANT. It writes `decidedBy` and appends a ledger entry whose
      // `from === to` and whose `lifecycle` advances — which is the shape the
      // P1 corpus already authored (`psl-001`'s second entry). A verb that
      // appended only on a DESIGNATION change would leave this step unrecorded.
      id: 't_psl_grant',
      from: ['Proposed'],
      to: 'Listed',
      trigger: 'user',
      requiredRole: 'psl:decide',
      requiredFields: ['reason'],
      policyHooks: [
        POLICY_HOOKS.PSL_DECIDER_NOT_PROPOSER,
        POLICY_HOOKS.PSL_RESTRICTIVE_STATUS_APPROVED,
        POLICY_HOOKS.PSL_DECISION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ `reason` IS REQUIRED, and the hook is what makes "required" mean
      // somebody wrote something — the dispatcher's emptiness check admits a
      // string of spaces. The reader is the next person to propose this
      // supplier for this scope, and it is the only account of the refusal
      // anybody will have.
      id: 't_psl_reject',
      from: ['Proposed'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'psl:decide',
      requiredFields: ['reason'],
      policyHooks: [
        POLICY_HOOKS.PSL_DECIDER_NOT_PROPOSER,
        POLICY_HOOKS.PSL_DECISION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ THE POLICY'S "STATUS IS DYNAMIC" CLAUSE, AS AN APPEND. `from === to`
      // is refused by a hook: a change that changes nothing is a ledger entry
      // with no subject, and it would let a seat manufacture an audit trail.
      id: 't_psl_change_status',
      from: ['Listed'],
      to: 'Listed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'psl:decide',
      requiredFields: ['status', 'reason'],
      policyHooks: [
        POLICY_HOOKS.PSL_STATUS_KNOWN,
        POLICY_HOOKS.PSL_STATUS_ACTUALLY_CHANGES,
        POLICY_HOOKS.PSL_RESTRICTIVE_STATUS_APPROVED,
        POLICY_HOOKS.PSL_DECISION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ RENEW CARRIES THE LEAD CHECK (ruling e). Extending an exemption is
      // granting one: `Mandatory` and `Sole Source` suspend competitive bidding
      // and a renewal suspends it for another term.
      //
      // ⚠️ **AND AN OVER-CAP RENEWAL IS REFUSED AT THE VERB, NEVER SILENTLY
      // BOUNDED AT READ** (ruling e). `effectiveValidUntil` would clamp it
      // quietly, so a person would record a two-year renewal, the record would
      // show two years, and the surface would show one. A governance bound that
      // only ever appears in a projection is a bound the decider never meets.
      id: 't_psl_renew',
      from: ['Listed'],
      to: 'Listed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'psl:decide',
      requiredFields: ['validUntil', 'reason'],
      policyHooks: [
        POLICY_HOOKS.PSL_RENEWAL_EXTENDS,
        POLICY_HOOKS.PSL_RENEWAL_WITHIN_CAP,
        POLICY_HOOKS.PSL_RESTRICTIVE_STATUS_APPROVED,
        POLICY_HOOKS.PSL_DECISION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // A designation that is stopped rather than allowed to run out. Terminal.
      id: 't_psl_withdraw',
      from: ['Listed'],
      to: 'Withdrawn',
      trigger: 'user',
      requiredRole: 'psl:decide',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.PSL_DECISION_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ THE DISCLOSURE. See the header for ruling (b) and ruling (c).
      //
      // It appends NO `statusHistory` entry, and that is forced rather than
      // chosen: `PslStatusChange` requires a `to: PslStatus` and a
      // `lifecycle: PslLifecycle`, and a publication is neither. Writing a
      // no-op designation entry to record a disclosure would put a second KIND
      // of fact in a ledger typed for one — and `publishedAt` already IS the
      // record.
      //
      // `requiredFields` is empty because both fields it writes are forbidden
      // to a caller: `publishedAt` is store-assigned (the `pinnedAt` discipline
      // — a caller that could set it could backdate a disclosure) and
      // `publishedBy` comes from the SESSION (C10 §6.2).
      id: 't_psl_publish',
      from: ['Listed'],
      to: 'Listed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'psl:publish',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.PSL_NOT_ALREADY_PUBLISHED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ THE PER-LISTING CAP OVERRIDE — A DEDICATED VERB (ruling d), not
      // payload fields on propose or grant. Three reasons, and the third is the
      // governing one:
      //   · the four cap fields must travel together, and one verb writing all
      //     four is that co-presence by construction rather than by assertion;
      //   · `capDecidedBy` is ALREADY a separate field from `decidedBy`, so the
      //     record anticipates a different decider;
      //   · folding it into `propose` would let the proposer set the override
      //     and the grant rubber-stamp it, which is what R3's *"exactly like
      //     granting the status"* exists to prevent.
      //
      // `capDecidedAt` is store-assigned and `capDecidedBy` comes from the
      // session, so neither is a payload field — the same rule as publish.
      id: 't_psl_cap_override',
      from: ['Listed'],
      to: 'Listed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'psl:cap-set',
      requiredFields: ['capDaysOverride', 'capJustification'],
      policyHooks: [
        POLICY_HOOKS.PSL_CAP_WITHIN_CEILING,
        POLICY_HOOKS.PSL_CAP_JUSTIFICATION_AUTHORED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

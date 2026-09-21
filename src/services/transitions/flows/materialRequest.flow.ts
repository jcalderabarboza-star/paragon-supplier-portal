// ────────────────────────────────────────────────────────────────────────────
// R8 · MATERIAL-REQUEST FLOW. **WIRED IN THE SAME COMMIT AS THIS FILE.**
//
// The machine behind asking for a material the master does not carry. A buyer
// discovers the gap — almost always at the RFQ wizard's material step — somebody
// picks the request up, and somebody decides it.
//
// ── ⚠️ WHAT THIS LANE DOES NOT DO, STATED FIRST BECAUSE IT IS THE DESIGN ─────
//
//   It mints NO material code. It writes NOTHING to the catalog. It changes NO
//   RFQ. It enforces NO four-eyes (typed for, not built — see the hook).
//
//   `t_materialrequest_approve` records a DECISION and nothing else, on
//   `t_application_approve`'s ruling word for word: *"creating the vendor master
//   record is S/4HANA's act (C10 §1), and a cascade from here into a supplier
//   row would be this platform inventing master data it does not own."* Swap
//   "vendor" for "material" and the sentence is unchanged. **The consumer is
//   named and the edge is not built.**
//
// ── ⚠️ NO `Draft` STATE, AND IT IS THE PRECEDENT'S RULING, NOT A COPY OF IT ──
//
//   The wizard and the page are the draft. `supplierApplication`'s ground holds
//   exactly: *"a half-filled form is not a fact about the world — and a `Draft`
//   state here would be a row in a store claiming otherwise, reviewable by a
//   buyer who would be reading somebody's abandoned typing."* It covers the
//   wizard's MARKED-BUT-UNDISPATCHED request too: marking is wizard-local
//   `useState`, and the entity is born only when `t_rfq_create` has returned and
//   the request is actually dispatched.
//
// ── ⚠️ BOTH ENDINGS TERMINAL — AND HALF THE PRECEDENT'S ARGUMENT IS FALSE HERE,
//     WHICH IS WHY THE CONCLUSION IS RE-DERIVED RATHER THAN INHERITED ─────────
//
//   `supplierApplication` refuses an edge out of `Rejected` on TWO grounds:
//
//     (1) "There is no slot: an application is a submission, not a container."
//     (2) "And there is no re-submitter: the applicant holds NO VERB AT ALL on
//          this machine — every atom is buyer-side."
//
//   ⚠️ **(2) IS FALSE HERE AND MUST NOT BE CITED.** A material requester is a
//   BUYER WITH A SEAT, holding `materialrequest:submit` — the exact opposite of
//   an applicant, who has no seat, no login and no way to check. A design
//   resting on (2) would be resting on a mechanism this lane measures false.
//
//   **(1) SURVIVES INTACT, AND IT IS SUFFICIENT.** A request is a submission,
//   not a container: no requested slot persists for a verb to refill. So a
//   refused request stays exactly as it was decided, a second attempt is a
//   second request born through the same birth edge, and the master-data team's
//   refusal reasons stay COUNTABLE rather than overwritten. That is a record,
//   not a dead end.
//
// ── ⚠️ THE TWO AUTHORITIES ARE IN DIFFERENT LANES, AND THE LIMIT IS STATED ───
//
//   Derived: `materialrequest:submit` ∈ `procurement` (the lane holding
//   `rfq:create`, inside whose reach the wizard entrance sits);
//   `materialrequest:review` + `:decide` ∈ `planning` (operator ruling — a
//   material request is a MASTER-DATA question, and `planning` is the only lane
//   whose subject matter that is; `compliance` is the tidier review-and-decide
//   precedent but owns certificates and documents, not material identity).
//
//   ⚠️ **AND THE LIMIT, MEASURED RATHER THAN INFERRED: THE DEFAULT BUYER SEAT
//   HOLDS ALL SIX LANE BUNDLES, SO TODAY ONE SEAT CAN RAISE A REQUEST AND DECIDE
//   IT.** The atoms sitting in different lanes is what makes NARROWING POSSIBLE,
//   not what makes segregation true. `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` is
//   an OPEN finding about exactly that shape, and this lane does not add a
//   second instance of it in its SURFACE: the page gates per verb from each
//   verb's own atom, never page-wide, so a seat holding `:review` and not
//   `:decide` sees the review act live and a notice on both decisions.
//
// ── ⚠️ `:review` AND `:decide` TOGETHER IS NOT THE PROBLEM `:submit` AVOIDS ──
//
//   Picking a request up and ruling on it are ONE authority split across two
//   states so the queue can answer *"has anybody started?"*; raising a request
//   and ruling on it are TWO authorities. `supplierdoc:verify`/`:reject` and
//   `application:review`/`:decide` sit together for the same reason and on the
//   same argument.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * What every birth must carry. Deliberately SHORT, and `requiredFields` proves
 * PRESENCE only — membership and substance are the hooks' job.
 *
 * ⚠️ **`raisedFromRfqId`, `specification` AND `expectedUom` ARE NOT HERE, AND
 * THAT IS THE POINT.** All three are legitimately absent on a standalone
 * request, and `requiredFields` is a flat per-verb list with no way to say
 * *"required when"* — putting `raisedFromRfqId` here would refuse every request
 * raised from the standalone page. The CONDITIONAL obligation on it lives in
 * `MATERIALREQUEST_RFQ_RESOLVED`, which is the only layer that can express one
 * and check the value at once (`APPLICATION_INTERNAL_VENDOR_RESOLVED`'s shape,
 * for its measured reason).
 */
export const MATERIAL_REQUEST_BIRTH_FIELDS = Object.freeze([
  'requestedLabel',
  'category',
  'need',
] as const);

export const materialRequestFlow: FlowDefinition = {
  entity: 'materialRequest',
  version: 1,
  states: ['Submitted', 'Under Review', 'Approved', 'Rejected'],
  initial: 'Submitted',
  /** See the header — both endings are real endings, on ground (1) alone. */
  terminals: ['Approved', 'Rejected'],
  transitions: [
    {
      // The request comes into existence. One birth edge: there is no
      // half-request, and a marked-but-undispatched wizard offer is not a fact.
      id: 't_materialrequest_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'materialrequest:submit',
      requiredFields: [...MATERIAL_REQUEST_BIRTH_FIELDS],
      policyHooks: [
        POLICY_HOOKS.MATERIALREQUEST_CATEGORY_KNOWN,
        POLICY_HOOKS.MATERIALREQUEST_NEED_AUTHORED,
        POLICY_HOOKS.MATERIALREQUEST_RFQ_RESOLVED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **A SEPARATE EDGE RATHER THAN AN IMPLICIT ONE, AND IT EARNS ITS
      // STATE.** With two states, "nobody has looked at this yet" and "somebody
      // is looking at it" are the same row — and the question a master-data
      // queue exists to answer is which requests are waiting on a person who
      // has not started. `t_application_start_review`'s ground, unchanged.
      id: 't_materialrequest_start_review',
      from: ['Submitted'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'materialrequest:review',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.MATERIALREQUEST_DECIDER_NOT_REQUESTER],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **APPROVAL IS TERMINAL AND MINTS NOTHING.** It records that the
      // request was accepted for creation in SAP. It does not create the
      // material, does not write a code anywhere, and does not touch the
      // catalog — the portal cannot: `MATERIAL_MASTER` is a frozen fixture with
      // no write path and S/4 owns material identity.
      //
      // ⚠️ **AND THERE IS NO `justification` FIELD ON THIS EDGE, DELIBERATELY.**
      // A refusal REQUIRES authored text because it is the only account of the
      // decision anybody will have; an approval does not, and
      // `BuyerSupplierApplications`' ruling is why it is not given a box
      // anyway: *"a field nobody must fill is a field somebody will."*
      id: 't_materialrequest_approve',
      from: ['Under Review'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'materialrequest:decide',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.MATERIALREQUEST_DECIDER_NOT_REQUESTER],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ `justification` IS REQUIRED, and the hook is what makes "required"
      // mean somebody wrote something — the dispatcher's emptiness check admits
      // a string of spaces. Fifth instance of that guard in this tree.
      //
      // The reader is closer than the application lane's (a requester has a
      // seat and can read the refusal themselves), which makes the text MORE
      // load-bearing rather than less: it is the one thing that tells a buyer
      // whether to re-request with a better description or stop asking.
      id: 't_materialrequest_reject',
      from: ['Under Review'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'materialrequest:decide',
      requiredFields: ['justification'],
      policyHooks: [
        POLICY_HOOKS.MATERIALREQUEST_REFUSAL_AUTHORED,
        POLICY_HOOKS.MATERIALREQUEST_DECIDER_NOT_REQUESTER,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

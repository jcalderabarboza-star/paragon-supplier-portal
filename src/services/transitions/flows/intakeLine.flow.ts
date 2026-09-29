// ────────────────────────────────────────────────────────────────────────────
// Intake-line flow (A2 / Design 1 B2). **WIRED IN THE SAME PR AS THIS FILE.**
//
// The machine behind the planner's triage of an inbound requirement line. A
// producer — the internal Grid or SOMO — emits a line; a planner dismisses it,
// restores it, or commits it into the sourcing workload.
//
// ── ⚠️ WHY THIS MACHINE EXISTS, AND ALL FOUR GROUNDS WERE MEASURED ───────────
//
// 1. **Triage was `useState`.** `IntakeReview` held its dismissals in a
//    `ReadonlySet<string>` behind a label reading *"this session only · not
//    persisted"* — honest, and honest about the wrong thing: a planner setting
//    a line aside had made a DECISION, and nothing anywhere recorded it. A
//    colleague opening the same queue saw the line back in the pile.
//
// 2. **The same line was pushable more than once.** Accept → reload → the row
//    is PLANNED again with its requisition still in the store. Three Drafts for
//    one requirement was one click away, with no transport and no redelivery
//    involved (C7-FIND-05). A `Committed` terminal refuses the second by
//    LEGALITY; the cascade's `idempotencyKey` refuses it by REPLAY. Both,
//    because they fail in different directions — see the commit edge.
//
// 3. **The override reason evaporated at the store.** The drawer refused to
//    dispatch without one (`overrideBlocked`, load-bearing), the payload
//    carried it, and `purchaseRequisitionTarget.create` read neither it nor the
//    line it came from. The reason rode the DR-10 event, **and no surface in
//    this tree renders an event** (C7-FIND-02).
//
// 4. **Two surfaces pushed different quantities for one requirement.** Intake
//    Review's *Accept* pushed `suggestedQty`; the drawer pre-filled
//    `acceptedQty` and demanded a justification for the gap. One line, two
//    numbers, and the path that looked more governed was the one charging a
//    human for an act they did not commit (C6 §8.3 Amendment 1 / A1-R2).
//
// ── ⚠️ THERE IS NO `t_intake_adjust`, AND THAT IS C6-LOCK VERBATIM ───────────
//
// An adjusted quantity that has not been committed is a **PLANNED overlay and
// nothing else** — it is not a fact about the world, so no verb records it.
// **Push is the only exit from PLANNED** (C6 §3), and here that exit is
// `t_intake_commit`. A seat that types 4,200 and walks away has changed
// nothing, which is the correct answer and the reason the overlay is never
// merged into a seam row.
//
// ── ⚠️ THE BASELINE IS THE PRODUCER'S `acceptedQty`, NEVER `suggestedQty` ────
//
// Operator ruling A1-R2 (C6 §8.3 Amendment 1). A SOMO line can arrive already
// adjusted by its producer — `pil-somo-002` is 5,000 suggested against 4,500
// accepted. That delta is SOMO's act: it is SHOWN, read-only, and never charged
// to the planner. So a commit at 4,500 needs no reason and carries no decision;
// a reason becomes mandatory the moment the planner leaves 4,500.
// `INTAKE_OVERRIDE_REASONED` reads the line through `ctx.target.readEntity` and
// compares against that baseline, which is why the gate cannot be satisfied by
// a caller asserting what the baseline was.
//
// ── ⚠️ NO CREATION EDGE — `Pending` IS THE BORN STATE ────────────────────────
//
// The line already exists when Paragon first sees it: a producer emitted it.
// Minting a birth verb would be this platform claiming to author a requirement
// it received, and it would need a caller — there is none. `complianceFlow`'s
// `Missing` is the precedent: a natural born-state, reached by existing rather
// than by acting.
//
// ── ⚠️ ONE ATOM ON ALL THREE VERBS, AND IT IS NOT LAZINESS ───────────────────
//
// `pr:create` (the `requisitioner` lane). Every one of these three acts decides
// whether a requirement enters the sourcing workload, and dismissing a line is
// exactly as consequential as committing it — the requirement disappears from
// the queue either way. A separate `intake:triage` atom would say the two
// decisions belong to different people, which is a claim about Paragon's
// organisation that nobody has made and that `SYSTEM_ROLES` would then have to
// place. Deriving the reverse is cheap if it is ever wanted; minting the
// vocabulary first is not.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * The three triage states. Exported because the store, the target and the read
 * seam all need the union, and a second spelling of it is the copy that drifts.
 */
export const INTAKE_LINE_STATES = Object.freeze([
  'Pending',
  'Dismissed',
  'Committed',
] as const);

export type IntakeLineState = (typeof INTAKE_LINE_STATES)[number];

/** True when `v` is one of the three triage states — used by the store's read. */
export function isIntakeLineState(v: unknown): v is IntakeLineState {
  return typeof v === 'string' && (INTAKE_LINE_STATES as readonly string[]).includes(v);
}

/**
 * What a commit must carry.
 *
 * ⚠️ **BOTH THE NUMBER AND THE TEXT THE HUMAN TYPED, AND THE PAIR IS THE
 * POINT.** `acceptedQty` is what will be committed; `acceptedQtyRaw` is the
 * token the planner actually entered. `INTAKE_QTY_AGREES` re-parses the raw
 * through the ONE legal parser (`normalizeQty`) and refuses unless it lands
 * exactly on the number — so a caller cannot send `4.5` as the raw and `4500`
 * as the value, which is precisely the shape the `type="number"` defect
 * produced on this very field (an Indonesian buyer's "4.500" read as 4.5).
 *
 * ⚠️ **`overrideReason` IS NOT HERE, AND ITS ABSENCE IS THE POINT.**
 * `requiredFields` is a flat per-verb list with no way to say *"required
 * when"*, and a reason is owed only when the planner moves the number off the
 * producer's baseline. Requiring it here would refuse every accept-as-delivered
 * — the majority path. It lives in `INTAKE_OVERRIDE_REASONED`, the only layer
 * that can express a conditional obligation and check the value at once. Same
 * shape, same reason, as `supplierApplication`'s `s4Vendor`.
 */
export const INTAKE_COMMIT_FIELDS = Object.freeze([
  'acceptedQty',
  'acceptedQtyRaw',
] as const);

export const intakeLineFlow: FlowDefinition = {
  entity: 'intakeLine',
  version: 1,
  states: [...INTAKE_LINE_STATES],
  initial: 'Pending',
  /**
   * ⚠️ **`Committed` IS TERMINAL AND `Dismissed` IS NOT, AND THE ASYMMETRY IS
   * THE WHOLE IDEMPOTENCY ARGUMENT.**
   *
   * A commit minted a requisition. There is no verb on this machine that can
   * un-mint one, and an edge out of `Committed` would be a planner editing the
   * record of an act whose consequence already exists somewhere else — the PR
   * has its own lifecycle, with its own reject and revise verbs, and that is
   * where a changed mind belongs.
   *
   * A dismissal produced nothing, so it costs nothing to reverse, and a
   * terminal `Dismissed` would be the dead-end shape: a planner who set a line
   * aside by mistake would have no way back and no record of why they could
   * not. `t_intake_restore` is that way back.
   */
  terminals: ['Committed'],
  transitions: [
    {
      // Set aside. The line stays in the set — it is never removed — so the
      // queue can still answer *what did we decline, and is it still declined?*
      id: 't_intake_dismiss',
      from: ['Pending'],
      to: 'Dismissed',
      trigger: 'user',
      requiredRole: 'pr:create',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The exact inverse, and the only edge out of `Dismissed`.
      id: 't_intake_restore',
      from: ['Dismissed'],
      to: 'Pending',
      trigger: 'user',
      requiredRole: 'pr:create',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **THE ONE EXIT FROM PLANNED, AND IT IS GUARDED TWICE AGAINST A
      // SECOND REQUISITION — BY LEGALITY AND BY REPLAY.**
      //
      // They are not redundant, because they answer different callers.
      // LEGALITY (`from: ['Pending']`) refuses a HUMAN pressing commit twice,
      // and refusing is the right answer there: a person who clicked twice must
      // be TOLD the second click did nothing. REPLAY (the cascade's
      // `idempotencyKey`, = this line's id) answers a TRANSPORT that never
      // intended a second act — F2's Event Mesh is at-least-once — and returns
      // the FIRST result rather than a refusal, because the correct response of
      // an at-least-once transport to a failure is to redeliver, so refusing a
      // replay converts one duplicate into an unbounded retry loop.
      //
      // **One intake line → at most one requisition** is therefore true under
      // both readings, and `intakeCommitIdempotency.test.ts` names which
      // mechanism answered in each direction rather than asserting only that
      // the count is one.
      id: 't_intake_commit',
      from: ['Pending'],
      to: 'Committed',
      trigger: 'user',
      requiredRole: 'pr:create',
      requiredFields: [...INTAKE_COMMIT_FIELDS],
      policyHooks: [
        POLICY_HOOKS.INTAKE_QTY_FLOOR,
        POLICY_HOOKS.INTAKE_QTY_AGREES,
        POLICY_HOOKS.INTAKE_OVERRIDE_REASONED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};

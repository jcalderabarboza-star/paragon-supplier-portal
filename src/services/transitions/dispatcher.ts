// ────────────────────────────────────────────────────────────────────────────
// Dispatcher (v2.2 Step 3.4 + 3.5) — the single command validator/executor.
//
// One dispatcher for every command. It validates, in order:
//   1. transition exists (in the registry) and entity has a command target,
//   2. QueryScope on EVERY command exactly as reads — a supplier can only
//      command its own entity, else DataError(SCOPE_DENIED); missing entity ⇒
//      DataError(NOT_FOUND) (DR-6 amended),
//   3. requiredRole ∈ the scope's roles (Step 3.7),
//   4. transition legality (currentState ∈ transition.from, unless creation),
//   5. requiredFields present & non-empty in the payload,
//   6. policyHooks (resolved by registered name) all pass.
// Then it applies the store mutation and emits ONE event (Step 3.8). SAP-boundary
// transitions resolve as `submitted` and settle later (Step 3.5).
//
// Hard authorization failures throw DataError (same channel as reads). Domain
// rejections resolve as `status: 'failed'` with a reason and a `failed` event —
// every outcome is auditable.
//
// This module is framework-agnostic: dependencies (roles, targets, hooks, sink,
// id/clock) are INJECTED, so the mock and the Phase-3 real adapter share it.
// ────────────────────────────────────────────────────────────────────────────

import { DataError } from '../data/types';
import type {
  QueryScope,
  CommandInput,
  CommandResult,
  CommandStatus,
  CommandOutcome,
} from '../data/types';
import type { CommandDecision } from '../data/types';
import type { ActorAttribution } from '../../lib/enforcement';
import type { AuditSink } from './events';
import { actorKey } from './events';
import { AUTOMATION_ROLE } from './businessRoles';
import { getTransition } from './registry';
import { refusal } from './refusals';
import { classifySettleFault, settleFault, settleFaultDetail } from './settleFaults';

/**
 * A per-entity adapter the dispatcher reads/writes through.
 *
 * The first four members serve NON-creation transitions (the entity exists).
 * The last two serve `creation` transitions and are the CANONICAL creation
 * pattern (see `advanceShipNotice.flow.ts`): the entity does not exist yet, so
 * scope is derived from the payload's PARENT (`creationOwner`) rather than an
 * existing owner, and `create` mints the new entity + returns its assigned id.
 */
export interface CommandTarget {
  /** Current transition-state, or null if the entity does not exist. */
  readState(entityId: string): string | null;
  /** Owning supplierId for scope enforcement, or null (buyer-only entity). */
  readScopeOwner(entityId: string): string | null;
  /** Full entity for policy hooks to inspect, or null. */
  readEntity(entityId: string): unknown;
  /**
   * Apply the target state + any payload effects (store mutation).
   *
   * ⚠️ **`scope` IS THE FOURTH PARAMETER BECAUSE ATTRIBUTION MAY NOT TRAVEL IN
   * THE PAYLOAD (C10 §6.2).** A target that must record WHO acted — the PR
   * approval is the first — needs the SESSION's actor, and the only alternative
   * was a caller-supplied payload field. That is `setBy`'s shape, which §6.2
   * names as ATTRIBUTION BY ASSERTION and permits only because nothing can
   * construct a `RESOLVED` actor yet. Reproducing it on a second verb would
   * have doubled the seam that has to be closed before the first resolved
   * record exists. Every existing target ignores the parameter.
   */
  applyTransition(
    entityId: string,
    toState: string,
    payload: Record<string, unknown>,
    scope: QueryScope,
  ): void;
  /**
   * Creation scope: the intended owner derived from the payload's parent
   * (e.g. `poReference` → the PO's supplierId). A supplier may create only when
   * this equals its own id (SCOPE_DENIED otherwise) — QueryScope on a creation
   * command, exactly as reads. Required on targets with creation transitions.
   */
  creationOwner?(payload: Record<string, unknown>): string | null;
  /**
   * Opt-in (C4b): when `true`, the dispatcher enforces `creationOwner(payload)
   * !== null` for EVERY persona — a BUYER included — so a buyer creation is
   * validated against a governed relationship anchor, not merely the caller's
   * word. A buyer creation whose owner the governed data cannot name is denied
   * (SCOPE_DENIED), which stops a planner minting an entity for a supplier the
   * world never names. Absent/`false` ⇒ EXACTLY today's behaviour: a buyer
   * passes creation-scope even with a null owner (the RFQ / PR buyer-verb
   * pattern), while the supplier `owner === scope.supplierId` check is
   * unaffected either way (it already requires a non-null owner).
   */
  requireCreationOwner?: boolean;
  /**
   * Creation apply: mint the entity in `toState`; return its assigned id.
   *
   * ⚠️ **`scope` IS THE THIRD PARAMETER FOR `applyTransition`'S REASON, AND IT
   * ARRIVED ONE VERB LATER (§82).** A creation that must record WHO acted needs
   * the SESSION's actor, and the only alternative is a caller-supplied payload
   * field — `setBy`'s shape, which C10 §6.2 names ATTRIBUTION BY ASSERTION and
   * permits only because nothing can construct a `RESOLVED` actor yet. The
   * update path was given this seam at the PR approval; a creation had no way to
   * reach it at all, so `t_supplierdoc_declare` would have had to take its
   * declarer from the form. Every pre-§82 target ignores the parameter.
   */
  create?(
    payload: Record<string, unknown>,
    toState: string,
    scope: QueryScope,
  ): { entityId: string };
}

export interface PolicyDecision {
  ok: boolean;
  reason?: string;
}

export type PolicyHookFn = (ctx: {
  entityId: string;
  currentState: string;
  toState: string;
  payload: Record<string, unknown>;
  target: CommandTarget;
  /**
   * The commanding scope — carried so a hook can read the SESSION's actor
   * (`scope.actor`) rather than a payload field. See `applyTransition` above:
   * a hook that policed `payload.approvedBy` would be policing an assertion.
   */
  scope: QueryScope;
}) => PolicyDecision;

/** A command the dispatcher should fan out after a source transition (G4). */
export interface CascadeCommand {
  entity: string;
  entityId: string;
  transitionId: string;
  payload?: Record<string, unknown>;
}

/** Context handed to the cascade resolver after a successful source apply. */
export interface CascadeContext {
  transitionId: string;
  entity: string;
  entityId: string;
  payload: Record<string, unknown>;
  scope: QueryScope;
}

/** Context handed to the settle finalize (Step 3.5, Option B) on settlement. */
export interface SettleContext {
  entity: string;
  transitionId: string;
  entityId: string;
  payload: Record<string, unknown>;
  /**
   * The scope the ORIGINATING command ran under (§43). `settle(correlationId)`
   * takes no scope — the settlement is the SAP callback, not a fresh user act —
   * so the second act's event would have had no `actor` to name. This carries it
   * forward, which is literally what `TransitionEvent.scope` is documented as:
   * *the scope the command ran under*. A `system:sap` actor was rejected —
   * inventing an actor vocabulary to fill one field is a member with no
   * definition, and the honest answer was already in hand.
   */
  scope: QueryScope;
}

export interface DispatcherDeps {
  resolveRoles: (scope: QueryScope) => readonly string[];
  target: (entity: string) => CommandTarget | undefined;
  resolvePolicyHook: (name: string) => PolicyHookFn | undefined;
  sink: AuditSink;
  nextCorrelationId: () => string;
  now: () => string;
  /**
   * Cross-entity cascade resolver (census G4). Given a successfully-applied
   * source transition, returns the cascade commands to fire (adapter resolves
   * WHICH target ids via cross-entity lookups). Absent ⇒ no cascades.
   */
  cascade?: (ctx: CascadeContext) => readonly CascadeCommand[];
  /**
   * SAP-boundary settlement finalize (Step 3.5, Option B). Runs when a
   * `submitted` command settles: advances the interim→terminal state and
   * assigns the real system reference, under the SAME correlationId. Absent ⇒
   * settlement only flips the command status (the pre-Option-B behaviour).
   */
  settleFinalize?: (ctx: SettleContext) => void;
}

export interface Dispatcher {
  /**
   * `causationId` groups this command's DR-10 events with an earlier command
   * (the SubmissionSession anchor, SDC-3a; the cascade source, census G4)
   * without collapsing its own correlationId. Absent ⇒ a directly-initiated
   * command. Long the internal contract (cascades pass it); now on the type.
   */
  dispatch(scope: QueryScope, input: CommandInput, causationId?: string): CommandResult;
  getCommandStatus(correlationId: string): CommandStatus | null;
  /** Settle a `submitted` command to `done` (Step 3.5 SAP settlement). */
  settle(correlationId: string): CommandStatus | null;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function createDispatcher(deps: DispatcherDeps): Dispatcher {
  const statuses = new Map<string, CommandStatus>();
  // Submitted commands awaiting settlement: correlationId → what to finalize.
  const pending = new Map<string, SettleContext>();

  /**
   * The ONE emit. Takes the correlationId rather than minting it, because the
   * settlement (§43) is a SECOND event under the FIRST command's correlationId —
   * `finish()` mints, `settle()` reuses, and both record through here so no
   * outcome can acquire a private event shape.
   */
  function emit(
    scope: QueryScope,
    transitionId: string,
    outcome: CommandOutcome,
    correlationId: string,
    ts: string,
    reason?: string,
    causationId?: string,
    decision?: CommandDecision,
    attribution?: ActorAttribution,
  ): void {
    deps.sink.emit({
      event: transitionId,
      actor: actorKey(scope),
      scope,
      correlationId,
      // Present only on a cascaded transition — groups the fan-out under the
      // source command's correlationId (DR-10) without sharing correlationId.
      ...(causationId ? { causationId } : {}),
      outcome,
      // WHY it failed, on the event and not only on the discarded CommandResult
      // (§43). Absent on a non-failure, so a `done` event gains no empty key.
      ...(reason ? { reason } : {}),
      ts,
      // Governed-decision provenance (C6-LOCK) — forwarded VERBATIM from the
      // caller's input; the dispatcher neither reads nor validates it.
      ...(decision ? { decision } : {}),
      // ⚠️ C10 §6.4 — WHICH HUMAN, beside the existing `actor` (WHICH SEAT).
      // Present ONLY on a `user`-trigger transition; see `attributionFor`.
      ...(attribution ? { attribution } : {}),
    });
  }

  function finish(
    scope: QueryScope,
    transitionId: string,
    outcome: CommandOutcome,
    reason?: string,
    entityId?: string,
    causationId?: string,
    decision?: CommandDecision,
    attribution?: ActorAttribution,
  ): CommandResult {
    const correlationId = deps.nextCorrelationId();
    const ts = deps.now();
    emit(scope, transitionId, outcome, correlationId, ts, reason, causationId, decision, attribution);
    statuses.set(correlationId, { correlationId, transitionId, status: outcome, ts });
    return { correlationId, transitionId, status: outcome, reason, entityId };
  }

  // `causationId` is set ONLY for a cascaded (fanned-out) command — the source
  // command's correlationId — so every event it emits is tagged to the group.
  function dispatch(scope: QueryScope, input: CommandInput, causationId?: string): CommandResult {
    // Tag every event this dispatch emits with the causationId (undefined for a
    // directly-initiated command; the source correlationId for a cascaded one).
    // ⚠️ **C10 §6.4 — ATTRIBUTION ABSENT MEANS A MACHINE ACT, AND THAT IS WHY
    // THIS READS THE TRIGGER RATHER THAN JUST FORWARDING `scope.actor`.**
    // A cascade fan-out re-dispatches under the SAME scope, so forwarding the
    // session actor unconditionally would stamp every cascaded and creation
    // event with an `UNATTRIBUTED` claim — and `UNATTRIBUTED` is a claim that a
    // HUMAN acted and could not be resolved, every member of the vocabulary
    // naming a failure somebody can go and fix. Flooding it with machine acts
    // makes the count meaningless, which is the only reason anybody would ever
    // fix one. The four triggers already carry the distinction (C1), so the
    // field is derived from `trigger`, never from the caller.
    //
    // It is also NOT a replacement for `actor` (`buyer:all`): that is a true
    // fact about WHICH SEAT and stays. This answers WHICH HUMAN. Collapsing
    // them is `ENF-EVENT-ACTOR-IS-A-PERSONA-01` with extra steps (C10 §6.4).
    const attributionFor = (): ActorAttribution | undefined =>
      getTransition(input.transitionId)?.trigger === 'user' ? scope.actor : undefined;

    const fin = (
      s: QueryScope,
      tid: string,
      outcome: CommandOutcome,
      reason?: string,
      entityId?: string,
    ): CommandResult =>
      finish(s, tid, outcome, reason, entityId, causationId, input.decision, attributionFor());

    const transition = getTransition(input.transitionId);
    if (!transition) return fin(scope, input.transitionId, 'failed', refusal('UNKNOWN_TRANSITION'));

    const target = deps.target(input.entity);
    if (!target) return fin(scope, input.transitionId, 'failed', refusal('UNKNOWN_ENTITY', input.entity));

    const isCreation = transition.trigger === 'creation';
    const payload = input.payload ?? {};

    // — Scope: QueryScope on every command exactly as reads (creation derives
    //   the owner from the payload's parent; others from the existing entity). —
    let currentState: string | null = null;
    if (isCreation) {
      const owner = target.creationOwner ? target.creationOwner(payload) : null;
      if (scope.personaType === 'supplier') {
        if (!scope.supplierId || owner === null || owner !== scope.supplierId) {
          throw new DataError('SCOPE_DENIED', `creation of ${input.entity} denied for scope`);
        }
      } else if (target.requireCreationOwner && owner === null) {
        // C4b: this target opts into a validated relationship anchor for a BUYER
        // scope too — a creation whose owner the governed data cannot name is
        // denied, so a planner cannot mint an entity for a supplier the world
        // never names. Targets that don't set the flag are unchanged (the buyer
        // passes with a null owner — the RFQ / PR buyer-verb pattern).
        throw new DataError('SCOPE_DENIED', `creation of ${input.entity} denied: unresolved owner`);
      }
    } else {
      if (!input.entityId) return fin(scope, transition.id, 'failed', refusal('MISSING_ENTITY_ID'));
      currentState = target.readState(input.entityId);
      const owner = target.readScopeOwner(input.entityId);
      if (scope.personaType === 'supplier') {
        // A supplier learns nothing about entities not provably its own:
        // non-existent OR foreign both resolve to SCOPE_DENIED (no existence leak).
        if (!scope.supplierId || currentState === null || (owner !== null && owner !== scope.supplierId)) {
          throw new DataError('SCOPE_DENIED', `command on ${input.entity} '${input.entityId}' denied for scope`);
        }
      } else if (currentState === null) {
        throw new DataError('NOT_FOUND', `${input.entity} '${input.entityId}' not found`);
      }
    }

    // (3) requiredRole ∈ scope roles.
    if (!deps.resolveRoles(scope).includes(transition.requiredRole)) {
      return fin(scope, transition.id, 'failed', refusal('ROLE_NOT_PERMITTED', transition.requiredRole));
    }

    // (4) transition legality (creation has no from-state to check).
    if (!isCreation && !transition.from.includes(currentState!)) {
      return fin(scope, transition.id, 'failed', refusal('ILLEGAL_TRANSITION', `${currentState}->${transition.to}`));
    }

    // (5) requiredFields.
    const missing = transition.requiredFields.filter((f) => isEmpty(payload[f]));
    if (missing.length > 0) {
      return fin(scope, transition.id, 'failed', refusal('MISSING_FIELDS', missing.join(',')));
    }

    // (6) policy hooks (by registered name).
    for (const name of transition.policyHooks) {
      const hook = deps.resolvePolicyHook(name);
      if (!hook) return fin(scope, transition.id, 'failed', refusal('UNBOUND_HOOK', name));
      const decision = hook({
        entityId: input.entityId ?? '',
        currentState: currentState ?? '',
        // A state-preserving verb leaves the entity where it is, so a policy
        // reading `toState` must see that — not the nominal `to` (2e-c-3).
        toState: transition.statePreserving ? (currentState ?? '') : transition.to,
        payload,
        target,
        scope,
      });
      if (!decision.ok) {
        return fin(scope, transition.id, 'failed', refusal('POLICY_REJECTED', `${name}:${decision.reason ?? ''}`));
      }
    }

    // Apply + emit. Creation mints a new entity (store-assigned id); others
    // mutate in place. SAP-boundary verbs settle asynchronously (Step 3.5).
    const outcome: CommandOutcome = transition.sapBoundary ? 'submitted' : 'done';
    let result: CommandResult;
    if (isCreation) {
      if (!target.create) return fin(scope, transition.id, 'failed', refusal('UNSUPPORTED_CREATION', input.entity));
      const { entityId } = target.create(payload, transition.to, scope);
      result = fin(scope, transition.id, outcome, undefined, entityId);
    } else {
      // 2e-c-3 — a state-preserving verb applies with the CURRENT state, so a
      // target that writes `status: toState` (as every target does) writes the
      // state back unchanged. This is what lets one verb be legal from several
      // resting states without moving the entity out of any of them.
      target.applyTransition(
        input.entityId!,
        transition.statePreserving ? currentState! : transition.to,
        payload,
        scope,
      );
      result = fin(scope, transition.id, outcome, undefined, input.entityId);
    }

    const resolvedId = result.entityId ?? input.entityId ?? '';

    // Record submitted-pending context so settlement can finalize it later
    // (Step 3.5, Option B): the interim→terminal advance + real-ref assignment.
    if (outcome === 'submitted') {
      pending.set(result.correlationId, {
        entity: input.entity,
        transitionId: transition.id,
        entityId: resolvedId,
        payload,
        scope,
      });
    }

    // Cross-entity cascade fan-out (census G4) — post-apply, best-effort. A
    // denied or illegal cascade NEVER breaks the source command (a fixture GR
    // whose ASN is absent, or an ASN not in a cascadable state, simply no-ops).
    if (deps.cascade) {
      for (const c of deps.cascade({
        transitionId: transition.id,
        entity: input.entity,
        entityId: resolvedId,
        payload,
        scope,
      })) {
        try {
          // Cascaded command carries the source's correlationId as causationId,
          // so its events group with the source WITHOUT sharing correlationId
          // (each cascaded transition keeps its own 1:1 status — DR-10, Option A).
          // ⚠️ **THE CASCADE RUNS UNDER THE AUTOMATION GRANT, NOT A PERSONA.**
          // The atoms this needs are in `AUTOMATION_ATOMS`, asserted against the
          // cascade map by `businessRoles.test.ts` — derive WHICH from that
          // assertion, never from a list here.
          //
          // ⚠️ **WHAT THIS `catch {}` ACTUALLY SWALLOWS, MEASURED AT C.1 — AND
          // IT IS NOT THE ROLE GATE.** This comment used to say that a cascade
          // refused at the role gate "fails SILENTLY" because of this `catch`.
          // Both halves were false, and the correction is here rather than in a
          // finding because this is the site that has to be right.
          //
          // A role refusal never reaches this `catch`: `ROLE_NOT_PERMITTED`
          // RETURNS a `CommandResult` (`status: 'failed'`) like 9 of the 11
          // refusal exits, and `finish` EMITS for every one of them — so the
          // refusal lands on the sink with its `reason` and the source's
          // `causationId`. Unsurfaced, but recorded. The same is true of
          // `ILLEGAL_TRANSITION`, which is the ordinary way a cascade declines
          // (a sibling already terminal, a PR not `Approved`).
          //
          // Only TWO exits throw — `NOT_FOUND` and `SCOPE_DENIED` — and they
          // throw BEFORE any emit. Those are the genuinely traceless failures:
          // this `catch` discards them and nothing anywhere records that a
          // cascade was attempted. **The remedy is at the resolver, not here:** a
          // resolver hands back an id it has confirmed exists, or hands back
          // nothing (`if (!gr) return []`, `if (!pr) return []`). Repairing the
          // `catch` was considered and rejected — best-effort fan-out is the
          // design, and a resolver that never emits a bad id has nothing to
          // swallow.
          //
          // `automation` is NOT a `SystemRoleId` and cannot be assigned to a
          // person (C10 §6.4 — attribution absent = a machine act). This is the
          // only site that names it.
          dispatch(
            {
              personaType: 'buyer',
              supplierId: null,
              businessRoles: [AUTOMATION_ROLE],
            },
            { transitionId: c.transitionId, entity: c.entity, entityId: c.entityId, payload: c.payload },
            result.correlationId,
          );
        } catch {
          /* best-effort cross-entity cascade */
        }
      }
    }

    return result;
  }

  function getCommandStatus(correlationId: string): CommandStatus | null {
    return statuses.get(correlationId) ?? null;
  }

  // ── §43 · THE SECOND ACT, RECORDED ─────────────────────────────────────────
  // A `sapBoundary` verb is two events, not one: the `submitted` moment and the
  // settlement that lands it. Only the first was ever emitted. Now both are, on
  // the SAME correlationId — which is what Option B already promised in prose
  // ("under the SAME correlationId") and what `getCommandStatus` staying 1:1
  // requires: one command, one correlationId, two recorded acts distinguished by
  // outcome.
  function settle(correlationId: string): CommandStatus | null {
    const current = statuses.get(correlationId);
    if (current && current.status === 'submitted') {
      const ts = deps.now();
      const ctx = pending.get(correlationId);
      // Unreachable by construction — `pending` and a `submitted` status are
      // written together (see the `outcome === 'submitted'` block above) and the
      // entry outlives the status flip. Pinned by `settleRecording.test.ts`, so
      // this branch cannot quietly become the settle path again. Behaviour here
      // is EXACTLY the pre-§43 behaviour for a state that cannot occur.
      if (!ctx) {
        const settled: CommandStatus = { ...current, status: 'done', ts };
        statuses.set(correlationId, settled);
        return settled;
      }
      if (deps.settleFinalize) {
        try {
          // Option B: advance interim→terminal + assign the real system
          // reference.
          deps.settleFinalize(ctx);
        } catch (err) {
          // ⚠️ RECORD, THEN RETHROW. The caller's experience is byte-identical
          // to before — the throw still propagates — and only the record is
          // added. The primary command still succeeded and still reports
          // honestly on its own scope: THE RECORD IS INCOMPLETE, NOT FALSE.
          emit(
            ctx.scope,
            current.transitionId,
            'failed',
            correlationId,
            ts,
            settleFault(classifySettleFault(err), settleFaultDetail(err)),
          );
          // ⚠️ THE STATUS IS DELIBERATELY *NOT* FLIPPED HERE, AND THIS IS THE
          // ONE BEHAVIOURAL DIFFERENCE IN THE BATCH — confined to a path that
          // cannot execute in this tree (no `settleFinalize` in the mock can
          // throw; every store `update` is a `rows.map` no-op on a missing id).
          // Pre-§43 the flip happened BEFORE the finalize, so a throw left the
          // status claiming `done` with nothing finalized AND left `pending`
          // undeleted — meaning the retry the UI is about to offer would find a
          // `done` status and silently no-op. Offering "retry" over that would
          // be a dead end wearing a remedy's clothes, which is the whole of
          // `HALAL-REFUSAL-DEAD-ENDS-01`. Leaving the command `submitted` is
          // what makes the named remedy TRUE.
          throw err;
        }
      }
      const settled: CommandStatus = { ...current, status: 'done', ts };
      statuses.set(correlationId, settled);
      pending.delete(correlationId);
      emit(ctx.scope, current.transitionId, 'done', correlationId, ts);
      return settled;
    }
    return current ?? null;
  }

  return { dispatch, getCommandStatus, settle };
}

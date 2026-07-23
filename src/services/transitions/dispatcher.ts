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
import type { AuditSink } from './events';
import { actorKey } from './events';
import { getTransition } from './registry';

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
  /** Apply the target state + any payload effects (store mutation). */
  applyTransition(entityId: string, toState: string, payload: Record<string, unknown>): void;
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
  /** Creation apply: mint the entity in `toState`; return its assigned id. */
  create?(payload: Record<string, unknown>, toState: string): { entityId: string };
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

  function finish(
    scope: QueryScope,
    transitionId: string,
    outcome: CommandOutcome,
    reason?: string,
    entityId?: string,
    causationId?: string,
    decision?: CommandDecision,
  ): CommandResult {
    const correlationId = deps.nextCorrelationId();
    const ts = deps.now();
    deps.sink.emit({
      event: transitionId,
      actor: actorKey(scope),
      scope,
      correlationId,
      // Present only on a cascaded transition — groups the fan-out under the
      // source command's correlationId (DR-10) without sharing correlationId.
      ...(causationId ? { causationId } : {}),
      outcome,
      ts,
      // Governed-decision provenance (C6-LOCK) — forwarded VERBATIM from the
      // caller's input; the dispatcher neither reads nor validates it.
      ...(decision ? { decision } : {}),
    });
    statuses.set(correlationId, { correlationId, transitionId, status: outcome, ts });
    return { correlationId, transitionId, status: outcome, reason, entityId };
  }

  // `causationId` is set ONLY for a cascaded (fanned-out) command — the source
  // command's correlationId — so every event it emits is tagged to the group.
  function dispatch(scope: QueryScope, input: CommandInput, causationId?: string): CommandResult {
    // Tag every event this dispatch emits with the causationId (undefined for a
    // directly-initiated command; the source correlationId for a cascaded one).
    const fin = (
      s: QueryScope,
      tid: string,
      outcome: CommandOutcome,
      reason?: string,
      entityId?: string,
    ): CommandResult => finish(s, tid, outcome, reason, entityId, causationId, input.decision);

    const transition = getTransition(input.transitionId);
    if (!transition) return fin(scope, input.transitionId, 'failed', 'UNKNOWN_TRANSITION');

    const target = deps.target(input.entity);
    if (!target) return fin(scope, input.transitionId, 'failed', `UNKNOWN_ENTITY:${input.entity}`);

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
      if (!input.entityId) return fin(scope, transition.id, 'failed', 'MISSING_ENTITY_ID');
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
      return fin(scope, transition.id, 'failed', `ROLE_NOT_PERMITTED:${transition.requiredRole}`);
    }

    // (4) transition legality (creation has no from-state to check).
    if (!isCreation && !transition.from.includes(currentState!)) {
      return fin(scope, transition.id, 'failed', `ILLEGAL_TRANSITION:${currentState}->${transition.to}`);
    }

    // (5) requiredFields.
    const missing = transition.requiredFields.filter((f) => isEmpty(payload[f]));
    if (missing.length > 0) {
      return fin(scope, transition.id, 'failed', `MISSING_FIELDS:${missing.join(',')}`);
    }

    // (6) policy hooks (by registered name).
    for (const name of transition.policyHooks) {
      const hook = deps.resolvePolicyHook(name);
      if (!hook) return fin(scope, transition.id, 'failed', `UNBOUND_HOOK:${name}`);
      const decision = hook({
        entityId: input.entityId ?? '',
        currentState: currentState ?? '',
        toState: transition.to,
        payload,
        target,
      });
      if (!decision.ok) {
        return fin(scope, transition.id, 'failed', `POLICY_REJECTED:${name}:${decision.reason ?? ''}`);
      }
    }

    // Apply + emit. Creation mints a new entity (store-assigned id); others
    // mutate in place. SAP-boundary verbs settle asynchronously (Step 3.5).
    const outcome: CommandOutcome = transition.sapBoundary ? 'submitted' : 'done';
    let result: CommandResult;
    if (isCreation) {
      if (!target.create) return fin(scope, transition.id, 'failed', `UNSUPPORTED_CREATION:${input.entity}`);
      const { entityId } = target.create(payload, transition.to);
      result = fin(scope, transition.id, outcome, undefined, entityId);
    } else {
      target.applyTransition(input.entityId!, transition.to, payload);
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
          dispatch(
            { personaType: 'buyer', supplierId: null },
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

  function settle(correlationId: string): CommandStatus | null {
    const current = statuses.get(correlationId);
    if (current && current.status === 'submitted') {
      const settled: CommandStatus = { ...current, status: 'done', ts: deps.now() };
      statuses.set(correlationId, settled);
      // Option B: run the registered finalize (advance interim→terminal +
      // assign the real system reference) under the SAME correlationId.
      const ctx = pending.get(correlationId);
      if (ctx && deps.settleFinalize) deps.settleFinalize(ctx);
      pending.delete(correlationId);
      return settled;
    }
    return current ?? null;
  }

  return { dispatch, getCommandStatus, settle };
}

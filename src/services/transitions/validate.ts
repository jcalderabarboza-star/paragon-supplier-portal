// ────────────────────────────────────────────────────────────────────────────
// Flow validation (v2.2 Step 3.1).
//
// Runtime structural validation for FlowDefinitions. The registry runs
// `assertValidFlow` before admitting a flow, so only well-formed machines ever
// become dispatchable. No dispatch logic here — legality/scope/role enforcement
// at COMMAND time lands with the dispatcher (Step 3.4).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from './schema';
import { isRegisteredPolicyHook } from './policyHooks';

// `t_<entity>_<verb>` — at least two lowercase segments after the `t_` prefix.
const TRANSITION_ID_RE = /^t_[a-z0-9]+(?:_[a-z0-9]+)+$/;
// `<namespace>:<role>` — dotted namespace allowed, both sides lowercase.
const ROLE_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*:[a-z][a-z0-9-]*$/;

export interface FlowValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

function isPositiveInt(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1;
}

/** Validate a flow's structure. Returns all violations (never throws). */
export function validateFlow(flow: FlowDefinition): FlowValidationResult {
  const errors: string[] = [];
  const states = new Set(flow.states);

  if (flow.states.length === 0) {
    errors.push(`flow '${flow.entity}': no states declared`);
  }
  if (states.size !== flow.states.length) {
    errors.push(`flow '${flow.entity}': duplicate state in 'states'`);
  }
  if (!states.has(flow.initial)) {
    errors.push(`flow '${flow.entity}': initial '${flow.initial}' is not a declared state`);
  }
  if (!isPositiveInt(flow.version)) {
    errors.push(`flow '${flow.entity}': version must be a positive integer`);
  }

  const seenIds = new Set<string>();
  for (const t of flow.transitions) {
    const at = `flow '${flow.entity}' transition '${t.id}'`;

    if (!TRANSITION_ID_RE.test(t.id)) {
      errors.push(`${at}: id must match t_<entity>_<verb>`);
    }
    if (seenIds.has(t.id)) {
      errors.push(`${at}: duplicate transition id within flow`);
    }
    seenIds.add(t.id);

    // Law 0.5 defence-in-depth for untyped (JS) callers — the type system
    // already makes 'clock' unassignable to TransitionTrigger.
    if ((t.trigger as string) === 'clock') {
      errors.push(`${at}: 'clock' trigger is forbidden (law 0.5 — clock states are computed, never transitioned)`);
    }

    if (t.trigger === 'creation') {
      if (t.from.length !== 0) {
        errors.push(`${at}: creation transitions must have an empty 'from'`);
      }
    } else {
      if (t.from.length === 0) {
        errors.push(`${at}: non-creation transitions require at least one 'from' state`);
      }
      for (const s of t.from) {
        if (!states.has(s)) errors.push(`${at}: 'from' state '${s}' is not declared`);
      }
    }

    if (!states.has(t.to)) {
      errors.push(`${at}: 'to' state '${t.to}' is not declared`);
    }

    // 2e-c-3 — a state-preserving verb records a fact and leaves the entity
    // where it is. Two structural requirements keep the declaration honest:
    // it cannot be a creation (there is no prior state to preserve), and its
    // declared `to` must be one of its own `from` states — so the metadata never
    // claims a destination the dispatcher will not take the entity to.
    if (t.statePreserving) {
      if (t.trigger === 'creation') {
        errors.push(`${at}: a creation transition cannot be statePreserving (there is no state to preserve)`);
      } else if (!t.from.includes(t.to)) {
        errors.push(`${at}: statePreserving requires 'to' ('${t.to}') to be one of its 'from' states`);
      }
    }
    if (!ROLE_RE.test(t.requiredRole)) {
      errors.push(`${at}: requiredRole '${t.requiredRole}' is not a namespaced transition-role (expected <namespace>:<role>)`);
    }
    for (const hook of t.policyHooks) {
      if (!isRegisteredPolicyHook(hook)) {
        errors.push(`${at}: policy hook '${hook}' is not registered`);
      }
    }
    if (!isPositiveInt(t.version)) {
      errors.push(`${at}: version must be a positive integer`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Validate a flow; throw a single aggregated error if it is malformed. */
export function assertValidFlow(flow: FlowDefinition): void {
  const { ok, errors } = validateFlow(flow);
  if (!ok) {
    throw new Error(`Invalid flow '${flow.entity}':\n- ${errors.join('\n- ')}`);
  }
}

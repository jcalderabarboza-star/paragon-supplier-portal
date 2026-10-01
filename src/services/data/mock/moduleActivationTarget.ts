// ────────────────────────────────────────────────────────────────────────────
// M1 · THE MODULE-ACTIVATION TARGET AND ITS HOOKS — bound in the mock layer,
// beside the store they read (the requirement-response / publication
// precedent). `enforcementTarget`, verb for verb:
//
//   · `readState` answers `Governed` for a code in the registry or a side, and
//     `null` for anything else — an unknown code is `NOT_FOUND`, never minted.
//     PLT answers `Governed` too, so switching it is refused BY NAME
//     (`MODULE_KNOWN`) rather than by a 404 that would say it does not exist.
//   · `readScopeOwner` is null: activation is a BUYER governance record, so a
//     supplier scope is denied at SCOPE — identically for a real code and an
//     invented one (§86: the refusal kind must not be a membership test).
//   · `applyTransition` APPENDS; `setBy` from the session, `setAt` from the
//     clock, `seq` from the store. Nothing the caller sends is a stamp.
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { asActorAttribution } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import { moduleActivationStore } from './stores/moduleActivationStore';
import {
  MODULE_PHASES,
  getModule,
  isModuleCode,
  isSideId,
  phaseIsOn,
  type ModuleCode,
  type ModulePhase,
} from '../../modules/registry';
import {
  activeHardDependants,
  inactiveHardDependencies,
  offDetail,
  verbOffReason,
} from '../../modules/activation';
import { moduleDeployment } from '../../modules/deployment';
import type { QueryScope } from '../types';

const isSubject = (id: string): boolean => isModuleCode(id) || isSideId(id);

const ok: PolicyDecision = { ok: true };
const no = (reason: string): PolicyDecision => ({ ok: false, reason });

/** The parts this act would record: the payload's over the module's current ones. */
function partsAfter(code: ModuleCode, payload: Record<string, unknown>): Record<string, boolean> {
  const current = moduleActivationStore.view().modules[code].parts;
  const asked = (payload.parts ?? {}) as Record<string, boolean>;
  return { ...current, ...asked };
}

export const moduleActivationTarget: CommandTarget = {
  readState: (id) => (isSubject(id) ? 'Governed' : null),
  readScopeOwner: () => null,
  readEntity: (id) => moduleActivationStore.forSubject(id),
  applyTransition: (id, _toState, payload, scope) => {
    const enabled = payload.enabled === true;
    const module = isModuleCode(id);
    moduleActivationStore.append({
      code: id as ModuleCode,
      phase: module ? (payload.phase as ModulePhase) : null,
      enabled,
      parts: module ? partsAfter(id as ModuleCode, payload) : {},
      reason: String(payload.reason).trim(),
      // FROM THE SESSION, never the payload (C10 §6.2) — the dispatcher refuses
      // the key, so there is no payload value left to prefer.
      setBy: asActorAttribution(scope.actor) ?? NO_PERSON,
      setAt: new Date().toISOString(),
      seq: moduleActivationStore.nextSeq(),
    });
  },
};

/**
 * The dispatcher's `moduleGate`: the refusal detail for a verb that is off for
 * this scope, or null. Reads the store's derived view — the ONE answer the
 * route gate and the surface hook read too.
 */
export const moduleGate = (transitionId: string, scope: QueryScope): string | null => {
  const off = verbOffReason(transitionId, scope, moduleActivationStore.view());
  return off ? offDetail(off) : null;
};

// ── THE HOOKS (Design 5 §A.4), each refusing BY NAME ────────────────────────

bindPolicyHook(POLICY_HOOKS.MODULE_KNOWN, ({ entityId, payload }) => {
  if (isModuleCode(entityId) && getModule(entityId).alwaysOn) {
    return no(`${entityId} is always on — the platform switches everything else, so it cannot be switched itself`);
  }
  if (entityId === 'side:buyer') {
    return no('the buyer side cannot be switched while PLT is on — the admin page lives there');
  }
  if (!isSubject(entityId)) return no(`${entityId} is not a module or a side`);
  if (typeof payload.enabled !== 'boolean') return no(`enabled must be true or false, got ${typeof payload.enabled}`);
  return ok;
});

bindPolicyHook(POLICY_HOOKS.MODULE_PHASE_CONSISTENT, ({ entityId, payload }) => {
  const phase = payload.phase;
  if (isSideId(entityId)) {
    return phase === undefined ? ok : no(`a side has no phase, got ${String(phase)}`);
  }
  if (!(MODULE_PHASES as readonly unknown[]).includes(phase)) {
    return no(`phase must be one of ${MODULE_PHASES.join(', ')}, got ${String(phase)}`);
  }
  const on = phaseIsOn(phase as ModulePhase);
  return on === (payload.enabled === true)
    ? ok
    : no(`${String(phase)} is ${on ? 'an ON' : 'an OFF'} phase, but enabled is ${String(payload.enabled)}`);
});

bindPolicyHook(POLICY_HOOKS.MODULE_PARTS_KNOWN, ({ entityId, payload }) => {
  if (payload.parts === undefined) return ok;
  if (isSideId(entityId)) return no('a side has no parts');
  const parts = payload.parts;
  if (typeof parts !== 'object' || parts === null || Array.isArray(parts)) {
    return no('parts must be a record of part → on/off');
  }
  const known = getModule(entityId as ModuleCode).parts.map((p) => p.id);
  for (const [k, v] of Object.entries(parts as Record<string, unknown>)) {
    if (!known.includes(k)) return no(`${k} is not a part of ${entityId}`);
    if (typeof v !== 'boolean') return no(`part ${k} must be true or false`);
  }
  return ok;
});

bindPolicyHook(POLICY_HOOKS.MODULE_REASON_AUTHORED, ({ payload }) => {
  const value = payload.reason;
  if (typeof value !== 'string') return no(`reason must be text, got ${typeof value}`);
  return value.trim() === '' ? no('reason is blank — say why the platform changes') : ok;
});

bindPolicyHook(POLICY_HOOKS.MODULE_ACTUALLY_CHANGES, ({ entityId, payload }) => {
  const view = moduleActivationStore.view();
  if (isSideId(entityId)) {
    return view.sides[entityId].enabled === (payload.enabled === true) ? no(`${entityId} is already ${payload.enabled ? 'on' : 'off'}`) : ok;
  }
  const code = entityId as ModuleCode;
  const now = view.modules[code];
  const next = partsAfter(code, payload);
  const same =
    now.phase === payload.phase &&
    now.enabled === (payload.enabled === true) &&
    Object.keys(next).every((k) => next[k] === now.parts[k]);
  return same ? no(`${code} is already ${now.phase}, ${now.enabled ? 'on' : 'off'}, with these parts`) : ok;
});

bindPolicyHook(POLICY_HOOKS.MODULE_NO_ACTIVE_HARD_DEPENDANTS, ({ entityId, payload }) => {
  if (!isModuleCode(entityId) || payload.enabled !== false) return ok;
  const blocking = activeHardDependants(entityId, moduleActivationStore.view());
  return blocking.length === 0
    ? ok
    : no(`${entityId} cannot go off while ${blocking.join(', ')} ${blocking.length === 1 ? 'depends' : 'depend'} on it — switch ${blocking.length === 1 ? 'it' : 'them'} off first`);
});

bindPolicyHook(POLICY_HOOKS.MODULE_DEPENDENCIES_ENABLED, ({ entityId, payload }) => {
  if (!isModuleCode(entityId) || payload.enabled !== true) return ok;
  const missing = inactiveHardDependencies(entityId, moduleActivationStore.view());
  return missing.length === 0
    ? ok
    : no(`${entityId} cannot go on while ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} off — it depends on ${missing.length === 1 ? 'it' : 'them'}`);
});

bindPolicyHook(POLICY_HOOKS.MODULE_SET_ATTRIBUTED, ({ scope }) => {
  const actor = asActorAttribution(scope.actor);
  if (actor?.kind === 'RESOLVED') return ok;
  return no(
    `the act must be answerable — ${actor ? `${actor.kind}: ${actor.reason}` : 'no actor in the session'}; adopt a person before switching a module`,
  );
});

bindPolicyHook(POLICY_HOOKS.MODULE_SET_NOT_SAMPLE_IN_PROD, ({ scope }) =>
  // The deployment's ONE answer — the admin page renders read-only on the same call.
  moduleDeployment.barsActor(scope.actor)
    ? no('a sample person cannot switch a module on a production deployment — a real person must')
    : ok,
);

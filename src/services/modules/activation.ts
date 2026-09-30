// ────────────────────────────────────────────────────────────────────────────
// M1 · MODULE ACTIVATION — the ledger row, and what is in force, DERIVED.
//
// The ledger records acts (`t_module_set`, append-only); what is ON is derived
// at read by `effectiveActivation`, exactly as `settingInForce` derives an
// enforcement mode from its ledger rather than a store holding a "current"
// field. Nothing here reads a clock — activation has no lapse — so the service
// may serve the derived view directly.
//
// The three predicates below are the ONE answer to "is this off?", asked from
// three places: the dispatcher (a verb), the route gate (a path) and the
// surface's availability hook (an atom). They share the side-then-module-then-
// part order, so a page and the dispatcher can never disagree about which
// switch is the reason.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import type { QueryScope } from '../data/types';
import type { PersonaType } from '../../context/CurrentIdentityContext';
import {
  MODULE_CODES,
  MODULE_SIDES,
  getModule,
  getModules,
  hardDependantsOf,
  hardDependenciesOf,
  moduleOf,
  modulesOfAtom,
  moduleOfRoute,
  phaseIsOn,
  sideOfPersona,
  sideOfRoute,
  sideOfScope,
  type ActivationSubject,
  type ModuleCode,
  type ModulePhase,
  type SideId,
} from './registry';

/**
 * ONE recorded act. Store-minted stamps (`setBy`, `setAt`, `seq`), never
 * payload fields — the `setAt` / `pinnedAt` discipline, and `ACTOR_IN_PAYLOAD`
 * refuses a payload actor at the dispatcher.
 */
export interface ModuleActivationSetting {
  /** A module code, or a side. */
  readonly code: ActivationSubject;
  /** A module's phase; `null` for a side, which has none. */
  readonly phase: ModulePhase | null;
  readonly enabled: boolean;
  /** The module's parts as recorded by this act — every part, not a diff. */
  readonly parts: Readonly<Record<string, boolean>>;
  readonly reason: string;
  readonly setBy: ActorAttribution;
  readonly setAt: string;
  /** Arrival order. The act recorded later wins a tie on `setAt`. */
  readonly seq: number;
}

/** What is in force for one module. Carries no attribution — that is the ledger's. */
export interface ModuleState {
  readonly code: ModuleCode;
  readonly phase: ModulePhase;
  readonly enabled: boolean;
  readonly parts: Readonly<Record<string, boolean>>;
  /** True when no act has been recorded: the registry default is in force. */
  readonly isDefault: boolean;
}

export interface ModuleActivationView {
  readonly modules: Readonly<Record<ModuleCode, ModuleState>>;
  readonly sides: Readonly<Record<SideId, { readonly enabled: boolean; readonly isDefault: boolean }>>;
}

const allPartsOn = (code: ModuleCode): Record<string, boolean> =>
  Object.fromEntries(getModule(code).parts.map((p) => [p.id, true]));

/** §A.2 — the defaults: every module Active, ON, every part on; both sides on. */
export function defaultActivation(): ModuleActivationView {
  const modules = {} as Record<ModuleCode, ModuleState>;
  for (const code of MODULE_CODES) {
    modules[code] = { code, phase: 'Active', enabled: true, parts: allPartsOn(code), isDefault: true };
  }
  const sides = {} as Record<SideId, { enabled: boolean; isDefault: boolean }>;
  for (const s of MODULE_SIDES) sides[s] = { enabled: true, isDefault: true };
  return { modules, sides };
}

/**
 * The view in force: the registry defaults, overwritten by the LAST recorded
 * act per subject (by `seq` — the store's arrival order).
 */
export function effectiveActivation(ledger: readonly ModuleActivationSetting[]): ModuleActivationView {
  const base = defaultActivation();
  const modules = { ...base.modules } as Record<ModuleCode, ModuleState>;
  const sides = { ...base.sides } as Record<SideId, { enabled: boolean; isDefault: boolean }>;
  for (const row of [...ledger].sort((a, b) => a.seq - b.seq)) {
    if ((MODULE_SIDES as readonly string[]).includes(row.code)) {
      sides[row.code as SideId] = { enabled: row.enabled, isDefault: false };
    } else {
      const code = row.code as ModuleCode;
      modules[code] = {
        code,
        phase: row.phase ?? modules[code].phase,
        enabled: row.enabled,
        parts: { ...allPartsOn(code), ...row.parts },
        isDefault: false,
      };
    }
  }
  return { modules, sides };
}

/** Why something is off: the switch that is off, and the part when it is a part. */
export interface OffReason {
  readonly subject: ActivationSubject;
  readonly part: string | null;
}

/** The refusal detail for an `OffReason`: `SHP`, `GRC.qualityHold`, `side:supplier`. */
export const offDetail = (r: OffReason): string => (r.part ? `${r.subject}.${r.part}` : r.subject);

function moduleOff(code: ModuleCode, part: string | null, view: ModuleActivationView): OffReason | null {
  if (getModule(code).alwaysOn) return null;
  const state = view.modules[code];
  if (!state.enabled) return { subject: code, part: null };
  if (part !== null && state.parts[part] === false) return { subject: code, part };
  return null;
}

/**
 * THE DISPATCHER'S QUESTION — is this verb off for this scope? Side first (a
 * supplier-side switch refuses every act a supplier seat attempts), then the
 * verb's module, then its part. `null` means nothing is off.
 */
export function verbOffReason(
  transitionId: string,
  scope: QueryScope,
  view: ModuleActivationView,
): OffReason | null {
  const side = sideOfScope(scope);
  if (!view.sides[side].enabled) return { subject: side, part: null };
  const m = moduleOf(transitionId);
  return m ? moduleOff(m.code, m.part, view) : null;
}

/** THE ROUTE GATE'S QUESTION — is this page read-only? The route's side, then its module, then its part. */
export function routeOffReason(path: string, view: ModuleActivationView): OffReason | null {
  const side = sideOfRoute(path);
  if (side && !view.sides[side].enabled) return { subject: side, part: null };
  const m = moduleOfRoute(path);
  return m ? moduleOff(m.code, m.part, view) : null;
}

/**
 * THE SURFACE'S QUESTION — is this atom's verb off for a seat of this persona?
 * An atom serving several places is off only when EVERY one is off; the first
 * place's reason is the one named. A read-only ROUTE is answered separately
 * (`availabilityWithModules`), so an atom still live elsewhere never withdraws
 * a control from a page that is itself on.
 */
export function atomOffReason(
  atom: string,
  persona: PersonaType,
  view: ModuleActivationView,
): OffReason | null {
  const side = sideOfPersona(persona);
  if (!view.sides[side].enabled) return { subject: side, part: null };
  const places = modulesOfAtom(atom);
  if (places.length === 0) return null;
  const reasons = places.map((m) => moduleOff(m.code, m.part, view));
  return reasons.every((r) => r !== null) ? reasons[0] : null;
}

/** The hard dependants of `code` that are ON — each must be switched off first. */
export function activeHardDependants(code: ModuleCode, view: ModuleActivationView): readonly ModuleCode[] {
  return hardDependantsOf(code).filter((d) => view.modules[d].enabled);
}

/** The hard dependencies of `code` that are OFF — each must be switched on first. */
export function inactiveHardDependencies(code: ModuleCode, view: ModuleActivationView): readonly ModuleCode[] {
  return hardDependenciesOf(code).filter((d) => !getModule(d).alwaysOn && !view.modules[d].enabled);
}

/** Every switchable module, for a caller that must walk them. */
export const switchableModules = (): readonly ModuleCode[] =>
  getModules().filter((m) => !m.alwaysOn).map((m) => m.code);

export { phaseIsOn };

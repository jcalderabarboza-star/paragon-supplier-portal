// ────────────────────────────────────────────────────────────────────────────
// M1 · WHAT IS SWITCHED ON, FOR THE SURFACES — and which page is read-only.
//
// Two contexts, two questions:
//   · `ModuleActivationContext` — the platform's activation, read through the
//     service (`getModuleActivation`). Mounted once by the router.
//   · `ModuleRouteContext` — the OffReason of the ROUTE being rendered, set by
//     `ModuleGate`. The shell reads it for the banner; the availability hooks
//     read it so every guarded verb slot on a read-only page renders the notice.
//
// ⚠️ **ABSENT A PROVIDER, THE REGISTRY DEFAULTS ARE IN FORCE — EVERYTHING ON.**
// That is the honest answer for a surface rendered outside the app (a spec, a
// story): no act has switched anything off. It is also why the ~200 specs that
// render a surface directly need no change. A spec that probes OFF mounts the
// provider value itself.
// ────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useMemo } from 'react';
import { useServiceQuery } from '../services/query/useServiceQuery';
import {
  defaultActivation,
  routeOffReason,
  type ModuleActivationView,
  type OffReason,
} from '../services/modules/activation';

/** The react-query key the activation read lives under — invalidate it after `t_module_set`. */
export const MODULE_ACTIVATION_KEY = ['modules', 'activation'] as const;

export const ModuleActivationContext = createContext<ModuleActivationView | null>(null);
export const ModuleRouteContext = createContext<OffReason | null>(null);

let defaults: ModuleActivationView | null = null;
const registryDefaults = (): ModuleActivationView => (defaults ??= defaultActivation());

/** The activation in force for this render. */
export function useModuleActivation(): ModuleActivationView {
  return useContext(ModuleActivationContext) ?? registryDefaults();
}

/** Why the page being rendered is read-only, or null when it is not. */
export function useRouteModuleOff(): OffReason | null {
  return useContext(ModuleRouteContext);
}

/** Mounted by the router: reads the activation through the service seam. */
export const ModuleActivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const q = useServiceQuery(MODULE_ACTIVATION_KEY, (svc, scope) => svc.modules.getModuleActivation(scope));
  return <ModuleActivationContext.Provider value={q.data ?? null}>{children}</ModuleActivationContext.Provider>;
};

/**
 * The route gate (Design 5 §A.3): wraps one route's page. OFF ⇒ the page still
 * renders — its lists and detail views stay readable — and the shell and every
 * guarded verb slot learn that it is read-only. Never a 404, never a blank.
 */
export const ModuleGate: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const view = useModuleActivation();
  const off = useMemo(() => routeOffReason(path, view), [path, view]);
  return <ModuleRouteContext.Provider value={off}>{children}</ModuleRouteContext.Provider>;
};

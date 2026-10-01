// ────────────────────────────────────────────────────────────────────────────
// M2 · THE ROADMAP BOARD'S FACTS — Design 5 §A.5.1. Pure, so every number on a
// card is testable without a DOM.
//
// ⚠️ **EVERY FIGURE IS DERIVED, NONE IS STORED.** A card's column is the phase
// in force (the ledger's latest act, the registry default where none); its
// route and verb counts are read from the registry and `getKnownFlows()`; its
// dependency line and dependants from `dependsOn`. A card that carried its own
// count would be `FLOOR-IN-PROSE-01` rendered on screen.
// ────────────────────────────────────────────────────────────────────────────

import { getKnownFlows } from '../../services/transitions';
import {
  MODULE_PHASES,
  getModule,
  getModules,
  type DependencyKind,
  type ModuleCode,
  type ModulePhase,
} from '../../services/modules/registry';
import type { ModuleActivationView } from '../../services/modules/activation';

/** The board: one column per phase, in the phase order, each module exactly once. */
export function boardColumns(view: ModuleActivationView): Record<ModulePhase, ModuleCode[]> {
  const cols = Object.fromEntries(MODULE_PHASES.map((p) => [p, [] as ModuleCode[]])) as Record<ModulePhase, ModuleCode[]>;
  for (const m of getModules()) cols[view.modules[m.code].phase].push(m.code);
  return cols;
}

/** Every verb of a module — every transition of its flows, read from the registry. */
export function verbsOfModule(code: ModuleCode): string[] {
  const flows = getModule(code).flows;
  return getKnownFlows()
    .filter((f) => flows.includes(f.entity))
    .flatMap((f) => f.transitions.map((t) => t.id));
}

/** The modules that depend on `code`, with the kind of each edge. */
export function dependantsOf(code: ModuleCode): { code: ModuleCode; kind: DependencyKind }[] {
  return getModules().flatMap((m) =>
    m.dependsOn.filter((d) => d.code === code).map((d) => ({ code: m.code, kind: d.kind })),
  );
}

export interface CardFacts {
  readonly code: ModuleCode;
  readonly routes: number;
  readonly verbs: number;
  /** Hard dependencies — "needs". */
  readonly needs: readonly ModuleCode[];
  /** Soft dependencies — "reads". */
  readonly reads: readonly ModuleCode[];
  /** The capability whose liveness the card shows — the module's first. */
  readonly mainCapability: string | null;
}

export function cardFacts(code: ModuleCode): CardFacts {
  const m = getModule(code);
  return {
    code,
    routes: m.routes.length,
    verbs: verbsOfModule(code).length,
    needs: m.dependsOn.filter((d) => d.kind === 'hard').map((d) => d.code),
    reads: m.dependsOn.filter((d) => d.kind === 'soft').map((d) => d.code),
    mainCapability: m.capabilities[0] ?? null,
  };
}

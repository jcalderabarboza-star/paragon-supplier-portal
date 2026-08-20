import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  isSystemRole,
  type SystemRoleId,
} from '../../services/transitions/businessRoles';
import { getKnownFlows } from '../../services/transitions';
import { WIRED_COMMAND_TARGETS } from '../../services/data/mock/MockCommandService';

// ────────────────────────────────────────────────────────────────────────────
// THE ROLE VIEW MODEL — one derivation, read by both the list and the detail.
//
// ⚠️ **EVERY FIELD COMES FROM THE CODE THAT ENFORCES IT.** The roster is
// `SYSTEM_ROLES` (what `resolveRoles` resolves against) and the verbs are
// `getKnownFlows()` (what the dispatcher resolves against), so neither surface
// can drift from the machine. A page that re-states either would be the second
// vocabulary C10 §3.3 refuses — and it would drift silently, because nothing
// checks a permissions page against a flow catalog.
//
// ⚠️ **THE COLUMNS WE DO NOT HAVE ARE ABSENT, NOT EMPTY.** The reference
// (Paragon TMS) lists USERS ASSIGNED, LAST MODIFIED and STATUS. We hold no
// people (staff identity is the corporate directory's, unconnected), no
// modification record (`SYSTEM_ROLES` is a frozen module constant, not a row),
// and no activation state (a role is either compiled in or it does not exist).
// **Rendering those columns would invent three facts to fill a layout** — the
// class this project spends its time removing. What transfers is the SHAPE:
// code, name, description, kind, and a view action.
// ────────────────────────────────────────────────────────────────────────────

export interface RoleVerb {
  readonly id: string;
  readonly entity: string;
  readonly surfaced: boolean;
  readonly wired: boolean;
}

export interface RoleView {
  readonly id: SystemRoleId;
  readonly side: 'buyer' | 'supplier';
  readonly isSystem: boolean;
  readonly atoms: readonly string[];
  readonly modules: readonly string[];
  readonly verbs: readonly RoleVerb[];
  readonly surfacedCount: number;
  /** i18n keys — the display strings are prose and belong to the locale layer. */
  readonly nameKey: string;
  readonly descriptionKey: string;
}

export function deriveRoleViews(): readonly RoleView[] {
  const wired = new Set(WIRED_COMMAND_TARGETS as readonly string[]);
  const all = getKnownFlows().flatMap((f) =>
    f.transitions.map((t) => ({
      id: t.id,
      entity: f.entity,
      requiredRole: t.requiredRole,
      surfaced: t.surfaceable.surfaced,
      wired: wired.has(f.entity),
    })),
  );
  const buyerSide = new Set<string>(PERSONA_SYSTEM_ROLES.buyer);

  return (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).map((id) => {
    const atoms = SYSTEM_ROLES[id];
    const verbs = all.filter((t) => atoms.includes(t.requiredRole));
    return {
      id,
      side: buyerSide.has(id) ? 'buyer' : 'supplier',
      isSystem: isSystemRole(id),
      atoms,
      modules: [...new Set(verbs.map((v) => v.entity))].sort(),
      verbs,
      surfacedCount: verbs.filter((v) => v.surfaced).length,
      nameKey: `roles.owner.${id}`,
      descriptionKey: `roles.desc.${id}`,
    };
  });
}

export function findRoleView(id: string): RoleView | undefined {
  return deriveRoleViews().find((r) => r.id === id);
}

/**
 * The catalogue-level totals. DERIVED, so a role added tomorrow moves them
 * without anybody editing a tile — the property that makes a KPI worth showing.
 */
export function roleTotals(views: readonly RoleView[]) {
  const permissions = new Set(views.flatMap((v) => v.atoms));
  const actions = new Set(views.flatMap((v) => v.verbs.map((x) => x.id)));
  return { roles: views.length, permissions: permissions.size, actions: actions.size };
}

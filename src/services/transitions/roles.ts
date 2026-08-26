// ────────────────────────────────────────────────────────────────────────────
// Persona → transition-role mapping (v2.2 Step 3.7), now DERIVED.
//
// Transition metadata names a `requiredRole` (namespaced, e.g. `po:confirm`).
// This module answers "which atoms does a PERSONA span?" — a TENANCY question,
// kept because `nextActorFrom`, `catalogView` and ~14 specs ask it.
//
// ⚠️ **`PERSONA_ROLES` IS NO LONGER THE AUTHORISATION SOURCE, AND IS NO LONGER
// AUTHORED.** It is now DERIVED from `SYSTEM_ROLES` × `PERSONA_SYSTEM_ROLES`
// (`businessRoles.ts`), so it cannot drift from the bundles a session actually
// holds — the `FLOOR-IN-PROSE-01` shape, avoided by construction rather than by
// a second gate. The values it produces are BIT-IDENTICAL to the hand-authored
// table it replaced (asserted in `businessRoles.test.ts` against the catalog),
// which is why every existing membership assertion stays green.
//
// **What changed is who reads it for a permission decision: nobody.** The
// dispatcher's `resolveRoles` now resolves through the SESSION's business roles
// (`session.ts`), not through a persona. A persona spanning 48 atoms was the
// wildcard this arc retired; it survives here only as the question "could
// anybody on this side ever fire this verb?", which is what a persona badge and
// a next-actor line legitimately need.
// ────────────────────────────────────────────────────────────────────────────

import type { PersonaType } from '../../context/CurrentIdentityContext';
import type { QueryScope, CapabilitySet } from '../data/types';
import { getKnownFlows } from './registry';
import { SYSTEM_ROLES, PERSONA_SYSTEM_ROLES, atomsFor } from './businessRoles';

/**
 * Persona → the transition-roles anybody on that side may hold. DERIVED: the
 * union of that persona's system-role bundles. Not an authorisation grant —
 * see the header.
 */
export const PERSONA_ROLES: Record<PersonaType, readonly string[]> = {
  buyer: atomsFor(PERSONA_SYSTEM_ROLES.buyer),
  supplier: atomsFor(PERSONA_SYSTEM_ROLES.supplier),
};

/** The transition-roles a persona spans. */
export function rolesForPersona(persona: PersonaType): readonly string[] {
  return PERSONA_ROLES[persona];
}

/** True if `persona` spans a transition requiring `role` (tenancy, not authority). */
export function personaCan(persona: PersonaType, role: string): boolean {
  return PERSONA_ROLES[persona].includes(role);
}

/** Every requiredRole named across the registered flow catalog (deduped). */
export function catalogRoles(): readonly string[] {
  const roles = new Set<string>();
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) roles.add(t.requiredRole);
  }
  return [...roles].sort();
}

/**
 * The capability set for a scope (Step 3.9): the roles it holds and the
 * transition ids it may initiate.
 *
 * ⚠️ **NOW HONOURS THE SCOPE'S BUSINESS ROLES WHEN IT CARRIES THEM.** A scope
 * with `businessRoles` reports the capabilities of THOSE bundles; a scope
 * without them falls back to the persona span, which is what every read-only
 * caller wants and is exactly the pre-batch answer.
 */
export function capabilitiesFor(scope: QueryScope): CapabilitySet {
  const roles = scope.businessRoles
    ? atomsFor(scope.businessRoles)
    : rolesForPersona(scope.personaType);
  const transitions: string[] = [];
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) {
      if (roles.includes(t.requiredRole)) transitions.push(t.id);
    }
  }
  return { roles, transitions };
}

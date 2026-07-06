// ────────────────────────────────────────────────────────────────────────────
// Role vocabulary + persona→transition-role mapping AS DATA (v2.2 Step 3.7).
//
// Transition metadata names a `requiredRole` (namespaced, e.g. `po:confirm`).
// This module maps each PERSONA to the set of transition-roles it may initiate.
// The mapping is DATA: Phase 4′ OIDC swaps this table for a real IdP claim set,
// never the transition metadata. System/cascade transitions (Paragon-side
// automation) map to `buyer`.
//
// Capabilities (Step 3.9) derive from this table × the flow catalog.
// ────────────────────────────────────────────────────────────────────────────

import type { PersonaType } from '../../context/CurrentIdentityContext';
import type { QueryScope, CapabilitySet } from '../data/types';
import { getKnownFlows } from './registry';

/** Persona → the transition-roles that persona may initiate. */
export const PERSONA_ROLES: Record<PersonaType, readonly string[]> = {
  // Paragon side: PO issuance + system-driven fulfilment/close; ASN logistics
  // (carry) + discrepancy flag (cascade ← GR).
  buyer: ['po:issue', 'po:fulfil', 'po:close', 'asn:carry', 'asn:flag'],
  // Supplier side: view / acknowledge / confirm an incoming PO; create + submit
  // an advance ship notice.
  supplier: ['po:view', 'po:acknowledge', 'po:confirm', 'asn:create', 'asn:submit'],
};

/** The transition-roles a persona may initiate. */
export function rolesForPersona(persona: PersonaType): readonly string[] {
  return PERSONA_ROLES[persona];
}

/** True if `persona` is permitted to initiate a transition requiring `role`. */
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
 * transition ids it may initiate, derived from the persona mapping × catalog.
 */
export function capabilitiesFor(scope: QueryScope): CapabilitySet {
  const roles = rolesForPersona(scope.personaType);
  const transitions: string[] = [];
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) {
      if (roles.includes(t.requiredRole)) transitions.push(t.id);
    }
  }
  return { roles, transitions };
}

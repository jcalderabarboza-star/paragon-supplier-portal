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
  // (carry) + discrepancy flag (cascade ← GR); goods-receipt receiving,
  // inspection, disposition, and the SAP post (GR is a buyer/warehouse document);
  // invoice match (system rollup), approve, pay (SAP release), and dispute.
  buyer: [
    'po:issue', 'po:fulfil', 'po:close',
    'asn:carry', 'asn:flag',
    'gr:receive', 'gr:inspect', 'gr:disposition', 'gr:post',
    'invoice:match', 'invoice:approve', 'invoice:pay', 'invoice:dispute',
    // Sourcing: create (Phase A/2 — retires extraRfqs), publish/close/cancel/
    // reopen an RFQ, award it (cascade source), move a quote into review, and
    // the cascade targets award/reject a quote.
    'rfq:create', 'rfq:publish', 'rfq:close', 'rfq:award', 'rfq:cancel', 'rfq:reopen',
    'quotation:review', 'quotation:award', 'quotation:reject',
    // F0.4 — the 5 remaining lifecycle machines (author-unwired, no surface yet;
    // mapped so the catalog-coverage invariant holds — a contract-level
    // permission surface, DNA-SEED-01; no UI consumer, no CommandTarget).
    'contract:draft', 'contract:activate', 'contract:renew', 'contract:terminate',
    'obligation:track', 'obligation:complete',
    'pr:create', 'pr:submit', 'pr:approve', 'pr:reject', 'pr:source', 'pr:convert',
    'shipment:create', 'shipment:advance', // system/cascade (TMS-owned, INT-TMS-01)
    'supplierdoc:request', 'supplierdoc:verify', 'supplierdoc:reject', // verify/reject = system
    // I3.1 — canonical compliance machine (census #11–15). verify/reject = system
    // (verification pipeline). Author-unwired; catalog-coverage only.
    'compliance:verify', 'compliance:reject',
    // SDC-2a — RequirementResponse buyer lifecycle (authored-unwired; the P2
    // planner's evaluation lane, mapped for catalog-coverage).
    'requirementresponse:review', 'requirementresponse:accept', 'requirementresponse:dispute',
    // C4c — the buyer RECORDING verb (ruled option (d)): a planner records an SOH
    // assertion a supplier made over an ungoverned channel. A DISTINCT buyer role,
    // NOT the supplier's ':declare' (the b1 trap — widening ':declare' onto the
    // buyer would make recorded-vs-self-submitted unrecoverable from the role
    // layer). The target sets requireCreationOwner (C4b) so the subject supplier ×
    // material is relationship-anchored even under a buyer scope.
    'inventorydeclaration:record',
  ],
  // Supplier side: view / acknowledge / confirm an incoming PO; create + submit
  // an advance ship notice; draft + submit an invoice against its own PO; submit
  // a quotation against an invited RFQ (authored-unwired until the quote batch);
  // upload a requested compliance document (F0.4, author-unwired).
  supplier: [
    'po:view', 'po:acknowledge', 'po:confirm',
    'asn:create', 'asn:submit',
    'invoice:submit',
    'quotation:submit',
    'supplierdoc:submit',
    'compliance:submit', // I3.1 — supplier submits a cert for a required cell
    // SDC-2a — confirm a published forecast line fanned to THIS supplier (the
    // wired creation verb; also names the authored-unwired draft promotion).
    'requirementresponse:submit',
    // SDC-2b-EXT — acknowledge a visibility-only line (the no-commitment
    // response verb; class-guarded 1:1 with the visibility class).
    'requirementresponse:acknowledge',
    // SDC-3a — the two additional supplier-submission objects on the session.
    // declare + report are WIRED creation verbs; the shipment advance verbs
    // (ship/arrive/cancel) are authored-unwired, mapped for catalog coverage
    // (a supplier updates its OWN report — supplier-owned when they wire).
    'inventorydeclaration:declare',
    'incomingshipment:report',
    'incomingshipment:ship', 'incomingshipment:arrive', 'incomingshipment:cancel',
  ],
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

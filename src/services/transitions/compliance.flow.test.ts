// ────────────────────────────────────────────────────────────────────────────
// I3.1 — the ONE canonical compliance machine (census #11–15 collapsed).
//
// Author-unwired contract completeness, like the F0.4 five — with one deliberate
// difference: this machine has NO creation transition. A required cert is born
// `Missing` (the supplier × material × cert requirement grid implies it); nothing
// mints it. So it is tested here, not in `remainingFlows.test.ts` (whose
// "exactly one creation" invariant does not apply).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  getFlow,
  getTransition,
  validateFlow,
  rolesForPersona,
  personaCan,
  cascadesFor,
  complianceFlow,
} from './index';
import { MockCommandService } from '../data/mock/MockCommandService';
import type { QueryScope } from '../data/types';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

// Clock-derived display states (law 0.5 / census G1) — MUST NOT be transition-
// states; they are computed in `complianceProjection.ts`.
const PROJECTIONS_EXCLUDED = ['Expiring', 'Expired'];

describe('compliance flow — registration + structure', () => {
  it('registered, valid, correct initial + states (transition-states only)', () => {
    expect(getFlow('compliance')).toBe(complianceFlow);
    expect(validateFlow(complianceFlow)).toEqual({ ok: true, errors: [] });
    expect(complianceFlow.initial).toBe('Missing');
    expect([...complianceFlow.states]).toEqual(['Missing', 'Under Review', 'Valid']);
  });

  it('excludes clock projections from the transition table (law 0.5)', () => {
    for (const projected of PROJECTIONS_EXCLUDED) {
      expect(complianceFlow.states).not.toContain(projected);
      for (const t of complianceFlow.transitions) expect(t.to).not.toBe(projected);
    }
  });

  it('has NO creation transition — Missing is the natural born-state', () => {
    const creations = complianceFlow.transitions.filter((t) => t.trigger === 'creation');
    expect(creations).toHaveLength(0);
    // Every transition names ≥1 declared from-state.
    for (const t of complianceFlow.transitions) {
      expect(t.from.length).toBeGreaterThan(0);
      for (const s of t.from) expect(complianceFlow.states).toContain(s);
    }
  });

  it('the 3-edge substrate matches census §4 (submit / verify / reject)', () => {
    expect(getTransition('t_compliance_submit')!.trigger).toBe('user');
    expect(getTransition('t_compliance_verify')!.trigger).toBe('system');
    expect(getTransition('t_compliance_reject')!.trigger).toBe('system');
    expect(getTransition('t_compliance_submit')!.to).toBe('Under Review');
    expect(getTransition('t_compliance_verify')!.to).toBe('Valid');
    expect(getTransition('t_compliance_reject')!.to).toBe('Missing');
  });
});

describe('compliance flow — roles are catalog-covered', () => {
  it('every requiredRole is initiable by some persona', () => {
    const assigned = new Set([...rolesForPersona('buyer'), ...rolesForPersona('supplier')]);
    for (const t of complianceFlow.transitions) expect(assigned.has(t.requiredRole)).toBe(true);
  });

  it('supplier owns compliance:submit; verify/reject are buyer (system)', () => {
    expect(personaCan('supplier', 'compliance:submit')).toBe(true);
    expect(personaCan('buyer', 'compliance:submit')).toBe(false);
    expect(personaCan('buyer', 'compliance:verify')).toBe(true);
    expect(personaCan('buyer', 'compliance:reject')).toBe(true);
    expect(personaCan('supplier', 'compliance:verify')).toBe(false);
  });
});

describe('compliance flow — inert (author-unwired, no CommandTarget/cascade)', () => {
  it('declares no cascade sources', () => {
    for (const t of complianceFlow.transitions) expect(cascadesFor(t.id)).toEqual([]);
  });

  it('dispatch fails UNKNOWN_ENTITY — nothing is wired (SIMULATED)', async () => {
    const svc = new MockCommandService();
    const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
    const res = await svc.dispatch(buyer, {
      transitionId: 't_compliance_verify',
      entity: 'compliance',
      entityId: 'creg-0001',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNKNOWN_ENTITY:compliance/);
  });
});

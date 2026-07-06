import { describe, it, expect } from 'vitest';

import {
  getKnownFlows,
  getFlow,
  getTransition,
  purchaseOrderFlow,
} from './index';
import { FlowRegistry } from './registry';
import { validateFlow, assertValidFlow } from './validate';
import {
  getRegisteredPolicyHooks,
  isRegisteredPolicyHook,
  POLICY_HOOKS,
} from './policyHooks';
import type { FlowDefinition, TransitionDef } from './schema';

// A minimal, valid two-state flow used as a mutation base for the error cases.
function baseFlow(): FlowDefinition {
  return {
    entity: 'sample',
    version: 1,
    states: ['A', 'B'],
    initial: 'A',
    transitions: [
      { id: 't_sample_create', from: [], to: 'A', trigger: 'creation', requiredRole: 'sample:create', requiredFields: [], policyHooks: [], version: 1 },
      { id: 't_sample_advance', from: ['A'], to: 'B', trigger: 'user', requiredRole: 'sample:advance', requiredFields: ['note'], policyHooks: [], version: 1 },
    ],
  };
}

function withTransition(flow: FlowDefinition, patch: Partial<TransitionDef>): FlowDefinition {
  const [creation] = flow.transitions;
  return { ...flow, transitions: [creation, { ...flow.transitions[1], ...patch }] };
}

describe('seeded registry (getKnownFlows)', () => {
  it('enumerates the shipped PO flow', () => {
    const flows = getKnownFlows();
    expect(flows.map((f) => f.entity)).toContain('purchaseOrder');
  });

  it('resolves the PO flow and its transitions by id', () => {
    expect(getFlow('purchaseOrder')).toBe(purchaseOrderFlow);
    expect(getTransition('t_po_confirm')?.to).toBe('Confirmed');
    expect(getTransition('t_nope')).toBeUndefined();
  });

  it('ships a valid PO flow', () => {
    expect(validateFlow(purchaseOrderFlow)).toEqual({ ok: true, errors: [] });
  });

  it('the PO-confirm proof transition carries the qty payload + a registered hook', () => {
    const confirm = getTransition('t_po_confirm')!;
    expect(confirm.trigger).toBe('user');
    expect(confirm.from).toEqual(['Acknowledged']);
    expect(confirm.requiredFields).toContain('confirmedQuantities');
    expect(confirm.policyHooks).toContain(POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED);
    for (const hook of confirm.policyHooks) expect(isRegisteredPolicyHook(hook)).toBe(true);
  });
});

describe('policy-hook registry', () => {
  it('registers the seed hooks and rejects unknown names', () => {
    expect(getRegisteredPolicyHooks()).toContain('po_confirm_qty_within_ordered');
    expect(isRegisteredPolicyHook('not_a_hook')).toBe(false);
  });
});

describe('validateFlow — structural rules', () => {
  it('accepts a well-formed flow', () => {
    expect(validateFlow(baseFlow()).ok).toBe(true);
  });

  it('rejects an initial state that is not declared', () => {
    const r = validateFlow({ ...baseFlow(), initial: 'Z' });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/initial 'Z' is not a declared state/);
  });

  it('rejects a from-state that is not declared', () => {
    const r = validateFlow(withTransition(baseFlow(), { from: ['Q'] }));
    expect(r.errors.join()).toMatch(/'from' state 'Q' is not declared/);
  });

  it('rejects a to-state that is not declared', () => {
    const r = validateFlow(withTransition(baseFlow(), { to: 'Q' }));
    expect(r.errors.join()).toMatch(/'to' state 'Q' is not declared/);
  });

  it('rejects a creation transition with a non-empty from', () => {
    const bad = withTransition(baseFlow(), { trigger: 'creation', from: ['A'] });
    expect(validateFlow(bad).errors.join()).toMatch(/creation transitions must have an empty 'from'/);
  });

  it('rejects a non-creation transition with an empty from', () => {
    const bad = withTransition(baseFlow(), { trigger: 'user', from: [] });
    expect(validateFlow(bad).errors.join()).toMatch(/require at least one 'from' state/);
  });

  it('rejects a malformed transition id', () => {
    const bad = withTransition(baseFlow(), { id: 'advance' });
    expect(validateFlow(bad).errors.join()).toMatch(/id must match t_<entity>_<verb>/);
  });

  it('rejects a non-namespaced requiredRole', () => {
    const bad = withTransition(baseFlow(), { requiredRole: 'advance' });
    expect(validateFlow(bad).errors.join()).toMatch(/is not a namespaced transition-role/);
  });

  it('rejects an unregistered policy hook', () => {
    const bad = withTransition(baseFlow(), { policyHooks: ['ghost_hook'] });
    expect(validateFlow(bad).errors.join()).toMatch(/policy hook 'ghost_hook' is not registered/);
  });

  it('rejects a non-positive version', () => {
    const bad = withTransition(baseFlow(), { version: 0 });
    expect(validateFlow(bad).errors.join()).toMatch(/version must be a positive integer/);
  });

  it('law 0.5: rejects a clock trigger even from an untyped caller', () => {
    // Cast simulates a JS caller bypassing the type-level ban (compile guard
    // lives in schema.ts). Runtime defence-in-depth must still reject it.
    const bad = withTransition(baseFlow(), { trigger: 'clock' as unknown as TransitionDef['trigger'] });
    expect(validateFlow(bad).errors.join()).toMatch(/'clock' trigger is forbidden \(law 0\.5/);
  });

  it('assertValidFlow throws an aggregated message on a malformed flow', () => {
    expect(() => assertValidFlow({ ...baseFlow(), initial: 'Z' })).toThrow(/Invalid flow 'sample'/);
  });
});

describe('FlowRegistry — admission + global uniqueness', () => {
  it('registers a valid flow and enumerates it', () => {
    const reg = new FlowRegistry();
    reg.register(baseFlow());
    expect(reg.getKnownFlows().map((f) => f.entity)).toEqual(['sample']);
    expect(reg.getTransition('t_sample_advance')?.to).toBe('B');
  });

  it('refuses to register a malformed flow', () => {
    const reg = new FlowRegistry();
    expect(() => reg.register({ ...baseFlow(), initial: 'Z' })).toThrow(/Invalid flow/);
  });

  it('refuses a duplicate entity key', () => {
    const reg = new FlowRegistry();
    reg.register(baseFlow());
    expect(() => reg.register(baseFlow())).toThrow(/already registered/);
  });

  it('refuses a transition id already owned by another flow', () => {
    const reg = new FlowRegistry();
    reg.register(baseFlow());
    const clash: FlowDefinition = {
      ...baseFlow(),
      entity: 'other',
      transitions: [
        { id: 't_other_create', from: [], to: 'A', trigger: 'creation', requiredRole: 'other:create', requiredFields: [], policyHooks: [], version: 1 },
        // Reuses 't_sample_advance' — must be refused.
        { id: 't_sample_advance', from: ['A'], to: 'B', trigger: 'user', requiredRole: 'other:advance', requiredFields: [], policyHooks: [], version: 1 },
      ],
    };
    expect(() => reg.register(clash)).toThrow(/already registered by flow 'sample'/);
  });
});

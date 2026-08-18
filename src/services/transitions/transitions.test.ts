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
    terminals: ['B'],
    transitions: [
      { id: 't_sample_create', from: [], to: 'A', trigger: 'creation', requiredRole: 'sample:create', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
      { id: 't_sample_advance', from: ['A'], to: 'B', trigger: 'user', requiredRole: 'sample:advance', requiredFields: ['note'], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
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
    expect(confirm.from).toEqual(['Sent', 'Viewed', 'Acknowledged']);
    expect(confirm.requiredFields).toContain('confirmedQuantities');
    expect(confirm.policyHooks).toContain(POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED);
    for (const hook of confirm.policyHooks) expect(isRegisteredPolicyHook(hook)).toBe(true);
  });

  // CP-0 · W1 · 2e-b-4a — the transition schema is a SPEC ARTIFACT for the SE
  // Team, so the required floor is locked here rather than left to the mock's
  // integration specs. The RFQ-create floor mirrors the other two creation verbs
  // that carry a quantity: an event nobody can quote against must not be
  // raisable, by ANY producer, including one that skips the wizard entirely.
  it('the creation verbs that carry a quantity all REQUIRE it (t_rfq_create joins the floor)', () => {
    expect(getTransition('t_rfq_create')!.requiredFields).toEqual([
      'title',
      'materialCategory',
      'totalQty',
    ]);
    // The two verbs it mirrors — same canon, stated together so a future edit to
    // one is visibly out of step with the others.
    expect(getTransition('t_pr_create')!.requiredFields).toContain('quantity');
    expect(getTransition('t_inventorydeclaration_declare')!.requiredFields).toContain(
      'totalQty',
    );
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
        { id: 't_other_create', from: [], to: 'A', trigger: 'creation', requiredRole: 'other:create', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
        // Reuses 't_sample_advance' — must be refused.
        { id: 't_sample_advance', from: ['A'], to: 'B', trigger: 'user', requiredRole: 'other:advance', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
      ],
    };
    expect(() => reg.register(clash)).toThrow(/already registered by flow 'sample'/);
  });
});

// ── CP-0 · 2e-c-3 — statePreserving, the fact-recording transition ───────────
//
// Some governed facts are recorded ON an entity without moving it: an FX pin is
// legal on an Open RFQ and on a Closed one, and must leave both where they are.
// `to` is a single value, so any concrete choice would move the entity for the
// other from-state — declaring `from: ['Open','Closed'], to: 'Open'` would
// silently REOPEN a Closed RFQ every time a buyer recorded a rate.
//
// Routing such a fact around the dispatcher was the alternative, and it is
// worse: the dispatcher is the only path to the DR-10 audit trail, and a
// governed fact recorded outside the trail is what the trail exists to prevent.
describe('validateFlow — statePreserving transitions', () => {
  it('accepts a state-preserving transition whose `to` is one of its `from`s', () => {
    const flow = withTransition(baseFlow(), {
      from: ['A', 'B'],
      to: 'A',
      statePreserving: true,
    });
    expect(validateFlow(flow).ok).toBe(true);
  });

  it('REJECTS one whose `to` is not a from-state — the declaration would lie', () => {
    // The metadata is read as executable spec. A declared destination the
    // dispatcher will never take the entity to is a false statement about the
    // machine, even though nothing would visibly break at runtime.
    const flow = withTransition(baseFlow(), {
      from: ['A'],
      to: 'B',
      statePreserving: true,
    });
    const r = validateFlow(flow);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/statePreserving requires 'to'/);
  });

  it('REJECTS it on a creation — there is no prior state to preserve', () => {
    const flow: FlowDefinition = {
      ...baseFlow(),
      transitions: [
        {
          id: 't_sample_create',
          from: [],
          to: 'A',
          trigger: 'creation',
          requiredRole: 'sample:create',
          requiredFields: [],
          policyHooks: [],
          statePreserving: true,
          surfaceable: { surfaced: true },
          version: 1,
        },
      ],
    };
    const r = validateFlow(flow);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/creation transition cannot be statePreserving/);
  });

  it('is OPT-IN — an ordinary transition is unaffected', () => {
    const t = baseFlow().transitions[1];
    expect(t.statePreserving).toBeUndefined();
    expect(validateFlow(baseFlow()).ok).toBe(true);
  });

  it('the shipped RFQ pin verb declares it, and validates', () => {
    const rfq = getKnownFlows().find((f) => f.entity === 'rfq')!;
    const pin = rfq.transitions.find((t) => t.id === 't_rfq_fx_pin')!;
    expect(pin.statePreserving).toBe(true);
    expect(pin.from).toEqual(['Open', 'Closed']);
    expect(pin.to).toBe('Open');
    expect(pin.requiredRole).toBe('rfq:fx-pin');
    expect(pin.requiredFields).toEqual(['quote', 'rate', 'asOf', 'source']);
    expect(pin.policyHooks).toContain(POLICY_HOOKS.RFQ_FX_PIN_WELL_FORMED);
    expect(validateFlow(rfq)).toEqual({ ok: true, errors: [] });
  });
});

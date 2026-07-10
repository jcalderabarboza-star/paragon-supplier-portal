import { describe, it, expect } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  resolvePolicyHook,
  flowRegistry,
  type CommandTarget,
  type CascadeCommand,
} from './index';

// Two synthetic flows: a source that flags, and a target that alerts via a
// `cascade` trigger. Registered on THIS file's isolated registry (vitest
// isolates files) so they never leak into the catalog-role census.
flowRegistry.register({
  entity: 'srcx',
  version: 1,
  states: ['Open', 'Flagged'],
  initial: 'Open',
  transitions: [
    { id: 't_srcx_flag', from: ['Open'], to: 'Flagged', trigger: 'user', requiredRole: 'srcx:flag', requiredFields: [], policyHooks: [], version: 1 },
  ],
});
flowRegistry.register({
  entity: 'dstx',
  version: 1,
  states: ['Live', 'Alerted'],
  initial: 'Live',
  transitions: [
    { id: 't_dstx_alert', from: ['Live'], to: 'Alerted', trigger: 'cascade', requiredRole: 'dstx:alert', requiredFields: [], policyHooks: [], version: 1 },
  ],
});

function wire(dstInitial: string) {
  const src = new Map([['s-1', { status: 'Open' }]]);
  const dst = new Map([['d-1', { status: dstInitial }]]);
  const mk = (m: Map<string, { status: string }>): CommandTarget => ({
    readState: (id) => m.get(id)?.status ?? null,
    readScopeOwner: () => null,
    readEntity: (id) => m.get(id) ?? null,
    applyTransition: (id, to) => { const e = m.get(id); if (e) e.status = to; },
  });
  const targets: Record<string, CommandTarget> = { srcx: mk(src), dstx: mk(dst) };
  const sink = new InMemoryAuditSink();
  let n = 0;
  const d = createDispatcher({
    resolveRoles: () => ['srcx:flag', 'dstx:alert'],
    target: (e) => targets[e],
    resolvePolicyHook,
    sink,
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => 'T',
    cascade: (ctx): CascadeCommand[] =>
      ctx.transitionId === 't_srcx_flag'
        ? [{ entity: 'dstx', entityId: 'd-1', transitionId: 't_dstx_alert' }]
        : [],
  });
  return { d, sink, src, dst };
}

describe('dispatcher — cross-entity cascade fan-out (census G4)', () => {
  it('a successful source transition fans out onto the linked target', () => {
    const { d, sink, src, dst } = wire('Live');
    const res = d.dispatch(
      { personaType: 'buyer', supplierId: null },
      { transitionId: 't_srcx_flag', entity: 'srcx', entityId: 's-1' },
    );
    expect(res.status).toBe('done');
    expect(src.get('s-1')!.status).toBe('Flagged');
    expect(dst.get('d-1')!.status).toBe('Alerted'); // cascade fired
    expect(sink.byEvent('t_dstx_alert')).toHaveLength(1); // its own event
  });

  it('a cascaded transition carries causationId = the source correlationId, keeping its own (DR-10, Option A)', () => {
    const { d, sink } = wire('Live');
    const res = d.dispatch(
      { personaType: 'buyer', supplierId: null },
      { transitionId: 't_srcx_flag', entity: 'srcx', entityId: 's-1' },
    );
    const srcEvent = sink.byEvent('t_srcx_flag')[0];
    const dstEvent = sink.byEvent('t_dstx_alert')[0];
    // Top-level command: no causation. Cascaded command: grouped to the source's
    // correlationId — yet still its OWN correlationId (getCommandStatus stays 1:1).
    expect(srcEvent.causationId).toBeUndefined();
    expect(dstEvent.causationId).toBe(res.correlationId);
    expect(dstEvent.correlationId).not.toBe(res.correlationId);
  });

  it('an illegal cascade is best-effort — the source still succeeds', () => {
    const { d, src, dst } = wire('Alerted'); // already alerted → cascade illegal
    const res = d.dispatch(
      { personaType: 'buyer', supplierId: null },
      { transitionId: 't_srcx_flag', entity: 'srcx', entityId: 's-1' },
    );
    expect(res.status).toBe('done'); // source unaffected
    expect(src.get('s-1')!.status).toBe('Flagged');
    expect(dst.get('d-1')!.status).toBe('Alerted'); // unchanged (no legal transition)
  });
});

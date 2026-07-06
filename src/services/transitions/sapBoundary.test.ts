import { describe, it, expect } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  resolvePolicyHook,
  flowRegistry,
  type CommandTarget,
} from './index';

// A synthetic flow with a sapBoundary transition — no shipped verb is one yet
// (the first is GR "Posted to SAP", Phase 2.2′). Registered on THIS file's
// isolated registry singleton so it never leaks into the catalog-role census.
flowRegistry.register({
  entity: 'widget',
  version: 1,
  states: ['New', 'Posted'],
  initial: 'New',
  transitions: [
    { id: 't_widget_create', from: [], to: 'New', trigger: 'creation', requiredRole: 'widget:create', requiredFields: [], policyHooks: [], version: 1 },
    { id: 't_widget_post', from: ['New'], to: 'Posted', trigger: 'system', requiredRole: 'widget:post', requiredFields: [], policyHooks: [], sapBoundary: true, version: 1 },
  ],
});

describe('dispatcher — SAP-boundary submitted→settle (Step 3.5)', () => {
  it('a sapBoundary command holds submitted, then settles to done', () => {
    const rows = new Map([['w-1', { status: 'New' }]]);
    const target: CommandTarget = {
      readState: (id) => rows.get(id)?.status ?? null,
      readScopeOwner: () => null, // buyer-only entity
      readEntity: (id) => rows.get(id) ?? null,
      applyTransition: (id, to) => { const e = rows.get(id); if (e) e.status = to; },
    };
    const sink = new InMemoryAuditSink();
    let n = 0;
    const d = createDispatcher({
      resolveRoles: () => ['widget:post'],
      target: () => target,
      resolvePolicyHook,
      sink,
      nextCorrelationId: () => `cmd_${++n}`,
      now: () => '2026-07-06T00:00:00.000Z',
    });

    const res = d.dispatch(
      { personaType: 'buyer', supplierId: null },
      { transitionId: 't_widget_post', entity: 'widget', entityId: 'w-1' },
    );
    expect(res.status).toBe('submitted');
    expect(d.getCommandStatus(res.correlationId)?.status).toBe('submitted');
    expect(rows.get('w-1')!.status).toBe('Posted'); // state moved; SAP ref pending

    const settled = d.settle(res.correlationId);
    expect(settled?.status).toBe('done');
    expect(d.getCommandStatus(res.correlationId)?.status).toBe('done');
  });
});

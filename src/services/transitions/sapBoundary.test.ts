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
// PF-0 · D-2 — a sapBoundary verb must now DECLARE where settlement lands it,
// and `settlesTo` must differ from `to`: the interim/settled split IS Option B,
// and a settlement that lands where the dispatch already put the entity is not
// one. This fixture therefore gained the interim state it always implied.
flowRegistry.register({
  entity: 'widget',
  version: 1,
  states: ['New', 'Posting', 'Posted'],
  initial: 'New',
  terminals: ['Posted'],
  transitions: [
    { id: 't_widget_create', from: [], to: 'New', trigger: 'creation', requiredRole: 'widget:create', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_widget_post', from: ['New'], to: 'Posting', trigger: 'system', requiredRole: 'widget:post', requiredFields: [], policyHooks: [], sapBoundary: true, settlesTo: 'Posted', surfaceable: { surfaced: true }, version: 1 },
  ],
});

// A gadget flow with an explicit submitted-INTERIM state (Option B): the post
// moves to 'Posting', and settle finalizes it to 'Posted' + assigns a ref. This
// is the canonical shape the real GR "Posted to SAP" verb uses.
flowRegistry.register({
  entity: 'gadget',
  version: 1,
  states: ['Ready', 'Posting', 'Posted'],
  initial: 'Ready',
  terminals: ['Posted'],
  transitions: [
    { id: 't_gadget_post', from: ['Ready'], to: 'Posting', trigger: 'system', requiredRole: 'gadget:post', requiredFields: [], policyHooks: [], sapBoundary: true, settlesTo: 'Posted', surfaceable: { surfaced: true }, version: 1 },
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
    expect(rows.get('w-1')!.status).toBe('Posting'); // interim — SAP ref pending

    const settled = d.settle(res.correlationId);
    expect(settled?.status).toBe('done');
    expect(d.getCommandStatus(res.correlationId)?.status).toBe('done');
    // ⚠️ PF-0 · D-2 — `settlesTo: 'Posted'` is DECLARED and NOTHING READS IT.
    // No `settleFinalize` is configured here, so the entity stays in the interim
    // state while the command reads `done`. Pinned deliberately: the declaration
    // is a contract a graph can check, NOT an executable rule, and a reader who
    // assumed otherwise would be wrong in the direction that flatters us.
    expect(rows.get('w-1')!.status).toBe('Posting');
  });

  it('Option B: settle runs the registered finalize — interim→terminal + real ref', () => {
    const rows = new Map([['g-1', { status: 'Ready', ref: null as string | null }]]);
    const target: CommandTarget = {
      readState: (id) => rows.get(id)?.status ?? null,
      readScopeOwner: () => null,
      readEntity: (id) => rows.get(id) ?? null,
      applyTransition: (id, to) => { const e = rows.get(id); if (e) e.status = to; },
    };
    let n = 0;
    const d = createDispatcher({
      resolveRoles: () => ['gadget:post'],
      target: () => target,
      resolvePolicyHook,
      sink: new InMemoryAuditSink(),
      nextCorrelationId: () => `cmd_${++n}`,
      now: () => '2026-07-06T00:00:00.000Z',
      settleFinalize: ({ transitionId, entityId }) => {
        if (transitionId === 't_gadget_post') {
          const e = rows.get(entityId);
          if (e) { e.status = 'Posted'; e.ref = 'REF-1'; }
        }
      },
    });

    const res = d.dispatch(
      { personaType: 'buyer', supplierId: null },
      { transitionId: 't_gadget_post', entity: 'gadget', entityId: 'g-1' },
    );
    expect(res.status).toBe('submitted');
    expect(rows.get('g-1')!.status).toBe('Posting'); // interim — not yet Posted
    expect(rows.get('g-1')!.ref).toBeNull(); // ref pending

    d.settle(res.correlationId);
    expect(rows.get('g-1')!.status).toBe('Posted'); // finalize advanced it
    expect(rows.get('g-1')!.ref).toBe('REF-1'); // real ref assigned on settle
  });
});

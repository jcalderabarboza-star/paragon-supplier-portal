// ─────────────────────────────────────────────────────────────────────────────
// §43 · THE SETTLEMENT IS A RECORDED EVENT.
//
// ⚠️ **RULE 4 IS THE ORGANISING PRINCIPLE OF THIS FILE, NOT A GARNISH.** A catch
// that never fires and a catch that fires and records nothing are
// indistinguishable from a green suite — and so are a settle that records and a
// settle that does not, if the only assertion is "the failure branch emits".
// So the FIRST test proves the known-GOOD path records, and every failure
// assertion below counts events RELATIVE to that proven baseline.
//
// The defect this pins: `deps.sink.emit` appeared exactly ONCE in the whole
// dispatcher, inside `finish()`. `settle()` never called it, so a `sapBoundary`
// verb's SECOND act — the one the async split exists for — left no trace on
// either path, success included.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  resolvePolicyHook,
  flowRegistry,
  type CommandTarget,
  type Dispatcher,
  type SettleContext,
} from './index';
import { DataError } from '../data/types';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

// A synthetic sapBoundary flow on THIS file's isolated registry (vitest isolates
// files), so it never enters the catalog-role census.
flowRegistry.register({
  entity: 'sbox',
  version: 1,
  states: ['Ready', 'Posting', 'Posted'],
  initial: 'Ready',
  terminals: ['Posted'],
  transitions: [
    { id: 't_sbox_post', from: ['Ready'], to: 'Posting', trigger: 'system', requiredRole: 'sbox:post', requiredFields: [], policyHooks: [], sapBoundary: true, settlesTo: 'Posted', surfaceable: { surfaced: true }, version: 1 },
    { id: 't_sbox_cancel', from: ['Ready'], to: 'Posted', trigger: 'user', requiredRole: 'sbox:none', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
  ],
});

const SCOPE = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer } as const;

function wire(finalize?: (ctx: SettleContext) => void): {
  d: Dispatcher;
  sink: InMemoryAuditSink;
  rows: Map<string, { status: string; ref: string | null }>;
} {
  const rows = new Map([['s-1', { status: 'Ready', ref: null as string | null }]]);
  const target: CommandTarget = {
    readState: (id) => rows.get(id)?.status ?? null,
    readScopeOwner: () => null,
    readEntity: (id) => rows.get(id) ?? null,
    applyTransition: (id, to) => {
      const e = rows.get(id);
      if (e) e.status = to;
    },
  };
  const sink = new InMemoryAuditSink();
  let n = 0;
  const d = createDispatcher({
    resolveRoles: () => ['sbox:post'],
    target: () => target,
    resolvePolicyHook,
    sink,
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => '2026-08-13T00:00:00.000Z',
    ...(finalize ? { settleFinalize: finalize } : {}),
  });
  return { d, sink, rows };
}

const post = (d: Dispatcher) =>
  d.dispatch(SCOPE, { transitionId: 't_sbox_post', entity: 'sbox', entityId: 's-1' });

describe('§43 — the settlement is a recorded event', () => {
  it('KNOWN-GOOD FIRST: a successful settle emits, under the SAME correlationId', () => {
    const { d, sink } = wire(({ entityId }) => {
      void entityId;
    });
    const res = post(d);
    expect(res.status).toBe('submitted');
    // One event so far — the submission.
    expect(sink.byEvent('t_sbox_post')).toHaveLength(1);

    d.settle(res.correlationId);

    const events = sink.byEvent('t_sbox_post');
    expect(events.map((e) => e.outcome)).toEqual(['submitted', 'done']);
    // ONE command, ONE correlationId, TWO acts — which is what Option B already
    // promised in prose and what `getCommandStatus` staying 1:1 requires.
    expect(new Set(events.map((e) => e.correlationId))).toEqual(new Set([res.correlationId]));
    // The settlement is the SAP callback, not a fresh user act: it carries the
    // ORIGINATING scope forward rather than inventing a `system:sap` actor.
    expect(events[1].actor).toBe('buyer:all');
    expect(events[1].reason).toBeUndefined();
  });

  it('records even with NO settleFinalize registered — the act happened either way', () => {
    const { d, sink } = wire();
    const res = post(d);
    d.settle(res.correlationId);
    expect(sink.byEvent('t_sbox_post').map((e) => e.outcome)).toEqual(['submitted', 'done']);
  });

  it('is idempotent and does NOT double-record', () => {
    const { d, sink } = wire();
    const res = post(d);
    d.settle(res.correlationId);
    d.settle(res.correlationId);
    d.settle(res.correlationId);
    expect(sink.byEvent('t_sbox_post')).toHaveLength(2);
  });

  it('the pending context is registered for EVERY submitted command', () => {
    // The dispatcher's `if (!ctx)` branch is unreachable by construction, and
    // this is what keeps it unreachable: a finalize that never runs would mean
    // `pending` lost the entry, and the settle path would have silently
    // reverted to its pre-§43 shape.
    let ran = 0;
    const { d } = wire(() => {
      ran += 1;
    });
    const res = post(d);
    d.settle(res.correlationId);
    expect(ran).toBe(1);
  });

  describe('the failure branch — record, then rethrow', () => {
    it('records a TRANSPORT fault and rethrows unchanged', () => {
      const boom = new DataError('UPSTREAM', 'gateway said nothing');
      const { d, sink } = wire(() => {
        throw boom;
      });
      const res = post(d);

      expect(() => d.settle(res.correlationId)).toThrow(boom);

      const events = sink.byEvent('t_sbox_post');
      expect(events.map((e) => e.outcome)).toEqual(['submitted', 'failed']);
      expect(events[1].reason).toBe('TRANSPORT:UPSTREAM');
      expect(events[1].correlationId).toBe(res.correlationId);
    });

    it('records an UNGOVERNED fault for a bare Error — the registry throw shape', () => {
      const { d, sink } = wire(() => {
        // Verbatim the shape `registry.ts:25` raises.
        throw new Error("flow 'sbox' is already registered");
      });
      const res = post(d);
      expect(() => d.settle(res.correlationId)).toThrow(/already registered/);
      expect(sink.byEvent('t_sbox_post')[1].reason).toBe('UNGOVERNED:Error');
    });

    it('records a REFUSED fault for a code the dispatcher itself throws', () => {
      const { d, sink } = wire(() => {
        throw new DataError('NOT_FOUND', 'gone');
      });
      const res = post(d);
      expect(() => d.settle(res.correlationId)).toThrow();
      expect(sink.byEvent('t_sbox_post')[1].reason).toBe('REFUSED:NOT_FOUND');
    });

    it('leaves the command SUBMITTED, so the offered retry is a real remedy', () => {
      // ⚠️ THIS IS THE ASSERTION THE UI STRING DEPENDS ON. Pre-§43 the status
      // flipped to `done` BEFORE the finalize ran, so a retry after a failure
      // found a settled command and silently no-opped — a "try again" that does
      // nothing is a dead end wearing a remedy's clothes
      // (`HALAL-REFUSAL-DEAD-ENDS-01`).
      let attempts = 0;
      const { d, sink, rows } = wire((ctx) => {
        attempts += 1;
        if (attempts === 1) throw new DataError('UPSTREAM', 'gateway said nothing');
        const row = rows.get(ctx.entityId);
        if (row) {
          row.status = 'Posted';
          row.ref = 'REF-1';
        }
      });
      const res = post(d);

      expect(() => d.settle(res.correlationId)).toThrow();
      expect(d.getCommandStatus(res.correlationId)?.status).toBe('submitted');
      expect(rows.get('s-1')!.status).toBe('Posting');

      // The remedy, exercised.
      const settled = d.settle(res.correlationId);
      expect(settled?.status).toBe('done');
      expect(rows.get('s-1')!.status).toBe('Posted');
      expect(rows.get('s-1')!.ref).toBe('REF-1');
      expect(sink.byEvent('t_sbox_post').map((e) => e.outcome)).toEqual([
        'submitted',
        'failed',
        'done',
      ]);
    });
  });

  it('a failed DISPATCH now carries its reason on the event too', () => {
    // The same field, populated uniformly — otherwise the two settle classes
    // would be the only failures in the ledger that say why, which is an
    // arbitrary line through one taxonomy.
    const { d, sink } = wire();
    const res = d.dispatch(SCOPE, {
      transitionId: 't_sbox_cancel',
      entity: 'sbox',
      entityId: 's-1',
    });
    expect(res.status).toBe('failed');
    const ev = sink.byEvent('t_sbox_cancel')[0];
    expect(ev.outcome).toBe('failed');
    expect(ev.reason).toBe(res.reason);
    expect(ev.reason).toContain('ROLE_NOT_PERMITTED');
  });
});

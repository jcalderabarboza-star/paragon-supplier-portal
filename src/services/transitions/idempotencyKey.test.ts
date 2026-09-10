// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// H2a — THE INGRESS REPLAY KEY.
//
// ⚠️ **WHAT THIS IS FOR, IN ONE LINE: the same EXTERNAL EVENT must not raise a
// second act.** Not "the same command must not run twice" — that is a different
// property with a different answer, and the last describe here asserts the
// boundary between them rather than leaving it to a comment.
//
// ── WHY A NEW FIELD AND NOT A NEW LOOKUP ────────────────────────────────────
//   `correlationId` is minted INSIDE the dispatcher (`deps.nextCorrelationId()`,
//   one call site) and `statuses` / `pending` / `owners` are all keyed by it.
//   Every one of them answers *"what happened to a command WE issued?"* —
//   idempotency for a RESPONSE. `settle(scope, correlationId)` is exactly that:
//   a SAP callback resolved against the command it settles.
//
//   The absent case is the mirror: an event THEY receive, turned into a command
//   we never issued. No existing key is under the caller's control, so a
//   redelivery had nothing to collide with. That makes it a new field AND a new
//   lookup — neither alone is sufficient, which is what the first describe
//   below pins.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { mockDataService } from '../data/mock/mockDataService';
import type { CommandInput, QueryScope } from '../data/types';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';

const ROOT = process.cwd();

const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};

/** A distinct key per test, so no spec can be made to pass by another's ledger. */
let n = 0;
const freshKey = () => `evt-${Date.now().toString(36)}-${++n}`;

/** A verb a buyer may fire repeatedly on distinct entities. */
function rfqCreate(extra: Partial<CommandInput> = {}): CommandInput {
  return {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: { title: 'Replay probe', materialCategory: 'Packaging', totalQty: 100 },
    ...extra,
  };
}

describe('POPULATION CONTROL — the verb under test really raises an act', () => {
  it('a keyless dispatch succeeds and mints an entity — otherwise everything below is vacuous', async () => {
    const r = await mockDataService.commands.dispatch(buyer, rfqCreate());
    expect(r.status).not.toBe('failed');
    expect(r.entityId).toBeTruthy();
    expect(r.correlationId).toBeTruthy();
  });
});

describe('THE REPLAY — a redelivered event returns the FIRST result', () => {
  it('the same key twice raises ONE act and returns the SAME correlationId and entityId', async () => {
    const key = freshKey();
    const first = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: key }));
    const second = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: key }));

    expect(first.status).not.toBe('failed');
    // The whole property: the second call did not raise a second act.
    expect(second.correlationId).toBe(first.correlationId);
    expect(second.entityId).toBe(first.entityId);
    expect(second.status).toBe(first.status);
  });

  // ⚠️ THE OTHER DIRECTION. A check that refuses everything would satisfy the
  // assertion above by never raising a second act for ANY input.
  it('⚠️ KNOWN-GOOD: two DIFFERENT keys raise TWO acts — the check is not refusing everything', async () => {
    const a = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: freshKey() }));
    const b = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: freshKey() }));

    expect(a.status).not.toBe('failed');
    expect(b.status).not.toBe('failed');
    expect(b.correlationId).not.toBe(a.correlationId);
    expect(b.entityId).not.toBe(a.entityId);
  });

  it('the replay is a RESULT, not a refusal — an at-least-once transport must not be told to retry', async () => {
    const key = freshKey();
    const first = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: key }));
    const second = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: key }));

    expect(second.status).not.toBe('failed');
    expect(second.reason).toBeUndefined();
    expect(second.status).toBe(first.status);
  });
});

describe('OPT-IN — absent, nothing changes (the `expectedState` precedent)', () => {
  it('two keyless dispatches raise TWO acts — omitting the key is not a silent dedupe', async () => {
    const a = await mockDataService.commands.dispatch(buyer, rfqCreate());
    const b = await mockDataService.commands.dispatch(buyer, rfqCreate());
    expect(a.correlationId).not.toBe(b.correlationId);
    expect(a.entityId).not.toBe(b.entityId);
  });

  it('an EMPTY key is treated as absent, never as a key everything shares', async () => {
    const a = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: '' }));
    const b = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: '' }));
    expect(a.status).not.toBe('failed');
    expect(b.correlationId).not.toBe(a.correlationId);
    expect(b.entityId).not.toBe(a.entityId);
  });
});

describe('A FAILED COMMAND RAISED NO ACT, so its key does not bind', () => {
  it('a refused dispatch is not recorded — the redelivery is free to try again', async () => {
    const key = freshKey();
    // Refused at the ROLE gate: a scope carrying no businessRoles.
    const denied = await mockDataService.commands.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: [] },
      rfqCreate({ idempotencyKey: key }),
    );
    expect(denied.status).toBe('failed');

    // Same key, now from a scope that may act: it must RAISE, not replay.
    const retried = await mockDataService.commands.dispatch(buyer, rfqCreate({ idempotencyKey: key }));
    expect(retried.status).not.toBe('failed');
    expect(retried.correlationId).not.toBe(denied.correlationId);
    expect(retried.entityId).toBeTruthy();
  });
});

describe('⚠️ THE KEY NAMESPACE IS PER-TENANT — a replay cannot cross a boundary', () => {
  it('the same key under a DIFFERENT tenancy raises its own act rather than reading the first', async () => {
    const key = freshKey();
    const supplierA: QueryScope = {
      personaType: 'supplier',
      supplierId: 'sup-007',
      businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    };
    const supplierB: QueryScope = { ...supplierA, supplierId: 'sup-002' };

    const declare = (sid: string) => ({
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: {
        supplierId: sid,
        certType: 'Halal',
        certNumber: 'PROBE-0001',
        issuer: 'MUI',
        issuedOn: '2026-01-01',
        scopeText: 'Replay probe',
      },
      idempotencyKey: key,
    });

    const a = await mockDataService.commands.dispatch(supplierA, declare('sup-007'));
    const b = await mockDataService.commands.dispatch(supplierB, declare('sup-002'));

    // CONTROL: both really acted, so the comparison below is not over failures.
    expect(a.status).not.toBe('failed');
    expect(b.status).not.toBe('failed');
    // The property: B was never handed A's result, despite the identical key.
    expect(b.correlationId).not.toBe(a.correlationId);
    expect(b.entityId).not.toBe(a.entityId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE BOUNDARY (e) — this must NOT become a general dedupe over user actions.
//
// A person pressing approve twice is a DIFFERENT problem, and this platform
// already answers it with refusals: `STALE_STATE` (the opt-in compare-and-set),
// `ILLEGAL_TRANSITION` (the machine), and the delivery verbs' `ALREADY_*`. Those
// stay refusals on purpose — somebody who clicked twice has to be TOLD the
// second click did nothing, and handing them "already done" hides it.
//
// The mechanical boundary is that no user surface supplies a key. Asserted from
// source rather than remembered, so the day a page starts passing one, this
// fires instead of the property quietly widening.
// ─────────────────────────────────────────────────────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe('⚠️ THE BOUNDARY — an ingress key, never a user-action dedupe', () => {
  const files = walk(join(ROOT, 'src'));

  it('CONTROL — the source walk is populated and finds the dispatcher itself', async () => {
    expect(files.length).toBeGreaterThan(400);
    expect(files.some((f) => f.endsWith('dispatcher.ts'))).toBe(true);
  });

  it('no page, component or hook supplies an idempotencyKey', async () => {
    const offenders = files
      .filter((f) => !/[\\/]__tests__[\\/]|\.test\.tsx?$/.test(f))
      .filter((f) => /[\\/](pages-v2|components|hooks)[\\/]/.test(f))
      .filter((f) => /idempotencyKey\s*:/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });

  it('KNOWN-BAD CONTROL — the matcher DOES see the token where it really occurs', async () => {
    const declaring = files
      .filter((f) => /idempotencyKey\??\s*:/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length + 1));
    // The type declares it and this spec passes it; a matcher finding NOTHING
    // would make the assertion above vacuously green.
    expect(declaring.length).toBeGreaterThan(0);
    expect(declaring.some((f) => f.includes('types.ts'))).toBe(true);
  });

  it('the cascade fan-out passes no key — a cascade is not an ingress', async () => {
    const src = readFileSync(join(ROOT, 'src/services/transitions/dispatcher.ts'), 'utf8');
    // The re-dispatch inside the fan-out builds its CommandInput inline.
    const fanOut = /transitionId: c\.transitionId[\s\S]{0,200}?\}/.exec(src)?.[0] ?? '';
    expect(fanOut).not.toBe('');
    expect(fanOut).not.toMatch(/idempotencyKey/);
  });
});

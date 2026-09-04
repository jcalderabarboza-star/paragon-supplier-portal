// ─────────────────────────────────────────────────────────────────────────────
// §87 · `settle` GETS A GATE, AND THE READ RETURNS `null`.
//
// ⚠️ **WHAT THIS FILE IS ACTUALLY ABOUT, STATED FIRST BECAUSE THE NAME
// UNDERSELLS IT.** The finding that opened this batch was posed as a read
// oracle: `getCommandStatus` ignores its scope and correlation ids are
// sequential, so a caller could read the status of a command it did not issue.
// **Measured, that read discloses nothing that names a tenant** — `CommandStatus`
// is four fields (`correlationId`, `transitionId`, `status`, `ts`), deliberately
// narrower than `CommandResult` beside it — and `getCommandStatus` had **zero
// callers** anywhere in the tree.
//
// What was actually there is on the other method. `settle` is a state-advancing
// WRITE: it runs `settleFinalize`, which advances an invoice to
// 'Payment Released' and mints an FI document, a payment reference and a
// payment date; it emits a DR-10 event under `ctx.scope` — the ORIGINATING
// scope — so a stranger's act is recorded against the issuer's name; and its
// fall-through `return current ?? null` discloses everything the read oracle
// did. It sat behind **no gate of any kind**, the only state-advancing path in
// this tree that did.
//
// ── ⚠️ RULE 4 IS THE ORGANISING PRINCIPLE, AND THE SECOND DIRECTION IS THE
//    WHOLE POINT ─────────────────────────────────────────────────────────────
//   A gate that refuses EVERYONE passes a one-directional probe: every
//   "foreign caller is refused" assertion goes green, and the suite reads like a
//   working gate while the product is broken. So the KNOWN-GOOD arms come
//   FIRST here — the issuer settles, the machine grant settles, the issuer
//   reads back — and every refusal assertion below is made against that proven
//   baseline. Both directions are mutation-probed; the probe transcript is in
//   the batch report.
//
// ── ⚠️ AND THE REFUSAL IS `null`, NOT `SCOPE_DENIED` (operator ruling) ───────
//   A loud refusal here would rebuild, one door over, exactly what §86 closed:
//   an existence oracle by refusal KIND. `null` already means "no such
//   command", and that collision IS the remedy. `#not-a-refusal` below is that
//   ruling made checkable — it asserts nothing throws AND that a real foreign
//   id is indistinguishable from an id that was never minted.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import {
  createDispatcher,
  InMemoryAuditSink,
  resolvePolicyHook,
  flowRegistry,
  type CommandTarget,
  type Dispatcher,
} from './index';
import { AUTOMATION_ROLE, PERSONA_SYSTEM_ROLES } from './businessRoles';
import type { QueryScope } from '../data/types';

// A synthetic sapBoundary flow on THIS file's isolated registry (vitest isolates
// files), so it never enters the catalog-role census. `settlesTo` differs from
// `to`, which is what makes the interim→terminal advance observable: the whole
// point of a foreign settle is that it MOVES something.
flowRegistry.register({
  entity: 'vault',
  version: 1,
  states: ['Ready', 'Posting', 'Posted'],
  initial: 'Ready',
  terminals: ['Posted'],
  transitions: [
    {
      id: 't_vault_post',
      from: ['Ready'],
      to: 'Posting',
      trigger: 'system',
      requiredRole: 'vault:post',
      requiredFields: [],
      policyHooks: [],
      sapBoundary: true,
      settlesTo: 'Posted',
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
});

// ── THE FOUR SCOPES. Two tenancies, plus the machine. ────────────────────────
const BUYER: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
const SUP_A: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
};
const SUP_B: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
};
// ⚠️ The machine grant, in the shape the cascade fan-out already uses
// (`dispatcher.ts` — the ONE other site that names it). It is NOT a
// `SystemRoleId`, holds no `SYSTEM_ROLES` entry, and is never assignable to a
// person; `businessRoles.test.ts` pins all three. Used here as a CALLER-IDENTITY
// marker, not as an atom grant — `AUTOMATION_ATOMS` holds neither `gr:post` nor
// `invoice:pay`, so this arm grants nothing `atomsFor` would grant.
const MACHINE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [AUTOMATION_ROLE],
};

function wire(): {
  d: Dispatcher;
  sink: InMemoryAuditSink;
  rows: Map<string, { status: string; ref: string | null }>;
} {
  const rows = new Map([['v-1', { status: 'Ready', ref: null as string | null }]]);
  const target: CommandTarget = {
    readState: (id) => rows.get(id)?.status ?? null,
    // Owner-less by construction — the ENTITY's ownership is not what this file
    // is about. `readScopeOwner: () => null` denies every supplier at the scope
    // gate (§86), so every dispatch below is a BUYER dispatch and the tenancy
    // being tested is the COMMAND's, recorded by `owners`, not the entity's.
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
    resolveRoles: () => ['vault:post'],
    target: () => target,
    resolvePolicyHook,
    sink,
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => '2026-09-04T00:00:00.000Z',
    settleFinalize: ({ transitionId, entityId }) => {
      if (transitionId === 't_vault_post') {
        const e = rows.get(entityId);
        if (e) {
          e.status = 'Posted';
          e.ref = 'SAP-REF-1';
        }
      }
    },
  });
  return { d, sink, rows };
}

const post = (d: Dispatcher, scope: QueryScope) =>
  d.dispatch(scope, { transitionId: 't_vault_post', entity: 'vault', entityId: 'v-1' });

describe('POPULATION — the probe has something to settle', () => {
  // ⚠️ Derived from the REGISTRY, which sits above every dispatcher predicate,
  // so a mutation to the gate cannot collapse this control (§86). A gate spec
  // whose population is derived through the code under test goes red on its own
  // control while the assertion it exists to make never executes.
  it('the synthetic flow really is a sapBoundary verb with a distinct settlesTo', () => {
    const t = flowRegistry.getFlow('vault')?.transitions.find((x) => x.id === 't_vault_post');
    expect(t, 'the fixture must exist before its behaviour means anything').toBeTruthy();
    expect(t!.sapBoundary).toBe(true);
    expect(t!.settlesTo).toBe('Posted');
    expect(t!.settlesTo).not.toBe(t!.to); // else "it advanced" is unobservable
  });
});

describe('KNOWN-GOOD FIRST — the gate ACCEPTS the callers it must', () => {
  it('the ISSUER settles: the entity advances and the real ref is minted', () => {
    const { d, rows } = wire();
    const res = post(d, BUYER);
    expect(res.status).toBe('submitted');
    expect(rows.get('v-1')!.status).toBe('Posting'); // interim
    expect(rows.get('v-1')!.ref).toBeNull();

    const settled = d.settle(BUYER, res.correlationId);

    expect(settled?.status).toBe('done');
    expect(rows.get('v-1')!.status).toBe('Posted');
    expect(rows.get('v-1')!.ref).toBe('SAP-REF-1');
  });

  it('the MACHINE GRANT settles a command it did not issue — the Phase-3 webhook', () => {
    // ⚠️ THIS ARM IS WHY THE GATE IS NOT `scope === issuer`. `ICommandService`
    // documents `settle` as the SAP settlement callback — *"Phase-3 implements
    // it as the integration webhook"* — and a webhook does not run under the
    // issuing user's scope. Gating on the issuer alone would make the contract's
    // own stated implementation impossible.
    const { d, rows } = wire();
    const res = post(d, BUYER);

    const settled = d.settle(MACHINE, res.correlationId);

    expect(settled?.status).toBe('done');
    expect(rows.get('v-1')!.status).toBe('Posted');
    expect(rows.get('v-1')!.ref).toBe('SAP-REF-1');
  });

  it('the ISSUER reads its own command back', () => {
    // The control that makes every `toBeNull()` below mean something: without
    // it, a gate returning null to EVERYONE would pass this whole file.
    const { d } = wire();
    const res = post(d, BUYER);
    expect(d.getCommandStatus(BUYER, res.correlationId)?.status).toBe('submitted');
    expect(d.getCommandStatus(MACHINE, res.correlationId)?.status).toBe('submitted');
  });
});

describe('THE WRITE DOOR — a foreign scope advances nothing', () => {
  it('a FOREIGN settle does not advance the entity and does not mint a ref', () => {
    // ⚠️ THE NAMED TEST THE MUTATION PROBE FIRES. Delete the `mayReach` guard in
    // `settle` and this is what goes red: the foreign caller advances the
    // entity to 'Posted' and mints 'SAP-REF-1' — which, on the shipped invoice
    // path, is 'Payment Released' plus a real FI document and today's date.
    const { d, rows } = wire();
    const res = post(d, BUYER);

    const out = d.settle(SUP_A, res.correlationId);

    expect(out).toBeNull();
    expect(rows.get('v-1')!.status).toBe('Posting'); // NOT advanced
    expect(rows.get('v-1')!.ref).toBeNull(); // no SAP reference minted
  });

  it('a FOREIGN settle records nothing — the audit does not gain a stranger act', () => {
    // The event `settle` emits carries `ctx.scope`, the ORIGINATING scope. So an
    // ungated foreign settle is not merely an unauthorised write: it is one
    // recorded against the issuer's name. Counted relative to the proven
    // baseline of one `submitted` event.
    const { d, sink } = wire();
    const res = post(d, BUYER);
    expect(sink.byEvent('t_vault_post')).toHaveLength(1);

    d.settle(SUP_B, res.correlationId);

    expect(sink.byEvent('t_vault_post')).toHaveLength(1);
    expect(sink.byEvent('t_vault_post').map((e) => e.outcome)).toEqual(['submitted']);
  });

  it('a foreign settle leaves the command settleable BY THE ISSUER afterwards', () => {
    // A refusal must not consume the act. If the gate swallowed the pending
    // context, the legitimate settle that follows would silently no-op — the
    // dead-end-wearing-a-remedy's-clothes shape.
    const { d, rows } = wire();
    const res = post(d, BUYER);
    d.settle(SUP_A, res.correlationId);
    const settled = d.settle(BUYER, res.correlationId);
    expect(settled?.status).toBe('done');
    expect(rows.get('v-1')!.status).toBe('Posted');
  });
});

describe('THE READ DOOR — and the fall-through, which is the same door', () => {
  it('a FOREIGN read returns null', () => {
    const { d } = wire();
    const res = post(d, BUYER);
    expect(d.getCommandStatus(SUP_A, res.correlationId)).toBeNull();
    expect(d.getCommandStatus(SUP_B, res.correlationId)).toBeNull();
  });

  it("settle's FALL-THROUGH is scoped too — a settled command is not a read hole", () => {
    // `settle` ends `return current ?? null`, which disclosed a `CommandStatus`
    // for any id whose command is not `submitted`. Gating only the mutation
    // would have left the WRITE door telling callers what the READ door had
    // just stopped telling them.
    const { d } = wire();
    const res = post(d, BUYER);
    d.settle(BUYER, res.correlationId); // now 'done' — the fall-through path

    expect(d.settle(SUP_A, res.correlationId)).toBeNull();
    // and the issuer still gets it, so the null above is not universal
    expect(d.settle(BUYER, res.correlationId)?.status).toBe('done');
  });

  it('one supplier cannot reach another supplier’s command', () => {
    // The buyer-vs-supplier split is the easy half. This is the half that needs
    // `supplierId` in the comparison rather than `personaType` alone.
    const { d } = wire();
    // A supplier-issued command, minted directly so the entity scope gate (which
    // denies every supplier on an owner-less target) is not what is under test.
    const supRes = createSupplierCommand();
    expect(supRes.owner.supplierId).toBe('sup-002');
    expect(supRes.d.getCommandStatus(SUP_A, supRes.id)?.status).toBe('done');
    expect(supRes.d.getCommandStatus(SUP_B, supRes.id)).toBeNull();
    expect(supRes.d.settle(SUP_B, supRes.id)).toBeNull();
    void d;
  });
});

describe('#not-a-refusal — ruling 1, made checkable', () => {
  it('a foreign read THROWS NOTHING — it must not become an oracle by refusal kind', () => {
    // ⚠️ A `SCOPE_DENIED` here would rebuild on the read path exactly what §86
    // closed on the write path. This asserts the shape of the refusal, not only
    // that one happened.
    const { d } = wire();
    const res = post(d, BUYER);
    expect(() => d.getCommandStatus(SUP_A, res.correlationId)).not.toThrow();
    expect(() => d.settle(SUP_A, res.correlationId)).not.toThrow();
  });

  it('a real foreign id is INDISTINGUISHABLE from an id that was never minted', () => {
    // This is the oracle-closure assertion, and it is an EQUALITY rather than
    // two separate nulls: the two questions must have one answer.
    const { d } = wire();
    const res = post(d, BUYER);

    const foreignReal = d.getCommandStatus(SUP_A, res.correlationId);
    const neverMinted = d.getCommandStatus(SUP_A, 'cmd_99999');
    expect(foreignReal).toEqual(neverMinted);
    expect(foreignReal).toBeNull();

    expect(d.settle(SUP_A, res.correlationId)).toEqual(d.settle(SUP_A, 'cmd_99999'));
  });

  it('an unminted id is null for the ISSUER too — null is not the foreigner’s marker', () => {
    // If "never minted" threw or behaved differently for a legitimate caller,
    // the equality above would be doing no work.
    const { d } = wire();
    post(d, BUYER);
    expect(d.getCommandStatus(BUYER, 'cmd_99999')).toBeNull();
    expect(() => d.getCommandStatus(BUYER, 'cmd_99999')).not.toThrow();
  });
});

// A supplier-issued command on an owner-ED target, so the supplier clears the
// entity scope gate and the dispatcher records a SUPPLIER scope as the owner.
function createSupplierCommand(): { d: Dispatcher; id: string; owner: QueryScope } {
  flowRegistryEnsureCrate();
  const rows = new Map([['c-1', { status: 'Ready', owner: 'sup-002' }]]);
  const target: CommandTarget = {
    readState: (id) => rows.get(id)?.status ?? null,
    readScopeOwner: (id) => rows.get(id)?.owner ?? null,
    readEntity: (id) => rows.get(id) ?? null,
    applyTransition: (id, to) => {
      const e = rows.get(id);
      if (e) e.status = to;
    },
  };
  let n = 0;
  const d = createDispatcher({
    resolveRoles: () => ['crate:ship'],
    target: () => target,
    resolvePolicyHook,
    sink: new InMemoryAuditSink(),
    nextCorrelationId: () => `sup_${++n}`,
    now: () => '2026-09-04T00:00:00.000Z',
  });
  const res = d.dispatch(SUP_A, { transitionId: 't_crate_ship', entity: 'crate', entityId: 'c-1' });
  expect(res.status, 'the supplier dispatch must SUCCEED or this fixture proves nothing').toBe(
    'done',
  );
  return { d, id: res.correlationId, owner: SUP_A };
}

function flowRegistryEnsureCrate(): void {
  if (flowRegistry.getFlow('crate')) return;
  flowRegistry.register({
    entity: 'crate',
    version: 1,
    states: ['Ready', 'Shipped'],
    initial: 'Ready',
    terminals: ['Shipped'],
    transitions: [
      {
        id: 't_crate_ship',
        from: ['Ready'],
        to: 'Shipped',
        trigger: 'user',
        requiredRole: 'crate:ship',
        requiredFields: [],
        policyHooks: [],
        surfaceable: { surfaced: true },
        version: 1,
      },
    ],
  });
}

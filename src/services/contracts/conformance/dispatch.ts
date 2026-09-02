// ─────────────────────────────────────────────────────────────────────────────
// C1 · THE DISPATCH CONFORMANCE FACTORY — the authorisation and precondition
// contract as a CLIENT CAN OBSERVE IT, runnable against any `IDataService`.
//
// ── ⚠️ WHAT GREEN HERE DOES NOT PROVE ───────────────────────────────────────
//   Stated first, as the house form now requires.
//
//     · **GREEN AGAINST THE MOCK PROVES THE FACTORY RUNS, NOT THAT THE CONTRACT
//       IS SUFFICIENT.** These assertions were written against the mock, so it
//       passing is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01` by construction. The
//       evidence it CONSTRAINS is the leak probe recorded in the batch that
//       built it.
//     · **IT DOES NOT TEST THE DISPATCHER.** It cannot, and that is the central
//       measurement of 1b. `createDispatcher` is FRAMEWORK-AGNOSTIC SHARED CODE
//       — C1 says the mock and the Phase-F1 adapter "share it unchanged", and
//       `MockCommandService` does exactly that. A suite that re-ran the
//       dispatcher's own algorithm against a second implementation would be
//       testing the same module twice under two labels: green for everyone who
//       imports it, which certifies nothing. What VARIES per implementation is
//       the `CommandTarget` set wired behind it — and targets are not on
//       `IDataService`, so they are observable only through `dispatch`. **That
//       is what this file asserts: the OBSERVABLE consequences of an
//       implementation's wiring, never the dispatcher's internals.**
//     · **IT IS A FLOOR.** Six atoms and two flows are exercised. An
//       implementation can pass every assertion here and still mis-wire a verb
//       this file does not name.
//     · **IT SAYS NOTHING ABOUT LEGALITY, POLICY HOOKS, CASCADES OR SETTLE.**
//       Those are dispatcher-module concerns with their own specs, and they do
//       not lift — see the batch report for the derived partition.
//
// ── ⚠️ HOW IT ACQUIRES AN ENTITY TO ACT ON, AND WHY THERE IS NO SEED SEAM ───
//   A conformance suite must act on a real entity in a known state. The obvious
//   answers are a seeding METHOD on `ICommandService`, or a second seeding
//   interface. **Both were measured and neither is needed.** This factory
//   DISCOVERS its entity through the READ half of the same interface —
//   `getBuyerInvoices` exposes `lifecycleState`, `getRFQs` exposes `status` —
//   so an HTTP implementation satisfies it with **zero additions**, because the
//   reads already exist and are already scoped.
//
//   ⚠️ **THE FIELD MATTERS AND THE OBVIOUS ONE IS WRONG.** The invoice DTO
//   carries BOTH `status` and `lifecycleState`. `status` is a DISPLAY value
//   (`Overdue`, `Disputed`, `Payment Released`) and the machine state is
//   `lifecycleState`. Filtering on `status` finds **zero** `Approved` invoices
//   while two exist. A discovery keyed on the wrong field reports an empty
//   population and reads as "your fixture is missing data" (§42).
//
//   The measured BOUNDARY, stated because a discovery that silently cannot see
//   a state is worse than one that admits it: discovery reaches only states the
//   READ half exposes. For invoices that is 4 of the store's 5 — a `Draft`
//   invoice exists in the store and is NOT returned by any read, so no
//   conformance assertion can be written against one. `entities` below is the
//   escape hatch for exactly that case.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { IDataService, QueryScope } from '../../data/types';

/**
 * WHAT AN IMPLEMENTATION MUST SUPPLY. **This set IS the contract.**
 */
export interface DispatchConformanceTarget {
  readonly service: IDataService;
  /**
   * Three buyer seats. `procurement` and `finance` must be NARROW (a single
   * lane each); `full` holds every buyer role.
   *
   * ⚠️ The segregation assertions are vacuous if `procurement` and `finance`
   * hold the same atoms, so the factory asserts they differ before using them.
   */
  readonly roles: {
    readonly procurement: readonly string[];
    readonly finance: readonly string[];
    readonly full: readonly string[];
  };
  /**
   * Restore the implementation to its seeded state. Called before every test.
   *
   * ⚠️ **REQUIRED, AND IT IS THE ONE REAL COST THIS FACTORY IMPOSES.** Two of
   * the assertions below are known-GOOD controls that SUCCEED, and a success
   * mutates. Without isolation they consume the very entities the later
   * refusal assertions need, and the suite becomes order-dependent — which is
   * a suite that passes for the wrong reason. A mock resets its stores; an HTTP
   * harness re-seeds its test database. **It is deliberately NOT a method on
   * `ICommandService`**: a production command interface must not carry a
   * test-only backdoor that mints or rewinds state.
   */
  readonly reset: () => void | Promise<void>;
  /**
   * OPTIONAL override for entity acquisition, for an implementation whose reads
   * cannot reach a required state. Omitted, the factory discovers by reading.
   */
  readonly entities?: {
    readonly releasableInvoiceId?: string;
    readonly anyRfqId?: string;
  };
}

const seat = (roles: readonly string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
});

const BUYER_READ: QueryScope = { personaType: 'buyer', supplierId: null };

/**
 * The dispatch contract, as a suite. Call once per implementation.
 *
 * @param label names the implementation in every test title.
 * @param make  returns the target; called once in `beforeAll`, may be async.
 */
export function describeDispatchConformance(
  label: string,
  make: () => DispatchConformanceTarget | Promise<DispatchConformanceTarget>,
): void {
  let t: DispatchConformanceTarget;
  let svc: IDataService;
  let procurement: QueryScope;
  let finance: QueryScope;
  let fullBuyer: QueryScope;

  beforeAll(async () => {
    t = await make();
    svc = t.service;
    procurement = seat(t.roles.procurement);
    finance = seat(t.roles.finance);
    fullBuyer = seat(t.roles.full);
  });

  beforeEach(async () => {
    await t.reset();
  });

  /** An invoice parked where a release is legal — discovered, not seeded. */
  const releasableInvoiceId = async (): Promise<string> => {
    if (t.entities?.releasableInvoiceId) return t.entities.releasableInvoiceId;
    const items = (await svc.procurement.getBuyerInvoices(BUYER_READ)).items as unknown as {
      id: string;
      lifecycleState?: string;
    }[];
    const approved = items.find((i) => i.lifecycleState === 'Approved');
    expect(
      approved,
      'no invoice with lifecycleState "Approved" is READABLE from this implementation — the ' +
        'release assertions cannot run. Supply `entities.releasableInvoiceId` if the state exists ' +
        'but is not exposed by a read.',
    ).toBeDefined();
    return approved!.id;
  };

  const anyRfqId = async (): Promise<string> => {
    if (t.entities?.anyRfqId) return t.entities.anyRfqId;
    const items = (await svc.procurement.getRFQs(BUYER_READ)).items as unknown as { id: string }[];
    expect(items.length, 'no RFQ is readable from this implementation').toBeGreaterThan(0);
    return items[0].id;
  };

  describe(`${label} — dispatch contract: the acquisition preconditions hold`, () => {
    it('the lanes are genuinely narrow, and genuinely different', () => {
      // Without this the segregation assertions below are vacuous: two seats
      // holding the same atoms cannot demonstrate a split.
      const p = new Set(t.roles.procurement);
      const f = new Set(t.roles.finance);
      expect([...f].some((r) => !p.has(r)) || [...p].some((r) => !f.has(r))).toBe(true);
      expect(t.roles.full.length).toBeGreaterThanOrEqual(p.size);
    });

    it('an actionable entity is reachable through the READ half alone', async () => {
      // The population control for everything below, and the proof that the
      // discovery seam works — an empty result here would make every refusal
      // assertion pass for the wrong reason.
      expect(await releasableInvoiceId()).toBeTruthy();
      expect(await anyRfqId()).toBeTruthy();
    });
  });

  describe(`${label} — dispatch contract: segregation of duties`, () => {
    it('PROCUREMENT is refused the payment release, by NAME', async () => {
      const id = await releasableInvoiceId();
      const res = await svc.commands.dispatch(procurement, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        payload: {},
      });
      expect(res.status).toBe('failed');
      // The refusal names the ATOM, not the role — so a reader learns which
      // permission was missing rather than merely that something was.
      expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
      // …and the refusal is REAL: the invoice did not move. Read back through
      // the interface rather than a store, because that is what a client can
      // see — the same claim, sourced where a conformance suite can source it.
      const after = (await svc.procurement.getBuyerInvoices(BUYER_READ)).items as unknown as {
        id: string;
        lifecycleState?: string;
      }[];
      expect(after.find((i) => i.id === id)?.lifecycleState).toBe('Approved');
    });

    it('FINANCE is permitted it — the known-GOOD control (§39)', async () => {
      // Without this, the refusal above is equally consistent with a broken
      // harness, an unregistered flow, or a fixture in the wrong state. A guard
      // probed in one direction only ships looking like a working guard.
      const id = await releasableInvoiceId();
      const res = await svc.commands.dispatch(finance, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        payload: {},
      });
      expect(res.status).not.toBe('failed');
      expect(res.reason).toBeUndefined();
    });

    it('and the segregation is MUTUAL — finance cannot award an RFQ', async () => {
      // A split that only narrows one side is not segregation, it is a demotion.
      const res = await svc.commands.dispatch(finance, {
        transitionId: 't_rfq_publish',
        entity: 'rfq',
        entityId: await anyRfqId(),
        payload: {},
      });
      expect(res.status).toBe('failed');
      expect(res.reason).toBe('ROLE_NOT_PERMITTED:rfq:publish');
    });
  });

  describe(`${label} — dispatch contract: there is no persona fallback`, () => {
    it('a scope with NO businessRoles is refused, not silently widened', async () => {
      // THE REGRESSION THIS PINS: falling back to the persona's whole atom set
      // when roles are absent would re-grant every buyer atom to any caller that
      // had not been migrated — the wildcard surviving as a default, which is a
      // wildcard with better manners. A refusal is loud and attributable.
      const res = await svc.commands.dispatch(
        { personaType: 'buyer', supplierId: null } as QueryScope,
        {
          transitionId: 't_invoice_release_payment',
          entity: 'invoice',
          entityId: await releasableInvoiceId(),
          payload: {},
        },
      );
      expect(res.status).toBe('failed');
      expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
    });

    it('an unknown role grants nothing rather than everything', async () => {
      const res = await svc.commands.dispatch(seat(['not-a-real-role']), {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: await releasableInvoiceId(),
        payload: {},
      });
      expect(res.status).toBe('failed');
      expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
    });
  });

  describe(`${label} — dispatch contract: nothing reachable became unreachable`, () => {
    it('the full seat still releases payment', async () => {
      const res = await svc.commands.dispatch(fullBuyer, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: await releasableInvoiceId(),
        payload: {},
      });
      expect(res.status).not.toBe('failed');
    });

    it('the full seat is not ROLE-refused an RFQ publish', async () => {
      const res = await svc.commands.dispatch(fullBuyer, {
        transitionId: 't_rfq_publish',
        entity: 'rfq',
        entityId: await anyRfqId(),
        payload: {},
      });
      // Publishing may be illegal from this fixture's state — what must NOT
      // happen is a ROLE refusal. Legality is a different gate and a different
      // question, and conflating them is how a role bug hides behind a state one.
      expect(res.reason ?? '').not.toMatch(/^ROLE_NOT_PERMITTED/);
    });
  });

  describe(`${label} — dispatch contract: the state precondition (1c) is observable`, () => {
    // NOT lifted — these are new, because 1c landed after the specs this batch
    // partitioned and nothing asserted `expectedState` THROUGH the interface.
    // They are here because `expectedState` is exactly the kind of thing an
    // adapter can wire wrongly while every other assertion stays green.
    it('a stale expectedState is refused with STALE_STATE, naming both states', async () => {
      const id = await releasableInvoiceId();
      const res = await svc.commands.dispatch(finance, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        expectedState: 'a-state-this-entity-is-not-in',
        payload: {},
      });
      expect(res.status).toBe('failed');
      expect(res.reason ?? '').toMatch(/^STALE_STATE:/);
      // The detail is `expected->actual`, so a caller can see what it missed.
      expect(res.reason).toContain('a-state-this-entity-is-not-in->');
    });

    it('the known-GOOD half: the CURRENT state as expectedState does not refuse', async () => {
      // The other direction, and the one that proves the precondition is a
      // comparison rather than a blanket refusal of any caller who supplies it.
      const id = await releasableInvoiceId();
      const res = await svc.commands.dispatch(finance, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        expectedState: 'Approved',
        payload: {},
      });
      expect(res.reason ?? '').not.toMatch(/^STALE_STATE/);
    });

    it('OMITTING expectedState changes nothing — the precondition is opt-in', async () => {
      const id = await releasableInvoiceId();
      const res = await svc.commands.dispatch(finance, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        payload: {},
      });
      expect(res.reason ?? '').not.toMatch(/^STALE_STATE/);
    });
  });
}

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { invoiceStore } from './stores/invoiceStore';
import { rfqStore } from './stores/rfqStore';
import type { QueryScope } from '../types';
import {
  PERSONA_SYSTEM_ROLES,
  AUTOMATION_ROLE,
} from '../../transitions/businessRoles';
import { NO_PERSON } from '../../../context/noPerson';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE FIRST BUYER↔BUYER AUTHORISATION TESTS IN THIS TREE.
//
// Before this arc EVERY `ROLE_NOT_PERMITTED` assertion in the suite was
// buyer↔supplier, and by construction none could be anything else: `resolveRoles`
// was `(scope) => rolesForPersona(scope.personaType)`, so a buyer session held
// all 48 buyer atoms unconditionally. The role gate discriminated at the TENANCY
// boundary and nowhere else — which is why "requiredRole is a control" and
// "authorisation exists" were different claims, and only the first was true.
//
// These are the tests that could not have been written a commit ago.
// ─────────────────────────────────────────────────────────────────────────────

const seat = (roles: readonly string[], supplierId: string | null = null): QueryScope => ({
  personaType: supplierId ? 'supplier' : 'buyer',
  supplierId,
  businessRoles: roles,
  actor: NO_PERSON,
});

const procurement = seat(['procurement']);
const finance = seat(['finance']);
const fullBuyer = seat(PERSONA_SYSTEM_ROLES.buyer);

let svc: MockCommandService;

beforeEach(() => {
  invoiceStore.reset();
  rfqStore.reset();
  svc = new MockCommandService();
});

/** An invoice parked where a release is legal. */
function releasableInvoiceId(): string {
  const approved = invoiceStore.all().find((i) => i.status === 'Approved');
  expect(approved, 'no Approved invoice in the fixtures to release').toBeDefined();
  return approved!.id;
}

describe('POPULATION GUARD — the fixtures still contain what these probe', () => {
  it('there is a releasable invoice and an RFQ to award', () => {
    expect(invoiceStore.all().length).toBeGreaterThan(0);
    expect(rfqStore.all().length).toBeGreaterThan(0);
    expect(releasableInvoiceId()).toMatch(/^inv-/);
  });
});

describe('⚠️ SEGREGATION OF DUTIES, AT THE DISPATCHER', () => {
  it('PROCUREMENT is refused the payment release, by NAME', () => {
    const id = releasableInvoiceId();
    return svc
      .dispatch(procurement, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        payload: {},
      })
      .then((res) => {
        expect(res.status).toBe('failed');
        // The refusal names the ATOM, not the role — so a reader learns which
        // permission was missing rather than merely that something was.
        expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
        // …and the refusal is REAL: the invoice did not move.
        expect(invoiceStore.get(id)!.status).toBe('Approved');
      });
  });

  it('FINANCE is permitted it — the known-GOOD control (§39)', async () => {
    // Without this, the refusal above is equally consistent with a broken
    // harness, an unregistered flow, or a fixture in the wrong state. A guard
    // probed in one direction only ships looking like a working guard.
    const id = releasableInvoiceId();
    const res = await svc.dispatch(finance, {
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
    const rfq = rfqStore.all()[0];
    const res = await svc.dispatch(finance, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: rfq.id,
      payload: {},
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:rfq:publish');
  });
});

describe('⚠️ THERE IS NO PERSONA FALLBACK — the wildcard is gone', () => {
  it('a scope with NO businessRoles is refused, not silently widened', async () => {
    // THE REGRESSION THIS PINS: falling back to `rolesForPersona(personaType)`
    // when roles are absent would re-grant all 48 buyer atoms to any caller
    // that had not been migrated — the wildcard surviving as a default, which
    // is a wildcard with better manners. A refusal is loud and attributable.
    const id = releasableInvoiceId();
    const res = await svc.dispatch(
      { personaType: 'buyer', supplierId: null } as QueryScope,
      {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: id,
        payload: {},
      },
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
  });

  it('an unknown role grants nothing rather than everything', async () => {
    const id = releasableInvoiceId();
    const res = await svc.dispatch(seat(['not-a-real-role']), {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: id,
      payload: {},
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:invoice:pay');
  });

  it('a person cannot hold the automation grant through a persona', () => {
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).not.toContain(AUTOMATION_ROLE);
  });
});

describe('NOTHING REACHABLE BECAME UNREACHABLE FOR A FULL SEAT', () => {
  it('the full buyer seat still releases payment', async () => {
    // The demo seat opens holding all six roles, so the portal behaves exactly
    // as it did before this batch. The narrowing is a CHOICE a person makes,
    // not something the batch imposed on every existing user.
    const id = releasableInvoiceId();
    const res = await svc.dispatch(fullBuyer, {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: id,
      payload: {},
    });
    expect(res.status).not.toBe('failed');
  });

  it('the full buyer seat still publishes an RFQ', async () => {
    const rfq = rfqStore.all()[0];
    const res = await svc.dispatch(fullBuyer, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: rfq.id,
      payload: {},
    });
    // Publishing may be illegal from this fixture's state — what must NOT
    // happen is a ROLE refusal. Legality is a different gate and a different
    // question, and conflating them is how a role bug hides behind a state one.
    expect(res.reason ?? '').not.toMatch(/ROLE_NOT_PERMITTED/);
  });
});

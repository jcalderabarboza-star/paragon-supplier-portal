import { describe, it, expect, beforeEach } from 'vitest';
import { invoiceStore } from './stores/invoiceStore';
import { rfqStore } from './stores/rfqStore';
import {
  PERSONA_SYSTEM_ROLES,
  AUTOMATION_ROLE,
} from '../../transitions/businessRoles';

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
// ── ⚠️ SEVEN OF THIS FILE'S NINE TESTS MOVED AT 1b, AND TWO DID NOT ─────────
//   The segregation-of-duties assertions, the no-persona-fallback pair and the
//   full-seat controls are now
//   `services/contracts/conformance/dispatch.ts`, stated once and runnable
//   against any `IDataService`. They moved because every one of them is a claim
//   about an IMPLEMENTATION's wiring, observable entirely through
//   `commands.dispatch` — which is what a conformance factory can reach.
//
//   **These two stayed, and the reason is mechanical rather than editorial:**
//
//     · the POPULATION GUARD reads `invoiceStore` / `rfqStore` DIRECTLY. That is
//       the point of it — it asks whether the seeded fixtures still contain what
//       the probes need, which is a question about the mock and has no meaning
//       for another implementation. Routed through a read it would become a
//       different assertion.
//     · the AUTOMATION check dispatches nothing at all. It is a statement about
//       a frozen constant — `PERSONA_SYSTEM_ROLES` — so there is no service to
//       parameterise over, and a factory wrapping it would be green against a
//       stub implementing nothing. Same shape as `dataError.contract.test.ts`,
//       and left behind for the same reason.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  invoiceStore.reset();
  rfqStore.reset();
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

describe('⚠️ THERE IS NO PERSONA FALLBACK — the wildcard is gone', () => {
  it('a person cannot hold the automation grant through a persona', () => {
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).not.toContain(AUTOMATION_ROLE);
  });
});

import { describe, it, expect } from 'vitest';
import { mockDataService as svc } from '../data/mock/mockDataService';
import type { QueryScope } from '../data/types';
import { getTransition, SYSTEM_ROLES, SEEDED_SEAT_ROLES } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE SPLIT MEASURED AT THE DISPATCHER, NOT READ OFF THE ROLE TABLE.
//
// The whole batch rests on one measured fact: **the role gate was ALREADY live
// on the supplier side.** `dispatcher.ts` gate (3) is a bare
// `resolveRoles(scope).includes(transition.requiredRole)`, and the only
// `personaType` branches in the file are in gate (2) — the SCOPE gate — and
// both TIGHTEN. There is no persona short-circuit, and `roleMatches` does not
// exist (0 occurrences; control `resolveRoles` = 16).
//
// So a narrowed supplier seat refuses TODAY, and this file proves it end to end
// through the same `mockDataService.commands.dispatch` every surface calls —
// because a unit test of `atomsFor` cannot see a gate that lives downstream.
//
// ⚠️ **AND IT PROVES THE OTHER HALF TOO: NARROWING A ROLE MUST NOT NARROW A
// TENANCY.** Roles govern ACTS; scope governs READS and OWNERSHIP. If a lane
// seat ever started seeing less, the split would have moved a boundary the
// operator did not rule on.
// ─────────────────────────────────────────────────────────────────────────────

const SUP = 'sup-007';
const seat = (roles: readonly string[]): QueryScope => ({
  personaType: 'supplier',
  supplierId: SUP,
  businessRoles: roles,
});

const FULL = seat(SEEDED_SEAT_ROLES.supplier);
const COMMERCIAL_ONLY = seat(['supplier', 'commercial']);
const FULFILMENT_ONLY = seat(['supplier', 'fulfilment']);
const ANCHOR_ONLY = seat(['supplier']);

/** A PO in a state `t_po_confirm` is legal from — DERIVED, never guessed. */
const confirmablePO = async (scope: QueryScope) => {
  const FROM = getTransition('t_po_confirm')!.from;
  expect(FROM.length, 'no from-states — the probe would be vacuous').toBeGreaterThan(0);
  const pos = (await svc.procurement.getPurchaseOrders(scope)).items as {
    id: string;
    status: string;
  }[];
  const target = pos.find((p) => FROM.includes(p.status));
  expect(target, `no PO in ${FROM.join('/')} — the probe would be vacuous`).toBeTruthy();
  return target!;
};

describe('POPULATION GUARD — the premises this file rests on', () => {
  it('the atom under test belongs to fulfilment and not to commercial', () => {
    expect(SYSTEM_ROLES.fulfilment).toContain('po:confirm');
    expect(SYSTEM_ROLES.commercial).not.toContain('po:confirm');
    expect(SYSTEM_ROLES.supplier).toEqual([]);
  });

  it('the seat owns POs at all — an empty fixture reports clean', async () => {
    const page = await svc.procurement.getPurchaseOrders(FULL);
    expect(page.items.length).toBeGreaterThan(0);
  });
});

describe('⚠️ A NARROWED SUPPLIER SEAT IS REFUSED AT THE ROLE GATE', () => {
  // Ordered deliberately: every refusing case runs BEFORE the one that
  // succeeds, because the store is shared and a successful confirm moves the
  // only eligible PO out of its from-state. The first draft of this probe put
  // the success first and the refusal read as "no such PO" — a vacuous pass
  // wearing a refusal's clothes.
  it('a COMMERCIAL-only seat cannot confirm an order, and the reason names the ATOM', async () => {
    const po = await confirmablePO(FULL);
    const res = await svc.commands.dispatch(COMMERCIAL_ONLY, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: po.id,
      payload: { confirmedQuantities: [1] },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:po:confirm/);
  });

  it('a seat holding ONLY the anchor is refused everything', async () => {
    const po = await confirmablePO(FULL);
    const res = await svc.commands.dispatch(ANCHOR_ONLY, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: po.id,
      payload: { confirmedQuantities: [1] },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });

  it('⚠️ …AND THE READS ARE UNTOUCHED — roles govern acts, scope governs sight', async () => {
    // The operator's boundary, pinned: a narrowed seat still SEES everything it
    // owns. If this ever diverges, the split moved a tenancy the ruling did not.
    const full = (await svc.procurement.getPurchaseOrders(FULL)).items.length;
    const narrow = (await svc.procurement.getPurchaseOrders(COMMERCIAL_ONLY)).items.length;
    const anchor = (await svc.procurement.getPurchaseOrders(ANCHOR_ONLY)).items.length;
    expect(narrow).toBe(full);
    expect(anchor).toBe(full);
  });

  it('⚠️ THE TENANCY CHECK STILL REFUSES A FOREIGN DOCUMENT, whichever lanes are held', async () => {
    // The half that is NOT the role gate. `personaType === 'supplier'` in the
    // SCOPE gate is what enforces this, and it is untouched by the split — so a
    // fulfilment seat that CAN confirm still cannot confirm somebody else's PO.
    const buyerScope: QueryScope = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['procurement'],
    };
    const all = (await svc.procurement.getPurchaseOrders(buyerScope)).items as {
      id: string;
      supplierId: string;
    }[];
    const foreign = all.find((p) => p.supplierId !== SUP);
    expect(foreign, 'no foreign PO — the probe would be vacuous').toBeTruthy();
    await expect(
      svc.commands.dispatch(FULFILMENT_ONLY, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: foreign!.id,
        payload: { confirmedQuantities: [1] },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('⚠️ AND THE KNOWN-GOOD HALF: a FULFILMENT seat confirms, for real', async () => {
    // Without this the four refusals above prove nothing — every one of them
    // would read identically if the verb were simply broken (§39, probe the
    // guard BOTH ways).
    const po = await confirmablePO(FULL);
    const res = await svc.commands.dispatch(FULFILMENT_ONLY, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: po.id,
      payload: { confirmedQuantities: [1] },
    });
    expect(res.status).not.toBe('failed');
    expect(res.reason ?? '').not.toMatch(/ROLE_NOT_PERMITTED/);
  });
});

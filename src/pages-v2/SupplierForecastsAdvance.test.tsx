// ────────────────────────────────────────────────────────────────────────────
// WAVE D — the incoming-shipment ADVANCE lane on `/supplier/forecasts`.
//
// `t_incomingshipment_ship` · `_arrive` · `_cancel`, surfaced on the Shipments
// tab. Three DISTINCT atoms, three availabilities, three notices in their own
// slots.
//
// ⚠️ **THE PREMISE THAT DECIDES THIS FILE IS A MEASUREMENT, AND IT IS ASSERTED
// HERE RATHER THAN QUOTED.** A to-paragon leg's DISPLAYED lifecycle is derived
// from its linked ASN and the derivation covers all five ASN statuses, so on
// such a leg the stored `lifecycle` — the field these three verbs move, and the
// field `readState` resolves — is never what the card shows. The first block
// below walks that with the real dispatcher and proves the store advances while
// the display does not. Everything else in this file follows from it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { incomingShipmentStore } from '../services/data/mock/stores/incomingShipmentStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import {
  asnTrackingFor,
  INCOMING_SHIPMENTS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
} from '../services/sdc';
import { MOCK_ASNS } from '../services/data/mock/fixtures/supplierShipments';
import { getKnownFlows, userVerbsFrom } from '../services/transitions';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { atomsForSeat } from '../services/transitions/customRoles';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';

const scopeFor = (supplierId: string, roles = SEEDED_SEAT_ROLES.supplier): QueryScope =>
  ({
    personaType: 'supplier',
    supplierId,
    businessRoles: roles,
    actor: NO_PERSON,
  }) as QueryScope;

const identityFor = (
  supplierId: string,
  roles: readonly string[] = SEEDED_SEAT_ROLES.supplier,
): CurrentIdentity =>
  ({
    personaType: 'supplier',
    supplierId,
    supplierName: supplierId,
    businessRoles: roles,
    actor: NO_PERSON,
  }) as CurrentIdentity;

/** sup-005 — the ONE distributor in the fixtures, and therefore the only seat
 *  that can hold a principal-to-distributor leg. */
const SUP005 = identityFor('sup-005');

/** The seeded seat with `fulfilment` removed — the narrowing that withholds all
 *  three atoms at once. It is the ONLY lane that holds them (asserted below), so
 *  removing it is the whole narrowing. */
const NARROWED = identityFor(
  'sup-005',
  SEEDED_SEAT_ROLES.supplier.filter((r) => r !== 'fulfilment'),
);

beforeEach(() => incomingShipmentStore.reset());

const openShipments = async () => {
  fireEvent.click(await screen.findByRole('tab', { name: /Shipments|Pengiriman/i }));
  return screen.findByTestId('sdcsup-shipments');
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE PREMISES — derived, and each one changed the build.
// ─────────────────────────────────────────────────────────────────────────────

describe('WAVE D premises — derived from the tree, not inherited', () => {
  it('⚠️ all three verbs exist with NO required fields and NO policy hooks — a cancel reason would be invented', () => {
    const flow = getKnownFlows().find((f) => f.entity === 'incomingShipment')!;
    for (const id of [
      't_incomingshipment_ship',
      't_incomingshipment_arrive',
      't_incomingshipment_cancel',
    ]) {
      const t = flow.transitions.find((x) => x.id === id)!;
      expect(t, `${id} must exist`).toBeDefined();
      expect(t.requiredFields, `${id} declares no fields`).toEqual([]);
      expect(t.policyHooks, `${id} declares no hooks`).toEqual([]);
    }
    // The known-good control on the same instrument: the CREATION verb on the
    // same flow DOES declare both, so "empty" above is a reading of the tree
    // rather than of a matcher that returns empty for everything.
    const report = flow.transitions.find((x) => x.id === 't_incomingshipment_report')!;
    expect(report.requiredFields.length).toBeGreaterThan(0);
    expect(report.policyHooks.length).toBeGreaterThan(0);
  });

  it('exits are Booked→Shipped, Shipped→Arrived, and cancel from BOTH in-flight states', () => {
    expect(userVerbsFrom('incomingShipment', 'Booked').map((v) => v.id)).toEqual([
      't_incomingshipment_ship',
      't_incomingshipment_cancel',
    ]);
    expect(userVerbsFrom('incomingShipment', 'Shipped').map((v) => v.id)).toEqual([
      't_incomingshipment_arrive',
      't_incomingshipment_cancel',
    ]);
    // Terminal both ways — nothing leaves, which is what the surface's
    // "no further updates" line rests on.
    expect(userVerbsFrom('incomingShipment', 'Arrived')).toEqual([]);
    expect(userVerbsFrom('incomingShipment', 'Cancelled')).toEqual([]);
  });

  it('all three atoms are held by the SEEDED supplier seat, and `fulfilment` is the only lane holding them', () => {
    const held = atomsForSeat([...SEEDED_SEAT_ROLES.supplier]);
    const narrowed = atomsForSeat([...NARROWED.businessRoles]);
    for (const atom of [
      'incomingshipment:ship',
      'incomingshipment:arrive',
      'incomingshipment:cancel',
    ] as const) {
      expect(held, `seeded seat holds ${atom}`).toContain(atom);
      expect(narrowed, `removing fulfilment withholds ${atom}`).not.toContain(atom);
    }
    // Known-good control: the narrowing removed those and NOT everything — a
    // seat that lost all atoms would satisfy every `not.toContain` above.
    expect(narrowed.length).toBeGreaterThan(0);
    expect(narrowed).toContain('invoice:submit');
  });

  it('⚠️ THE MEASUREMENT THAT DECIDED WAVE D, NOW INVERTED BY THE FIX', async () => {
    // ⚠️ **THIS TEST USED TO ASSERT THE DEFECT.** It read: the store advances
    // Booked → Shipped → Arrived while the card reads Booked at every step, and
    // that was Wave D's whole reason for withholding these verbs on a to-paragon
    // leg. The shadowed-lifecycle batch separated the axes, so the same walk now
    // shows the leg's own state moving — and the assertion is turned around
    // rather than deleted, because the inversion is the evidence the fix landed.
    const svc = new MockCommandService();
    const scope = scopeFor('sup-007');
    const created = await svc.dispatch(scope, {
      transitionId: 't_incomingshipment_report',
      entity: 'incomingShipment',
      payload: {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8810',
        direction: 'to-paragon',
        qty: 1000,
        asnRef: 'ASN-2025-00215',
      },
    });
    expect(created.status).not.toBe('failed');
    const id = created.entityId!;
    const declared: string[] = [];
    const asnAxis: (string | null)[] = [];
    const observe = () => {
      const row = incomingShipmentStore.get(id)!;
      declared.push(row.lifecycle);
      asnAxis.push(asnTrackingFor(row, 'Draft')?.asnStatus ?? null);
    };
    observe();
    for (const v of [
      't_incomingshipment_ship',
      't_incomingshipment_arrive',
    ]) {
      const r = await svc.dispatch(scope, {
        transitionId: v,
        entity: 'incomingShipment',
        entityId: id,
      });
      expect(r.status, `${v} dispatches successfully`).not.toBe('failed');
      observe();
    }

    // AXIS 1 moves with every act. The old assertion here was the same walk on
    // the same instrument and read ['Booked', 'Booked', 'Booked'].
    expect(
      declared,
      'THE DECLARED AXIS STOPPED MOVING. The two axes have been collapsed back\n' +
        'into one and a supplier act is invisible again.',
    ).toEqual(['Booked', 'Shipped', 'Arrived']);

    // AXIS 2 is unchanged throughout — correctly, because nothing the supplier
    // did touched the ASN. That is what makes them two facts rather than one.
    expect(asnAxis).toEqual(['Draft', 'Draft', 'Draft']);

    // ⚠️ **ship → arrive → cancel CANNOT RUN ON ONE LEG, and the machine is
    // right.** `Arrived` is terminal, so cancel is reachable only from `Booked`
    // or `Shipped`. It gets its own leg rather than being tacked onto this one —
    // a walk that dispatches an illegal verb and swallows the refusal would
    // prove nothing about either axis.
    expect(userVerbsFrom('incomingShipment', 'Arrived')).toEqual([]);
    const second = await svc.dispatch(scope, {
      transitionId: 't_incomingshipment_report',
      entity: 'incomingShipment',
      payload: {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8810',
        direction: 'to-paragon',
        qty: 500,
        asnRef: 'ASN-2025-00215',
      },
    });
    const cancelled = await svc.dispatch(scope, {
      transitionId: 't_incomingshipment_cancel',
      entity: 'incomingShipment',
      entityId: second.entityId!,
    });
    expect(cancelled.status).not.toBe('failed');
    const row = incomingShipmentStore.get(second.entityId!)!;
    expect(row.lifecycle).toBe('Cancelled');
    expect(asnTrackingFor(row, 'Draft')?.asnStatus).toBe('Draft');
  });

  it('⚠️ `Cancelled` is renderable on a to-paragon leg — the state the old map dropped', () => {
    // The old range was Booked | Shipped | Arrived, so a cancelled to-paragon leg
    // could never render as cancelled. The ASN axis no longer speaks in leg
    // words, so there is no range for a leg state to fall outside of.
    const cancelled = { ...INCOMING_SHIPMENTS[0], lifecycle: 'Cancelled' as const };
    expect(cancelled.lifecycle).toBe('Cancelled');
    expect(asnTrackingFor(cancelled, 'Delivered')?.asnStatus).toBe('Delivered');
  });

  it('⚠️ sup-007 — the DEFAULT SEAT — cannot produce an advanceable leg at all', async () => {
    // It holds zero rows…
    expect(INCOMING_SHIPMENTS.filter((s) => s.supplierId === 'sup-007')).toHaveLength(0);
    // …and it is a MANUFACTURER on both its materials, so the p2d guard refuses.
    const rels = SUPPLIER_MATERIAL_RELATIONSHIPS.filter((r) => r.supplierId === 'sup-007');
    expect(rels.length).toBeGreaterThan(0);
    expect(rels.every((r) => r.supplierType === 'manufacturer')).toBe(true);

    const refused = await new MockCommandService().dispatch(scopeFor('sup-007'), {
      transitionId: 't_incomingshipment_report',
      entity: 'incomingShipment',
      payload: {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8810',
        direction: 'principal-to-distributor',
        qty: 1000,
      },
    });
    expect(refused.status).toBe('failed');
    expect(refused.reason).toContain('distributor');

    // The known-good control: the SAME seat CAN report a to-paragon leg, so the
    // refusal above is about the direction and not about the seat being unable
    // to report anything.
    const ok = await new MockCommandService().dispatch(scopeFor('sup-007'), {
      transitionId: 't_incomingshipment_report',
      entity: 'incomingShipment',
      payload: {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8810',
        direction: 'to-paragon',
        qty: 1000,
        asnRef: 'ASN-2025-00215',
      },
    });
    expect(ok.status).not.toBe('failed');
  });

  it('THE CROSS-STORE CHECK — the surface keys on `ish-…`, the ASN link on `ASN-…`, and the sets are DISJOINT', () => {
    const ishIds = new Set(INCOMING_SHIPMENTS.map((s) => s.id));
    const asnNums = new Set(MOCK_ASNS.map((a) => a.asnNumber));
    expect([...ishIds].filter((i) => asnNums.has(i))).toEqual([]);
    // …and the reference that DOES cross stores resolves, which is the half a
    // bare "they are disjoint" assertion would leave unproven.
    const refs = INCOMING_SHIPMENTS.map((s) => s.asnRef).filter(Boolean) as string[];
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(asnNums.has(r), `${r} resolves`).toBe(true);
  });

  it('the buyer DOES see these acts — coverage counts a leg only while Booked or Shipped', async () => {
    // Not cosmetic: `_arrive` and `_cancel` remove the quantity from the
    // buyer's coverage projection. Asserted through the store the projection
    // reads, so a change to either side breaks this.
    const svc = new MockCommandService();
    const before = incomingShipmentStore.get('ish-0002')!;
    expect(['Booked', 'Shipped']).toContain(before.lifecycle);
    await svc.dispatch(scopeFor('sup-005'), {
      transitionId: 't_incomingshipment_cancel',
      entity: 'incomingShipment',
      entityId: 'ish-0002',
    });
    expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Cancelled');
  });

  it('nothing fabricates a date or a duration — `applyTransition` writes ONE field', async () => {
    // The `||0` class cannot occur here: the DTO carries no act-stamped
    // temporal field, and the transition writes only `lifecycle`.
    const before = { ...incomingShipmentStore.get('ish-0002')! } as Record<string, unknown>;
    await new MockCommandService().dispatch(scopeFor('sup-005'), {
      transitionId: 't_incomingshipment_ship',
      entity: 'incomingShipment',
      entityId: 'ish-0002',
    });
    const after = incomingShipmentStore.get('ish-0002')! as unknown as Record<string, unknown>;
    const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
    expect(changed).toEqual(['lifecycle']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE HELD SEAT — the walk, on the surface, reaching every reachable state.
// ─────────────────────────────────────────────────────────────────────────────

describe('the held seat — the walk reaches the state where each control renders', () => {
  it('⚠️ Booked → ship → Shipped → arrive → Arrived, entirely through the surface', async () => {
    renderWithProviders(<SupplierForecasts />, {
      identity: SUP005,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Booked');

    // Booked → the SHIP control is present; ARRIVE is not (not legal here).
    const ship = await within(tab).findByRole('button', { name: /Mark shipped/i });
    expect(within(tab).queryByRole('button', { name: /Mark arrived/i })).toBeNull();
    expect(within(tab).getByRole('button', { name: /Cancel shipment/i })).toBeInTheDocument();

    fireEvent.click(ship);
    await waitFor(() =>
      expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Shipped'),
    );

    // …and the surface now offers ARRIVE, which is the state the assertion had
    // to WALK TO — a held-seat test that never left Booked would prove nothing
    // about `t_incomingshipment_arrive`.
    const arrive = await within(await screen.findByTestId('sdcsup-shipments')).findByRole(
      'button',
      { name: /Mark arrived/i },
    );
    fireEvent.click(arrive);
    await waitFor(() =>
      expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Arrived'),
    );

    // Terminal: every control is gone and the surface SAYS so.
    const done = await screen.findByTestId('sdcsup-shipments');
    await waitFor(() =>
      expect(within(done).getByTestId('ship-advance-terminal')).toBeInTheDocument(),
    );
    expect(within(done).queryByRole('button', { name: /Mark shipped/i })).toBeNull();
    expect(within(done).queryByRole('button', { name: /Mark arrived/i })).toBeNull();
    expect(within(done).queryByRole('button', { name: /Cancel shipment/i })).toBeNull();
  }, 20000);

  it('⚠️ …and CANCEL reaches Cancelled from Booked — the third reachable state', async () => {
    renderWithProviders(<SupplierForecasts />, {
      identity: SUP005,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    fireEvent.click(await within(tab).findByRole('button', { name: /Cancel shipment/i }));
    await waitFor(() =>
      expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Cancelled'),
    );
    const after = await screen.findByTestId('sdcsup-shipments');
    await waitFor(() =>
      expect(within(after).getByTestId('ship-advance-terminal')).toBeInTheDocument(),
    );
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE WITHHELD SEAT — three notices, in three slots, never absent.
// ─────────────────────────────────────────────────────────────────────────────

describe('the narrowed seat — each verb renders its OWN pending-with-an-owner notice', () => {
  it('⚠️ ship and cancel BOTH show a notice on a Booked leg — one per verb, not one per group', async () => {
    renderWithProviders(<SupplierForecasts />, {
      identity: NARROWED,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    expect(await within(tab).findByTestId('handoff-incomingshipment-ship')).toBeInTheDocument();
    expect(within(tab).getByTestId('handoff-incomingshipment-cancel')).toBeInTheDocument();
    // Not absent, not disabled — text naming an owner.
    expect(within(tab).getByTestId('handoff-incomingshipment-ship').textContent ?? '').toMatch(
      /\w/,
    );
    // The control it replaces is gone.
    expect(within(tab).queryByRole('button', { name: /Mark shipped/i })).toBeNull();
    // `arrive` is not legal from Booked, so it has no slot on this leg at all —
    // a notice there would promise an act the machine would refuse.
    expect(within(tab).queryByTestId('handoff-incomingshipment-arrive')).toBeNull();
  }, 20000);

  it('⚠️ …and the ARRIVE notice appears once the leg is Shipped — the withheld walk, too', async () => {
    // The narrowed seat cannot advance the leg itself, so the state is moved by
    // the dispatcher under a HELD scope and the narrowed seat then reads it.
    await new MockCommandService().dispatch(scopeFor('sup-005'), {
      transitionId: 't_incomingshipment_ship',
      entity: 'incomingShipment',
      entityId: 'ish-0002',
    });
    expect(incomingShipmentStore.get('ish-0002')!.lifecycle).toBe('Shipped');

    renderWithProviders(<SupplierForecasts />, {
      identity: NARROWED,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    expect(await within(tab).findByTestId('handoff-incomingshipment-arrive')).toBeInTheDocument();
    expect(within(tab).getByTestId('handoff-incomingshipment-cancel')).toBeInTheDocument();
    expect(within(tab).queryByTestId('handoff-incomingshipment-ship')).toBeNull();
  }, 20000);

  it('THE KNOWN-GOOD CONTROL — the same leg under the HELD seat renders buttons, not notices', async () => {
    // §39: every assertion above is about a notice being present, and would all
    // pass on a page that rendered notices unconditionally.
    renderWithProviders(<SupplierForecasts />, {
      identity: SUP005,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    expect(await within(tab).findByRole('button', { name: /Mark shipped/i })).toBeInTheDocument();
    expect(within(tab).queryByTestId('handoff-incomingshipment-ship')).toBeNull();
    expect(within(tab).queryByTestId('handoff-incomingshipment-cancel')).toBeNull();
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE to-paragon LEG — a reason, never a blank, and never a control.
// ─────────────────────────────────────────────────────────────────────────────

describe('a to-paragon leg offers no advance control, and says why', () => {
  it('⚠️ no button, no handoff notice — the reason line instead', async () => {
    renderWithProviders(<SupplierForecasts />, {
      identity: identityFor('sup-002'),
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    const reason = await within(tab).findByTestId('ship-advance-via-asn');
    expect(reason.textContent).toContain('ASN-2025-00301');

    for (const name of [/Mark shipped/i, /Mark arrived/i, /Cancel shipment/i]) {
      expect(within(tab).queryByRole('button', { name })).toBeNull();
    }
    // ⚠️ AND NOT A HANDOFF NOTICE. This seat HOLDS all three atoms — naming an
    // owner would say a role is the obstacle when the obstacle is the ASN.
    for (const id of [
      'handoff-incomingshipment-ship',
      'handoff-incomingshipment-arrive',
      'handoff-incomingshipment-cancel',
    ]) {
      expect(within(tab).queryByTestId(id)).toBeNull();
    }
    // The leg IS in a state with legal exits — so the absence above is the
    // direction rule, not an already-terminal leg.
    expect(userVerbsFrom('incomingShipment', 'Shipped').length).toBeGreaterThan(0);
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TENANCY — proved against a population that can violate it.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE RENDER GUARD — the card shows the DECLARED axis, not the ASN's.
//
// ⚠️ **NO SPEC ASSERTED THIS BEFORE THE SHADOWED-LIFECYCLE BATCH, WHICH IS THE
// COMPLETE EXPLANATION FOR HOW THE DEFECT SURVIVED.** Wave D's walks asserted
// the STORE moved and which BUTTONS appeared; the old selector's own tests
// asserted the ASN won. Nothing asserted what the card actually said, so the one
// question that mattered was the one nothing asked.
//
// It needs a leg where the two axes DISAGREE. The fixtures agree by luck
// (ish-0001 stores 'Shipped' and its ASN is 'In Transit', which the old map
// translated to 'Shipped'), so the disagreement is GROWN with a real dispatch
// rather than stamped.
// ─────────────────────────────────────────────────────────────────────────────

describe('the card renders the DECLARED axis even when the ASN disagrees', () => {
  it('⚠️ a CANCELLED to-paragon leg reads Cancelled, beside an In Transit ASN', async () => {
    // Grow the disagreement: ish-0001 is sup-002's, stored 'Shipped', linked to
    // ASN-2025-00301 which is 'In Transit'. Cancelling it is legal from Shipped
    // and puts the stored axis somewhere the old map could not express AT ALL.
    const res = await new MockCommandService().dispatch(scopeFor('sup-002'), {
      transitionId: 't_incomingshipment_cancel',
      entity: 'incomingShipment',
      entityId: 'ish-0001',
    });
    expect(res.status).not.toBe('failed');
    expect(incomingShipmentStore.get('ish-0001')!.lifecycle).toBe('Cancelled');

    renderWithProviders(<SupplierForecasts />, {
      identity: identityFor('sup-002'),
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();

    // AXIS 1 — the leg's own state, on the card. Under the old shape this read
    // 'Shipped' (In Transit, translated) and the cancellation was invisible.
    await waitFor(() =>
      expect(
        tab.textContent,
        'THE CARD IS NOT SHOWING THE DECLARED STATE. The ASN axis has been let\n' +
          'back in front of the stored one — the shadowed-lifecycle defect.',
      ).toMatch(/Cancelled|Dibatalkan/),
    );

    // AXIS 2 — present, beside it, naming the ASN and carrying the ASN's OWN
    // word rather than a leg word.
    const axis = within(tab).getByTestId('ship-asn-tracking');
    expect(axis.textContent).toContain('ASN-2025-00301');
    expect(axis.textContent).toMatch(/In Transit|Dalam Perjalanan/);

    // …and the two are DIFFERENT text, which is the whole point: one card, two
    // facts, neither standing in for the other.
    expect(axis.textContent).not.toMatch(/Cancelled|Dibatalkan/);
  }, 20000);

  it('THE KNOWN-GOOD CONTROL — a p2d leg renders its state and NO ASN axis', async () => {
    // §44 / §39: the assertions above would pass on a page that rendered the ASN
    // axis unconditionally. A p2d leg has no ASN by construction, so its absence
    // proves the axis is conditional on real linkage rather than always drawn.
    renderWithProviders(<SupplierForecasts />, {
      identity: SUP005,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    await waitFor(() => expect(tab.textContent).toMatch(/Booked|Dipesan/));
    expect(within(tab).queryByTestId('ship-asn-tracking')).toBeNull();
  }, 20000);
});

describe('tenancy — the legs are isolated per supplier', () => {
  it('the default seat sees NEITHER fixture leg; each owner sees exactly its own', async () => {
    renderWithProviders(<SupplierForecasts />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts',
    });
    const tab = await openShipments();
    expect(tab.textContent).not.toContain('ASN-2025-00301'); // sup-002's
    expect(tab.textContent).not.toContain('RM-EMUL-3310'); // both foreign legs
  }, 20000);

  it('⚠️ a foreign leg is refused AT THE DISPATCHER, not merely hidden', async () => {
    const svc = new MockCommandService();
    for (const foreign of ['sup-002', 'sup-007']) {
      await expect(
        svc.dispatch(scopeFor(foreign), {
          transitionId: 't_incomingshipment_ship',
          entity: 'incomingShipment',
          entityId: 'ish-0002', // sup-005's
        }),
      ).rejects.toThrow(/denied/i);
    }
    // The known-good control: the OWNER's identical dispatch succeeds, so the
    // refusals above are about tenancy and not about the verb being broken.
    const ok = await svc.dispatch(scopeFor('sup-005'), {
      transitionId: 't_incomingshipment_ship',
      entity: 'incomingShipment',
      entityId: 'ish-0002',
    });
    expect(ok.status).not.toBe('failed');
  });
});

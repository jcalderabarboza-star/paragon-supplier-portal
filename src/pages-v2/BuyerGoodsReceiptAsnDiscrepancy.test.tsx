// ────────────────────────────────────────────────────────────────────────────
// `t_asn_resolve_discrepancy` on /buyer/goods-receipt — the exit from the one
// problem state in this portal that a LIVE dispatched verb produces.
//
// ⚠️ **WHY THE HELD ASSERTION WALKS TO `Delivered` INSTEAD OF STOPPING AT THE
// BUTTON.** A held-seat test that only asserts the control RENDERS kills
// nothing: flip availability to never-available and it fails, flip it to
// always-available and it still passes, so it cannot tell the two apart. The
// held test below clicks the control and asserts the ASN's STATE MOVED, which
// is the only assertion the mutation probe can distinguish.
//
// ⚠️ **AND THE WITHHELD ASSERTION REACHES THE SAME CELL.** It asserts the row
// EXISTS (so the seat genuinely arrived where the control lives), the notice is
// present BY TEST-ID, the owner is named, and the button is ABSENT. A withheld
// test that never reaches a discrepancy row would pass on an empty page.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import {
  SEEDED_SEAT_ROLES,
  SYSTEM_ROLES,
  AUTOMATION_ATOMS,
  rolesHolding,
} from '../services/transitions/businessRoles';
import { CASCADES } from '../services/transitions/cascades';
import { getKnownFlows } from '../services/transitions';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

/** The one fixture ASN in the problem state. Asserted below, never assumed. */
const FLAGGED = 'ASN-2025-00201';

/** A buyer seat with the receiving lane removed — the narrowest honest way to
 *  withhold `asn:flag` without inventing a role that does not exist. */
const NO_RECEIVING = {
  ...BUYER,
  businessRoles: SEEDED_SEAT_ROLES.buyer.filter((r) => r !== 'receiving'),
};

const section = () => screen.getByTestId('gr-asn-discrepancies');

const openPage = async (identity = BUYER) => {
  asnStore.reset();
  goodsReceiptStore.reset();
  renderWithProviders(<BuyerGoodsReceipt />, { identity });
  await screen.findByText('Rejection Rate (30d)');
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE PREMISE, DERIVED — every claim this file rests on, measured first.
// ─────────────────────────────────────────────────────────────────────────────

describe('the premise — derived, not inherited from the dispatch', () => {
  it('the verb exits to Delivered, is payload-free, and gates on asn:flag', () => {
    const flow = getKnownFlows().find((f) => f.entity === 'advanceShipNotice')!;
    const verb = flow.transitions.find((tr) => tr.id === 't_asn_resolve_discrepancy')!;
    expect(verb.from).toEqual(['Discrepancy']);
    expect(verb.to).toBe('Delivered');
    expect(verb.requiredRole).toBe('asn:flag');
    // The control carries no reason field BECAUSE the machine asks for none.
    // If this ever gains a required field, the surface below is incomplete and
    // this line is what says so.
    expect(verb.requiredFields).toEqual([]);
    expect(verb.policyHooks).toEqual([]);
  });

  it('asn:flag is a receiving atom, held by the seeded buyer seat and by NO supplier lane', () => {
    expect(SYSTEM_ROLES.receiving).toContain('asn:flag');
    expect(SEEDED_SEAT_ROLES.buyer).toContain('receiving');
    // The bilateral half: every supplier lane is asserted NOT to hold it, which
    // is what makes the supplier-side notice correct rather than merely tidy.
    for (const lane of SEEDED_SEAT_ROLES.supplier) {
      expect(SYSTEM_ROLES[lane]).not.toContain('asn:flag');
    }
    // Owner naming, derived — the string the withheld seat reads comes from here.
    expect(rolesHolding('asn:flag')).toEqual(['receiving']);
  });

  it('⚠️ the producer set is TWO verbs, not one — a reject AND a partial approve', () => {
    // The dispatch named only `t_gr_reject`. Derived from the registry, the
    // partial-approve path cascades identically, and it is the likelier one:
    // a mixed inspection is more common than a total rejection.
    const producers = Object.entries(CASCADES)
      .filter(([, links]) =>
        links.some((l) => l.targetTransitionId === 't_asn_discrepancy'),
      )
      .map(([src]) => src)
      .sort();
    expect(producers).toEqual(['t_gr_partial_approve', 't_gr_reject']);
    // And the cascade fires under the automation grant, which must still hold
    // the atom — narrowing that grant would delete this reachable act.
    expect(AUTOMATION_ATOMS).toContain('asn:flag');
  });

  it('the fixture really is in the problem state', () => {
    asnStore.reset();
    expect(asnStore.get(FLAGGED)!.status).toBe('Discrepancy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE HELD SEAT — and it WALKS TO THE STATE.
// ─────────────────────────────────────────────────────────────────────────────

describe('the held seat resolves it, and the ASN actually moves', () => {
  it('the flagged ASN is on the page — it was reachable NOWHERE on this surface before', async () => {
    await openPage();
    expect(within(section()).getByText(FLAGGED)).toBeInTheDocument();
  });

  it('⚠️ THE WALK — clicking Reconcile drives Discrepancy → Delivered in the store', async () => {
    await openPage();
    expect(asnStore.get(FLAGGED)!.status).toBe('Discrepancy');

    fireEvent.click(within(section()).getByRole('button', { name: 'Reconcile' }));

    await waitFor(() =>
      expect(asnStore.get(FLAGGED)!.status).toBe('Delivered'),
    );
  });

  it('and the row leaves the list — the surface re-derives, it does not keep a copy', async () => {
    await openPage();
    fireEvent.click(within(section()).getByRole('button', { name: 'Reconcile' }));
    await waitFor(() =>
      expect(screen.queryByTestId('gr-asn-discrepancies')).not.toBeInTheDocument(),
    );
  });

  it('no handoff notice is rendered to a seat that holds the atom', async () => {
    await openPage();
    expect(screen.queryByTestId('handoff-asn-resolve')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE WITHHELD SEAT — pending with an owner, in the control's own cell.
// ─────────────────────────────────────────────────────────────────────────────

describe('a seat without the receiving lane waits, and is told whose act it is', () => {
  it('⚠️ IT REACHES THE ROW FIRST — otherwise the notice assertions prove nothing', async () => {
    await openPage(NO_RECEIVING);
    expect(within(section()).getByText(FLAGGED)).toBeInTheDocument();
  });

  it('the notice stands in the cell, names Receiving, and is marked withheld', async () => {
    await openPage(NO_RECEIVING);
    const notice = within(section()).getByTestId('handoff-asn-resolve');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice).toHaveTextContent('Awaiting Receiving');
  });

  it('and the commit is ABSENT rather than disabled — never a dead button', async () => {
    await openPage(NO_RECEIVING);
    expect(
      within(section()).queryByRole('button', { name: 'Reconcile' }),
    ).not.toBeInTheDocument();
  });

  it('the ASN does not move for a seat that cannot act', async () => {
    await openPage(NO_RECEIVING);
    expect(asnStore.get(FLAGGED)!.status).toBe('Discrepancy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE FULL LOOP, HEADLESS — a receipt disposition raises it, the dock clears it.
//
// ⚠️ **THIS IS THE HALF THE SEEDED ROW CANNOT PROVE.** Walking `ASN-2025-00201`
// shows the exit works on a fixture. It says nothing about whether anything in
// the product ever ENTERS that state. Both cascade producers are driven here.
// ─────────────────────────────────────────────────────────────────────────────

describe('the loop — the cascade raises it and the resolution clears it', () => {
  const buyerScope = {
    personaType: 'buyer' as const,
    supplierId: null,
    businessRoles: SEEDED_SEAT_ROLES.buyer,
  };

  /**
   * Drive a GR to a finished disposition on `asnNumber`.
   *
   * ⚠️ **THE LINES ARE BUILT FROM THE ASN'S OWN `lineItems`, AND THAT IS NOT
   * COSMETIC.** `t_gr_create` records `inspectionResults` FROM THE PAYLOAD and
   * defaults them to `[]` when absent — and an empty line set rolls up to
   * `Pending`, which the `gr_rollup_*` policy hook refuses with
   * *"line rollup is 'Pending', not 'Rejected'"*. A first draft of this helper
   * mapped over the created GR's lines instead of supplying them, so the map
   * ran over an empty array, the disposition was refused, and the cascade never
   * fired. Reading the material codes off the ASN also keeps
   * `GR_INSPECTION_MATERIALS_DECLARED` satisfied with real master codes rather
   * than an invented one.
   */
  const receiveAndDispose = async (
    svc: MockCommandService,
    asnNumber: string,
    headerVerb: 't_gr_reject' | 't_gr_partial_approve',
    split: (shipped: number) => { qtyAccepted: number; qtyRejected: number },
  ) => {
    const asn = asnStore.get(asnNumber)!;
    const inspectionResults = asn.lineItems.map((li) => ({
      materialCode: li.materialCode,
      description: li.description,
      qtyExpected: li.orderedQty,
      qtyReceived: li.shippedQty,
      ...split(li.shippedQty),
      visualCheck: 'Pass' as const,
      packagingCheck: 'Pass' as const,
    }));
    const created = await svc.dispatch(buyerScope, {
      transitionId: 't_gr_create',
      entity: 'goodsReceipt',
      payload: {
        asnReference: asnNumber,
        inspectionResults,
        receivedDate: '2026-05-20',
        receivedBy: 'spec',
      },
    });
    expect(created.status).toBe('done');
    const grId = created.entityId!;
    // The GR really did bind to the ASN under test — otherwise the cascade
    // below would fire at some other document and this test would prove nothing.
    expect(goodsReceiptStore.get(grId)!.asnNumber).toBe(asnNumber);
    expect(goodsReceiptStore.get(grId)!.inspectionResults.length).toBeGreaterThan(0);

    const started = await svc.dispatch(buyerScope, {
      transitionId: 't_gr_start_inspection',
      entity: 'goodsReceipt',
      entityId: grId,
    });
    expect(started.status).toBe('done');

    const disposed = await svc.dispatch(buyerScope, {
      transitionId: headerVerb,
      entity: 'goodsReceipt',
      entityId: grId,
      payload: { dispositionReason: 'walked in a spec' },
    });
    return { grId, disposed };
  };

  it.each([
    ['t_gr_reject', 'ASN-2025-00211'],
    ['t_gr_partial_approve', 'ASN-2025-00301'],
  ] as const)(
    '⚠️ %s cascades its ASN into Discrepancy, and the dock resolves it back to Delivered',
    async (headerVerb, asnNumber) => {
      asnStore.reset();
      goodsReceiptStore.reset();
      const svc = new MockCommandService();

      // BEFORE — the state set, stated rather than counted.
      const before = asnStore.get(asnNumber)!.status;
      expect(before).not.toBe('Discrepancy');

      // Reject = nothing accepted on any line; partial = a genuine mix, which
      // is what `deriveLineState` reads to roll the header up.
      const split =
        headerVerb === 't_gr_reject'
          ? (shipped: number) => ({ qtyAccepted: 0, qtyRejected: shipped })
          : (shipped: number) => ({
              qtyAccepted: Math.floor(shipped / 2),
              qtyRejected: shipped - Math.floor(shipped / 2),
            });
      const { disposed } = await receiveAndDispose(svc, asnNumber, headerVerb, split);
      expect(disposed.status).toBe('done');

      // THE CASCADE LANDED — this is the hop the empty GR↔ASN fixture join
      // cannot demonstrate, because a wizard-created GR is the only GR in this
      // system whose `asnNumber` names a row the ASN store actually holds.
      expect(asnStore.get(asnNumber)!.status).toBe('Discrepancy');

      // THE EXIT.
      const resolved = await svc.dispatch(buyerScope, {
        transitionId: 't_asn_resolve_discrepancy',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
      });
      expect(resolved.status).toBe('done');
      expect(asnStore.get(asnNumber)!.status).toBe('Delivered');
    },
  );

  it('resolve is refused from every state that is not Discrepancy', async () => {
    asnStore.reset();
    const svc = new MockCommandService();
    // `ASN-2025-00198` is Delivered; `ASN-2025-00215` is Draft. Neither is a
    // legal from-state, and a refusal here is what keeps the surface's
    // state-keyed row list honest rather than decorative.
    for (const id of ['ASN-2025-00198', 'ASN-2025-00215']) {
      const res = await svc.dispatch(buyerScope, {
        transitionId: 't_asn_resolve_discrepancy',
        entity: 'advanceShipNotice',
        entityId: id,
      });
      expect(res.status).toBe('failed');
    }
  });
});

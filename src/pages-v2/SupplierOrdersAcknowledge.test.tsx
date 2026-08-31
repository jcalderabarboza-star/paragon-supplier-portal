// ────────────────────────────────────────────────────────────────────────────
// `t_po_acknowledge` on /supplier/orders — the act between receiving an order
// and committing to a quantity.
//
// ⚠️ **WHY THE HELD ASSERTION OPENS THE PANEL BEFORE IT ASSERTS ANYTHING.** The
// control lives in the side panel's `detail` footer, which is only populated for
// a selected row. A held test that asserted from the list page would find no
// button, pass under a `withheld` mutation for the wrong reason, and kill
// nothing. Every test below WALKS: open the row, then read the footer.
//
// ⚠️ **AND THE WITHHELD TESTS WALK TO THE SAME FOOTER.** They assert the panel
// really opened (by title) before asserting the notice is in it — a notice
// assertion over an unopened panel is an assertion over an empty document.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import {
  SEEDED_SEAT_ROLES,
  SYSTEM_ROLES,
  rolesHolding,
} from '../services/transitions/businessRoles';
import { getFlow, userVerbsFrom } from '../services/transitions';
import { POStatus } from '../services/data/types';
import SupplierOrders from './SupplierOrders';

/** The seeded supplier seat's ONE `Sent` order. Asserted below, never assumed. */
const SENT_PO = 'PO-2025-00108';
const SENT_PO_ID = 'po-008';

/** A supplier seat with the fulfilment lane removed. */
const NO_FULFILMENT = {
  ...SUPPLIER,
  businessRoles: SEEDED_SEAT_ROLES.supplier.filter((r) => r !== 'fulfilment'),
};

const openPanelOn = async (poNumber: string, identity = SUPPLIER) => {
  purchaseOrderStore.reset();
  renderWithProviders(<SupplierOrders />, { identity });
  const cell = await screen.findByText(poNumber);
  fireEvent.click(cell);
  // ⚠️ The panel HEADING, not "any text matching the PO number" — the number
  // also appears in the table row behind the panel, so a loose matcher finds
  // two nodes and cannot tell an open panel from a closed one.
  await waitFor(() =>
    expect(
      panel().getByRole('heading', { name: new RegExp(poNumber) }),
    ).toBeInTheDocument(),
  );
};

/**
 * ⚠️ **SCOPED TO THE PANEL, AND THAT IS LOAD-BEARING RATHER THAN TIDY.**
 * `SidePanel` renders its `<aside>` unconditionally — `open` only toggles
 * `aria-hidden` and a transform — so a page-level `screen.getBy*` cannot
 * distinguish "the control is in the open panel" from "the control is in the
 * always-mounted subtree of a closed one". Every assertion here reads through
 * this. (The always-mounted contract is filed as its own batch; this page
 * already guards the footer's CONTENT on `selected`, which is the
 * `BuyerGoodsReceipt` pattern, so nothing renders into a closed panel.)
 */
const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);
const footer = panel;

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE PREMISE — every claim derived, none inherited.
// ─────────────────────────────────────────────────────────────────────────────

describe('the premise — derived, not inherited from the dispatch', () => {
  it('the verb is payload-free and gates on po:acknowledge', () => {
    const flow = getFlow('purchaseOrder')!;
    const v = flow.transitions.find((tr) => tr.id === 't_po_acknowledge')!;
    expect(v.from).toEqual([POStatus.SENT, POStatus.VIEWED]);
    expect(v.to).toBe(POStatus.ACKNOWLEDGED);
    expect(v.requiredRole).toBe('po:acknowledge');
    // No reason field to build a control around — the same shape the ASN
    // resolution had. If this ever gains one, this line says so first.
    expect(v.requiredFields).toEqual([]);
    expect(v.policyHooks).toEqual([]);
  });

  it('po:acknowledge is a fulfilment atom held by the seeded supplier seat', () => {
    expect(SYSTEM_ROLES.fulfilment).toContain('po:acknowledge');
    expect(SEEDED_SEAT_ROLES.supplier).toContain('fulfilment');
    expect(rolesHolding('po:acknowledge')).toEqual(['fulfilment']);
    // The bilateral half: no BUYER lane holds it, so the notice can never
    // truthfully name one on this side.
    for (const lane of SEEDED_SEAT_ROLES.buyer) {
      expect(SYSTEM_ROLES[lane]).not.toContain('po:acknowledge');
    }
  });

  it('⚠️ acknowledge is NOT a prerequisite for confirm — the two are siblings', () => {
    // A surface that presented acknowledge as a required first step would be
    // inventing a sequence the machine does not have: `t_po_confirm` is legal
    // from `Sent` directly.
    const confirm = getFlow('purchaseOrder')!.transitions.find(
      (tr) => tr.id === 't_po_confirm',
    )!;
    expect(confirm.from).toContain(POStatus.SENT);
    // …and both are offered from `Sent` at the same time, which is why they get
    // two notice slots rather than one.
    const fromSent = userVerbsFrom('purchaseOrder', POStatus.SENT).map((v) => v.id);
    expect(fromSent).toContain('t_po_acknowledge');
    expect(fromSent).toContain('t_po_confirm');
  });

  it('⚠️ `Viewed` is FIXTURE-ONLY — no dispatched verb produces it', () => {
    // `t_po_view` is its sole producer and has no caller anywhere in the tree.
    // The control still renders there (acknowledge IS legal from Viewed), but
    // nothing a person does can put a PO into that state.
    const producers = getFlow('purchaseOrder')!
      .transitions.filter((tr) => tr.to === POStatus.VIEWED)
      .map((tr) => tr.id);
    expect(producers).toEqual(['t_po_view']);
    expect(userVerbsFrom('purchaseOrder', POStatus.VIEWED).map((v) => v.id)).toContain(
      't_po_acknowledge',
    );
  });

  it('the seeded seat really has this Sent order, and the id/number keys differ', () => {
    purchaseOrderStore.reset();
    const po = purchaseOrderStore.get(SENT_PO_ID)!;
    expect(po.poNumber).toBe(SENT_PO);
    expect(po.supplierId).toBe('sup-007');
    expect(po.status).toBe(POStatus.SENT);
    // ⚠️ The keying trap: the store resolves by `id`, never by `poNumber`, and
    // the two spaces are disjoint — so a hook passing the number would silently
    // resolve nothing rather than fail loudly.
    expect(purchaseOrderStore.get(SENT_PO)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE HELD SEAT — and it walks to Acknowledged.
// ─────────────────────────────────────────────────────────────────────────────

describe('the held seat acknowledges, and the order actually moves', () => {
  it('the control is in the panel footer on a Sent order', async () => {
    await openPanelOn(SENT_PO);
    expect(
      footer().getByRole('button', { name: 'Acknowledge receipt' }),
    ).toBeInTheDocument();
  });

  it('⚠️ THE WALK — clicking it drives Sent → Acknowledged in the store', async () => {
    await openPanelOn(SENT_PO);
    expect(purchaseOrderStore.get(SENT_PO_ID)!.status).toBe(POStatus.SENT);

    fireEvent.click(footer().getByRole('button', { name: 'Acknowledge receipt' }));

    await waitFor(() =>
      expect(purchaseOrderStore.get(SENT_PO_ID)!.status).toBe(POStatus.ACKNOWLEDGED),
    );
  });

  it('⚠️ AND THE ORDERED QUANTITIES SURVIVE — acknowledge commits to nothing', async () => {
    // `applyTransition` is SHARED with `t_po_confirm`, which writes line items
    // from `payload.confirmedQuantities`. A payload-free verb must not touch
    // them; this is the assertion that would catch it if the branch changed.
    await openPanelOn(SENT_PO);
    const before = purchaseOrderStore.get(SENT_PO_ID)!.lineItems.map((li) => ({
      q: li.quantity,
      c: li.confirmedQty,
    }));
    fireEvent.click(footer().getByRole('button', { name: 'Acknowledge receipt' }));
    await waitFor(() =>
      expect(purchaseOrderStore.get(SENT_PO_ID)!.status).toBe(POStatus.ACKNOWLEDGED),
    );
    expect(
      purchaseOrderStore.get(SENT_PO_ID)!.lineItems.map((li) => ({
        q: li.quantity,
        c: li.confirmedQty,
      })),
    ).toEqual(before);
  });

  it('the control leaves once the order is Acknowledged — the verb is illegal there', async () => {
    await openPanelOn(SENT_PO);
    fireEvent.click(footer().getByRole('button', { name: 'Acknowledge receipt' }));
    await waitFor(() =>
      expect(
        footer().queryByRole('button', { name: 'Acknowledge receipt' }),
      ).not.toBeInTheDocument(),
    );
    // …and Confirm is STILL offered: acknowledging did not consume the order.
    expect(footer().getByRole('button', { name: /Confirm/ })).toBeInTheDocument();
  });

  it('no handoff notice reaches a seat that holds the atom', async () => {
    await openPanelOn(SENT_PO);
    expect(screen.queryByTestId('handoff-po-acknowledge')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE WITHHELD SEAT — pending with an owner, in the verb's own slot.
// ─────────────────────────────────────────────────────────────────────────────

describe('a seat without the fulfilment lane waits, and is told whose act it is', () => {
  it('⚠️ IT REACHES THE PANEL FIRST — otherwise the notice assertions prove nothing', async () => {
    await openPanelOn(SENT_PO, NO_FULFILMENT);
    // The heading, for the same reason `openPanelOn` uses it: the bare number
    // lives in the table row behind the panel, not inside the panel body.
    expect(
      panel().getByRole('heading', { name: new RegExp(SENT_PO) }),
    ).toBeInTheDocument();
  });

  it('the notice stands in the footer, names Fulfilment, and is marked withheld', async () => {
    await openPanelOn(SENT_PO, NO_FULFILMENT);
    const notice = footer().getByTestId('handoff-po-acknowledge');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    // ⚠️ The owner string is 'Supplier Fulfilment', not 'Fulfilment' — the label
    // comes from `roles.owner.fulfilment`, which qualifies the SIDE because the
    // buyer catalogue has lanes of its own. Asserted as the i18n layer renders
    // it rather than as the role id reads.
    expect(notice).toHaveTextContent('Awaiting Supplier Fulfilment');
  });

  it('the commit is ABSENT rather than disabled — never a dead button', async () => {
    await openPanelOn(SENT_PO, NO_FULFILMENT);
    expect(
      footer().queryByRole('button', { name: 'Acknowledge receipt' }),
    ).not.toBeInTheDocument();
  });

  it('⚠️ TWO SLOTS, NOT ONE — confirm keeps its own notice beside acknowledge', async () => {
    // §76: the verbs are co-reachable on a `Sent` order, so a collapsed notice
    // would speak for an act the reader was not looking at.
    await openPanelOn(SENT_PO, NO_FULFILMENT);
    expect(footer().getByTestId('handoff-po-acknowledge')).toBeInTheDocument();
    expect(footer().getByTestId('handoff-po-confirm')).toBeInTheDocument();
  });

  it('the order does not move for a seat that cannot act', async () => {
    await openPanelOn(SENT_PO, NO_FULFILMENT);
    expect(purchaseOrderStore.get(SENT_PO_ID)!.status).toBe(POStatus.SENT);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE MACHINE — refusals the surface's legality check mirrors.
// ─────────────────────────────────────────────────────────────────────────────

describe('the dispatcher agrees with what the surface offers', () => {
  const supplierScope = {
    personaType: 'supplier' as const,
    supplierId: 'sup-007',
    businessRoles: SEEDED_SEAT_ROLES.supplier,
  };

  it('acknowledge is refused from a state the surface does not offer it on', async () => {
    purchaseOrderStore.reset();
    const svc = new MockCommandService();
    // `po-007` (PO-2025-00107, sup-007) is Confirmed — legal for neither verb.
    expect(purchaseOrderStore.get('po-007')!.status).toBe(POStatus.CONFIRMED);
    const res = await svc.dispatch(supplierScope, {
      transitionId: 't_po_acknowledge',
      entity: 'purchaseOrder',
      entityId: 'po-007',
    });
    expect(res.status).toBe('failed');
  });

  it('⚠️ a BUYER scope is refused — this is the supplier lane, asserted not assumed', async () => {
    purchaseOrderStore.reset();
    const svc = new MockCommandService();
    const res = await svc.dispatch(
      {
        personaType: 'buyer',
        supplierId: null,
        businessRoles: SEEDED_SEAT_ROLES.buyer,
      },
      { transitionId: 't_po_acknowledge', entity: 'purchaseOrder', entityId: SENT_PO_ID },
    );
    expect(res.status).toBe('failed');
    expect(purchaseOrderStore.get(SENT_PO_ID)!.status).toBe(POStatus.SENT);
  });

  it('the number-vs-id key trap is real: the PO NUMBER resolves no entity', async () => {
    purchaseOrderStore.reset();
    const svc = new MockCommandService();
    await expect(
      svc.dispatch(supplierScope, {
        transitionId: 't_po_acknowledge',
        entity: 'purchaseOrder',
        entityId: SENT_PO, // the NUMBER, not the id — the mistake this guards
      }),
    ).rejects.toThrow();
  });
});

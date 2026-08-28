import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierOrders from './SupplierOrders';
import SupplierRFQs from './SupplierRFQs';
import { supplierOrdersEn } from '../lib/i18n/supplierOrders';
import { rfqsEn } from '../lib/i18n/rfqs';
import { availabilityOfAtom } from '../services/transitions/handoff';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

// ─────────────────────────────────────────────────────────────────────────────
// TWO SURFACE RESIDUALS §84's ARC LEFT BEHIND — THE SAME MISTAKE ON EITHER SIDE
// OF ONE CONTROL:
//
//   · `SupplierOrders` — the ACT became honest (`effectivePanelMode` collapses
//     `editing` for a seat that does not hold `po:confirm`) while the LABEL kept
//     saying "Confirm" and kept wearing DP-2's primary register.
//   · `SupplierRFQs` — the LABEL became honest (the card renders the handoff
//     notice in the button's slot) while the ACT stayed reachable, because the
//     open panel is component state and COMPONENT STATE OUTLIVES THE SEAT.
//
// A handler census sees neither: in the first the handler is already right, in
// the second the entrance is.
// ─────────────────────────────────────────────────────────────────────────────

const supplierSeat = (lanes: readonly string[]): CurrentIdentity => ({
  ...SUPPLIER,
  businessRoles: lanes,
});

const HOLDS_CONFIRM = supplierSeat(['fulfilment']);
const LACKS_CONFIRM = supplierSeat(['commercial']);
const HOLDS_QUOTE = supplierSeat(['commercial']);
const LACKS_QUOTE = supplierSeat(['fulfilment']);

/**
 * Narrow the seat THROUGH THE PRODUCTION PATH. `setIdentity` is what the
 * identity panel calls, so this reproduces a real mid-session narrowing rather
 * than a test-only re-render — and `renderWithProviders` bakes its identity into
 * a `useState` initialiser, so a plain `rerender` could not have done it anyway.
 */
const NarrowSeat: React.FC<{ to: CurrentIdentity }> = ({ to }) => {
  const { setIdentity } = useCurrentIdentity();
  return (
    <button type="button" data-testid="narrow-seat" onClick={() => setIdentity(to)}>
      narrow
    </button>
  );
};

describe('POPULATION GUARD — the seats below really do differ on the atom', () => {
  it('resolves through the SAME function the surfaces gate on, both ways on both atoms', () => {
    // `availabilityOfAtom` is what `useVerbAvailability` calls; asking a
    // different resolver here would let this suite agree with itself while
    // disagreeing with the pages.
    expect(availabilityOfAtom('po:confirm', ['fulfilment']).kind).toBe('held');
    expect(availabilityOfAtom('po:confirm', ['commercial']).kind).not.toBe('held');
    expect(availabilityOfAtom('quotation:submit', ['commercial']).kind).toBe('held');
    expect(availabilityOfAtom('quotation:submit', ['fulfilment']).kind).not.toBe('held');
  });
});

describe('SupplierOrders — the row label names what pressing it does', () => {
  it('a seat holding po:confirm still sees Confirm', async () => {
    renderWithProviders(<SupplierOrders />, { identity: HOLDS_CONFIRM });
    await waitFor(() =>
      expect(
        screen.getAllByText(supplierOrdersEn['supplierOrders.action.confirm']).length,
      ).toBeGreaterThan(0),
    );
  });

  it('a seat that cannot confirm sees View — the LABEL, not only the act', async () => {
    renderWithProviders(<SupplierOrders />, { identity: LACKS_CONFIRM });
    await waitFor(() =>
      expect(
        screen.getAllByText(supplierOrdersEn['supplierOrders.action.view']).length,
      ).toBeGreaterThan(0),
    );
    // THE DEFECT, asserted as an absence.
    expect(screen.queryByText(supplierOrdersEn['supplierOrders.action.confirm'])).toBeNull();
  });

  it('and the row still OPENS the order — the fix is the label, not a removed affordance', async () => {
    renderWithProviders(<SupplierOrders />, { identity: LACKS_CONFIRM });
    const buttons = await screen.findAllByText(supplierOrdersEn['supplierOrders.action.view']);
    fireEvent.click(buttons[0]);
    // The panel opens and states the wait rather than offering the commit —
    // one notice, in the slot that already had it (§76).
    await waitFor(() => expect(screen.getByTestId('handoff-po-confirm')).toBeTruthy());
  });
});

describe('SupplierRFQs — the open quote panel is gated by the SEAT, not by the entrance', () => {
  it('a commercial seat opens the panel and reaches the submit control', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: HOLDS_QUOTE });
    const open = await screen.findAllByText(rfqsEn['rfqs.card.submitQuote']);
    fireEvent.click(open[0]);
    await waitFor(() => expect(screen.getByText(rfqsEn['rfqs.panel.submit'])).toBeTruthy());
  });

  it('a seat without quotation:submit never gets the entrance', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: LACKS_QUOTE });
    await waitFor(() => expect(screen.getAllByTestId('handoff-quotation-submit').length).toBeGreaterThan(0));
    expect(screen.queryByText(rfqsEn['rfqs.card.submitQuote'])).toBeNull();
    expect(screen.queryByText(rfqsEn['rfqs.panel.submit'])).toBeNull();
  });

  it('⚠️ THE MID-SESSION HOLE: narrowing the seat WHILE the panel stands open kills the commit', async () => {
    renderWithProviders(
      <>
        <NarrowSeat to={LACKS_QUOTE} />
        <SupplierRFQs />
      </>,
      { identity: HOLDS_QUOTE },
    );
    const open = await screen.findAllByText(rfqsEn['rfqs.card.submitQuote']);
    fireEvent.click(open[0]);
    // Known-GOOD control: the commit really was reachable a moment ago, so the
    // absence below is the narrowing and not a panel that never opened.
    await waitFor(() => expect(screen.getByText(rfqsEn['rfqs.panel.submit'])).toBeTruthy());

    fireEvent.click(screen.getByTestId('narrow-seat'));

    await waitFor(() => expect(screen.queryByText(rfqsEn['rfqs.panel.submit'])).toBeNull());
    // It lands on the notice that was ALREADY THERE, not on a second one.
    expect(screen.getAllByTestId('handoff-quotation-submit').length).toBeGreaterThan(0);
  });
});
